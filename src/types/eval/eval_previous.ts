import { evaluate } from './evaluate'
import { BPlusTree } from '../BPlusTree'

export function eval_previous(tree: BPlusTree, id: number, pos: number) {
  return evaluate(tree, id, pos - 1)
}
