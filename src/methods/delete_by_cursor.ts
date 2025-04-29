import type { BPlusTree } from '../types/BPlusTree'
import type { ValueType } from '../types/ValueType'
import { reflow } from './reflow'
import { try_to_pull_up_tree } from './try_to_pull_up_tree'
import type { Cursor } from '../types/eval/Cursor'
import { update_state } from '../types/Node/update_state'
import { replace_max } from '../types/Node/replace_max'
import { replace_min } from '../types/Node/replace_min'

export function delete_by_cursor<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  cursor: Cursor<T, K>,
): Array<[K, T]> {
  const node = tree.nodes.get(cursor.node)
  const { key, pos } = cursor
  const res: [K, T] = [key, node.pointers.splice(pos, 1)[0]]
  node.keys.splice(pos, 1)
  update_state(node)

  if (pos == 0) {
    replace_min(node, node.keys[0])
  }
  // as far as we splice last item from node it is now at length position
  if (pos == node.keys.length) {
    replace_max(node, node.keys[pos - 1])
  }

  reflow(tree, node)

  try_to_pull_up_tree(tree)
  return [res]
}
