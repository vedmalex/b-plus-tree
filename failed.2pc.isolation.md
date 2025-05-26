# Трассировка падающего теста: 2PC Transaction Isolation

## Описание проблемы
Тест `"should maintain transaction isolation during prepare phase"` падает на строке 634:
```
expect(tree.get_all_in_transaction(200, txCtx2)).toEqual([]);
```

**Ожидается:** `[]` (пустой массив)
**Получается:** `["two-hundred"]`

## Анализ теста

### Шаги теста:
1. Создается начальное дерево с ключом 100: `tree.insert(100, 'hundred')`
2. Создается первая транзакция `txCtx` и добавляется ключ 200: `tree.insert_in_transaction(200, 'two-hundred', txCtx)`
3. Создается вторая транзакция `txCtx2` и добавляется ключ 300: `tree.insert_in_transaction(300, 'three-hundred', txCtx2)`
4. Первая транзакция готовится к коммиту: `await txCtx.prepareCommit()`
5. Проверяется, что основное дерево все еще содержит только начальные данные
6. Первая транзакция финализируется: `await txCtx.finalizeCommit()`
7. **ПРОБЛЕМА:** Вторая транзакция видит данные первой: `tree.get_all_in_transaction(200, txCtx2)` возвращает `["two-hundred"]` вместо `[]`

### Ожидаемое поведение (Snapshot Isolation):
Вторая транзакция должна видеть только снимок дерева на момент её создания (до коммита первой транзакции).

## Корневая причина
Проблема в том, что `find_all_in_transaction` использует "alternative search" который ищет данные в основном дереве:

```typescript
// Alternative search found key 200 in main tree leaf 1
```

Это нарушает изоляцию транзакций, так как вторая транзакция видит изменения, которые были закоммичены после её создания.

## Анализ логов
```
[find_all_in_transaction] Called with key=200
[find_all_in_transaction] Root node: id=3, keys=[100,300], leaf=true, children=[none]
[find_all_in_transaction] No values found through normal traversal, attempting alternative search
[find_all_in_transaction] Alternative search found key 200 in main tree leaf 1
[find_all_in_transaction] Alternative search found 1 values for key 200
[find_all_in_transaction] Found 1 values for key 200: [two-hundred] in leaves: [1]
```

Вторая транзакция (txCtx2) имеет свой снимок (snapshot) с корнем id=3, который содержит только ключи [100,300]. Но alternative search находит ключ 200 в основном дереве (leaf 1), что нарушает изоляцию.

## Решение
Нужно модифицировать `find_all_in_transaction` чтобы alternative search учитывал snapshot isolation и не искал данные в основном дереве, которые были добавлены после создания транзакции.

## Первая попытка исправления
Изменили alternative search чтобы проверять только достижимость от snapshot root:
```typescript
const isReachableFromSnapshotRoot = this.isNodeReachableFromSpecificRoot(nodeId, txCtx.snapshotRootId);
if (!isReachableFromSnapshotRoot) {
  console.warn(`[find_all_in_transaction] Skipping main tree leaf ${nodeId} because it's not reachable from snapshot root ${txCtx.snapshotRootId} (enforcing snapshot isolation)`);
  continue;
}
```

**Результат:** Тест все еще падает. Узел 1 считается достижимым от snapshot root.

## Анализ проблемы глубже
Проблема в том, что `txCtx.snapshotRootId` и `this.root` указывают на один и тот же узел (ID 1), потому что `treeSnapshot` в TransactionContext - это **ссылка** на то же самое дерево, а не настоящий снимок.

Когда первая транзакция коммитится, она изменяет основное дерево, и вторая транзакция видит эти изменения через свой `treeSnapshot`.

## Корневая причина
В конструкторе TransactionContext:
```typescript
constructor(tree: BPlusTree<T, K>) {
  this.treeSnapshot = tree; // ЭТО ССЫЛКА, А НЕ СНИМОК!
  this.snapshotRootId = tree.root;
}
```

## Вторая попытка исправления
Добавили snapshot isolation через сохранение состояния узлов на момент создания транзакции:
```typescript
// В TransactionContext конструкторе
this._snapshotNodeStates = new Map();
for (const [nodeId, node] of tree.nodes) {
  this._snapshotNodeStates.set(nodeId, {
    keys: [...node.keys],
    values: node.leaf ? [...(node.pointers as T[])] : [],
    leaf: node.leaf
  });
}

// Метод проверки изменений
public isNodeModifiedSinceSnapshot(nodeId: number): boolean {
  // Сравнивает текущее состояние узла с сохраненным снимком
}
```

**Результат:** Alternative search теперь правильно пропускает измененные узлы, но desperate search все еще находит данные.

## Проблема с desperate search
Desperate search игнорирует snapshot isolation и ищет во всех узлах. Нужно отключить его для транзакций с snapshot isolation.

## Третья попытка исправления (УСПЕШНАЯ!)
Отключили desperate search для транзакций с snapshot isolation:
```typescript
const hasSnapshotIsolation = typeof (txCtx as any).isNodeModifiedSinceSnapshot === 'function';
const treeSize = this.size;

if (treeSize > 0 && !hasSnapshotIsolation) {
  // Desperate search только для обычных транзакций
} else if (hasSnapshotIsolation) {
  console.warn(`[find_all_in_transaction] Skipping desperate search due to snapshot isolation requirements`);
}
```

**Результат:** ✅ Тест проходит полностью!

## Финальное решение
Комбинация трех исправлений:
1. **Snapshot isolation** - сохранение состояния узлов на момент создания транзакции
2. **Alternative search filtering** - пропуск измененных узлов в alternative search
3. **Desperate search disabling** - отключение desperate search для snapshot isolation

## Статус
- [x] Проблема идентифицирована
- [x] Первая попытка исправления (неудачная)
- [x] Вторая попытка исправления (частично успешная)
- [x] Третья попытка исправления (УСПЕШНАЯ!)
- [x] Решение реализовано
- [x] Тест проходит ✅