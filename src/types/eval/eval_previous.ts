import { evaluate } from './evaluate'
import { BPlusTree } from '../BPlusTree'

export function eval_previous<T>(tree: BPlusTree<T>, id: number, pos: number) {
  return evaluate<T>(tree, id, pos - 1)
}
