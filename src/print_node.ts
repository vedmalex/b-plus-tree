import type { BPlusTree } from './BPlusTree'
import { printTree } from './print-tree'
import type { PortableNode } from './Node'
import type { Node } from './Node'
import type { ValueType } from './Node'

export function print_node<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  node?: Node<T, K>,
): Array<string> {
  if (!node) {
    node = tree.node(tree.root)
  }
  const nodes = tree.nodes
  return printTree(
    node?.toJSON(),
    (node: PortableNode<T, K>) =>
      `${node._parent ? 'N' : ''}${node._parent ?? ''}${
        node._parent ? '<-' : ''
      }${node.isFull ? '!' : ''}${node.leaf ? 'L' : 'N'}${node.id} <${
        JSON.stringify(node.min) ?? ''
      }:${JSON.stringify(node.max) ?? ''}> ${JSON.stringify(node.keys)} L:${
        node.leaf ? 'L' : 'N'
      }${node._left ?? '-'} R:${node.leaf ? 'L' : 'N'}${node._right ?? '-'} ${
        node.leaf ? JSON.stringify(node.pointers) : ''
      } ${node.errors.length == 0 ? '' : `[error]: ${node.errors.join(';')}`}`,
    (node: PortableNode<T, K>) =>
      node.children.map((c) => nodes.get(c).toJSON()),
  )
}
