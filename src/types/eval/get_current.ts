import { Node } from '../Node'

export function get_current<T>(cur: Node<T>, pos: number) {
  return { node: cur.id, pos, key: cur.keys[pos], value: cur.pointers[pos] }
}
