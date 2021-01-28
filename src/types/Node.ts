import print from 'print-tree'
import { ValueType } from '../btree'
import { min } from '../methods/min'
import { max } from '../methods/max'
import { find_last_key } from '../methods/find_last_key'
import { RuleRunner, Rule } from 'dymanic-rule-runner'
import { Chainable } from './Chainable'
import { find_first_key } from '../methods/find_first_key'
import { attach_many_to_right } from '../methods/attach_many_to_right'
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

const rules: Array<Rule<Node>> = [
  ...Rule.createSetter<Node>({
    field: 'keys',
    condition: (obj: Node) => !obj.leaf,
    run: (root: Node) => root.children.slice(1).map((c) => c.min),
  }),
  ...Rule.createSetter<Node>({
    field: 'isFull',
    subscribesTo: ['size'],
    run: (node) =>
      (node.leaf ? node.keys.length : node.children.length) > node.t << 1,
  }),
  ...Rule.createSetter<Node>({
    field: 'size',
    subscribesTo: ['keys'],
    run: (obj: Node) => (obj.leaf ? obj.keys.length : obj.children.length),
  }),
  ...Rule.createSetter<Node>({
    field: 'key_num',
    subscribesTo: ['keys'],
    run: (obj: Node) => obj.keys.length,
  }),
  ...Rule.createSetter({
    field: 'isEmpty',
    subscribesTo: ['size'],
    run: (obj: Node) => obj.size == 0,
  }),
  ...Rule.createSetter({
    field: 'min',
    subscribesTo: ['keys'],
    run: (obj: Node) => (obj.leaf ? obj.keys[0] ?? undefined : min(obj)),
  }),
  ...Rule.createSetter({
    field: 'max',
    subscribesTo: ['keys'],
    run: (obj: Node) =>
      obj.leaf ? obj.keys[obj.key_num - 1] ?? undefined : max(obj),
  }),
  // уменьшать можно только разрядность всего дерева???
  ...Rule.createAction({
    on: ['after:update', 'before:delete'],
    condition: (obj: Node) =>
      obj.key_num == 0 && obj.size == 1 && obj.parent && !obj.leaf,
    run: (obj: Node) => {
      //#ifdef DEBUG
      if (DEBUG) {
        console.log(`${obj.id} 'after:update', 'before:delete'`)
      }
      //#endif
      const child = obj.children.pop()
      const parent = obj.parent
      // вставляем на прямо на то же место где и был
      const pos = parent.children.indexOf(obj)
      parent.children[pos] = child
      child.parent = parent
      obj.left?.removeSiblingAtRight()
      obj.right?.removeSiblingAtLeft()
      obj.parent = undefined
      obj.commit()
      obj.delete()
      parent.commit()
    },
  }),

  ...Rule.createAction({
    on: ['after:update'],
    condition: (obj: Node) => obj.parent?.size > 0,
    run: (obj: Node) => {
      //#ifdef DEBUG
      if (DEBUG) {
        console.log(`${obj.id} action 'after:update'`)
      }
      //#endif
      obj.parent.commit()
    },
  }),

  ...Rule.createAction({
    on: ['after:delete'],
    condition: (obj: Node) => {
      return obj.tree.root != obj
    },
    run: (obj: Node) => {
      unregisterNode(obj.tree, obj)
      //#ifdef DEBUG
      if (DEBUG) {
        console.log(`unregistered ${obj.id}`)
      }
      //#endif
    },
  }),
  ...Rule.createAction({
    on: ['after:create'],
    run: (obj: Node) => {
      registerNode(obj.tree, obj)
      //#ifdef DEBUG
      if (DEBUG) {
        console.log(`registered ${obj.id}`)
      }
      //#endif
    },
  }),
]

export const ruleRunner = new RuleRunner<Node>(rules)

let node = 0

export function registerNode(tree: BPlusTree, node: Node) {
  if (tree.nodes.has(node.id)) throw new Error('already here')
  tree.nodes.set(node.id, node)
}

export function unregisterNode(tree: BPlusTree, node: Node) {
  if (!tree.nodes.has(node.id)) throw new Error(`already removed ${node.id}`)
  tree.nodes.delete(node.id)
}

export class Node {
  static createLeaf(tree: BPlusTree) {
    return ruleRunner.create(new Node(true, tree))
  }
  static createNode(tree: BPlusTree) {
    return ruleRunner.create(new Node(false, tree))
  }
  static createRootFrom(tree: BPlusTree, ...node: Array<Node>) {
    const root = Node.createNode(tree)
    attach_many_to_right(root, node)
    root.updateStatics()
    return root
  }
  static load(tree: BPlusTree) {
    const node = Node.createNode(tree)
  }
  id = node++
  t: number
  leaf: boolean // является ли узел листом
  key_num: number // количество ключей узла
  size: number // значимый размер узла
  keys: ValueType[] // ключи узла
  children: Node[] // указатели на детей узла
  pointers: any[] // если лист — указатели на данные
  min: ValueType
  max: ValueType
  isFull: boolean
  isEmpty: boolean
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
  }

  delete() {
    ruleRunner.delete(this)
  }

  insertMany(...items: [/* Node |  */ ValueType, any][]) {
    items.forEach((item) => this.insert(item))
  }

  insert(item: [ValueType, any]) {
    if (this.leaf) {
      const [key, value] = item
      const pos = find_last_key(this.keys, item[0])
      this.keys.splice(pos, 0, key)
      this.pointers.splice(pos, 0, value)
    } else {
      throw new Error("can't attach value to node")
    }
    this.updateStatics()
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
    //#ifdef DEBUG
    if (DEBUG) {
      console.log(`${this.id} update statics`)
    }
    //#endif
    return ruleRunner.updateFields(this, '*')
  }

  commit() {
    //#ifdef DEBUG
    if (DEBUG) {
      console.log(`${this.id} commit`)
    }
    //#endif
    this.updateStatics()
    return ruleRunner.runAction(this, 'after:update')
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
