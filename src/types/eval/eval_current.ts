import { evaluate } from './evaluate'
import { BPlusTree } from '../BPlusTree'

export function eval_current(tree: BPlusTree, id: number, pos: number) {
  return evaluate(tree, id, pos)
}