# Трассировка падающего теста: "should remove duplicates one by one sequentially using remove_in_transaction"

## Описание проблемы
Тест падает на последнем шаге (строка 952):
```
expect(tree.remove_in_transaction(10, txCtx)).toBe(false);
```

**Ожидается:** `false` (ключ 10 не должен существовать)
**Получается:** `true` (ключ 10 найден и удален)

## Анализ последовательности операций

### Исходное состояние
- Данные: `[[10, 'A1'], [20, 'B1'], [10, 'A2'], [30, 'C1'], [10, 'A3'], [20, 'B2']]`
- Ожидаемое содержимое:
  - Key 10: ['A1', 'A2', 'A3'] (3 значения)
  - Key 20: ['B1', 'B2'] (2 значения)
  - Key 30: ['C1'] (1 значение)
- `tree.size = 6`

### Step 1: Удаление первого 10 ✅ РАБОТАЕТ
```
remove_in_transaction(10) → true
tree.size = 5, tree.count(10) = 2
```

### Step 2: Удаление первого 20 ✅ РАБОТАЕТ
```
remove_in_transaction(20) → true
tree.size = 4, tree.count(20) = 1
```

### Step 3: Удаление второго 10 ✅ РАБОТАЕТ
```
remove_in_transaction(10) → true
tree.size = 3, tree.count(10) = 1
```

### Step 4: Удаление 30 ✅ РАБОТАЕТ
```
remove_in_transaction(30) → true
tree.size = 2, tree.count(30) = 0
```

### Step 5: Удаление третьего 10 ✅ РАБОТАЕТ
```
remove_in_transaction(10) → true
tree.size = 1, tree.count(10) = 0
```

### Step 6: Удаление второго 20 ✅ РАБОТАЕТ
```
remove_in_transaction(20) → true
tree.size = 0, tree.count(20) = 0
```

### Step 7: Попытка удаления несуществующего 10 ❌ ПАДАЕТ
```
remove_in_transaction(10) → true (ожидается false)
```

## Анализ проблемы

### Из логов видно:
1. **После Step 6**: `tree.size = 0` (дерево пустое)
2. **Step 7**: Alternative search все еще находит ключ 10:
   ```
   [find_all_in_transaction] Alternative search found key 10 in main tree leaf 11
   [find_all_in_transaction] Alternative search found 1 values for key 10
   ```

### Корневая причина:
**Orphaned nodes остаются в `tree.nodes` после транзакций!**

Несмотря на то, что дерево показывает `size = 0`, в `tree.nodes` все еще существуют orphaned листья с данными, которые alternative search находит и считает валидными.

### Проблемы с очисткой:
1. **`cleanupOrphanedReferences()`** не удаляет orphaned nodes из `tree.nodes`
2. **`removeDuplicateNodes()`** не обнаруживает эти orphaned nodes
3. **Alternative search** находит orphaned nodes и считает их валидными данными

## Решение
Нужно улучшить логику очистки, чтобы:
1. **Полностью удалять orphaned nodes** из `tree.nodes`
2. **Улучшить alternative search** чтобы он не находил orphaned nodes
3. **Добавить проверку reachability** в alternative search

## Первое исправление (ЧАСТИЧНО УСПЕШНОЕ!)
Добавили проверку reachability в alternative search:
```typescript
// CRITICAL FIX: Always check reachability from current root to avoid orphaned nodes
const isReachableFromCurrentRoot = this.isNodeReachableFromSpecificRoot(nodeId, this.root);
if (!isReachableFromCurrentRoot) {
  console.warn(`[find_all_in_transaction] Skipping main tree leaf ${nodeId} because it's not reachable from current root (orphaned node)`);
  continue;
}
```

**Результат:**
- ✅ Alternative search теперь правильно пропускает orphaned nodes
- ✅ Тест продвинулся с строки 952 на строку 944
- ❌ Новая проблема: строка 944 ожидает `true`, получает `false`

## Анализ новой проблемы

### Из логов видно:
```
[find_all_in_transaction] Alternative search also found no values for key 10
[remove_in_transaction] Single remove: No leaves found containing key 10
```

### Проблема:
Тест на строке 944 ожидает, что `remove_in_transaction(10)` вернет `true`, но:
1. `tree.size = 2` (правильно)
2. `tree.count(10) = 0` (manual search не находит ключ 10)
3. Но alternative search в size() все еще находит orphaned nodes и считает их

### Корневая причина:
**Несоответствие между `size()` и `find_all_in_transaction()`:**
- `size()` использует alternative search и находит orphaned nodes
- `find_all_in_transaction()` теперь правильно пропускает orphaned nodes
- В результате `tree.size = 2`, но `remove_in_transaction(10)` возвращает `false`

## Решение
Нужно синхронизировать логику между `size()` и `find_all_in_transaction()` - добавить такую же проверку reachability в `size()`.

## Второе исправление (ЧАСТИЧНО УСПЕШНОЕ!)
Синхронизировали логику между `size()` и `find_all_in_transaction()`:
```typescript
// В size() добавили такую же проверку reachability как в find_all_in_transaction()
const isReachableFromCurrentRoot = (tree as any).isNodeReachableFromSpecificRoot?.(altNodeId, tree.root) ?? true;
if (!isReachableFromCurrentRoot) {
  console.warn(`[size] Skipping alternative leaf ${altNodeId} because it's not reachable from current root (orphaned node)`);
  continue;
}
```

**Результат:**
- ✅ `size()` и `find_all_in_transaction()` теперь синхронизированы
- ✅ Тест продвинулся с строки 944 на строку 941
- ❌ Новая проблема: строка 941 ожидает `tree.size = 2`, получает `tree.size = 1`

## Анализ новой проблемы

### Из логов видно:
```
[TEST DEBUG] Manual search for key 10: count=0
[TEST DEBUG] Manual search for key 20: count=1
[size] get size] Final result: 1 from root 24
```

### Проблема:
Тест ожидает, что после удаления 30 в дереве должно остаться 2 элемента:
- 1 ключ 10 (значение A2)
- 1 ключ 20 (значение B1)

Но `tree.size = 1` и `tree.count(10) = 0`, что означает, что ключ 10 был потерян.

### Корневая причина:
Из логов видно, что `size()` правильно пропускает orphaned nodes:
```
[size] Skipping alternative leaf 2 because it's not reachable from current root (orphaned node)
[size] Skipping alternative leaf 11 because it's not reachable from current root (orphaned node)
```

Но это означает, что узлы с ключом 10 стали orphaned и недостижимыми от текущего корня.

## Решение
Проблема не в логике поиска, а в том, что структура дерева повреждена - узлы с данными стали orphaned. Нужно исправить структуру дерева, чтобы все данные оставались достижимыми.

## Статус
- [x] Проблема идентифицирована
- [x] Первое исправление (частично успешное)
- [x] Синхронизация size() и find_all_in_transaction() (успешная)
- [ ] Исправление структуры дерева для предотвращения orphaned nodes
- [ ] Тест проходит