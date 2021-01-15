import { ValueType } from '../btree'
import { min } from '../methods/min'
import { max } from '../methods/max'
import { findPosInsert } from '../methods/findPosInsert'
import { findFast } from '../methods/findFast'
import { RuleRunner } from './RuleRunner'
import { Rule } from './Rule'
import { Chainable } from './Chainable'

export function addSibling(
  a: Chainable,
  b: Chainable,
  order: 'right' | 'left',
) {
  const right = order
  const left = order == 'left' ? 'right' : 'left'
  if (a[right]) {
    b[right] = a[right]
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
    if (b[right]) {
      a[right] = b[right]
      b[right][left] = a
    }
    a[right] = undefined
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
  new Rule({
    field: 'keys',
    condition: (obj: Node) => !obj.leaf,
    run: (root: Node) => root.children.slice(1).map((c) => c.min),
  }),
  new Rule({
    field: 'size',
    deps: ['keys'],
    run: (obj: Node) => (obj.leaf ? obj.keys.length : obj.children.length),
  }),
  new Rule({
    field: 'key_num',
    deps: ['keys'],
    run: (obj: Node) => obj.keys.length,
  }),
  new Rule({
    field: 'isEmpty',
    deps: ['size'],
    run: (obj: Node) => obj.size == 0,
  }),
  new Rule({
    field: 'min',
    deps: ['keys'],
    run: (obj: Node) => (obj.leaf ? obj.keys[0] ?? undefined : min(obj)),
  }),
  new Rule({
    field: 'max',
    deps: ['keys'],
    run: (obj: Node) =>
      obj.leaf ? obj.keys[obj.key_num - 1] ?? undefined : max(obj),
  }),
  new Rule({
    name: 'move last children to parent',
    deps: ['key_num', 'size'],
    condition: (obj: Node) =>
      obj.key_num == 0 && obj.size == 1 && obj.parent && !obj.leaf,
    run: (obj: Node) => {
      const child = obj.children.pop()
      const parent = obj.parent
      parent.insert(child)
      obj.commit()
      parent.commit()
    },
  }),
  new Rule({
    name: 'ack parent that here is only one children',
    condition: (obj: Node) => obj.parent?.size == 1,
    run: (obj: Node) => obj.parent.commit(),
  }),
]
export const ruleRunner = new RuleRunner<Node>(rules)

let node = 0
export class Node extends Chainable {
  static createLeaf() {
    return new Node(true)
  }
  static createNode() {
    return new Node(false)
  }
  static createRootFrom(...node: Array<Node>) {
    const root = Node.createNode()
    root.insertMany(...node)
    root.updateStatics()
    return root
  }
  id = node++
  leaf: boolean // является ли узел листом
  key_num: number // количество ключей узла
  size: number // значимый размер узла
  keys: ValueType[] // ключи узла
  parent: Node // указатель на отца
  children: Node[] // указатели на детей узла
  pointers: any[] // если лист — указатели на данные
  left: Node // указатель на левого брата
  right: Node // указатель на правого брата
  min: ValueType
  max: ValueType
  isFull: boolean
  isEmpty: boolean
  private constructor(leaf: boolean) {
    super()
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
  }

  insertMany(...items: (Node | [ValueType, any])[]) {
    items.forEach((item) => this.insert(item))
  }

  insert(item: Node | [ValueType, any]) {
    if (item instanceof Node) {
      if (!this.leaf) {
        if (!item.isEmpty) {
          item.parent = this
          const pos = findPosInsert<Node>(this.children, item, (key, node) =>
            key.min > node.min ? 1 : key.min == node.min ? 0 : -1,
          )
          this.children.splice(pos, 0, item)
        } else {
          throw new Error("can't attach empty children to node")
        }
      } else {
        throw new Error("can't attach children to leaf")
      }
    } else {
      if (this.leaf) {
        const [key, value] = item
        const pos = findPosInsert(this.keys, item[0])
        this.keys.splice(pos, 0, key)
        this.pointers.splice(pos, 0, value)
      } else {
        throw new Error("can't attach value to node")
      }
    }
    this.updateStatics()
  }

  remove(key: ValueType): Node | [ValueType, any] {
    if (this.leaf) {
      const pos = findFast(this.keys, key)
      const res: [ValueType, any] = [key, this.pointers.splice(pos, 1)[0]]
      this.keys.splice(pos, 1)
      this.updateStatics()
      return res
    } else {
      const pos = findPosInsert(this.keys, key)
      const res = this.children.splice(pos, 1)[0]
      this.updateStatics()
      return res
    }
  }

  updateStatics() {
    return ruleRunner.updateFields(this, '*')
  }

  commit() {
    this.updateStatics()
    return ruleRunner.executeAllActions(this)
  }
  moveChildtoParent() {}

  toJSON() {
    if (this.leaf) {
      return {
        id: this.id,
        keys: [...this.keys].map((i) => (typeof i == 'number' ? i : 'empty')),
        key_num: this.key_num,
        min: this.min,
        max: this.max,
        pointers: this.pointers,
        // left: this.left?.creation_order,
        // right: this.right?.creation_order,
      }
    } else {
      return {
        id: this.id,
        keys: [...this.keys].map((i) => (typeof i == 'number' ? i : 'empty')),
        key_num: this.key_num,
        min: this.min,
        max: this.max,
        // left: this.left?.creation_order,
        // right: this.right?.creation_order,
        children: this.children.map((c) => c.toJSON()),
      }
    }
  }
}
