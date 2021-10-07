import { Cursor } from '../eval/Cursor'
import { BPlusTree } from '../BPlusTree'
import { ValueType } from '../ValueType'
import { update_state } from '../Node/update_state'
import { replace_min } from '../Node/replace_min'
import { reflow } from '../../methods/reflow'
import { try_to_pull_up_tree } from '../../methods/try_to_pull_up_tree'
import { replace_max } from '../Node/replace_max'

export function remove<T, K extends ValueType>(tree: BPlusTree<T, K>) {
  return async function* (
    source: Generator<Cursor<T, K>> | AsyncGenerator<Cursor<T, K>>,
  ): AsyncGenerator<[K, T], void> {
    const result: Array<[K, T]> = []
    const touched_nodes = new Set<number>()
    // сначала удаляем все записи какие есть
    for await (const cursor of source) {
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
    for (const res of result) {
      yield res
    }
  }
}
