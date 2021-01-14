import { ValueType } from '../btree'
import { min } from '../methods/min'
import { max } from '../methods/max'
import { findPosInsert } from '../methods/findPosInsert'
import { updateValue } from '../methods/updateValue'
import { findFast } from '../methods/findFast'

export function nodeComparator(a, b) {
  return a.min - b.min
}

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

export class Chainable {
  left: Chainable
  right: Chainable

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

  mergeWithLeftSibling() {}
  borrowLeft() {}
}

export type RuleInput = {
  deps?: Array<keyof StaticNodeInfo>
  condition?: (obj: Node) => boolean
  run: (obj: Node) => any
}
export class Rule {
  deps?: Array<keyof StaticNodeInfo>
  condition?: (obj: Node) => boolean
  run: (obj: Node) => any
  constructor({ deps, run, condition }: RuleInput) {
    this.deps = deps
    this.run = run
    this.condition = condition
  }
}

export interface StaticNodeInfo<T = any> {
  size: T
  key_num: T
  isEmpty: T
  min: T
  max: T
  keys: T
}

export class NodeStatics implements StaticNodeInfo<Rule> {
  size = new Rule({
    deps: ['keys'],
    run: (obj: Node) => (obj.leaf ? obj.keys.length : obj.children.length),
  })
  key_num = new Rule({ deps: ['keys'], run: (obj: Node) => obj.keys.length })
  isEmpty = new Rule({ deps: ['size'], run: (obj: Node) => obj.size == 0 })
  min = new Rule({
    deps: ['keys'],
    run: (obj) => (obj.leaf ? obj.keys[0] ?? undefined : min(obj)),
  })
  max = new Rule({
    deps: ['keys'],
    run: (obj) =>
      obj.leaf ? obj.keys[obj.key_num - 1] ?? undefined : max(obj),
  })
  keys = new Rule({
    condition: (obj) => !obj.leaf,
    run: (root) => root.children.slice(1).map((c) => c.min),
  })
}

export const NodeRuleEngine = new NodeStatics()

export function updateMetric(
  node: Node,
  metric: keyof StaticNodeInfo | '*',
  batch: boolean = false,
) {
  if (metric == '*') {
    const metrics: Array<keyof StaticNodeInfo> = [
      'keys',
      'size',
      'key_num',
      'isEmpty',
      'max',
      'min',
    ]
    const result = metrics
      .map((metric) => updateMetric(node, metric, true))
      .reduce((r, c) => r + c, 0)
    return result
  } else if (
    NodeRuleEngine[metric] &&
    (NodeRuleEngine[metric].condition?.(node) ?? true)
  ) {
    const rule = NodeRuleEngine[metric]
    if (rule.deps && !batch) {
      rule.deps.forEach((dep) => {
        updateMetric(node, dep, batch)
      })
    }
    return updateValue(node, metric, rule.run)
  } else {
    // nothing to change
    return 0
  }
}

let node = 0
export class Node extends Chainable implements StaticNodeInfo {
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
  _id = node++
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
    return updateMetric(this, '*')
  }

  commit() {
    let updated = this.updateStatics()
    if (this.isEmpty && this.parent && !this.parent.isEmpty) {
      const pos = this.parent.children.indexOf(this)
      if (pos >= 0) {
        this.parent.children.splice(pos, 1)
        this.parent.commit()
        this.parent = undefined
        updated += 1
      }
    }
    if (this.parent?.size == 1) {
      updated += this.parent.commit()
    }
    if (this.key_num == 0 && this.size == 1 && this.parent && !this.leaf) {
      const child = this.children.pop()
      const parent = this.parent
      parent.insert(child)
      this.commit()
      parent.commit()
      updated += 1
    }
    return updated
  }

  toJSON() {
    if (this.leaf) {
      return {
        id: this._id,
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
        id: this._id,
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
