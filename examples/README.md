# B+ Tree Examples

Эта папка содержит практические примеры использования B+ дерева с транзакционной поддержкой.

## 📁 Файлы

### `serialization-examples.ts`

Комплексные примеры сериализации и десериализации B+ деревьев для различных сценариев использования.

#### Включенные примеры:

1. **Базовая сериализация** - основные операции serialize/deserialize
2. **Файловая персистентность** - сохранение и загрузка из файлов
3. **Простой формат key-value** - работа с обычными объектами
4. **Интеграция с базой данных** - симуляция работы с БД
5. **Тестирование производительности** - бенчмарки для больших деревьев
6. **Обработка ошибок** - graceful handling некорректных данных

#### Запуск примеров:

```bash
# Запустить все примеры
bun run examples/serialization-examples.ts

# Или с Node.js
npx ts-node examples/serialization-examples.ts
```

#### Основные функции:

```typescript
import {
  basicSerializationExample,
  filePersistenceExample,
  simpleFormatExample,
  databaseIntegrationExample,
  performanceExample,
  errorHandlingExample,
  TreeRepository
} from './serialization-examples'

// Запуск отдельных примеров
basicSerializationExample()
await filePersistenceExample()
simpleFormatExample()
databaseIntegrationExample()
performanceExample()
errorHandlingExample()

// Использование TreeRepository
const repo = new TreeRepository()
await repo.saveTree('my-tree', tree)
const loadedTree = await repo.loadTree('my-tree')
```

## 🎯 Сценарии использования

### 1. Веб-приложения
- Кэширование индексов в localStorage/sessionStorage
- Сохранение состояния приложения
- Офлайн-режим с синхронизацией

### 2. Node.js серверы
- Персистентные индексы в файловой системе
- Backup и restore операции
- Миграция данных между версиями

### 3. Базы данных
- Сохранение B+ деревьев как BLOB/JSON
- Репликация индексов
- Снапшоты для восстановления

### 4. Микросервисы
- Передача индексов между сервисами
- Кэширование в Redis/Memcached
- Распределенные вычисления

## 📊 Производительность

Результаты тестирования (на примере 10,000 элементов):

- **Сериализация:** ~15ms (666,000 элементов/сек)
- **Десериализация:** ~9ms (1,111,000 элементов/сек)
- **Размер данных:** Сжатие ~2-3x по сравнению с in-memory
- **Целостность:** 100% сохранение данных

## 🔧 Типы данных

Примеры работают с различными типами данных:

```typescript
// Пользователи
interface User {
  id: number
  name: string
  email: string
  age: number
  department: string
}

// Продукты
interface Product {
  sku: string
  name: string
  price: number
  category: string
  inStock: boolean
}

// Простые конфигурации
type Config = Record<string, string>
```

## 🛡️ Обработка ошибок

Все примеры демонстрируют:

- ✅ Graceful handling некорректных данных
- ✅ Сохранение состояния при ошибках
- ✅ Валидация входных данных
- ✅ Логирование и отладка

## 📚 Дополнительные ресурсы

- [Основная документация](../README.md)
- [API Reference](../README.md#-api-reference)
- [Тесты](../src/test/BPlusTreeUtils.test.ts)
- [Исходный код](../src/BPlusTreeUtils.ts)

---

*Примеры регулярно обновляются и тестируются с каждым релизом*