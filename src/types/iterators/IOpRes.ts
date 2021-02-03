import { ValueType } from '../ValueType'
import { IOpTr } from './IOpTr'
import { Cursor } from '../eval/Cursor'

export interface IOpRes<T> {
  readonly iterator: Iterable<Cursor<T>>
  readonly asyncIterator: AsyncIterable<Cursor<T>>
  readonly result: IOpRes<T>
  readonly transform: IOpTr<T>
  distinct(): Set<T>
  every(condition: (value: [ValueType, T]) => boolean): boolean
  some(condition: (value: [ValueType, T]) => boolean): boolean
  forEach(
    action:
      | ((value: [ValueType, T]) => void)
      | ((value: [ValueType, T]) => Promise<void>),
  )
  reduce<E, D>(
    reducer: ((cur: T | E, res: D) => D) | ((cur: T | E, res: D) => Promise<D>),
    initial?: D,
  ): D | Promise<D>
}
