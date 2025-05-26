# Правила разработки на основе опыта B+ Tree проекта

## 📋 Оглавление

- [Правила планирования](#-правила-планирования)
- [Правила реализации](#-правила-реализации)
- [Правила тестирования](#-правила-тестирования)
- [Правила отладки](#-правила-отладки)
- [Правила документирования](#-правила-документирования)
- [Правила рефакторинга](#-правила-рефакторинга)

---

## 🎯 Правила планирования

### 1. **Фазовый подход к разработке**
```markdown
## Phase 1: Stabilize Core & Fix Bugs ✅
1. Fix critical memory/performance issues
2. Implement basic functionality with CoW
3. Fix parent-child relationship corruption
4. Implement commit() logic

## Phase 2: Complete Transaction Logic ✅
5. Implement transactional operations
6. Implement 2PC API
7. Add complex scenarios support

## Phase 3: Fix Advanced Operations ✅
8. Fix CoW Node Operations
9. Handle edge cases and boundary conditions
10. Implement conflict detection

## Phase 4: Refactor & Test ✅
11. Write comprehensive tests
12. Implement garbage collection
13. Performance optimization
```

### 2. **Документирование прогресса**
```markdown
# Rules для отслеживания прогресса

- Текущие размышления и идеи записывай в implementation файл
- Удачные идеи помечай ✅, неудачные идеи помечай ❌
- Идеи не удаляй, чтобы не возвращаться к ним в будущих сессиях
- После успешного этапа фиксируй изменения и переходи к следующему
```

### 3. **Приоритизация проблем**
```typescript
// ✅ ПРАВИЛЬНО: Решаем критические проблемы первыми
enum ProblemPriority {
  CRITICAL = 'critical',    // Блокирует основной функционал
  HIGH = 'high',           // Влияет на производительность
  MEDIUM = 'medium',       // Улучшения UX
  LOW = 'low'             // Nice to have
}

// Пример приоритизации из проекта:
// CRITICAL: RangeError: Out of memory в transactional remove
// HIGH: Parent-child relationship corruption в CoW
// MEDIUM: Улучшение производительности merge операций
// LOW: Дополнительные utility функции
```

---

## 🔧 Правила реализации

### 4. **Проверка зависимостей тестов**
```typescript
// ✅ ПРАВИЛЬНО: Проверяем что новые изменения не ломают другие тесты
function validateTestDependencies() {
  // При проверке тестов учитывай, что тесты могут быть зависимыми друг от друга
  // Чтобы не ломать один тест, не ломай другой
  // Строй карту зависимостей и последовательности выполнения тестов
}

// Пример из проекта:
// Исправление merge функций сломало тесты borrow операций
// Потребовалось координировать обновления separator keys
```

### 5. **Избегание заглушек в продакшене**
```typescript
// ❌ НЕПРАВИЛЬНО: Заглушки остаются в финальном коде
function merge_with_left_cow<T, K extends ValueType>(/* ... */) {
  // TODO: Implement real merge logic
  return originalNode // Заглушка
}

// ✅ ПРАВИЛЬНО: Полная реализация
function merge_with_left_cow<T, K extends ValueType>(/* ... */) {
  // Реальная логика merge с CoW
  const workingCopy = Node.forceCopy(originalNode, transactionContext)
  // ... полная реализация
  return workingCopy
}

// Правило: Проверяй что тесты обращаются к новым функциям,
// а не используют заглушки для прохождения
```

### 6. **Robust поиск и навигация**
```typescript
// ✅ ПРАВИЛЬНО: Robust поиск с fallback
function findChildIndex<T, K extends ValueType>(
  parent: Node<T, K>,
  childOriginalId: number,
  txCtx: TransactionContext<T, K>
): number {
  // Сначала ищем по working copy ID
  const workingChild = txCtx.workingNodes.get(childOriginalId)
  if (workingChild) {
    const workingIndex = parent.pointers.indexOf(workingChild.id)
    if (workingIndex !== -1) return workingIndex
  }

  // Fallback: ищем по original ID
  const originalIndex = parent.pointers.indexOf(childOriginalId)
  if (originalIndex !== -1) return originalIndex

  throw new Error(`Child ${childOriginalId} not found in parent ${parent.id}`)
}

// Урок из проекта: Простой поиск по ID часто не работает в CoW системах
```

### 7. **Координация между системами**
```typescript
// ✅ ПРАВИЛЬНО: Флаговая система для координации
function borrow_from_left_cow<T, K extends ValueType>(/* ... */) {
  // Устанавливаем флаг чтобы избежать двойного обновления
  (fNode as any)._skipParentSeparatorUpdate = true
  (fLeftSibling as any)._skipParentSeparatorUpdate = true

  // Выполняем операцию
  const result = performBorrow(/* ... */)

  // Ручное обновление separator keys
  updateParentSeparators(/* ... */)

  return result
}

// Урок: В сложных системах нужна координация между автоматическими и ручными операциями
```

---

## 🧪 Правила тестирования

### 8. **Высокогранулированные тесты**
```typescript
// ✅ ПРАВИЛЬНО: Создавай высокогранулированные тесты и объединяй их по функционалу
describe('Merge Operations', () => {
  describe('merge_with_left_cow', () => {
    it('should merge leaf nodes correctly', () => { /* ... */ })
    it('should update parent pointers', () => { /* ... */ })
    it('should handle separator keys', () => { /* ... */ })
    it('should work with working copies', () => { /* ... */ })
  })

  describe('merge_with_right_cow', () => {
    it('should merge internal nodes correctly', () => { /* ... */ })
    it('should preserve tree structure', () => { /* ... */ })
  })
})

// Группируй связанные тесты, но тестируй каждый аспект отдельно
```

### 9. **Тестирование edge cases**
```typescript
// ✅ ПРАВИЛЬНО: Покрывай все граничные случаи
describe('Edge Cases', () => {
  it('should handle empty nodes', () => {
    const emptyNode = Node.createLeaf(txCtx)
    expect(() => merge_with_left_cow(emptyNode, /* ... */)).not.toThrow()
  })

  it('should handle single element nodes', () => { /* ... */ })
  it('should handle maximum capacity nodes', () => { /* ... */ })
  it('should handle orphaned nodes', () => { /* ... */ })
  it('should handle duplicate keys', () => { /* ... */ })
})

// Урок из проекта: Edge cases часто выявляют фундаментальные проблемы
```

### 10. **Тестирование производительности**
```typescript
// ✅ ПРАВИЛЬНО: Включай тесты производительности
describe('Performance', () => {
  it('should handle large datasets efficiently', () => {
    const startTime = performance.now()

    // Выполняем операцию
    for (let i = 0; i < 10000; i++) {
      tree.insert_in_transaction(i, `value${i}`, txCtx)
    }

    const duration = performance.now() - startTime
    expect(duration).toBeLessThan(1000) // Менее 1 секунды для 10k операций
  })
})

// Урок: RangeError: Out of memory был обнаружен через тесты производительности
```

---

## 🐛 Правила отладки

### 11. **Трассировка перед исправлением**
```markdown
# Правило трассировки

Перед отладкой и исправлением сложных тестов:
1. Сначала выполни трассировку вручную с ожидаемыми результатами
2. Помечай шаг на котором возникает ошибка
3. Сохраняй этот лог в отдельный файл markdown
4. Только потом переходи к отладке и исправлению

Пример файлов трассировки из проекта:
- failed.2pc.isolation.md
- failed.duplicate.keys.md
- failed.transaction.abort.md
```

### 12. **Детальное логирование**
```typescript
// ✅ ПРАВИЛЬНО: Подробное логирование для сложных операций
function remove_in_transaction<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  key: K,
  txCtx: TransactionContext<T, K>
): boolean {
  console.log(`[REMOVE_TX] Starting removal of key ${key}`)

  const leaf = find_leaf_for_key_in_transaction(tree, key, txCtx)
  console.log(`[REMOVE_TX] Found leaf ${leaf.id} with ${leaf.keys.length} keys`)

  const keyIndex = find_first_key(leaf.keys, key, tree.comparator)
  console.log(`[REMOVE_TX] Key index: ${keyIndex}`)

  if (keyIndex === -1 || tree.comparator(leaf.keys[keyIndex], key) !== 0) {
    console.log(`[REMOVE_TX] Key ${key} not found`)
    return false
  }

  // ... остальная логика с логированием каждого шага
}
```

### 13. **Валидация инвариантов**
```typescript
// ✅ ПРАВИЛЬНО: Проверка инвариантов на каждом шаге
function validateTreeInvariants<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  operation: string
): void {
  console.log(`[VALIDATION] Checking invariants after ${operation}`)

  // Проверяем структуру дерева
  const structureValid = validateTreeStructure(tree)
  if (!structureValid) {
    throw new Error(`Tree structure invalid after ${operation}`)
  }

  // Проверяем parent-child связи
  const linksValid = validateParentChildLinks(tree)
  if (!linksValid) {
    throw new Error(`Parent-child links invalid after ${operation}`)
  }

  // Проверяем порядок ключей
  const orderValid = validateKeyOrder(tree)
  if (!orderValid) {
    throw new Error(`Key order invalid after ${operation}`)
  }

  console.log(`[VALIDATION] All invariants valid after ${operation}`)
}
```

---

## 📚 Правила документирования

### 14. **Документирование решений**
```markdown
# Правило документирования решений

Для каждой решенной проблемы документируй:

## ✅ ИСПРАВЛЕНИЕ #N: Название проблемы
- **Проблема:** Краткое описание
- **Решение:** Техническое решение
- **Техническое решение:** Код/алгоритм
- **Результат:** Что изменилось
- **Файлы:** Какие файлы затронуты

Пример из проекта:
## ✅ ИСПРАВЛЕНИЕ #1: 2PC Transaction Isolation
- **Проблема:** Нарушение snapshot isolation в prepare фазе
- **Решение:** Реализована система сохранения состояния узлов
- **Техническое решение:**
  ```typescript
  this._snapshotNodeStates = new Map();
  for (const [nodeId, node] of tree.nodes) {
    this._snapshotNodeStates.set(nodeId, { ... });
  }
  ```
- **Результат:** ✅ Тест проходит полностью
- **Файлы:** `src/TransactionContext.ts`, `src/BPlusTree.ts`
```

### 15. **Ведение статистики**
```markdown
# Правило ведения статистики

Отслеживай прогресс количественно:

**ИТОГОВАЯ СТАТИСТИКА УСПЕХА:**
- **✅ ВСЕ 340 ТЕСТОВ ПРОХОДЯТ** (100% success rate)
- **✅ insert_in_transaction:** Полностью реализован
- **✅ remove_in_transaction:** Полностью реализован
- **✅ 2PC API:** Полностью реализован
- **✅ Транзакционная изоляция:** Работает корректно
- **✅ Copy-on-Write:** Полностью функционирует

Это помогает видеть общую картину прогресса.
```

### 16. **Создание примеров использования**
```typescript
// ✅ ПРАВИЛЬНО: Создавай рабочие примеры для каждой функции
// examples/transaction-example.ts
async function transactionExample() {
  const tree = new BPlusTree<User, number>(3, false)
  const txCtx = new TransactionContext(tree)

  // Демонстрируем основные операции
  tree.insert_in_transaction(1, { name: 'Alice' }, txCtx)
  tree.insert_in_transaction(2, { name: 'Bob' }, txCtx)

  // Демонстрируем 2PC
  const canCommit = await txCtx.prepareCommit()
  if (canCommit) {
    await txCtx.finalizeCommit()
  }

  console.log('Transaction completed successfully')
}

// Примеры должны быть исполняемыми и демонстрировать реальные сценарии
```

---

## 🔄 Правила рефакторинга

### 17. **Постепенный рефакторинг**
```typescript
// ✅ ПРАВИЛЬНО: Рефакторинг по одной функции за раз
// Шаг 1: Создаем новую функцию с улучшенной логикой
function merge_with_left_cow_v2<T, K extends ValueType>(/* ... */) {
  // Улучшенная реализация
}

// Шаг 2: Тестируем новую функцию
describe('merge_with_left_cow_v2', () => {
  // Все тесты для новой версии
})

// Шаг 3: Заменяем старую функцию после успешных тестов
// Шаг 4: Удаляем старую функцию

// ❌ НЕПРАВИЛЬНО: Переписываем все сразу
```

### 18. **Сохранение обратной совместимости**
```typescript
// ✅ ПРАВИЛЬНО: Сохраняем старый API при рефакторинге
// Старый API (deprecated)
function insert(key: K, value: T): boolean {
  console.warn('insert() is deprecated, use insert_in_transaction()')
  const txCtx = new TransactionContext(this)
  const result = this.insert_in_transaction(key, value, txCtx)
  txCtx.commit()
  return result
}

// Новый API
function insert_in_transaction(key: K, value: T, txCtx: TransactionContext<T, K>): boolean {
  // Новая реализация
}
```

### 19. **Метрики качества кода**
```typescript
// ✅ ПРАВИЛЬНО: Отслеживай метрики качества
interface CodeQualityMetrics {
  testCoverage: number        // 100% для критических функций
  cyclomaticComplexity: number // < 10 для большинства функций
  linesOfCode: number         // Отслеживай рост
  technicalDebt: number       // Количество TODO/FIXME
  performanceRegression: boolean // Нет регрессий производительности
}

// Пример из проекта:
// Было: 13 провальных тестов, сложность > 15
// Стало: 0 провальных тестов, сложность < 8
```

---

## 📋 Чек-лист для каждого PR

### Перед коммитом:
- [ ] Все тесты проходят (включая существующие)
- [ ] Добавлены тесты для новой функциональности
- [ ] Обновлена документация
- [ ] Проверена производительность
- [ ] Нет memory leaks
- [ ] Код соответствует стилю проекта

### Перед релизом:
- [ ] Все фазы разработки завершены
- [ ] 100% тестовое покрытие критических функций
- [ ] Примеры использования работают
- [ ] Документация актуальна
- [ ] Производительность не хуже предыдущей версии
- [ ] Обратная совместимость сохранена

---

## 🎯 Ключевые уроки из проекта

### 1. **Сложность растет экспоненциально**
- Простые изменения могут сломать множество тестов
- Всегда проверяй влияние на существующий функционал
- Используй фазовый подход для управления сложностью

### 2. **Тестирование - это инвестиция**
- Высокогранулированные тесты помогают быстро находить проблемы
- Edge cases часто выявляют фундаментальные ошибки архитектуры
- Тесты производительности предотвращают критические проблемы

### 3. **Документирование экономит время**
- Подробные логи помогают в отладке
- Документирование решений предотвращает повторные ошибки
- Примеры использования выявляют проблемы UX

### 4. **Координация между системами критична**
- В сложных системах нужны механизмы координации
- Флаги, события, callbacks помогают избежать конфликтов
- Всегда думай о взаимодействии компонентов

### 5. **Производительность важна с самого начала**
- Memory leaks могут полностью заблокировать разработку
- Алгоритмическая сложность важнее микрооптимизаций
- Регулярно измеряй производительность

---

*Правила основаны на реальном опыте разработки B+ Tree с транзакционной поддержкой*
*Проект: 340 тестов, 100% success rate, полная транзакционная поддержка*
*Версия: 1.0 | Дата: Декабрь 2024*