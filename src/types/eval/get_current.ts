import { Node } from '../Node'

export function get_current(cur: Node, pos: number) {
  return { node: cur.id, pos, key: cur.keys[pos], value: cur.pointers[pos] }
}
