import { ValueType } from '../ValueType'
import { IOpTr } from './IOpTr'
import { Cursor } from '../eval/Cursor'

export interface IOpRes<T> {
  readonly result: IOpRes<T>
  readonly transform: IOpTr<T>
  distinct(): Set<T>
  every(condition: (value: [ValueType, T]) => boolean): boolean
  some(condition: (value: [ValueType, T]) => boolean): boolean
  forEach(action: (value: [ValueType, T]) => void)
  reduce<E, D>(reducer: (cur: T | E, res: D) => D, initial?: D): D
}
