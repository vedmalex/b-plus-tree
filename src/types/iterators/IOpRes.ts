import { ValueType } from '../ValueType'

export interface IOpRes<T> {
  distinct(): Set<T>
  every(condition: (value: [ValueType, T]) => boolean): boolean
  some(condition: (value: [ValueType, T]) => boolean): boolean
  forEach(action: (value: [ValueType, T]) => void)
  reduce<D>(reducer: (cur: T, res: D) => D, initial?: D): D
}
