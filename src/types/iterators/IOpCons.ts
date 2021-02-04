import { ValueType } from '../ValueType'
import { IOpRes } from './IOpRes'
import { IOpTr } from './IOpTr'
import { Cursor } from '../eval/Cursor'

export interface IOpCons<T> {
  eq(key: ValueType): IOpRes<T>
  ne(key: ValueType): IOpRes<T>
  gt(key: ValueType): IOpCons<T> | IOpRes<T> | IOpTr<T>
  gte(key: ValueType): IOpCons<T> | IOpRes<T> | IOpTr<T>
  lt(key: ValueType): IOpCons<T> | IOpRes<T> | IOpTr<T>
  lte(key: ValueType): IOpCons<T> | IOpRes<T> | IOpTr<T>
  in(keys: Array<ValueType>): IOpCons<T> | IOpRes<T> | IOpTr<T>
  nin(keys: Array<ValueType>): IOpCons<T> | IOpRes<T> | IOpTr<T>
  range(
    from: ValueType,
    to: ValueType,
    fromIncl: boolean,
    toIncl: boolean,
  ): IOpCons<T>
  filter(filter: (value: [ValueType, T]) => boolean): IOpCons<T>

  distinct(): Set<T>
  every(condition: (value: [ValueType, T]) => boolean): boolean
  some(condition: (value: [ValueType, T]) => boolean): boolean
  forEach(action: (value: [ValueType, T]) => void)
}
