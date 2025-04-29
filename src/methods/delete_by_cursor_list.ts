import type { BPlusTree } from '../types/BPlusTree'
import type { ValueType } from '../types/ValueType'
import { reflow } from './reflow'
import { try_to_pull_up_tree } from './try_to_pull_up_tree'
import type { Cursor } from '../types/eval/Cursor'
import { update_state } from '../types/Node/update_state'
import { replace_max } from '../types/Node/replace_max'
import { replace_min } from '../types/Node/replace_min'

export function delete_by_cursor_list<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  cursors: Array<Cursor<T, K>>,
): Array<[K, T]> {
  const result: Array<[K, T]> = []
  const touched_nodes = new Set<number>()
  // сначала удаляем все записи какие есть
  for (const cursor of cursors) {
    const node = tree.nodes.get(cursor.node)
    const { key, pos } = cursor
    result.push([key, node.pointers.splice(pos, 1, undefined)[0]])
    node.keys.splice(pos, 1, undefined)
    touched_nodes.add(cursor.node)
  }
  // обновляем все записи в дереве
  for (const node_id of touched_nodes) {
    const node = tree.nodes.get(node_id)
    const new_keys = []
    const new_pointers = []
    for (let i = 0; i < node.size; i++) {
      if (node.keys[i] !== undefined) {
        new_keys.push(node.keys[i])
        new_pointers.push(node.pointers[i])
      }
    }

    node.keys = new_keys
    node.pointers = new_pointers

    update_state(node)
    if (node.min != node.keys[0]) {
      replace_min(node, node.keys[0])
    }
    if (node.max != node.keys[node.keys.length - 1]) {
      replace_max(node, node.keys[node.keys.length - 1])
    }
  }
  // обновляем дерево
  for (const node_id of touched_nodes) {
    const node = tree.nodes.get(node_id)
    if (node) {
      reflow(tree, node)
      try_to_pull_up_tree(tree)
    }
  }
  return result
}
