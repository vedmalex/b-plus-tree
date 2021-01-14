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

export enum VertexColor {
  gray = 1,
  blue = 2,
  red = 3,
}

export type RuleInput<T> = {
  name?: string
  field?: 'none' | keyof T
  deps?: Array<keyof T>
  condition?: (obj: T) => boolean
  run: (obj: T) => any
}

export class Rule<T extends object> {
  type: 'action' | 'setter' = 'action'
  field: keyof T
  name: string
  deps?: Array<keyof T>
  condition?: (obj: T) => boolean
  run: (obj: T) => any
  constructor({ deps, run, condition, field, name }: RuleInput<T>) {
    this.type = field ? 'setter' : 'action'
    this.deps = deps
    this.run = run
    this.condition = condition
    if (field != 'none') this.field = field
    this.name = name
    if (!name) {
      this.name = `${this.type} for ${field}`
    }
  }
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

export class RuleRunner<T extends object> {
  dependencies: { [key: string]: Array<keyof T> }
  notifiers: { [key: string]: Array<keyof T> }
  setters: { [key: string]: Rule<T> }
  rules: { [key: string]: Rule<T> }
  public fields: Array<keyof T>
  public actions: Array<string>
  constructor(rules: Array<Rule<T>>) {
    // задать порядок выполнения правил в автоматическом режиме
    // отсортировать по порядку
    // отследить работу правил
    // перенести логику работы с деревом в правила

    // обновление зависимостей как-то записывать
    // чтобы не было каскадных обновлений

    // допилить остальное..
    // вызывать после обновление ключевого поля, обновления зависимых полей.
    // проставить что мы должны работать в режиме обновления какие поля за текущий запуск обработаны
    //
    this.notifiers = {}
    this.dependencies = {}
    this.fields = []
    this.setters = {}
    this.actions = []
    this.rules = {}
    rules.forEach((cur) => {
      if (cur.type == 'setter') {
        this.fields.push(cur.field)
        if (!this.setters[cur.field as string]) {
          this.setters[cur.field as string] = cur
        } else {
          throw new Error(`duplicate rule ${cur.field}`)
        }
      } else if (cur.type == 'action') {
        if (!this.rules[cur.name]) {
          this.rules[cur.name] = cur
        } else {
          throw new Error(`duplicate action ${cur.name}`)
        }
        this.actions.push(cur.name)
      }
    })
    this.initDependencies()
  }
  /**
   * ищем зависимость
   */
  initDependencies() {
    const color: { [key: string]: number } = {}
    this.dependencies = this.fields.reduce((g, c) => {
      g[c as string] = this.setters[c as string].deps
      color[c as string] = 0 /* white */
      return g
    }, {})

    this.findLoops(color)

    this.fields.forEach((f) => {
      if (color[f as string] != 1) {
        this.getDeps(f)
      }
    })
  }

  private findLoops(color: { [key: string]: number }) {
    const loop = []

    const loops = this.fields.reduce((res, f) => {
      const isLoop = this.dfs(f as string, color)
      if (isLoop == 1) {
        loop.push(f)
      }
      this.dfs(f as string, color)
      return res
    }, 0)

    if (loops > 0) {
      throw new Error(`cyclic dependecy loop found ${loop.join(',')}`)
    }
  }

  dfs(v: string, color: { [key: string]: number }) {
    color[v] = 1 /* gray */
    for (let i = 0; i < this.dependencies[v]?.length; i++) {
      let f = this.fields[i]
      if (!color[f as string]) {
        this.dfs(v, color)
      }
      if (color[f as string] == 1) {
        return 1
      }
    }
    color[v] = 2
    return 0
  }

  getDeps(f: keyof T, field?: keyof T) {
    const dependency = this.dependencies[f as string]
    field = field ?? f
    if (dependency?.length > 0) {
      for (let i = 0; i < dependency.length; i++) {
        const f = dependency[i]
        this.getDeps(f, field)
        if (!this.notifiers[f as string]) this.notifiers[f as string] = []
        this.notifiers[f as string].push(field)
      }
    }
  }

  updateFields(obj: T, metric: keyof T | '*', batch: boolean = false) {
    if (metric == '*') {
      const metrics = this.fields
      const result = metrics
        .map((metric) => this.updateFields(obj, metric, true))
        .reduce((r, c) => r + c, 0)
      return result
    } else if (
      this.setters[metric as string] &&
      (this.setters[metric as string].condition?.(obj) ?? true)
    ) {
      const rule = this.setters[metric as string]
      if (rule.deps && !batch) {
        rule.deps.forEach((dep) => {
          this.updateFields(obj, dep, batch)
        })
      }
      return updateValue<T>(obj, metric, rule.run)
    } else {
      // nothing to change
      return 0
    }
  }

  executeAction(obj: T, name: string) {
    const action = this.actions[name]
    if (obj && name && action) {
      if (action.condition?.(obj)) {
        if (action.deps) {
          action.deps.forEach((dep) => {
            this.updateFields(obj, dep, true)
          })
        }
        return action.run(obj) ?? 1
      }
    } else {
      return 0
    }
  }
  executeAllActions(obj: T) {
    return this.actions
      .map((name) => this.executeAction(obj, name))
      .reduce((r, c) => r + c, 0)
  }
}

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
