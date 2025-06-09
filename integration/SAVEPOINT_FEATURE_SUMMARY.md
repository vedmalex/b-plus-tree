# 💾 Savepoint Feature Summary

## 🎉 Новый функционал: Savepoint Support

В B+ Tree библиотеку добавлена полная поддержка **Savepoint** - механизма создания именованных точек восстановления внутри транзакций.

### ✨ Основные возможности

- **🏷️ Именованные savepoints** - создание checkpoint'ов с описательными именами
- **🔄 Nested rollback** - поддержка вложенных savepoints с правильным порядком отката
- **🧠 Memory management** - автоматическая очистка при commit/abort/finalize
- **📊 Inspection API** - получение информации о savepoints и их состоянии
- **🛡️ Error recovery** - использование savepoints для восстановления после ошибок

### 🔧 API методы

```typescript
// Создание savepoint
const savepointId = await txCtx.createSavepoint(name: string): Promise<string>

// Откат к savepoint
await txCtx.rollbackToSavepoint(savepointId: string): Promise<void>

// Освобождение savepoint
await txCtx.releaseSavepoint(savepointId: string): Promise<void>

// Список savepoints
const savepoints = txCtx.listSavepoints(): string[]

// Информация о savepoint
const info = txCtx.getSavepointInfo(savepointId: string): SavepointInfo | undefined
```

### 📋 Новые интерфейсы

```typescript
interface SavepointInfo {
  savepointId: string      // Уникальный идентификатор
  name: string             // Пользовательское имя
  timestamp: number        // Время создания
  workingNodesCount: number // Количество измененных узлов
  deletedNodesCount: number // Количество удаленных узлов
}

interface SavepointSnapshot<T, K> {
  savepointId: string
  name: string
  timestamp: number
  workingRootId: number | undefined
  workingNodesSnapshot: Map<number, Node<T, K>>
  deletedNodesSnapshot: Set<number>
}
```

### 🧪 Тестирование

- **23 новых теста** для Savepoint функционала
- **373 теста всего** (все проходят успешно)
- **Полное покрытие** всех сценариев использования
- **Совместимость** с существующими тестами

### 📚 Примеры использования

#### Базовый пример
```typescript
const txCtx = new TransactionContext(tree)

// Создаем savepoint
const sp1 = await txCtx.createSavepoint('checkpoint-1')

// Делаем изменения
tree.insert_in_transaction(10, 'ten', txCtx)

// Откатываемся при необходимости
await txCtx.rollbackToSavepoint(sp1)

await txCtx.commit()
```

#### Error Recovery
```typescript
const safetyPoint = await txCtx.createSavepoint('safety-checkpoint')

try {
  // Рискованные операции
  performRiskyOperations(txCtx)
} catch (error) {
  // Откат к безопасной точке
  await txCtx.rollbackToSavepoint(safetyPoint)
}
```

#### Batch Processing
```typescript
for (let i = 0; i < items.length; i++) {
  if (i % 100 === 0) {
    // Checkpoint каждые 100 элементов
    await txCtx.createSavepoint(`checkpoint-${i}`)
  }
  processItem(items[i], txCtx)
}
```

### 🚀 Практические применения

1. **Batch Processing** - создание checkpoint'ов при обработке больших объемов данных
2. **Error Recovery** - восстановление после ошибок без потери всей работы
3. **Multi-stage Transactions** - разбиение сложных транзакций на этапы
4. **Validation Workflows** - откат при неудачной валидации
5. **A/B Testing** - тестирование разных подходов в рамках одной транзакции

### 📊 Производительность

- **O(n) создание savepoint** где n - количество working nodes
- **O(n) rollback** где n - количество nodes в snapshot
- **Минимальные накладные расходы** благодаря efficient deep copy
- **Memory efficient** - автоматическая очистка при завершении транзакции

### 🔗 Интеграция

Savepoint функционал полностью интегрирован с существующими возможностями:

- ✅ **Transactional Operations** - работает с insert/remove/find в транзакциях
- ✅ **Two-Phase Commit** - savepoints очищаются при 2PC finalize
- ✅ **Snapshot Isolation** - сохраняет изоляцию между транзакциями
- ✅ **Copy-on-Write** - использует CoW для efficient snapshots
- ✅ **Serialization** - совместимо с сериализацией деревьев

### 📖 Документация

- **Полная документация** в README.md
- **Практические примеры** в examples/savepoint-example.ts
- **API Reference** с детальным описанием методов
- **Best Practices** для эффективного использования

### 🎯 Готовность к использованию

Функционал Savepoint **готов к production использованию**:

- ✅ Все тесты проходят
- ✅ Обратная совместимость сохранена
- ✅ Документация обновлена
- ✅ Примеры созданы
- ✅ Memory management реализован
- ✅ Error handling добавлен

---

**🚀 Savepoint Support теперь доступен в B+ Tree библиотеке!**