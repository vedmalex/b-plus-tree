import { evaluate } from './evaluate'
import { BPlusTree } from '../BPlusTree'

export function eval_current<T>(tree: BPlusTree<T>, id: number, pos: number) {
  return evaluate(tree, id, pos)
}
