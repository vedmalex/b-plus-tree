# Анализ падающего теста: "should handle transaction abort without affecting main tree"

## Проблема
Тест ожидает размер дерева 2 после отмены транзакции, но получает 4.

## Суть проблемы
**Транзакция должна быть отменена без применения изменений к основному дереву**, но наши агрессивные функции `ensureValidRoot()` вмешиваются и применяют изменения из working nodes к основному дереву.

## Отладочный вывод
```
Expected: 2
Received: 4

// Финальное состояние:
[size] STARTING size calculation from node 6 (leaf=false, keys=[200], tree.root=6)
[size] COUNTING leaf 4 with 2 keys: [100,150] and values: [hundred,one-fifty]
[size] COUNTING leaf 5 with 2 keys: [200,250] and values: [two-hundred,two-fifty]
[get size] Final result: 4 from root 6
```

## Анализ последовательности событий

### Исходное состояние
- Дерево содержит ключи [100, 200] со значениями ['hundred', 'two-hundred']
- tree.size = 2 ✅

### Во время транзакции (НЕ ДОЛЖНЫ затрагивать основное дерево)
- Транзакция добавляет ключи [150, 250] со значениями ['one-fifty', 'two-fifty']
- **working nodes**: 4, 5, 6 создаются как копии для транзакции

### ПРОБЛЕМА: Отмена транзакции
```
Expected: tree.size = 2 (только [100, 200])
Received: tree.size = 4 (включает [100, 150, 200, 250])
```

**ПРОБЛЕМА**: Функция `ensureValidRoot()` срабатывает при вычислении `tree.size` и обнаруживает "недостижимые листья":
- Недостижимые листья: [2,4,5] (75% ratio > 30%)
- `findValidRoot()` "восстанавливает" дерево, включая транзакционные узлы 4 и 5
- В результате working nodes становятся частью основного дерева

## Корневая причина

### 1. Агрессивная логика в `ensureValidRoot()`
```typescript
if (unreachableRatio > 0.3) {
  // If more than 30% of leaves are unreachable, this is likely transaction corruption
  console.warn(`[ensureValidRoot] High unreachable ratio (${(unreachableRatio * 100).toFixed(1)}%) - likely transaction corruption, reconstructing tree to recover data`);
  this.findValidRoot();
  return;
}
```

### 2. `findValidRoot()` обрабатывает working nodes как валидные данные
```typescript
// Find all leaf nodes in the tree
for (const [nodeId, node] of this.nodes) {
  if (node.leaf && node.keys.length > 0) {
    allLeafNodes.add(nodeId);
  }
}
```

**ПРОБЛЕМА**: `this.nodes` включает как committed, так и working nodes, но `findValidRoot()` не различает их.

## Решение

### Вариант 1: Контекстно-осведомленный `ensureValidRoot()`
Модифицировать `ensureValidRoot()`, чтобы она не вмешивалась, когда есть активные транзакции:

```typescript
// Проверить наличие активных working nodes
if ((this as any).workingNodes && (this as any).workingNodes.size > 0) {
  console.warn(`[ensureValidRoot] Active transaction detected - skipping reconstruction to preserve transaction isolation`);
  return;
}
```

### Вариант 2: Разделение committed и working nodes в `findValidRoot()`
Убедиться, что `findValidRoot()` работает только с committed nodes, не с working nodes.

### Вариант 3: Отложенная валидация
Не выполнять валидацию корня при вычислении size во время активных транзакций.

## Следующие шаги
1. ✅ **Идентифицировали причину**: агрессивная реконструкция дерева во время транзакций
2. 🔧 **Исправить `ensureValidRoot()`**: добавить проверку активных транзакций
3. 🔧 **Модифицировать `findValidRoot()`**: работать только с committed nodes
4. ✅ **Проверить изоляцию транзакций**: убедиться, что working nodes не влияют на основное дерево

## КОРНЕВАЯ ПРИЧИНА НАЙДЕНА! 🎯

### Проблема изоляции транзакций:
**Working nodes добавляются прямо в `tree.nodes` во время транзакции!**

#### Как это происходит:
1. `Node.copy()` → `Node.forceCopy()`
2. `Node.forceCopy()` → `Node.createLeaf(transactionContext.treeSnapshot)` или `Node.createNode()`
3. `Node.createLeaf/createNode()` → `register_node(tree, node)`
4. `register_node()` добавляет working node прямо в `tree.nodes`!

#### Результат:
- Working nodes (4, 5, 6) попадают в основное дерево ДО commit
- При abort транзакции эти узлы остаются в `tree.nodes`
- `ensureValidRoot()` видит их как "недостижимые" и пытается восстановить дерево
- Размер дерева становится 4 вместо 2

### Решение:
Изменить `Node.forceCopy()` чтобы working nodes НЕ добавлялись в `tree.nodes` до commit

## УСПЕШНОЕ ИСПРАВЛЕНИЕ! ✅

### Что было исправлено:
1. **Создали методы `createWorkingLeaf()` и `createWorkingNode()`** которые НЕ добавляют узлы в `tree.nodes`
2. **Модифицировали `Node.forceCopy()`** для использования working node методов
3. **Добавили отслеживание активных транзакций** в BPlusTree с `activeTransactions` Set
4. **Улучшили `ensureValidRoot()`** для пропуска валидации во время активных транзакций

### Результат теста:
```
✓ BPlusTree Transactional CoW Inserts > should handle transaction abort without affecting main tree [2.93ms]
```

**Транзакция теперь полностью изолирована!** Working nodes остаются только в TransactionContext и не попадают в основное дерево до commit.