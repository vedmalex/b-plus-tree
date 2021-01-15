import { Node } from '../Node'

export function nodeComparator(a: Node, b: Node) {
  return a.min > b.min ? 1 : a.min == b.min ? 0 : -1
}
