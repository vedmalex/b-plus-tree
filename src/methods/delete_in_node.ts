import { BPlusTree } from '../types/BPlusTree'
import { Node } from '../types/Node'
import { ValueType } from '../btree'
import { reflow } from './reflow'

export function delete_in_node(tree: BPlusTree, node: Node, key: ValueType) {
  if (node.keys.indexOf(key) == -1) {
    return
  }

  node.remove(key)
  node.updateStatics()
  reflow(tree, node)
  node.commit()
  if (tree.root.size == 1 && !tree.root.leaf) {
    tree.root = tree.root.children[0]
    tree.root.parent = undefined
  }
}
