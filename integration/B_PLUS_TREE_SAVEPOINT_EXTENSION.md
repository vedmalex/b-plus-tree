# Расширения B+ Tree API для поддержки Savepoint

## 📋 Текущие размышления и план реализации

### ✅ Анализ существующего кода завершен
- Изучена структура TransactionContext.ts (573 строки)
- Найдены методы commit(), abort(), prepareCommit(), finalizeCommit()
- Определены поля для расширения: _workingNodes, _deletedNodes, workingRootId
- Проверена структура тестов (12 файлов тестов)

### ⏳ План реализации (Phase 1: Stabilize Core & Add Savepoint)
1. **Расширить интерфейс ITransactionContext** - добавить savepoint методы
2. **Добавить новые поля в TransactionContext** - для хранения savepoint данных
3. **Реализовать createSavepoint()** - создание snapshot текущего состояния
4. **Реализовать rollbackToSavepoint()** - восстановление состояния
5. **Реализовать releaseSavepoint()** - освобождение памяти
6. **Обновить commit()/abort()** - очистка savepoint при завершении транзакции
7. **Создать тесты** - высокогранулированные тесты для каждого метода
8. **Проверить существующие тесты** - убедиться что ничего не сломалось

### 🎯 Ключевые требования для реализации
- Сохранить обратную совместимость с существующим API
- Использовать deep copy для snapshot данных (избежать shared references)
- Правильно обрабатывать cleanup при commit/abort
- Поддержать nested savepoints с правильным порядком rollback
- Добавить подробное логирование для отладки

## 📋 Необходимые изменения в B+ Tree

### 1. Расширение ITransactionContext интерфейса

```typescript
// Добавить в src/TransactionContext.ts

export interface ITransactionContext<T, K extends ValueType> {
  // ... существующие методы ...
  readonly transactionId: string;
  readonly snapshotRootId: number;
  workingRootId: number | undefined;
  readonly treeSnapshot: BPlusTree<T, K>;
  readonly workingNodes: ReadonlyMap<number, Node<T, K>>;
  readonly deletedNodes: ReadonlySet<number>;

  addWorkingNode(node: Node<T, K>): void;
  getWorkingNode(nodeId: number): Node<T, K> | undefined;
  getCommittedNode(nodeId: number): Node<T, K> | undefined;
  ensureWorkingNode(nodeId: number): Node<T, K>;
  markNodeForDeletion(nodeId: number): void;
  getNode(nodeId: number): Node<T, K> | undefined;
  getRootNode(): Node<T, K> | undefined;

  commit(): Promise<void>;
  abort(): Promise<void>;

  // 2PC methods
  prepareCommit(): Promise<void>;
  finalizeCommit(): Promise<void>;

  // ✅ НОВЫЕ МЕТОДЫ: Savepoint support
  createSavepoint(name: string): Promise<string>;
  rollbackToSavepoint(savepointId: string): Promise<void>;
  releaseSavepoint(savepointId: string): Promise<void>;
  listSavepoints(): string[];
  getSavepointInfo(savepointId: string): SavepointInfo | undefined;
}

// ✅ НОВЫЙ ИНТЕРФЕЙС: Информация о savepoint
export interface SavepointInfo {
  savepointId: string;
  name: string;
  timestamp: number;
  workingNodesCount: number;
  deletedNodesCount: number;
}

// ✅ НОВЫЙ ИНТЕРФЕЙС: Snapshot данных savepoint
export interface SavepointSnapshot<T, K extends ValueType> {
  savepointId: string;
  name: string;
  timestamp: number;
  workingRootId: number | undefined;
  workingNodesSnapshot: Map<number, Node<T, K>>;
  deletedNodesSnapshot: Set<number>;
  // Для оптимизации - храним только изменения с предыдущего savepoint
  incrementalChanges?: {
    addedNodes: Map<number, Node<T, K>>;
    modifiedNodes: Map<number, Node<T, K>>;
    removedNodes: Set<number>;
  };
}
```

### 2. Расширение TransactionContext класса

```typescript
// Добавить в src/TransactionContext.ts

export class TransactionContext<T, K extends ValueType> implements ITransactionContext<T, K> {
  // ... существующие поля ...
  public readonly transactionId: string;
  public readonly snapshotRootId: number;
  public workingRootId: number | undefined;
  public readonly treeSnapshot: BPlusTree<T, K>;
  private _workingNodes: Map<number, Node<T, K>>;
  private _deletedNodes: Set<number>;
  private readonly _snapshotNodeStates: Map<number, { keys: K[], values: T[], leaf: boolean }>;
  private _isPrepared: boolean = false;
  private _preparedChanges: any;

  // ✅ НОВЫЕ ПОЛЯ: Savepoint support
  private _savepoints: Map<string, SavepointSnapshot<T, K>>;
  private _savepointCounter: number = 0;
  private _savepointNameToId: Map<string, string>;

  // ✅ НОВЫЕ ПОЛЯ: Nested transaction support (для будущего расширения)
  private _parentContext?: TransactionContext<T, K>;
  private _childContexts: Set<TransactionContext<T, K>>;

  constructor(tree: BPlusTree<T, K>, parentContext?: TransactionContext<T, K>) {
    // ... существующая инициализация ...
    this.transactionId = TransactionContext.generateTransactionId();
    this.treeSnapshot = tree;
    this.snapshotRootId = tree.root;
    this.workingRootId = tree.root;
    this._workingNodes = new Map<number, Node<T, K>>();
    this._deletedNodes = new Set<number>();

    // ✅ НОВАЯ ИНИЦИАЛИЗАЦИЯ: Savepoint support
    this._savepoints = new Map<string, SavepointSnapshot<T, K>>();
    this._savepointNameToId = new Map<string, string>();
    this._parentContext = parentContext;
    this._childContexts = new Set<TransactionContext<T, K>>();

    // Создаем snapshot состояния
    this._snapshotNodeStates = new Map();
    for (const [nodeId, node] of tree.nodes) {
      this._snapshotNodeStates.set(nodeId, {
        keys: [...node.keys],
        values: node.leaf ? [...(node.pointers as T[])] : [],
        leaf: node.leaf
      });
    }
  }

  // ✅ НОВЫЙ МЕТОД: Создание savepoint
  async createSavepoint(name: string): Promise<string> {
    // Проверяем уникальность имени
    if (this._savepointNameToId.has(name)) {
      throw new Error(`Savepoint with name '${name}' already exists in transaction ${this.transactionId}`);
    }

    // Генерируем уникальный ID
    const savepointId = `sp-${this.transactionId}-${++this._savepointCounter}-${Date.now()}`;

    // Создаем deep copy текущего состояния
    const workingNodesSnapshot = new Map<number, Node<T, K>>();
    for (const [nodeId, node] of this._workingNodes) {
      // Создаем полную копию узла
      const nodeCopy = Node.copy(node, this);
      workingNodesSnapshot.set(nodeId, nodeCopy);
    }

    const deletedNodesSnapshot = new Set<number>(this._deletedNodes);

    const snapshot: SavepointSnapshot<T, K> = {
      savepointId,
      name,
      timestamp: Date.now(),
      workingRootId: this.workingRootId,
      workingNodesSnapshot,
      deletedNodesSnapshot
    };

    this._savepoints.set(savepointId, snapshot);
    this._savepointNameToId.set(name, savepointId);

    console.log(`[TransactionContext] Created savepoint '${name}' (${savepointId}) with ${workingNodesSnapshot.size} working nodes`);
    return savepointId;
  }

  // ✅ НОВЫЙ МЕТОД: Rollback к savepoint
  async rollbackToSavepoint(savepointId: string): Promise<void> {
    const snapshot = this._savepoints.get(savepointId);
    if (!snapshot) {
      throw new Error(`Savepoint ${savepointId} not found in transaction ${this.transactionId}`);
    }

    console.log(`[TransactionContext] Rolling back to savepoint '${snapshot.name}' (${savepointId})`);

    // Восстанавливаем состояние из snapshot
    this.workingRootId = snapshot.workingRootId;

    // Очищаем текущие working nodes
    this._workingNodes.clear();

    // Восстанавливаем working nodes из snapshot
    for (const [nodeId, node] of snapshot.workingNodesSnapshot) {
      // Создаем новую копию чтобы избежать shared references
      const restoredNode = Node.copy(node, this);
      this._workingNodes.set(nodeId, restoredNode);
    }

    // Восстанавливаем deleted nodes
    this._deletedNodes.clear();
    for (const deletedNodeId of snapshot.deletedNodesSnapshot) {
      this._deletedNodes.add(deletedNodeId);
    }

    // Удаляем все savepoints созданные после этого
    const savePointsToRemove: string[] = [];
    for (const [spId, sp] of this._savepoints) {
      if (sp.timestamp > snapshot.timestamp) {
        savePointsToRemove.push(spId);
      }
    }

    for (const spId of savePointsToRemove) {
      const sp = this._savepoints.get(spId);
      if (sp) {
        this._savepointNameToId.delete(sp.name);
        this._savepoints.delete(spId);
        console.log(`[TransactionContext] Removed savepoint '${sp.name}' (${spId}) created after rollback point`);
      }
    }

    console.log(`[TransactionContext] Rollback completed. Working nodes: ${this._workingNodes.size}, deleted nodes: ${this._deletedNodes.size}`);
  }

  // ✅ НОВЫЙ МЕТОД: Release savepoint
  async releaseSavepoint(savepointId: string): Promise<void> {
    const snapshot = this._savepoints.get(savepointId);
    if (!snapshot) {
      throw new Error(`Savepoint ${savepointId} not found in transaction ${this.transactionId}`);
    }

    console.log(`[TransactionContext] Releasing savepoint '${snapshot.name}' (${savepointId})`);

    // Удаляем savepoint
    this._savepoints.delete(savepointId);
    this._savepointNameToId.delete(snapshot.name);

    // Освобождаем память от snapshot данных
    snapshot.workingNodesSnapshot.clear();
    snapshot.deletedNodesSnapshot.clear();
  }

  // ✅ НОВЫЙ МЕТОД: Список savepoints
  listSavepoints(): string[] {
    const savepoints: string[] = [];
    for (const snapshot of this._savepoints.values()) {
      savepoints.push(`${snapshot.name} (${snapshot.savepointId}) - ${new Date(snapshot.timestamp).toISOString()}`);
    }
    return savepoints.sort();
  }

  // ✅ НОВЫЙ МЕТОД: Информация о savepoint
  getSavepointInfo(savepointId: string): SavepointInfo | undefined {
    const snapshot = this._savepoints.get(savepointId);
    if (!snapshot) {
      return undefined;
    }

    return {
      savepointId: snapshot.savepointId,
      name: snapshot.name,
      timestamp: snapshot.timestamp,
      workingNodesCount: snapshot.workingNodesSnapshot.size,
      deletedNodesCount: snapshot.deletedNodesSnapshot.size
    };
  }

  // ✅ РАСШИРЕННЫЙ МЕТОД: Commit с очисткой savepoints
  async commit(): Promise<void> {
    // Очищаем все savepoints перед commit
    console.log(`[TransactionContext] Clearing ${this._savepoints.size} savepoints before commit`);
    for (const snapshot of this._savepoints.values()) {
      snapshot.workingNodesSnapshot.clear();
      snapshot.deletedNodesSnapshot.clear();
    }
    this._savepoints.clear();
    this._savepointNameToId.clear();

    // Выполняем обычный commit
    // ... существующая логика commit() ...
  }

  // ✅ РАСШИРЕННЫЙ МЕТОД: Abort с очисткой savepoints
  async abort(): Promise<void> {
    console.log(`[TransactionContext] Aborting transaction ${this.transactionId}, clearing ${this._savepoints.size} savepoints`);

    // Очищаем все savepoints
    for (const snapshot of this._savepoints.values()) {
      snapshot.workingNodesSnapshot.clear();
      snapshot.deletedNodesSnapshot.clear();
    }
    this._savepoints.clear();
    this._savepointNameToId.clear();

    // Очищаем working nodes и deleted nodes
    this._workingNodes.clear();
    this._deletedNodes.clear();
    this.workingRootId = this.snapshotRootId;

    console.log(`[TransactionContext] Transaction ${this.transactionId} aborted`);
  }
}
```

### 3. Обновление экспортов

```typescript
// Добавить в src/index.ts

export {
  // ... существующие экспорты ...
  TransactionContext,
  type ITransactionContext,

  // ✅ НОВЫЕ ЭКСПОРТЫ
  type SavepointInfo,
  type SavepointSnapshot
} from './TransactionContext';
```

## 🧪 Тесты для B+ Tree Savepoint

### Создать файл: src/__test__/TransactionContext.savepoint.test.ts

```typescript
import { describe, it, expect, beforeEach } from 'bun:test';
import { BPlusTree } from '../BPlusTree';
import { TransactionContext } from '../TransactionContext';

describe('TransactionContext Savepoint Support', () => {
  let tree: BPlusTree<string, number>;
  let txCtx: TransactionContext<string, number>;

  beforeEach(() => {
    tree = new BPlusTree<string, number>(3, false);
    // Добавляем начальные данные
    tree.insert(1, 'one');
    tree.insert(2, 'two');
    tree.insert(3, 'three');

    txCtx = new TransactionContext(tree);
  });

  describe('createSavepoint', () => {
    it('should create savepoint with unique ID', async () => {
      const savepointId = await txCtx.createSavepoint('test-savepoint');

      expect(savepointId).toMatch(/^sp-tx-\d+-\w+-1-\d+$/);
      expect(txCtx.listSavepoints()).toHaveLength(1);
      expect(txCtx.listSavepoints()[0]).toContain('test-savepoint');
    });

    it('should snapshot current working state', async () => {
      // Делаем изменения в транзакции
      tree.insert_in_transaction(4, 'four', txCtx);
      tree.remove_in_transaction(1, txCtx);

      const savepointId = await txCtx.createSavepoint('after-changes');
      const info = txCtx.getSavepointInfo(savepointId);

      expect(info).toBeDefined();
      expect(info!.name).toBe('after-changes');
      expect(info!.workingNodesCount).toBeGreaterThan(0);
    });

    it('should handle multiple savepoints', async () => {
      const sp1 = await txCtx.createSavepoint('savepoint-1');
      tree.insert_in_transaction(10, 'ten', txCtx);

      const sp2 = await txCtx.createSavepoint('savepoint-2');
      tree.insert_in_transaction(20, 'twenty', txCtx);

      const sp3 = await txCtx.createSavepoint('savepoint-3');

      expect(txCtx.listSavepoints()).toHaveLength(3);
      expect(sp1).not.toBe(sp2);
      expect(sp2).not.toBe(sp3);
    });

    it('should reject duplicate savepoint names', async () => {
      await txCtx.createSavepoint('duplicate-name');

      await expect(txCtx.createSavepoint('duplicate-name')).rejects.toThrow(
        "Savepoint with name 'duplicate-name' already exists"
      );
    });
  });

  describe('rollbackToSavepoint', () => {
    it('should restore working nodes state', async () => {
      // Создаем savepoint
      const savepointId = await txCtx.createSavepoint('before-changes');

      // Делаем изменения
      tree.insert_in_transaction(100, 'hundred', txCtx);
      tree.insert_in_transaction(200, 'two-hundred', txCtx);

      expect(tree.find_in_transaction(100, txCtx)).toHaveLength(1);
      expect(tree.find_in_transaction(200, txCtx)).toHaveLength(1);

      // Rollback к savepoint
      await txCtx.rollbackToSavepoint(savepointId);

      // Проверяем что изменения отменены
      expect(tree.find_in_transaction(100, txCtx)).toHaveLength(0);
      expect(tree.find_in_transaction(200, txCtx)).toHaveLength(0);
    });

    it('should restore deleted nodes state', async () => {
      // Создаем savepoint
      const savepointId = await txCtx.createSavepoint('before-deletion');

      // Удаляем данные
      tree.remove_in_transaction(2, txCtx);
      expect(tree.find_in_transaction(2, txCtx)).toHaveLength(0);

      // Rollback к savepoint
      await txCtx.rollbackToSavepoint(savepointId);

      // Проверяем что данные восстановлены
      expect(tree.find_in_transaction(2, txCtx)).toHaveLength(1);
      expect(tree.find_in_transaction(2, txCtx)[0]).toBe('two');
    });

    it('should handle nested savepoints correctly', async () => {
      // Создаем цепочку savepoints
      const sp1 = await txCtx.createSavepoint('level-1');
      tree.insert_in_transaction(10, 'ten', txCtx);

      const sp2 = await txCtx.createSavepoint('level-2');
      tree.insert_in_transaction(20, 'twenty', txCtx);

      const sp3 = await txCtx.createSavepoint('level-3');
      tree.insert_in_transaction(30, 'thirty', txCtx);

      // Rollback к level-2
      await txCtx.rollbackToSavepoint(sp2);

      // Проверяем состояние
      expect(tree.find_in_transaction(10, txCtx)).toHaveLength(1); // Должно остаться
      expect(tree.find_in_transaction(20, txCtx)).toHaveLength(1); // Должно остаться
      expect(tree.find_in_transaction(30, txCtx)).toHaveLength(0); // Должно быть удалено

      // Проверяем что savepoint level-3 удален
      expect(txCtx.listSavepoints()).toHaveLength(2);
    });

    it('should throw error for non-existent savepoint', async () => {
      await expect(txCtx.rollbackToSavepoint('non-existent')).rejects.toThrow(
        'Savepoint non-existent not found'
      );
    });
  });

  describe('releaseSavepoint', () => {
    it('should remove savepoint data', async () => {
      const savepointId = await txCtx.createSavepoint('to-release');
      expect(txCtx.listSavepoints()).toHaveLength(1);

      await txCtx.releaseSavepoint(savepointId);
      expect(txCtx.listSavepoints()).toHaveLength(0);
    });

    it('should handle release of non-existent savepoint', async () => {
      await expect(txCtx.releaseSavepoint('non-existent')).rejects.toThrow(
        'Savepoint non-existent not found'
      );
    });

    it('should not affect transaction state', async () => {
      // Делаем изменения
      tree.insert_in_transaction(100, 'hundred', txCtx);

      const savepointId = await txCtx.createSavepoint('test-release');

      // Делаем еще изменения
      tree.insert_in_transaction(200, 'two-hundred', txCtx);

      // Release savepoint
      await txCtx.releaseSavepoint(savepointId);

      // Проверяем что данные остались
      expect(tree.find_in_transaction(100, txCtx)).toHaveLength(1);
      expect(tree.find_in_transaction(200, txCtx)).toHaveLength(1);
    });
  });

  describe('commit and abort cleanup', () => {
    it('should clear savepoints on commit', async () => {
      await txCtx.createSavepoint('sp1');
      await txCtx.createSavepoint('sp2');
      expect(txCtx.listSavepoints()).toHaveLength(2);

      await txCtx.commit();
      expect(txCtx.listSavepoints()).toHaveLength(0);
    });

    it('should clear savepoints on abort', async () => {
      await txCtx.createSavepoint('sp1');
      await txCtx.createSavepoint('sp2');
      expect(txCtx.listSavepoints()).toHaveLength(2);

      await txCtx.abort();
      expect(txCtx.listSavepoints()).toHaveLength(0);
    });
  });
});
```

## 📋 Статус реализации

### ✅ Готово к реализации
- [x] Спроектирован API для savepoint в TransactionContext
- [x] Определены интерфейсы SavepointInfo и SavepointSnapshot
- [x] Создан план тестирования с высокогранулированными тестами
- [x] Учтены требования memory management и cleanup

### ⏳ Следующие шаги
1. Реализовать изменения в src/TransactionContext.ts
2. Добавить тесты в src/__test__/
3. Проверить что все существующие тесты проходят
4. Переходить к Phase 2 - расширение CSDatabase

---

*Документ создан в соответствии с DEVELOPMENT_RULES.md - фазовый подход к разработке*