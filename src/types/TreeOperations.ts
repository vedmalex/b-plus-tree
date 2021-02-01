import { ValueType } from './ValueType'
import { Cursor } from './eval/Cursor'

// gt, lt, gte, lte, in, nin,
// update

export interface TreeOperations<T> extends Iterable<Cursor<T>> {
  forEach(action: (T) => void)
  filter(filter: (value: T) => boolean): Iterable<Cursor<T>>
  eq(key: ValueType): Iterable<Cursor<T>>
  lt(key: ValueType): Iterable<Cursor<T>>
  lte(key: ValueType): Iterable<Cursor<T>>
  gt(key: ValueType): Iterable<Cursor<T>>
  gte(key: ValueType): Iterable<Cursor<T>>
  in(keys: Array<ValueType>): Iterable<Cursor<T>>
  nin(keys: Array<ValueType>): Iterable<Cursor<T>>
  // update(action: (T) => T, filter: (value: T) => boolean): Iterable<Cursor<T>>
}
