import { Node } from './Node'
import { ValueType } from '../btree'
import { findFirstPosToInsert } from '../methods/findPosInsert'

export function getItems(
  node: Node,
  key: ValueType = undefined,
): Array<[ValueType, any]> {
  const all = key === undefined
  let start = findFirstPosToInsert(node.keys, key)
  let i = start
  if (node.leaf) {
    if (all) {
      return node.keys.map((key, i) => [key, node.pointers[i]])
    } else {
      const lres = []
      while (node.keys[i] == key) {
        lres.push(i)
        i++
      }
      return lres.map((i) => [node.keys[i], node.pointers[i]])
    }
  } else throw new Error('can be uses on leaf nodes only')
}
