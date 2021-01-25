import { Node } from '../types/Node'
import { ValueType } from '../btree'
import { findFirstPosToInsert } from './findFirstPosToInsert'

export function count(key: ValueType, node: Node) {
  let lres = 0
  let start = findFirstPosToInsert(node.keys, key)
  let i = start
  if (node.leaf) {
    while (node.keys[i] == key) {
      lres++
      i++
    }
  } else {
    const len = node.size
    while (i < len) {
      const res = count(key, node.children[i])
      lres += res
      i++
    }
  }
  return lres
}
