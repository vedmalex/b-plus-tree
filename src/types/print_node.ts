import { BPlusTree } from './BPlusTree'
import { printTree } from '../utils/print-tree'
import { PortableNode } from './Node/PortableNode'
import { Node } from './Node'

export function print_node(tree: BPlusTree, node?: Node) {
  if (!node) {
    node = tree.node(tree.root)
  }
  const nodes = tree.nodes
  return printTree(
    node?.toJSON(),
    (node: PortableNode) =>
      `${node._parent ? 'N' : ''}${node._parent ?? ''}${
        node._parent ? '<-' : ''
      }${node.isFull ? '!' : ''}${node.leaf ? 'L' : 'N'}${node.id} <${
        node.min ?? ''
      }:${node.max ?? ''}> ${JSON.stringify(node.keys)} L:${
        node.leaf ? 'L' : 'N'
      }${node._left ?? '-'} R:${node.leaf ? 'L' : 'N'}${node._right ?? '-'} ${
        node.leaf ? node.pointers : ''
      } ${node.errors.length == 0 ? '' : '[error]: ' + node.errors.join(';')}`,
    (node: PortableNode) => node.children.map((c) => nodes.get(c).toJSON()),
  )
}
