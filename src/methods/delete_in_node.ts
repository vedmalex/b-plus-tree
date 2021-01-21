import { BPlusTree } from '../types/BPlusTree'
import { Node } from '../types/Node'
import { ValueType } from '../btree'
import { reflow } from './reflow'

export function delete_in_node(this: BPlusTree, node: Node, key: ValueType) {
  if (node.keys.indexOf(key) == -1) {
    return
  }

  node.remove(key)
  node.updateStatics()
  reflow.call(this, node)
  node.commit()
  if (this.root.size == 1 && !this.root.leaf) {
    this.root = this.root.children[0]
    this.root.parent = undefined
  }
}
