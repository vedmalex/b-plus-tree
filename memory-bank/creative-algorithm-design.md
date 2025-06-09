# Creative Phase: Algorithm Design - Range Queries

## Problem Definition
Необходимо реализовать эффективные Range-запросы для B+ Tree, поддерживающие операторы `<`, `>`, `<=`, `>=` с оптимальной производительностью O(log n + k), где k - количество результатов.

## Current State Analysis
- B+ Tree имеет упорядоченную структуру листовых узлов
- Листовые узлы связаны указателями для последовательного обхода
- Существующий код имеет базовую структуру для навигации по дереву
- Отсутствует метод `range()` или он не функционирует

## Options Analysis

### Option 1: Simple Linear Scan
**Approach**: Обход всех элементов и фильтрация по условию
- **Pros**: Простота реализации
- **Cons**: O(n) сложность, неэффективно для больших деревьев
- **Verdict**: ❌ Неприемлемо для production

### Option 2: Binary Search + Sequential Scan
**Approach**: Найти начальную позицию через binary search, затем последовательный обход
- **Pros**: O(log n + k) сложность, использует структуру B+ Tree
- **Cons**: Требует корректной реализации поиска начальной позиции
- **Verdict**: ✅ Оптимальный подход

### Option 3: Iterator-based Approach
**Approach**: Создать итератор для обхода диапазона
- **Pros**: Ленивое вычисление, memory-efficient
- **Cons**: Более сложная реализация, дополнительная абстракция
- **Verdict**: 🤔 Возможно для будущих версий

## Selected Approach: Binary Search + Sequential Scan

### Algorithm Design

#### 1. Find Start Position
```typescript
function findStartPosition(key: K, inclusive: boolean): Node<T, K> | null {
  // Используем существующую логику поиска в B+ Tree
  // Находим листовой узел, содержащий ключ >= key (для >) или > key (для >=)
  // Возвращаем позицию в листовом узле
}
```

#### 2. Sequential Scan
```typescript
function scanRange(startNode: Node<T, K>, startIndex: number, endKey: K, endInclusive: boolean): T[] {
  // Обходим листовые узлы последовательно
  // Собираем значения до достижения endKey
  // Используем связи между листовыми узлами
}
```

#### 3. Range Method Implementation
```typescript
range(fromKey: K, toKey: K, fromInclusive = true, toInclusive = true): T[] {
  // 1. Валидация параметров
  // 2. Поиск начальной позиции
  // 3. Последовательный сбор результатов
  // 4. Возврат отфильтрованного массива
}
```

### Implementation Strategy

#### Phase 1: Core Range Logic
1. Реализовать `findStartPosition` в Node.ts
2. Реализовать `scanRange` для обхода листовых узлов
3. Добавить связи между листовыми узлами (если отсутствуют)

#### Phase 2: Range Method
1. Добавить метод `range()` в BPlusTree.ts
2. Поддержать все варианты операторов (<, >, <=, >=)
3. Обработка граничных случаев (пустой диапазон, несуществующие ключи)

#### Phase 3: Integration
1. Интеграция с Query System (source.ts)
2. Добавление `sourceRange` функции
3. Тестирование производительности

### Performance Considerations

#### Time Complexity
- **Search**: O(log n) для поиска начальной позиции
- **Scan**: O(k) для сбора k результатов
- **Total**: O(log n + k) - оптимально для B+ Tree

#### Space Complexity
- **Memory**: O(k) для хранения результатов
- **Additional**: O(1) для навигации

#### Optimization Opportunities
1. **Early Termination**: Остановка при достижении endKey
2. **Batch Processing**: Обработка узлов целиком когда возможно
3. **Memory Pooling**: Переиспользование массивов результатов

### Edge Cases Handling

#### 1. Empty Range
```typescript
if (fromKey > toKey) return []
```

#### 2. Non-existent Keys
```typescript
// Поиск ближайшего существующего ключа
// Корректная обработка границ
```

#### 3. Single Key Range
```typescript
if (fromKey === toKey && fromInclusive && toInclusive) {
  return this.find(fromKey) || []
}
```

### Testing Strategy

#### Unit Tests
- Тесты для каждого оператора (<, >, <=, >=)
- Граничные случаи (пустой диапазон, несуществующие ключи)
- Производительность на больших наборах данных

#### Integration Tests
- Совместимость с существующими методами
- Интеграция с Query System
- Транзакционная совместимость

## Decision Summary

**Selected Algorithm**: Binary Search + Sequential Scan
**Rationale**:
- Оптимальная сложность O(log n + k)
- Использует существующую структуру B+ Tree
- Относительно простая реализация
- Хорошая производительность для всех размеров данных

**Implementation Priority**: High
**Estimated Effort**: 2-3 дня
**Risk Level**: Medium (требует понимания внутренней структуры B+ Tree)

## Next Steps
1. Изучить существующую структуру листовых узлов
2. Реализовать базовый алгоритм поиска
3. Добавить последовательный обход
4. Интегрировать с основным API
5. Создать comprehensive тесты