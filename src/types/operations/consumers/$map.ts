import { ValueType } from '../../ValueType'
import { Cursor, EmptyCursor } from '../../eval/Cursor'

export function $map<T, D>(
  source: Iterable<Cursor<T>>,
  func: (value: [ValueType, T]) => D,
): Iterable<Cursor<D>> {
  return {
    [Symbol.iterator]() {
      const iterator = source[Symbol.iterator]() as Iterator<
        Cursor<T>,
        Cursor<T>
      >
      return {
        next() {
          let cursor
          const res = iterator.next()
          if (!res.done) {
            cursor = res.value
          } else {
            cursor = EmptyCursor
          }

          const result = cursor.done
            ? { value: undefined, done: true }
            : {
                value: { ...cursor, value: func([cursor.key, cursor.value]) },
                done: false,
              }
          return result
        },
      }
    },
  }
}
