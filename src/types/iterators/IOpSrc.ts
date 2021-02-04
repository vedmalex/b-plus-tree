import { ValueType } from '../ValueType'
import { IOpCons } from './IOpCons'

export interface IOpSrc<T> {
  eq(key: ValueType): IOpCons<T>
  gt(key: ValueType): IOpCons<T>
  gte(key: ValueType): IOpCons<T>
  lt(key: ValueType): IOpCons<T>
  lte(key: ValueType): IOpCons<T>
  in(keys: Array<ValueType>): IOpCons<T>
  nin(keys: Array<ValueType>): IOpCons<T>
  range(
    from: ValueType,
    to: ValueType,
    fromIncl: boolean,
    toIncl: boolean,
  ): IOpCons<T>
}
