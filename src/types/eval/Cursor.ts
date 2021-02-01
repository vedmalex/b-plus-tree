import { ValueType } from '../ValueType'

export type Cursor<T> = {
  node: number
  pos: number
  key: ValueType
  value: T
}
