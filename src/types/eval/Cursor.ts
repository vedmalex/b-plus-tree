import { ValueType } from '../ValueType'

export type Cursor<T, K extends ValueType> = {
  node: number
  pos: number
  key: K
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
