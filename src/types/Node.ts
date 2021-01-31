import print from 'print-tree'
import { ValueType } from '../btree'
import { find_last_key } from '../methods/find_last_key'
import { Chainable } from './Chainable'
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

// let node = 0

export function registerNode(tree: BPlusTree, node: Node) {
  if (tree.nodes.has(node.id)) throw new Error('already here')
  node.tree = tree
  node.id = tree.get_next_id()
  tree.nodes.set(node.id, node)
  console.log(`register ${node.id}`)
}

export function unregisterNode(tree: BPlusTree, node: Node) {
  console.log(`unregister ${node.id}`)
  if (!tree.nodes.has(node.id)) throw new Error(`already removed ${node.id}`)
  node.tree = undefined
  tree.nodes.delete(node.id)
}

export function push_node_up(node: Node) {
  console.log(`push_node_up ${node.id}`)
  const child = node.tree.nodes.get(node.children.pop())
  const parent = node.parent
  // вставляем на прямо на то же место где и был
  const pos = parent.children.indexOf(node.id)
  parent.children[pos] = child.id
  child.parent = parent
  node.left?.removeSiblingAtRight()
  node.right?.removeSiblingAtLeft()
  node.parent = undefined
  node.delete()
  parent.commit()
}

export function insert_new_min(node: Node, key: ValueType) {
  console.log(`insert_new_min ${node.id}`)
  node.min = key
  let cur = node
  while (cur.parent) {
    let parent = cur.parent
    const pos = parent.children.indexOf(cur.id)
    if (pos > 0) {
      parent.keys[pos - 1] = key
      break
    } else {
      parent.min = key
      cur = parent
    }
  }
}

export function insert_new_max(node: Node, key: ValueType) {
  console.log(`insert_new_max ${node.id} ${key}`)
  node.max = key
  let cur = node
  while (cur.parent) {
    let parent = cur.parent
    if (parent.children.indexOf(cur.id) == parent.key_num) {
      parent.max = key
      cur = parent
    } else break
  }
}

export function update_min_max(node: Node) {
  console.log(`update_min_max ${node.id}`)
  if (!node.isEmpty) {
    const nodes = node.tree.nodes
    if (node.leaf) {
      replace_min(node, node.keys[0])
      replace_max(node, node.keys[node.size - 1])
    } else {
      replace_min(node, nodes.get(node.children[0]).min)
      replace_max(node, nodes.get(node.children[node.size - 1]).max)
    }
  } else {
    node.min = undefined
    node.max = undefined
  }
}

export function update_state(node: Node) {
  if (node.leaf) {
    node.key_num = node.keys.length
    node.size = node.keys.length
    node.isFull = node.size > node.t << 1
    node.isEmpty = node.size <= 0
  } else {
    node.key_num = node.keys.length
    node.size = node.children.length
    node.isFull = node.size > node.t << 1
    node.isEmpty = node.size <= 0
  }
}

export function replace_min(node: Node, key: ValueType) {
  node.min = key
  let cur = node
  while (cur.parent) {
    let parent = cur.parent
    const pos = parent.children.indexOf(cur.id)
    if (pos > 0) {
      parent.keys[pos - 1] = key
      break
    } else {
      parent.min = key
      cur = parent
    }
  }
}

export function replace_max(node: Node, key: ValueType) {
  node.max = key
  let cur = node
  while (cur.parent) {
    let parent = cur.parent
    const pos = parent.children.indexOf(cur.id)
    if (pos == parent.children.length - 1) {
      parent.max = key
      cur = parent
    } else break
  }
}

export function remove_node(obj: Node, item: Node): Node {
  console.log(`remove_node:start ${obj.id} -${item.id}:`)
  obj.print()
  const pos = obj.children.indexOf(item.id)
  obj.children.splice(pos, 1)
  if (pos == 0) {
    obj.keys.shift()
  } else {
    obj.keys.splice(pos - 1, 1)
  }
  item.parent = undefined
  item.right?.removeSiblingAtLeft()
  item.left?.removeSiblingAtRight()

  update_state(item)

  update_state(obj)

  const nodes = obj.tree.nodes
  if (pos == 0) {
    const min = nodes.get(obj.children[0])?.min
    insert_new_min(obj, min)
  }
  // as far as we splice last item from node it is now at length position
  if (pos == obj.size) {
    const max = nodes.get(obj.children[obj.key_num])?.max
    insert_new_max(obj, max)
  }
  console.log(`remove_node:end ${obj.id} -${item.id}:`)
  obj.print()
  return item
}

export type PortableNode = {
  id: number
  t: number
  _parent: number
  _left: number
  _right: number
  isEmpty: boolean
  isFull: boolean
  leaf: boolean
  max: ValueType
  min: ValueType
  size: number
  keys: ValueType[]
  key_num: number
  pointers: any[]
  children: number[]
}

// TODO: MAKE NODE SIMPLE OBJECT with static methods?????
export class Node {
  static createLeaf(tree: BPlusTree) {
    const node = new Node()
    node.leaf = true
    node.t = tree.t
    node.pointers = []
    registerNode(tree, node)
    return node
  }
  static createNode(tree: BPlusTree) {
    const node = new Node()
    node.children = []
    node.leaf = false
    node.t = tree.t
    registerNode(tree, node)
    return node
  }
  static createRootFrom(tree: BPlusTree, ...node: Array<Node>) {
    const root = Node.createNode(tree)
    add_initial_nodes(root, node)
    return root
  }
  static serialize(node: Node): PortableNode {
    const {
      id,
      leaf,
      t,
      _parent,
      _left,
      _right,
      isEmpty,
      isFull,
      max,
      min,
      size,
      keys,
      key_num,
      pointers,
      children,
    } = node
    return {
      id,
      leaf,
      t,
      _parent,
      _left,
      _right,
      isEmpty,
      isFull,
      max,
      min,
      size,
      keys,
      key_num,
      pointers,
      children,
    }
  }
  static deserialize(stored: PortableNode) {
    const node = new Node()
    node.id = stored.id
    node.leaf = stored.leaf
    node.t = stored.t
    node._parent = stored._parent
    node._left = stored._left
    node._right = stored._right
    node.isEmpty = stored.isEmpty
    node.isFull = stored.isFull
    node.max = stored.max
    node.min = stored.min
    node.size = stored.size
    node.keys = stored.keys
    node.key_num = stored.key_num
    node.pointers = stored.pointers
    node.children = stored.children
    return node
  }

  id: number
  t: number
  leaf: boolean // является ли узел листом
  key_num: number // количество ключей узла
  size: number // значимый размер узла
  keys: ValueType[] // ключи узла
  pointers: any[] // если лист — указатели на данные
  min: ValueType
  max: ValueType
  isFull: boolean
  isEmpty: boolean
  tree: BPlusTree
  private constructor() {
    this.keys = []
    this.key_num = 0
    this.size = 0
    this.isFull = false
    this.isEmpty = true
    this.min = undefined
    this.max = undefined
  }

  delete() {
    console.log(`delete ${this.id}`)
    if (this.tree.root != this.id) unregisterNode(this.tree, this)
  }

  insert(item: [ValueType, any]) {
    const [key, value] = item
    const pos = find_last_key(this.keys, item[0])
    this.keys.splice(pos, 0, key)
    this.pointers.splice(pos, 0, value)

    update_state(this)

    if (pos == 0) {
      insert_new_min(this, key)
    }
    if (pos == this.size - 1) {
      insert_new_max(this, key)
    }
  }

  remove(item: ValueType): [ValueType, any] {
    console.log(`remove:start ${this.id} -${item}`)
    this.print()
    const pos = find_first_item(this.keys, item)
    const res: [ValueType, any] = [item, this.pointers.splice(pos, 1)[0]]
    this.keys.splice(pos, 1)
    update_state(this)

    if (pos == 0) {
      replace_min(this, this.keys[0])
    }
    // as far as we splice last item from node it is now at length position
    if (pos == this.keys.length) {
      replace_max(this, this.keys[pos - 1])
    }
    console.log(`remove:end ${this.id} -${item}`)
    this.print()
    return res
  }

  commit() {
    console.log(`commit ${this.id}`)
    if (this.key_num == 0 && this.size == 1 && this.parent && !this.leaf) {
      console.log('push_node_up:before')
      this.print()
      push_node_up(this)
      if (this.parent?.size > 0) {
        console.log('parent.commit')
        this.print()
        this.parent.commit()
      }
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
        } ${
          node.errors.length == 0 ? '' : '[error]: ' + node.errors.join(';')
        }`,
      (node: Node) => node.children,
    )
  }
  get errors() {
    return this.validate()
  }
  validate() {
    const res = []
    if (!this.isEmpty) {
      if (!this.leaf) {
        if (this.children.length != this.keys.length + 1) {
          res.push(
            `!children ${this.leaf ? 'L' : 'N'}${this.id} ${
              this.children.length
            } ${this.keys.length}`,
          )
        }
        if (this.keys.length != this.key_num) {
          res.push(`!keys ${this.id}`)
        }
      }
      if (this.size != (this.leaf ? this.key_num : this.children.length)) {
        res.push(`!size ${this.id}`)
      }
    }
    return res
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
        left: this._left,
        right: this._right,
        parent: this._parent,
        isFull: this.isFull,
        errors: this.validate(),
      }
    } else {
      const nodes = this.tree?.nodes
      return {
        id: this.id,
        leaf: this.leaf,
        keys: [...this.keys].map((i) => (typeof i == 'number' ? i : 'empty')),
        key_num: this.key_num,
        min: this.min,
        max: this.max,
        left: this._left,
        right: this._right,
        children: nodes
          ? this.children.map((c) => nodes.get(c).toJSON())
          : this.children,
        parent: this._parent,
        isFull: this.isFull,
        errors: this.validate(),
      }
    }
  }

  // left: Node
  // right: Node
  // parent: Node
  // children: Node[] // указатели на детей узла

  children: number[] // ключи на детей узла

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
 * все манипуляции с деревом простое объединение массивов
 * поскольку мы знаем что и откуда надо брать
 * отсюда: все операции это просто функции
 *
 * операции пользователя это вставка... он вставляет только данные а не узлы дерева
 * а это методы дерева
 *
 */
