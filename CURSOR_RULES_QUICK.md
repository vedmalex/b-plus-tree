# Cursor Rules - Краткая версия

## 🎯 Основные принципы

### 1. Полная типизация
```typescript
export type Cursor<T, K extends ValueType, R = T> = {
  node: number | undefined
  pos: number | undefined
  key: K | undefined
  value: R | undefined
  done: boolean
}
```

### 2. Immutable операции
```typescript
// ✅ Возвращаем новый cursor
function eval_next<T, K>(tree: Tree<T, K>, id: number, pos: number): Cursor<T, K>

// ❌ Не мутируем cursor
function badNext<T, K>(cursor: Cursor<T, K>): void { cursor.pos++ }
```

### 3. Graceful degradation
```typescript
export const EmptyCursor = {
  done: true, key: undefined, pos: undefined,
  node: undefined, value: undefined
}
```

## 🏗️ Архитектура

### 4. Разделение ответственности
- `eval.ts` - базовые операции (eval_next, eval_previous)
- `source.ts` - генераторы (sourceEq, sourceRange)
- `query.ts` - трансформации (map, filter, reduce)

### 5. Ленивые генераторы
```typescript
export function sourceRange<T, K>(from: K, to: K) {
  return function* (tree: Tree<T, K>): Generator<Cursor<T, K>, void> {
    let cursor = find_range_start(tree, from, true, true)
    while (!cursor.done && tree.comparator(cursor.key!, to) <= 0) {
      yield cursor  // Ленивая генерация
      cursor = eval_next(tree, cursor.node!, cursor.pos!)
    }
  }
}
```

## 🧭 Навигация

### 6. Консистентная навигация
```typescript
export function evaluate<T, K>(tree: Tree<T, K>, id: number, pos: number): Cursor<T, K> {
  let cur = tree.nodes.get(id)
  while (cur) {
    if (pos >= cur.pointers.length) {
      cur = cur.right; pos -= cur.pointers.length
    } else if (pos < 0) {
      cur = cur.left; if (cur) pos += cur.pointers.length
    } else {
      return get_current(cur, pos)
    }
  }
  return EmptyCursor as Cursor<T, K>
}
```

### 7. Boundary handling
```typescript
// Всегда проверяем границы и возвращаем валидный cursor
if (index === -1) index = node.keys.length  // Переход к следующему узлу
```

## 📊 Состояние

### 8. Type Guards
```typescript
function isValidCursor<T, K>(cursor: Cursor<T, K>): cursor is Required<Cursor<T, K>> {
  return !cursor.done && cursor.node !== undefined &&
         cursor.pos !== undefined && cursor.key !== undefined
}
```

### 9. Инварианты
```typescript
// done cursor не имеет валидных данных
if (cursor.done) {
  return cursor.node === undefined && cursor.pos === undefined
}
```

## 🔄 Транзакции

### 10. Snapshot isolation
```typescript
// Cursor видит снапшот на момент создания транзакции
const snapshotState = txCtx.getSnapshotState()
```

### 11. Copy-on-Write
```typescript
// Используем working copy если доступна
const workingNode = txCtx.workingNodes.get(originalCursor.node!)
if (workingNode) {
  return { ...originalCursor, node: workingNode.id }
}
```

## 🧪 Тестирование

### 12. Высокогранулированные тесты
```typescript
describe('Cursor Navigation', () => {
  it('should navigate forward correctly', () => {
    const cursor = tree.cursor(5)
    const nextCursor = eval_next(tree, cursor.node!, cursor.pos!)
    expect(nextCursor.key).toBeGreaterThan(cursor.key!)
  })
})
```

### 13. Edge cases
```typescript
it('should handle empty tree', () => {
  const cursor = emptyTree.cursor(1)
  expect(cursor.done).toBe(true)
})
```

## 🐛 Отладка

### 14. Детальное логирование
```typescript
function debugCursor<T, K>(cursor: Cursor<T, K>, operation: string): void {
  console.log(`[CURSOR] ${operation}:`, {
    node: cursor.node, pos: cursor.pos, key: cursor.key, done: cursor.done
  })
}
```

### 15. Трассировка
```typescript
class CursorTracer<T, K> {
  traceCursor(operation: string, cursor: Cursor<T, K>): void {
    this.trace.push({ operation, cursor: {...cursor}, timestamp: performance.now() })
  }
}
```

## ⚡ Производительность

### 16. Кэширование
```typescript
class CursorCache<T, K> {
  getCachedCursor(tree: Tree<T, K>, key: K): Cursor<T, K> {
    const cacheKey = `${tree.root}-${key}`
    return this.cache.get(cacheKey) || this.createAndCache(tree, key, cacheKey)
  }
}
```

### 17. Batch операции
```typescript
async function processCursorsBatch<T, K>(
  cursors: Generator<Cursor<T, K>>, batchSize = 1000
): Promise<T[]> {
  // Обрабатываем cursor батчами для лучшей производительности
}
```

## 🔗 Интеграция

### 18. Адаптеры
```typescript
class CursorAdapter<T, K> implements ExternalCursor<T> {
  constructor(source: Generator<Cursor<T, K>>) { /* ... */ }
  current(): T | null { return this.currentCursor.value || null }
  next(): boolean { /* ... */ }
}
```

### 19. Сериализация
```typescript
interface SerializableCursor<T, K> {
  node: number | undefined; pos: number | undefined
  key: K | undefined; done: boolean
  // value восстанавливаем из структуры
}
```

## 📋 Чек-лист

### При создании cursor:
- [ ] Полный тип `Cursor<T, K, R>`
- [ ] Поддержка `EmptyCursor`
- [ ] Type guards
- [ ] Тесты всех состояний

### При навигации:
- [ ] Граничные случаи
- [ ] Прямая/обратная навигация
- [ ] Ленивая генерация
- [ ] Логирование

### При транзакциях:
- [ ] Изоляция транзакций
- [ ] CoW поддержка
- [ ] Snapshot isolation
- [ ] Транзакционные тесты

### При оптимизации:
- [ ] Генераторы вместо массивов
- [ ] Кэширование
- [ ] Batch операции
- [ ] Тесты производительности

---

## 🎯 Ключевые принципы

1. **Cursor = полное состояние навигации** (node, pos, key, value, done)
2. **Immutable операции** - всегда возвращаем новый cursor
3. **Graceful degradation** - EmptyCursor при ошибках
4. **Ленивые генераторы** - экономия памяти
5. **Type safety** - строгая типизация с ограничениями
6. **Транзакционная изоляция** - snapshot + CoW
7. **Высокогранулированное тестирование** - каждый аспект отдельно
8. **Детальная отладка** - логирование + трассировка

---

*Основано на опыте разработки B+ Tree с транзакционной поддержкой*