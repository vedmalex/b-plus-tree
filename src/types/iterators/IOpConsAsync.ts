import { ValueType } from '../ValueType'
import { IOpRes } from './IOpRes'
import { IOpCons } from './IOpCons'

export interface IOpConsAsync<T> {
  forEach(action: (value: [ValueType, T]) => Promise<void>)
  filter(filter: (value: [ValueType, T]) => Promise<boolean>): IOpCons<T>
  reduce<E, D>(
    reducer: (cur: T | E, res: D) => Promise<D>,
    initial?: D,
  ): Promise<D>
  map<D>(func: (value: [ValueType, T]) => Promise<D>): IOpRes<D>
}
