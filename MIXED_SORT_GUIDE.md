# 🔀 Руководство по смешанной сортировке в B+ Tree

## Введение

Смешанная сортировка позволяет создавать составные ключи, где разные поля сортируются в разных направлениях (по возрастанию или убыванию). Это критически важно для реальных приложений, где требуется сложная логика упорядочивания данных.

## Основные принципы

### 1. Порядок сортировки полей

```typescript
interface CompositeKey {
  field1: string  // ASC - по возрастанию (A → Z)
  field2: number  // DESC - по убыванию (100 → 1)
  field3: Date    // ASC - по возрастанию (старые → новые)
}
```

### 2. Реализация компаратора

```typescript
const mixedComparator = (a: CompositeKey, b: CompositeKey): number => {
  // Поле 1: ASC (возрастание)
  if (a.field1 !== b.field1) {
    return a.field1.localeCompare(b.field1) // Положительный результат для ASC
  }

  // Поле 2: DESC (убывание)
  if (a.field2 !== b.field2) {
    return b.field2 - a.field2 // Обратный порядок для DESC
  }

  // Поле 3: ASC (возрастание)
  return a.field3.getTime() - b.field3.getTime()
}
```

## Практические примеры

### 1. Рейтинг сотрудников

**Требования**: Сортировка по отделу (A-Z), затем по зарплате (высокая → низкая), затем по стажу (старые → новые)

```typescript
interface EmployeeKey {
  department: string  // ASC
  salary: number      // DESC
  joinDate: Date      // ASC
}

const employeeComparator = (a: EmployeeKey, b: EmployeeKey): number => {
  // 1. Отдел: Engineering < Marketing < Sales
  if (a.department !== b.department) {
    return a.department.localeCompare(b.department)
  }

  // 2. Зарплата: 120000 > 110000 > 95000
  if (a.salary !== b.salary) {
    return b.salary - a.salary // DESC
  }

  // 3. Дата приема: 2019 < 2020 < 2021
  return a.joinDate.getTime() - b.joinDate.getTime() // ASC
}
```

**Результат сортировки**:
```
1. Engineering - Alice ($120,000) - 2020
2. Engineering - Charlie ($120,000) - 2021
3. Engineering - Bob ($110,000) - 2019
4. Marketing - Diana ($95,000) - 2020
5. Marketing - Eve ($85,000) - 2018
```

### 2. Каталог товаров

**Требования**: Категория (A-Z), в наличии (да → нет), рейтинг (5★ → 1★), цена (дешевые → дорогие)

```typescript
interface ProductKey {
  category: string    // ASC
  inStock: boolean    // DESC (true > false)
  rating: number      // DESC
  price: number       // ASC
}

const productComparator = (a: ProductKey, b: ProductKey): number => {
  // 1. Категория: Apparel < Electronics
  if (a.category !== b.category) {
    return a.category.localeCompare(b.category)
  }

  // 2. В наличии: true > false
  if (a.inStock !== b.inStock) {
    return b.inStock ? 1 : -1 // DESC для boolean
  }

  // 3. Рейтинг: 4.8 > 4.6 > 4.5
  if (a.rating !== b.rating) {
    return b.rating - a.rating // DESC
  }

  // 4. Цена: $129 < $199 < $899
  return a.price - b.price // ASC
}
```

### 3. Планирование событий

**Требования**: Приоритет (high → medium → low), срочность (да → нет), время (раннее → позднее)

```typescript
interface EventKey {
  priority: 'high' | 'medium' | 'low'  // Custom order
  isUrgent: boolean                    // DESC
  startTime: Date                      // ASC
  duration: number                     // ASC
}

const eventComparator = (a: EventKey, b: EventKey): number => {
  // 1. Приоритет: пользовательский порядок
  const priorityOrder = { 'high': 1, 'medium': 2, 'low': 3 }
  const aPriority = priorityOrder[a.priority]
  const bPriority = priorityOrder[b.priority]

  if (aPriority !== bPriority) {
    return aPriority - bPriority
  }

  // 2. Срочность: urgent > not urgent
  if (a.isUrgent !== b.isUrgent) {
    return b.isUrgent ? 1 : -1
  }

  // 3. Время начала: 09:00 < 10:00 < 14:00
  if (a.startTime.getTime() !== b.startTime.getTime()) {
    return a.startTime.getTime() - b.startTime.getTime()
  }

  // 4. Продолжительность: 30min < 45min < 60min
  return a.duration - b.duration
}
```

### 4. Управление версиями

**Требования**: Стабильность (stable → beta), major (новые → старые), minor (новые → старые), patch (новые → старые)

```typescript
interface VersionKey {
  isStable: boolean   // DESC (stable first)
  major: number       // DESC (latest first)
  minor: number       // DESC (latest first)
  patch: number       // DESC (latest first)
}

const versionComparator = (a: VersionKey, b: VersionKey): number => {
  // 1. Стабильность: stable > beta
  if (a.isStable !== b.isStable) {
    return b.isStable ? 1 : -1
  }

  // 2. Major версия: 2.x.x > 1.x.x
  if (a.major !== b.major) {
    return b.major - a.major
  }

  // 3. Minor версия: x.2.x > x.1.x
  if (a.minor !== b.minor) {
    return b.minor - a.minor
  }

  // 4. Patch версия: x.x.5 > x.x.0
  return b.patch - a.patch
}
```

## Типы данных и сортировка

### Строки (String)

```typescript
// ASC: "apple" < "banana" < "cherry"
if (a.stringField !== b.stringField) {
  return a.stringField.localeCompare(b.stringField) // ASC
}

// DESC: "cherry" > "banana" > "apple"
if (a.stringField !== b.stringField) {
  return b.stringField.localeCompare(a.stringField) // DESC
}
```

### Числа (Number)

```typescript
// ASC: 1 < 5 < 10
if (a.numberField !== b.numberField) {
  return a.numberField - b.numberField // ASC
}

// DESC: 10 > 5 > 1
if (a.numberField !== b.numberField) {
  return b.numberField - a.numberField // DESC
}
```

### Даты (Date)

```typescript
// ASC: 2020 < 2021 < 2024
if (a.dateField.getTime() !== b.dateField.getTime()) {
  return a.dateField.getTime() - b.dateField.getTime() // ASC
}

// DESC: 2024 > 2021 > 2020
if (a.dateField.getTime() !== b.dateField.getTime()) {
  return b.dateField.getTime() - a.dateField.getTime() // DESC
}
```

### Булевы значения (Boolean)

```typescript
// DESC: true > false
if (a.boolField !== b.boolField) {
  return b.boolField ? 1 : -1 // DESC
}

// ASC: false < true
if (a.boolField !== b.boolField) {
  return a.boolField ? 1 : -1 // ASC
}
```

### Пользовательские типы (Enum/Union)

```typescript
type Priority = 'high' | 'medium' | 'low'

const priorityOrder = { 'high': 1, 'medium': 2, 'low': 3 }

// Custom order: high < medium < low
if (a.priority !== b.priority) {
  const aPriority = priorityOrder[a.priority]
  const bPriority = priorityOrder[b.priority]
  return aPriority - bPriority
}
```

## Лучшие практики

### 1. Порядок полей в компараторе

Располагайте поля по важности:
```typescript
// ✅ Правильно: от самого важного к менее важному
const comparator = (a: Key, b: Key): number => {
  // 1. Самое важное поле (основная группировка)
  if (a.category !== b.category) return a.category.localeCompare(b.category)

  // 2. Вторичная сортировка
  if (a.priority !== b.priority) return b.priority - a.priority

  // 3. Третичная сортировка (детализация)
  return a.timestamp.getTime() - b.timestamp.getTime()
}
```

### 2. Обработка null/undefined

```typescript
const safeComparator = (a: Key, b: Key): number => {
  // Обработка null/undefined значений
  if (a.field == null && b.field == null) return 0
  if (a.field == null) return -1 // null в начале
  if (b.field == null) return 1

  // Обычное сравнение
  return a.field.localeCompare(b.field)
}
```

### 3. Производительность

```typescript
// ✅ Оптимизированный компаратор
const optimizedComparator = (a: Key, b: Key): number => {
  // Быстрые сравнения сначала (числа, boolean)
  if (a.numericField !== b.numericField) {
    return b.numericField - a.numericField
  }

  // Медленные сравнения в конце (строки, даты)
  if (a.stringField !== b.stringField) {
    return a.stringField.localeCompare(b.stringField)
  }

  return a.dateField.getTime() - b.dateField.getTime()
}
```

### 4. Тестирование

```typescript
// Тестирование всех сценариев сортировки
describe('Mixed Sort Comparator', () => {
  it('should sort by first field ASC', () => {
    const result = [
      { dept: 'B', salary: 100 },
      { dept: 'A', salary: 200 }
    ].sort(comparator)

    expect(result[0].dept).toBe('A')
  })

  it('should sort by second field DESC when first is equal', () => {
    const result = [
      { dept: 'A', salary: 100 },
      { dept: 'A', salary: 200 }
    ].sort(comparator)

    expect(result[0].salary).toBe(200)
  })
})
```

## Примеры использования

### Запуск примеров

```bash
# Основной пример смешанной сортировки
bun run examples/mixed-sort-example.ts

# Тесты смешанной сортировки
bun test src/test/mixed-sort.test.ts
```

### Интеграция в приложение

```typescript
import { BPlusTree } from 'b-plus-tree'

// Создание индекса с смешанной сортировкой
const employeeIndex = new BPlusTree<Employee, EmployeeKey>(
  3,           // degree
  false,       // allowDuplicates
  employeeComparator  // custom comparator
)

// Добавление данных
employees.forEach(emp => {
  employeeIndex.insert({
    department: emp.department,
    salary: emp.salary,
    joinDate: emp.joinDate
  }, emp)
})

// Получение отсортированных данных
const sortedEmployees = employeeIndex.list()
```

## Заключение

Смешанная сортировка в B+ Tree обеспечивает:

- **Гибкость**: Любые комбинации ASC/DESC для разных полей
- **Производительность**: O(log n) для поиска и вставки
- **Масштабируемость**: Эффективная работа с большими объемами данных
- **Типобезопасность**: Полная поддержка TypeScript

Используйте эти паттерны для создания эффективных индексов в ваших приложениях!