import { BPlusTree } from '../types/BPlusTree'
import { ValueType } from '../btree'

export function find_key(this: BPlusTree, key: ValueType) {
  let cur = this.root
  while (cur.leaf != true) {
    for (let i = 0; i <= cur.key_num; i++) {
      if (i == cur.key_num || key < cur.keys[i]) {
        cur = cur.children[i]
        break
      }
    }
  }
  return cur
}
