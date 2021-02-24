import { ValueType } from '../ValueType'

export type PortableNode<T, K extends ValueType> = {
  id: number
  t: number
  _parent: number
  _left: number
  _right: number
  isEmpty: boolean
  isFull: boolean
  leaf: boolean
  max: K
  min: K
  size: number
  keys: Array<K>
  key_num: number
  pointers: Array<T>
  children: Array<number>
  errors?: Array<string>
}
