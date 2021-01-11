import { Node } from '../types/Node'
import { ValueType } from '../btree'

export function min(this: Node): ValueType {
  return this.keys.reduce((res, cur) => {
    if (res == null) {
      return cur
    } else if (res > cur) {
      return cur
    } else if (res < cur) {
      return res
    } else return res
  })
}
