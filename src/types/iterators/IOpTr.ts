import { ValueType } from '../ValueType'
import { IOpRes } from './IOpRes'
import { Cursor } from '../eval/Cursor'

export interface IOpTr<T> {
  map<D>(func: (value: [ValueType, T]) => D): IOpRes<D>
  reduce<E, D>(reducer: (cur: T | E, res: D) => D, initial?: D): D
}
