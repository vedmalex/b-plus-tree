import { ValueType } from '../ValueType'

export type Cursor<T> = {
  node: number
  pos: number
  key: ValueType
  value: T
  done: boolean
}

export const EmptyCursor = {
  done: true,
  key: undefined,
  pos: undefined,
  node: undefined,
  value: undefined,
}
