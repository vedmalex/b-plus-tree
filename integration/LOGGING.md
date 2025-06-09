# 📝 Система логирования B+ Tree

## 🎯 Проблема

После успешной реализации транзакционной поддержки в B+ дереве, мы закомментировали множество `console.log` вызовов, что привело к ошибкам парсера из-за неиспользуемых переменных. Логирование важно для отладки, но не должно влиять на производительность в продакшене.

## 🚀 Решения

Мы реализовали **две системы логирования** с разными подходами:

### 1. 🔄 Runtime Logger (`src/logger.ts`)
**Подход:** Проверка переменных окружения во время выполнения

```typescript
import { debug, warn, error, transaction } from './logger';

// Debug логи выводятся только в development или с DEBUG_BTREE=true
debug('Debug message');

// Предупреждения и ошибки выводятся ВСЕГДА
warn('Warning message');
error('Error message');

// Transaction логи выводятся только в development или с DEBUG_BTREE=true
transaction('Transaction started');
```

**Особенности:**
- ✅ Простота использования
- ✅ Гибкая настройка через переменные окружения
- ✅ Предупреждения и ошибки всегда выводятся
- ❌ Небольшой overhead в продакшене (проверка условий для debug/verbose)
- ❌ Код логирования остается в бандле

### 2. ⚡ Build-time Debug (`src/debug.ts`)
**Подход:** Полное удаление кода логирования при сборке

```typescript
import { log, ifDev, trace, debugAssert } from './debug';

// Полностью удаляется из продакшн-бандла
log('Debug message');
ifDev(() => {
  // Весь этот блок удаляется в продакшене
  const expensiveData = generateDebugInfo();
  log('Expensive debug:', expensiveData);
});
```

**Особенности:**
- ✅ Нулевой overhead в продакшене
- ✅ Меньший размер бандла
- ✅ Полное удаление дорогих операций отладки
- ❌ Требует правильной настройки сборки

## 📋 Переменные окружения

```bash
# Включить debug логи
DEBUG_BTREE=true

# Включить verbose логи
VERBOSE_BTREE=true

# Продакшн режим (отключает все логи)
NODE_ENV=production
```

## 🛠 Команды для тестирования

```bash
# Обычные тесты
npm run test

# С debug логами
npm run test:debug

# С verbose логами
npm run test:verbose

# Без логов (продакшн режим)
npm run test:silent
```

## 🎨 Примеры использования

### Runtime Logger
```typescript
import { debug, warn, error, transaction, ifDebug } from './logger';

function processTransaction(txId: string) {
  transaction(`Starting transaction ${txId}`); // Только в debug режиме

  // Условное выполнение дорогих операций
  ifDebug(() => {
    const memUsage = process.memoryUsage();
    debug(`Memory usage: ${JSON.stringify(memUsage)}`);
  });

  try {
    // ... логика транзакции
    debug('Transaction completed successfully'); // Только в debug режиме
  } catch (err) {
    error('Transaction failed:', err); // ВСЕГДА выводится
    warn('Check transaction parameters'); // ВСЕГДА выводится
    throw err;
  }
}
```

### Build-time Debug
```typescript
import { log, ifDev, trace, debugAssert, dumpTree } from './debug';

function complexOperation(data: any[]) {
  // Assertion удаляется в продакшене
  debugAssert(data.length > 0, 'Data array should not be empty');

  // Трассировка производительности (удаляется в продакшене)
  return trace('complex-operation', () => {
    // Дорогая операция отладки (полностью удаляется)
    ifDev(() => {
      dumpTree(someTree, 'Before complex operation');
      log('Processing', data.length, 'items');
    });

    const result = processData(data);

    ifDev(() => {
      dumpTree(someTree, 'After complex operation');
      log('Result:', result);
    });

    return result;
  });
}
```

## 🔧 Настройка сборки

В `build.ts` уже настроена правильная конфигурация:

```typescript
define: {
  PRODUCTION: JSON.stringify(process.env.NODE_ENV === 'production'),
}
```

Это позволяет системе `debug.ts` полностью удалять код в продакшене.

## 📊 Сравнение подходов

| Критерий                            | Runtime Logger     | Build-time Debug                        |
|-------------------------------------|--------------------|-----------------------------------------|
| **Производительность в продакшене** | Небольшой overhead | Нулевой overhead                        |
| **Размер бандла**                   | Больше             | Меньше                                  |
| **Простота использования**          | Очень простая      | Простая                                 |
| **Гибкость настройки**              | Высокая            | Средняя                                 |
| **Безопасность**                    | Высокая            | Очень высокая                           |
| **Предупреждения/ошибки**           | Всегда выводятся   | Ошибки всегда, предупреждения удаляются |

## 🎯 Рекомендации

### Используйте Runtime Logger для:
- Обычных debug сообщений
- Логирования состояния транзакций
- Предупреждений и ошибок
- Случаев, когда нужна гибкая настройка

### Используйте Build-time Debug для:
- Дорогих операций отладки
- Дампа структур данных
- Assertions и проверок
- Трассировки производительности
- Критически важных для производительности участков

## 🚀 Миграция существующего кода

1. **Замените закомментированные логи:**
```typescript
// Было:
// console.log(`[transaction] Starting ${txId}`);

// Стало:
transaction(`Starting ${txId}`);
```

2. **Оберните дорогие операции:**
```typescript
// Было:
// const debugInfo = generateExpensiveDebugInfo();
// console.log('Debug info:', debugInfo);

// Стало:
ifDev(() => {
  const debugInfo = generateExpensiveDebugInfo();
  log('Debug info:', debugInfo);
});
```

3. **Добавьте assertions:**
```typescript
// Было:
// if (!node) throw new Error('Node not found');

// Стало:
debugAssert(node !== undefined, 'Node not found');
if (!node) throw new Error('Node not found');
```

## ✅ Результат

- ✅ **Нет ошибок парсера** - все переменные используются
- ✅ **Гибкое логирование** - можно включать/выключать по необходимости
- ✅ **Нулевой overhead в продакшене** - для критических участков
- ✅ **Лучшая отладка** - структурированные логи с категориями
- ✅ **Меньший размер бандла** - удаление debug кода в продакшене

Эта система решает проблему неиспользуемых переменных и обеспечивает эффективное логирование без влияния на производительность!