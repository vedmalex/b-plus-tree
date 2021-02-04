import { ValueType } from '../ValueType'
import { IOpRes } from './IOpRes'
import { Cursor } from '../eval/Cursor'

export interface IOpTr<T> {
  map<D>(func: (value: [ValueType, T]) => D): IOpRes<D>
  reduce<D>(reducer: (cur: T, res: D) => D, initial?: D): D
}
