# Правила работы с Cursor

## 📋 Оглавление

- [Основные принципы](#-основные-принципы)
- [Архитектурные правила](#-архитектурные-правила)
- [Правила типизации](#-правила-типизации)
- [Правила навигации](#-правила-навигации)
- [Правила состояния](#-правила-состояния)
- [Правила производительности](#-правила-производительности)
- [Правила транзакционности](#-правила-транзакционности)
- [Правила тестирования](#-правила-тестирования)
- [Правила отладки](#-правила-отладки)
- [Правила интеграции](#-правила-интеграции)

---

## 🎯 Основные принципы

### 1. **Cursor как указатель состояния**
```typescript
// ✅ ПРАВИЛЬНО: Cursor содержит всю информацию для навигации
export type Cursor<T, K extends ValueType, R = T> = {
  node: number      // ID узла в структуре данных
  pos: number       // Позиция внутри узла
  key: K           // Текущий ключ
  value: R         // Текущее значение (может быть трансформировано)
  done: boolean    // Флаг завершения итерации
}

// ❌ НЕПРАВИЛЬНО: Неполная информация о состоянии
type BadCursor<T> = {
  value: T
  hasNext: boolean  // Недостаточно для навигации
}
```

### 2. **Immutable операции**
```typescript
// ✅ ПРАВИЛЬНО: Cursor операции не изменяют исходный cursor
function eval_next<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  id: number,
  pos: number,
): Cursor<T, K> {
  return evaluate(tree, id, pos + 1)  // Новый cursor
}

// ❌ НЕПРАВИЛЬНО: Мутация cursor
function badNext<T, K>(cursor: Cursor<T, K>): void {
  cursor.pos++  // Изменяет исходный объект
}
```

### 3. **Graceful degradation**
```typescript
// ✅ ПРАВИЛЬНО: Безопасное поведение при ошибках
export const EmptyCursor = {
  done: true,
  key: undefined,
  pos: undefined,
  node: undefined,
  value: undefined,
}

// Всегда возвращаем валидный cursor, даже при ошибках
function safeEvaluate<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  id: number,
  pos: number,
): Cursor<T, K> {
  try {
    return evaluate(tree, id, pos)
  } catch (error) {
    console.warn('Cursor evaluation failed:', error)
    return EmptyCursor as Cursor<T, K>
  }
}
```

---

## 🏗️ Архитектурные правила

### 4. **Разделение ответственности**
```typescript
// ✅ ПРАВИЛЬНО: Четкое разделение функций
// eval.ts - базовые операции с cursor
export function eval_current<T, K>(tree: BPlusTree<T, K>, id: number, pos: number): Cursor<T, K>
export function eval_next<T, K>(tree: BPlusTree<T, K>, id: number, pos: number): Cursor<T, K>
export function eval_previous<T, K>(tree: BPlusTree<T, K>, id: number, pos: number): Cursor<T, K>

// source.ts - генераторы cursor для запросов
export function sourceEq<T, K>(key: K): (tree: BPlusTree<T, K>) => Generator<Cursor<T, K>>
export function sourceRange<T, K>(from: K, to: K): (tree: BPlusTree<T, K>) => Generator<Cursor<T, K>>

// query.ts - трансформации cursor
export function map<T, K, R>(fn: (cursor: Cursor<T, K>) => R): Transform<T, K, R>
export function filter<T, K>(predicate: (cursor: Cursor<T, K>) => boolean): Transform<T, K, T>
```

### 5. **Композиция операций**
```typescript
// ✅ ПРАВИЛЬНО: Cursor операции легко композируются
const result = await query(
  tree.range(1, 10),           // Источник cursor
  filter(c => c.value.active), // Фильтрация cursor
  map(c => c.value.name),      // Трансформация cursor
  reduce((acc, name) => [...acc, name], [])  // Агрегация
)(tree)
```

### 6. **Ленивые вычисления**
```typescript
// ✅ ПРАВИЛЬНО: Generator для ленивой обработки
export function sourceEach<T, K extends ValueType>(forward = true) {
  return function* (tree: BPlusTree<T, K>): Generator<Cursor<T, K>, void> {
    let cursor = forward ? tree.cursor(tree.min) : findLastCursor(tree, tree.max)

    while (!cursor.done) {
      yield cursor  // Ленивая генерация
      cursor = forward
        ? eval_next(tree, cursor.node, cursor.pos)
        : eval_previous(tree, cursor.node, cursor.pos)
    }
  }
}
```

---

## 🔤 Правила типизации

### 7. **Строгая типизация**
```typescript
// ✅ ПРАВИЛЬНО: Полная типизация с ограничениями
export type Cursor<T, K extends ValueType, R = T> = {
  node: number | undefined     // Может быть undefined для EmptyCursor
  pos: number | undefined      // Может быть undefined для EmptyCursor
  key: K | undefined          // Может быть undefined для EmptyCursor
  value: R | undefined        // Может быть undefined для EmptyCursor
  done: boolean               // Всегда определен
}

// ValueType ограничивает допустимые типы ключей
export type ValueType = number | string | boolean
```

### 8. **Генерики с ограничениями**
```typescript
// ✅ ПРАВИЛЬНО: Правильные ограничения типов
function find_first<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  key: K,
  forward = true,
): Cursor<T, K> {
  // Реализация
}

// ✅ ПРАВИЛЬНО: Трансформация типов в cursor
function map<T, K extends ValueType, R>(
  transform: (value: T) => R
): (source: Generator<Cursor<T, K>>) => Generator<Cursor<T, K, R>> {
  return function* (source) {
    for (const cursor of source) {
      yield {
        ...cursor,
        value: transform(cursor.value)  // Трансформируем тип значения
      }
    }
  }
}
```

### 9. **Type Guards**
```typescript
// ✅ ПРАВИЛЬНО: Type guards для безопасности
function isValidCursor<T, K extends ValueType>(cursor: Cursor<T, K>): cursor is Required<Cursor<T, K>> {
  return !cursor.done &&
         cursor.node !== undefined &&
         cursor.pos !== undefined &&
         cursor.key !== undefined &&
         cursor.value !== undefined
}

function processValidCursor<T, K extends ValueType>(cursor: Cursor<T, K>) {
  if (isValidCursor(cursor)) {
    // TypeScript знает, что все поля определены
    console.log(`Node ${cursor.node}, pos ${cursor.pos}, key ${cursor.key}`)
  }
}
```

---

## 🧭 Правила навигации

### 10. **Консистентная навигация**
```typescript
// ✅ ПРАВИЛЬНО: Консистентные функции навигации
export function evaluate<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  id: number,
  pos: number,
): Cursor<T, K> {
  let cur = tree.nodes.get(id)

  while (cur) {
    const len = cur.pointers.length

    if (pos >= len) {
      // Переход к следующему узлу
      cur = cur.right
      pos -= len
    } else if (pos < 0) {
      // Переход к предыдущему узлу
      cur = cur.left
      if (cur) {
        pos += cur.pointers.length
      }
    } else {
      // Валидная позиция в текущем узле
      return get_current(cur, pos)
    }
  }

  // Достигнут конец структуры
  return EmptyCursor as Cursor<T, K>
}
```

### 11. **Boundary handling**
```typescript
// ✅ ПРАВИЛЬНО: Правильная обработка границ
export function find_range_start<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  key: K,
  include: boolean,
  forward = true,
): Cursor<T, K> {
  const node = forward ? find_first_node(tree, key) : find_last_node(tree, key)

  let index: number
  if (forward) {
    if (include) {
      // Найти первый ключ >= указанного
      index = find_first_key(node.keys, key, tree.comparator)
      if (index === -1) {
        index = node.keys.length  // Переход к следующему узлу
      }
    } else {
      // Найти первый ключ > указанного
      let firstGTE = find_first_key(node.keys, key, tree.comparator)
      if (firstGTE !== -1 && firstGTE < node.keys.length &&
          tree.comparator(node.keys[firstGTE], key) === 0) {
        index = firstGTE + 1  // Пропустить равный ключ
      } else {
        index = firstGTE !== -1 ? firstGTE : node.keys.length
      }
    }
  } else {
    // Обратная навигация
    index = include
      ? find_last_key(node.keys, key, tree.comparator) - 1
      : find_first_key(node.keys, key, tree.comparator) - 1
  }

  return evaluate(tree, node.id, index)
}
```

### 12. **Направленная навигация**
```typescript
// ✅ ПРАВИЛЬНО: Поддержка прямой и обратной навигации
export function sourceEach<T, K extends ValueType>(forward = true) {
  return function* (tree: BPlusTree<T, K>): Generator<Cursor<T, K>, void> {
    const step = forward ? eval_next : eval_previous
    const startKey = forward ? tree.min : tree.max
    let cursor = forward
      ? tree.cursor(startKey)
      : find_last_cursor_equivalent(tree, startKey)

    while (!cursor.done) {
      yield cursor
      cursor = step(tree, cursor.node, cursor.pos)
    }
  }
}
```

---

## 📊 Правила состояния

### 13. **Четкие состояния cursor**
```typescript
// ✅ ПРАВИЛЬНО: Четкое определение состояний
enum CursorState {
  VALID = 'valid',       // cursor указывает на валидные данные
  EMPTY = 'empty',       // cursor пуст (done = true)
  BOUNDARY = 'boundary', // cursor на границе структуры
  ERROR = 'error'        // cursor в ошибочном состоянии
}

function getCursorState<T, K extends ValueType>(cursor: Cursor<T, K>): CursorState {
  if (cursor.done) return CursorState.EMPTY
  if (cursor.node === undefined || cursor.pos === undefined) return CursorState.ERROR
  if (cursor.value === undefined) return CursorState.BOUNDARY
  return CursorState.VALID
}
```

### 14. **Инварианты cursor**
```typescript
// ✅ ПРАВИЛЬНО: Проверка инвариантов
function validateCursor<T, K extends ValueType>(
  cursor: Cursor<T, K>,
  tree: BPlusTree<T, K>
): boolean {
  // Инвариант 1: done cursor не имеет валидных данных
  if (cursor.done) {
    return cursor.node === undefined &&
           cursor.pos === undefined &&
           cursor.key === undefined &&
           cursor.value === undefined
  }

  // Инвариант 2: активный cursor имеет валидные координаты
  if (!cursor.done) {
    const node = tree.nodes.get(cursor.node!)
    return node !== undefined &&
           cursor.pos! >= 0 &&
           cursor.pos! < node.pointers.length &&
           cursor.key !== undefined
  }

  return false
}
```

### 15. **Состояние при ошибках**
```typescript
// ✅ ПРАВИЛЬНО: Безопасное состояние при ошибках
function safeGetCurrent<T, K extends ValueType>(
  cur: Node<T, K> | undefined,
  pos: number,
): Cursor<T, K> {
  if (!cur || pos < 0 || pos >= cur.pointers.length) {
    return {
      node: undefined,
      pos: undefined,
      key: undefined,
      value: undefined,
      done: true,
    }
  }

  const value = cur.pointers[pos]
  return {
    node: cur.id,
    pos,
    key: cur.keys[pos],
    value,
    done: value === undefined,
  }
}
```

---

## ⚡ Правила производительности

### 16. **Ленивые вычисления**
```typescript
// ✅ ПРАВИЛЬНО: Генераторы для экономии памяти
export function sourceRange<T, K extends ValueType>(from: K, to: K) {
  return function* (tree: BPlusTree<T, K>): Generator<Cursor<T, K>, void> {
    let cursor = find_range_start(tree, from, true, true)

    while (!cursor.done && tree.comparator(cursor.key!, to) <= 0) {
      yield cursor  // Ленивая генерация - только по требованию
      cursor = eval_next(tree, cursor.node!, cursor.pos!)
    }
  }
}

// ❌ НЕПРАВИЛЬНО: Загрузка всех данных в память
function badRange<T, K extends ValueType>(tree: BPlusTree<T, K>, from: K, to: K): Cursor<T, K>[] {
  const results: Cursor<T, K>[] = []
  // Загружает все данные сразу - неэффективно для больших диапазонов
  // ...
  return results
}
```

### 17. **Кэширование навигации**
```typescript
// ✅ ПРАВИЛЬНО: Кэширование для часто используемых cursor
class CursorCache<T, K extends ValueType> {
  private cache = new Map<string, Cursor<T, K>>()

  getCachedCursor(tree: BPlusTree<T, K>, key: K): Cursor<T, K> {
    const cacheKey = `${tree.root}-${key}`

    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!
      // Проверяем, что cached cursor все еще валиден
      if (this.isValidCached(tree, cached)) {
        return cached
      }
    }

    const cursor = tree.cursor(key)
    this.cache.set(cacheKey, cursor)
    return cursor
  }

  private isValidCached(tree: BPlusTree<T, K>, cursor: Cursor<T, K>): boolean {
    // Проверяем, что узел все еще существует и не изменился
    const node = tree.nodes.get(cursor.node!)
    return node !== undefined &&
           cursor.pos! < node.pointers.length &&
           tree.comparator(node.keys[cursor.pos!], cursor.key!) === 0
  }
}
```

### 18. **Batch операции**
```typescript
// ✅ ПРАВИЛЬНО: Batch обработка cursor
async function processCursorsBatch<T, K extends ValueType>(
  cursors: Generator<Cursor<T, K>>,
  batchSize = 1000
): Promise<T[]> {
  const results: T[] = []
  let batch: Cursor<T, K>[] = []

  for (const cursor of cursors) {
    batch.push(cursor)

    if (batch.length >= batchSize) {
      // Обрабатываем batch
      const batchResults = await processBatch(batch)
      results.push(...batchResults)
      batch = []
    }
  }

  // Обрабатываем оставшиеся cursor
  if (batch.length > 0) {
    const batchResults = await processBatch(batch)
    results.push(...batchResults)
  }

  return results
}
```

---

## 🔄 Правила транзакционности

### 19. **Изоляция cursor в транзакциях**
```typescript
// ✅ ПРАВИЛЬНО: Cursor учитывает транзакционный контекст
export function find_leaf_for_key_in_transaction<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  key: K,
  txCtx: TransactionContext<T, K>
): Node<T, K> {
  let currentNodeId = txCtx.workingRootId ?? tree.root

  while (true) {
    // Используем working copy если доступна
    const currentNode = txCtx.workingNodes.get(currentNodeId) ?? tree.nodes.get(currentNodeId)

    if (!currentNode) {
      throw new Error(`Node ${currentNodeId} not found`)
    }

    if (currentNode.leaf) {
      return currentNode
    }

    // Навигация с учетом транзакционных изменений
    const childIndex = find_first_key(currentNode.keys, key, tree.comparator)
    currentNodeId = currentNode.pointers[childIndex] as number
  }
}
```

### 20. **Snapshot isolation для cursor**
```typescript
// ✅ ПРАВИЛЬНО: Cursor видит снапшот на момент создания транзакции
export function get_all_in_transaction<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  key: K,
  txCtx: TransactionContext<T, K>
): T[] {
  const results: T[] = []

  // Используем снапшот состояния на момент начала транзакции
  const snapshotState = txCtx.getSnapshotState()

  for (const [nodeId, nodeState] of snapshotState) {
    if (nodeState.leaf) {
      for (let i = 0; i < nodeState.keys.length; i++) {
        if (tree.comparator(nodeState.keys[i], key) === 0) {
          results.push(nodeState.values[i])
        }
      }
    }
  }

  return results
}
```

### 21. **Copy-on-Write для cursor**
```typescript
// ✅ ПРАВИЛЬНО: Cursor работает с CoW узлами
function getWorkingCursor<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  originalCursor: Cursor<T, K>,
  txCtx: TransactionContext<T, K>
): Cursor<T, K> {
  if (originalCursor.done) return originalCursor

  // Проверяем, есть ли working copy узла
  const workingNode = txCtx.workingNodes.get(originalCursor.node!)

  if (workingNode) {
    return {
      ...originalCursor,
      node: workingNode.id,  // Используем ID working copy
      value: workingNode.pointers[originalCursor.pos!] as T
    }
  }

  return originalCursor
}
```

---

## 🧪 Правила тестирования

### 22. **Высокогранулированные тесты**
```typescript
// ✅ ПРАВИЛЬНО: Тестируем каждый аспект cursor отдельно
describe('Cursor Navigation', () => {
  it('should navigate forward correctly', () => {
    const tree = createTestTree()
    const cursor = tree.cursor(5)
    const nextCursor = eval_next(tree, cursor.node!, cursor.pos!)

    expect(nextCursor.done).toBe(false)
    expect(nextCursor.key).toBeGreaterThan(cursor.key!)
  })

  it('should handle boundary conditions', () => {
    const tree = createTestTree()
    const lastCursor = tree.cursor(tree.max!)
    const beyondCursor = eval_next(tree, lastCursor.node!, lastCursor.pos!)

    expect(beyondCursor.done).toBe(true)
    expect(beyondCursor.node).toBeUndefined()
  })

  it('should maintain cursor invariants', () => {
    const tree = createTestTree()
    const cursor = tree.cursor(10)

    expect(validateCursor(cursor, tree)).toBe(true)
  })
})
```

### 23. **Тестирование edge cases**
```typescript
// ✅ ПРАВИЛЬНО: Покрываем все граничные случаи
describe('Cursor Edge Cases', () => {
  it('should handle empty tree', () => {
    const tree = new BPlusTree<string, number>(3)
    const cursor = tree.cursor(1)

    expect(cursor.done).toBe(true)
  })

  it('should handle single element tree', () => {
    const tree = new BPlusTree<string, number>(3)
    tree.insert(1, 'one')

    const cursor = tree.cursor(1)
    expect(cursor.done).toBe(false)
    expect(cursor.value).toBe('one')

    const nextCursor = eval_next(tree, cursor.node!, cursor.pos!)
    expect(nextCursor.done).toBe(true)
  })

  it('should handle non-existent keys', () => {
    const tree = createTestTree([1, 3, 5])
    const cursor = tree.cursor(2)  // Ключ не существует

    // Должен найти первый ключ >= 2, то есть 3
    expect(cursor.key).toBe(3)
  })
})
```

### 24. **Тестирование производительности cursor**
```typescript
// ✅ ПРАВИЛЬНО: Тесты производительности
describe('Cursor Performance', () => {
  it('should iterate large dataset efficiently', () => {
    const tree = createLargeTree(10000)
    const startTime = performance.now()

    let count = 0
    for (const cursor of tree.each()) {
      count++
    }

    const endTime = performance.now()
    const duration = endTime - startTime

    expect(count).toBe(10000)
    expect(duration).toBeLessThan(100) // Менее 100ms для 10k элементов
  })

  it('should handle range queries efficiently', () => {
    const tree = createLargeTree(10000)
    const startTime = performance.now()

    const results = []
    for (const cursor of tree.range(1000, 2000)) {
      results.push(cursor.value)
    }

    const endTime = performance.now()
    const duration = endTime - startTime

    expect(results.length).toBe(1001) // 1000-2000 включительно
    expect(duration).toBeLessThan(50)  // Должно быть быстрее полной итерации
  })
})
```

---

## 🐛 Правила отладки

### 25. **Детальное логирование cursor**
```typescript
// ✅ ПРАВИЛЬНО: Подробное логирование для отладки
function debugCursor<T, K extends ValueType>(
  cursor: Cursor<T, K>,
  operation: string,
  tree?: BPlusTree<T, K>
): void {
  const state = getCursorState(cursor)

  console.log(`[CURSOR DEBUG] ${operation}:`, {
    state,
    node: cursor.node,
    pos: cursor.pos,
    key: cursor.key,
    value: cursor.value,
    done: cursor.done,
    treeSize: tree?.size,
    timestamp: new Date().toISOString()
  })

  if (tree && !cursor.done) {
    const node = tree.nodes.get(cursor.node!)
    console.log(`[NODE DEBUG] Node ${cursor.node}:`, {
      leaf: node?.leaf,
      keysCount: node?.keys.length,
      pointersCount: node?.pointers.length,
      keys: node?.keys,
      leftSibling: node?.left,
      rightSibling: node?.right
    })
  }
}
```

### 26. **Трассировка навигации cursor**
```typescript
// ✅ ПРАВИЛЬНО: Трассировка для сложных случаев
class CursorTracer<T, K extends ValueType> {
  private trace: Array<{
    operation: string
    cursor: Cursor<T, K>
    timestamp: number
  }> = []

  traceCursor(operation: string, cursor: Cursor<T, K>): void {
    this.trace.push({
      operation,
      cursor: { ...cursor }, // Копируем для сохранения состояния
      timestamp: performance.now()
    })
  }

  getTrace(): string {
    return this.trace
      .map((entry, index) =>
        `${index}: ${entry.operation} -> ` +
        `node:${entry.cursor.node}, pos:${entry.cursor.pos}, ` +
        `key:${entry.cursor.key}, done:${entry.cursor.done} ` +
        `(+${entry.timestamp.toFixed(2)}ms)`
      )
      .join('\n')
  }

  saveTraceToFile(filename: string): void {
    const trace = this.getTrace()
    // Сохраняем трассировку в файл для анализа
    console.log(`Trace saved to ${filename}:\n${trace}`)
  }
}
```

### 27. **Валидация структуры через cursor**
```typescript
// ✅ ПРАВИЛЬНО: Проверка целостности структуры через cursor
function validateTreeStructureViaCursor<T, K extends ValueType>(
  tree: BPlusTree<T, K>
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  let prevKey: K | undefined
  let count = 0

  try {
    for (const cursor of tree.each()) {
      count++

      // Проверяем порядок ключей
      if (prevKey !== undefined && tree.comparator(cursor.key!, prevKey) < 0) {
        errors.push(`Key order violation: ${cursor.key} < ${prevKey} at position ${count}`)
      }

      // Проверяем валидность cursor
      if (!validateCursor(cursor, tree)) {
        errors.push(`Invalid cursor at position ${count}: ${JSON.stringify(cursor)}`)
      }

      prevKey = cursor.key
    }

    // Проверяем соответствие размера
    if (count !== tree.size) {
      errors.push(`Size mismatch: cursor count ${count} != tree.size ${tree.size}`)
    }

  } catch (error) {
    errors.push(`Cursor iteration failed: ${error}`)
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
```

---

## 🔗 Правила интеграции

### 28. **Совместимость с внешними системами**
```typescript
// ✅ ПРАВИЛЬНО: Адаптеры для интеграции cursor
interface ExternalCursor<T> {
  current(): T | null
  next(): boolean
  hasNext(): boolean
  reset(): void
}

class CursorAdapter<T, K extends ValueType> implements ExternalCursor<T> {
  private currentCursor: Cursor<T, K>
  private generator: Generator<Cursor<T, K>>

  constructor(source: Generator<Cursor<T, K>>) {
    this.generator = source
    this.currentCursor = this.generator.next().value || EmptyCursor as Cursor<T, K>
  }

  current(): T | null {
    return this.currentCursor.done ? null : this.currentCursor.value!
  }

  next(): boolean {
    const result = this.generator.next()
    this.currentCursor = result.value || EmptyCursor as Cursor<T, K>
    return !result.done
  }

  hasNext(): boolean {
    return !this.currentCursor.done
  }

  reset(): void {
    throw new Error('Reset not supported for generator-based cursors')
  }
}
```

### 29. **Сериализация cursor состояния**
```typescript
// ✅ ПРАВИЛЬНО: Сериализация для персистентности
interface SerializableCursor<T, K extends ValueType> {
  node: number | undefined
  pos: number | undefined
  key: K | undefined
  done: boolean
  // value не сериализуем - восстанавливаем из структуры
}

function serializeCursor<T, K extends ValueType>(
  cursor: Cursor<T, K>
): SerializableCursor<T, K> {
  return {
    node: cursor.node,
    pos: cursor.pos,
    key: cursor.key,
    done: cursor.done
  }
}

function deserializeCursor<T, K extends ValueType>(
  serialized: SerializableCursor<T, K>,
  tree: BPlusTree<T, K>
): Cursor<T, K> {
  if (serialized.done || serialized.node === undefined || serialized.pos === undefined) {
    return EmptyCursor as Cursor<T, K>
  }

  // Восстанавливаем cursor из координат
  return evaluate(tree, serialized.node, serialized.pos)
}
```

### 30. **Метрики и мониторинг cursor**
```typescript
// ✅ ПРАВИЛЬНО: Сбор метрик для мониторинга
class CursorMetrics<T, K extends ValueType> {
  private stats = {
    cursorsCreated: 0,
    navigationsPerformed: 0,
    averageNavigationTime: 0,
    errorsEncountered: 0,
    cacheHits: 0,
    cacheMisses: 0
  }

  recordCursorCreation(): void {
    this.stats.cursorsCreated++
  }

  recordNavigation(duration: number): void {
    this.stats.navigationsPerformed++
    this.stats.averageNavigationTime =
      (this.stats.averageNavigationTime * (this.stats.navigationsPerformed - 1) + duration) /
      this.stats.navigationsPerformed
  }

  recordError(): void {
    this.stats.errorsEncountered++
  }

  recordCacheHit(): void {
    this.stats.cacheHits++
  }

  recordCacheMiss(): void {
    this.stats.cacheMisses++
  }

  getMetrics() {
    return {
      ...this.stats,
      cacheHitRate: this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses),
      errorRate: this.stats.errorsEncountered / this.stats.cursorsCreated
    }
  }
}
```

---

## 📋 Чек-лист применения правил

### При создании нового cursor:
- [ ] Определен полный тип `Cursor<T, K, R>`
- [ ] Реализована поддержка `EmptyCursor`
- [ ] Добавлены type guards для безопасности
- [ ] Написаны тесты для всех состояний

### При реализации навигации:
- [ ] Обработаны граничные случаи
- [ ] Поддерживается прямая и обратная навигация
- [ ] Реализована ленивая генерация
- [ ] Добавлено логирование для отладки

### При интеграции с транзакциями:
- [ ] Учтена изоляция транзакций
- [ ] Реализована поддержка CoW
- [ ] Добавлены тесты транзакционных сценариев
- [ ] Проверена корректность snapshot isolation

### При оптимизации производительности:
- [ ] Использованы генераторы вместо массивов
- [ ] Реализовано кэширование где возможно
- [ ] Добавлены batch операции для больших объемов
- [ ] Измерена производительность тестами

---

## 🎯 Заключение

Эти правила основаны на реальном опыте разработки B+ дерева с полной транзакционной поддержкой. Они помогают:

1. **Избежать типичных ошибок** при работе с cursor
2. **Обеспечить высокую производительность** и масштабируемость
3. **Поддерживать надежность** в сложных сценариях
4. **Упростить отладку** и тестирование
5. **Обеспечить совместимость** с различными системами

Следование этим правилам гарантирует создание robust и эффективных cursor-based систем.

---

*Правила обновлены на основе опыта разработки B+ Tree с транзакционной поддержкой*
*Версия: 1.0 | Дата: Декабрь 2024*