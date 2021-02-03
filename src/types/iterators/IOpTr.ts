import { ValueType } from '../ValueType'
import { IOpRes } from './IOpRes'
import { Cursor } from '../eval/Cursor'

export interface IOpTr<T> {
  readonly iterator: Iterable<Cursor<T>>
  readonly asyncIterator: AsyncIterable<Cursor<T>>
  map<D>(
    func:
      | ((value: [ValueType, T]) => D)
      | ((value: [ValueType, T]) => Promise<D>),
  ): IOpRes<D>
  reduce<E, D>(
    reducer: ((cur: T | E, res: D) => D) | ((cur: T | E, res: D) => Promise<D>),
    initial?: D,
  ): D | Promise<D>
}
