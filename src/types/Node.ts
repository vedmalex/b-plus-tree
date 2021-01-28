import print from 'print-tree'
import { ValueType } from '../btree'
import { min } from '../methods/min'
import { max } from '../methods/max'
import { find_last_key } from '../methods/find_last_key'
import { RuleRunner, Rule } from 'dymanic-rule-runner'
import { Chainable } from './Chainable'
import { find_first_key } from '../methods/find_first_key'
import { add_initial_nodes } from '../methods/add_initial_nodes'
import { find_first_item } from '../methods/find_first_item'
import { BPlusTree } from './BPlusTree'

export function addSibling(
  a: Chainable,
  b: Chainable,
  order: 'right' | 'left',
) {
  const right = order
  const left = order == 'left' ? 'right' : 'left'
  b[right] = a[right]
  if (a[right]) {
    b[right][left] = b
  }
  a[right] = b
  b[left] = a
}

export function removeSibling(a: Chainable, order: 'right' | 'left') {
  const right = order
  const left = order == 'left' ? 'right' : 'left'
  if (a[right]) {
    const b = a[right]
    a[right] = b[right]
    if (b[right]) {
      b[right][left] = a
    }
    b[left] = undefined
    b[right] = undefined
  }
}

export enum VertexColor {
  gray = 1,
  blue = 2,
  red = 3,
}

let node = 0

export function registerNode(tree: BPlusTree, node: Node) {
  if (tree.nodes.has(node.id)) throw new Error('already here')
  tree.nodes.set(node.id, node)
}

export function unregisterNode(tree: BPlusTree, node: Node) {
  if (!tree.nodes.has(node.id)) throw new Error(`already removed ${node.id}`)
  tree.nodes.delete(node.id)
}

export function push_node_up(node: Node) {
  const child = node.children.pop()
  const parent = node.parent
  // вставляем на прямо на то же место где и был
  const pos = parent.children.indexOf(node)
  parent.children[pos] = child
  child.parent = parent
  node.left?.removeSiblingAtRight()
  node.right?.removeSiblingAtLeft()
  node.parent = undefined
  node.commit()
  node.delete()
  parent.commit()
}

export function push_min_up(node: Node, key: ValueType) {
  node.min = key
  let cur = node
  while (cur.parent) {
    let parent = cur.parent
    const pos = parent.children.indexOf(cur)
    if (pos > 0) {
      parent.keys[pos - 1] = key
      break
    } else {
      parent.min = key
      cur = parent
    }
  }
}

export function push_max_up(node: Node, key: ValueType) {
  node.max = key
  let cur = node
  while (cur.parent) {
    let parent = cur.parent
    if (parent.max < key) {
      parent.max = key
      cur = parent
    } else break
  }
}
export class Node {
  static createLeaf(tree: BPlusTree) {
    return new Node(true, tree)
  }
  static createNode(tree: BPlusTree) {
    return new Node(false, tree)
  }
  static createRootFrom(tree: BPlusTree, ...node: Array<Node>) {
    const root = Node.createNode(tree)
    add_initial_nodes(root, node)
    return root
  }
  static load(tree: BPlusTree) {
    const node = Node.createNode(tree)
  }
  id = node++
  t: number
  leaf: boolean // является ли узел листом
  key_num: number = 0 // количество ключей узла
  size: number = 0 // значимый размер узла
  keys: ValueType[] // ключи узла
  children: Node[] // указатели на детей узла
  pointers: any[] // если лист — указатели на данные
  min: ValueType
  max: ValueType
  isFull: boolean = false
  isEmpty: boolean = true
  tree: BPlusTree
  private constructor(leaf: boolean, tree: BPlusTree) {
    this.tree = tree
    if (leaf == undefined) throw new Error('leaf type expected')
    this.leaf = leaf
    this.keys = []
    this.key_num = 0
    this.size = 0
    if (this.leaf) {
      this.pointers = []
    } else {
      this.children = []
    }
    this.isFull = false
    this.isEmpty = true
    this.min = undefined
    this.max = undefined
    this.t = tree.t
    registerNode(this.tree, this)
  }

  delete() {
    if (this.tree.root != this) unregisterNode(this.tree, this)
  }

  insertMany(...items: Array<[ValueType, any]>) {
    items.forEach((item) => this.insert(item))
    // немного другая логика по обновлению ключей
    // TODO: переписать код, чтобы вызывал обновления после всего
  }

  insert(item: [ValueType, any]) {
    const [key, value] = item
    const pos = find_last_key(this.keys, item[0])
    this.keys.splice(pos, 0, key)
    this.pointers.splice(pos, 0, value)

    this.key_num += 1
    this.size += 1
    this.isFull = this.size > this.t << 1

    if (pos == 0) {
      push_min_up(this, key)
    }
    if (pos == this.keys.length - 1) {
      push_max_up(this, key)
    }
  }

  remove(item: ValueType | Node): Node | [ValueType, any] {
    if (item instanceof Node) {
      const pos = this.children.indexOf(item)
      this.children.splice(pos, 1)
      item.parent = undefined
      item.right?.removeSiblingAtLeft()
      item.left?.removeSiblingAtRight()
      this.updateStatics()
      return item
    } else {
      if (this.leaf) {
        const pos = find_first_item(this.keys, item)
        const res: [ValueType, any] = [item, this.pointers.splice(pos, 1)[0]]
        this.keys.splice(pos, 1)
        this.updateStatics()
        return res
      } else {
        // const pos = find_last_pos_to_insert(this.keys, item)
        const pos = find_first_key(this.keys, item)
        const res = this.children.splice(pos, 1)[0]
        res.parent = undefined
        this.updateStatics()
        return res
      }
    }
  }

  updateStatics() {
    /**
      0:'keys'
      1:'size'
      2:'isFull'
      3:'key_num'
      4:'isEmpty'
      5:'min'
      6:'max'
     */
    // if (!this.leaf) {
    //   this.keys = this.children.slice(1).map((c) => c.min)
    // }
    this.size = this.leaf ? this.keys.length : this.children.length
    this.isFull =
      (this.leaf ? this.keys.length : this.children.length) > this.t << 1
    this.key_num = this.keys.length
    this.isEmpty = this.size == 0
    // this.min = this.leaf ? this.keys[0] ?? undefined : min(this)
    // this.max = this.leaf ? this.keys[this.key_num - 1] ?? undefined : max(this)
  }

  commit() {
    this.updateStatics()
    if (this.key_num == 0 && this.size == 1 && this.parent && !this.leaf) {
      push_node_up(this)
    }
    if (this.parent?.size > 0) {
      this.parent.commit()
    }
  }

  print(node?: Node) {
    print(
      node?.toJSON() ?? this.toJSON(),
      (node: Node) =>
        `${node.parent ? 'N' : ''}${node.parent ?? ''}${
          node.parent ? '<-' : ''
        }${node.isFull ? '!' : ''}${node.leaf ? 'L' : 'N'}${node.id} <${
          node.min ?? ''
        }:${node.max ?? ''}> ${JSON.stringify(node.keys)} L:${
          node.leaf ? 'L' : 'N'
        }${node.left ?? '-'} R:${node.leaf ? 'L' : 'N'}${node.right ?? '-'} ${
          node.leaf ? node.pointers : ''
        }`,
      (node: Node) => node.children,
    )
  }
  toJSON() {
    if (this.leaf) {
      return {
        id: this.id,
        leaf: this.leaf,
        keys: [...this.keys].map((i) => (typeof i == 'number' ? i : 'empty')),
        key_num: this.key_num,
        min: this.min,
        max: this.max,
        pointers: this.pointers,
        left: this.left?.id,
        right: this.right?.id,
        parent: this.parent?.id,
        isFull: this.isFull,
      }
    } else {
      return {
        id: this.id,
        leaf: this.leaf,
        keys: [...this.keys].map((i) => (typeof i == 'number' ? i : 'empty')),
        key_num: this.key_num,
        min: this.min,
        max: this.max,
        left: this.left?.id,
        right: this.right?.id,
        children: this.children.map((c) => c.toJSON()),
        parent: this.parent?.id,
        isFull: this.isFull,
      }
    }
  }

  // left: Node
  // right: Node
  // parent: Node
  // указатель на отца
  _parent: number

  get parent(): Node {
    return this.tree.nodes.get(this._parent) ?? undefined
  }
  set parent(node: Node) {
    this._parent = node?.id ?? undefined
  }
  // указатель на левого брата
  _left: number
  _right: number
  get left(): Node {
    return this.tree.nodes.get(this._left) ?? undefined
  }
  set left(node: Node) {
    this._left = node?.id ?? undefined
  }
  // указатель на правого брата
  get right(): Node {
    return this.tree.nodes.get(this._right) ?? undefined
  }
  set right(node: Node) {
    this._right = node?.id ?? undefined
  }
  addSiblingAtRight(b) {
    addSibling(this, b, 'right')
  }

  addSiblingAtLeft(b) {
    addSibling(this, b, 'left')
  }

  removeSiblingAtRight() {
    removeSibling(this, 'right')
  }

  removeSiblingAtLeft() {
    removeSibling(this, 'left')
  }
}

/**
 * все манипуляции с деревом простое обхединение массивов
 * поскольку мы знаем что и откуда надо брать
 * отсюда: все операции это просто функции
 *
 * операции пользователя это вставка... он вставляет только данные а не узлы дерева
 * а это методы дерева
 *
 */
