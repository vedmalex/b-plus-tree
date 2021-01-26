import { ValueType } from '../btree'

export type NodeStruct = {
  leaf: boolean
  keys: ValueType[]
  pointers: any[]
  children: NodeStruct[]
  min: ValueType
  max: ValueType
  size: number
}
