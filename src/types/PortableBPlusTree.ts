import type { PortableNode } from './Node/PortableNode'
import type { ValueType } from './ValueType'

// можно использовать скип, относительное перемещение по страницам... зная их размер,можно просто пропускать сколько нужно
// можно в курсорах указывать: отсюда и 10 элементов
// перемещаться так же можно по ключу --- значению
/**
 * в дереве храняться значения ключевого поля и указатель на запись, по сути это будет id
 * но тут можно хранить и значения
 */

export type PortableBPlusTree<T, K extends ValueType> = {
  t: number
  next_node_id: number
  root: number
  unique: boolean
  nodes: Array<PortableNode<T, K>>
}
