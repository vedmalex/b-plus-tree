import { BPlusTree } from '../types/BPlusTree'
import { ValueType } from '../btree'
import { delete_in_node } from './delete_in_node'

export function remove(this: BPlusTree, key: ValueType): boolean {
  let leaf = this.find(key)
  if (leaf.keys.indexOf(key) == -1) {
    return false
  } else {
    delete_in_node.call(leaf, key) // Удалить ключ из вершины
    if (this.root.key_num == 1) {
      this.root = this.root.children[0]
    }
    return true
  }
}
