import { ValueType } from '../ValueType'

export type PortableNode<T> = {
  id: number
  t: number
  _parent: number
  _left: number
  _right: number
  isEmpty: boolean
  isFull: boolean
  leaf: boolean
  max: ValueType
  min: ValueType
  size: number
  keys: ValueType[]
  key_num: number
  pointers: T[]
  children: number[]
  errors?: Array<string>
}
