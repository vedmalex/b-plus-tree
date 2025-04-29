import type { ValueType } from '../ValueType'

export type Cursor<T, K extends ValueType, R = T> = {
  node: number
  pos: number
  key: K
  value: R
  done: boolean
}

export const EmptyCursor = {
  done: true,
  key: undefined,
  pos: undefined,
  node: undefined,
  value: undefined,
}
