import { BPlusTree } from '../types/BPlusTree'
import { Node } from '../types/Node'
import { ValueType } from '../types/ValueType'
import { reflow } from './reflow'
import { find_first_item } from './find_first_item'

export function delete_in_node(
  tree: BPlusTree,
  node: Node,
  key: ValueType,
  all: boolean = false,
) {
  const nodes = tree.nodes
  if (all) {
    while (find_first_item(node.keys, key) != -1) {
      // console.log(`remove node ${node.id} ${key}`)
      // node.tree.print()
      node.remove(key)
    }
  } else {
    node.remove(key)
  }
  reflow(tree, node)
  const root = nodes.get(tree.root)
  if (root.size == 1 && !root.leaf) {
    const node = nodes.get(tree.root)
    const new_root = nodes.get(root.children.pop())
    tree.root = new_root.id
    new_root.parent = undefined
    node.delete()
  }
}
