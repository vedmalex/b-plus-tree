import { ValueType } from '../btree'
import { min } from '../methods/min'
import { max } from '../methods/max'

let node = 0
export class Node {
  _id = node++
  leaf: boolean // является ли узел листом
  get key_num() {
    return this._key_num
  }
  set key_num(v) {
    if (v == -1) debugger
    this._key_num = v
  }
  _key_num: number // количество ключей узла
  keys: ValueType[] // ключи узла
  parent: Node // указатель на отца
  children: Node[] // указатели на детей узла
  pointers: any[] // если лист — указатели на данные
  left: Node // указатель на левого брата
  right: Node // указатель на правого брата
  min: ValueType
  max: ValueType
  constructor(leaf: boolean = false) {
    this.leaf = leaf
    this.keys = []
    this.pointers = []
    this.key_num = 0
    this.children = []
  }
  commit() {
    this.updateMinMax()
    if (this.leaf && this.pointers.length != this.key_num) {
      this.pointers.length = this.key_num
    }
    if (this.keys.length != this.key_num) {
      this.keys.length = this.key_num
    }
    if (!this.leaf && this.children.length != this.key_num + 1) {
      this.children.length = this.key_num + 1
    }
    if (this.key_num == 0) {
      const pos = this.parent.children.indexOf(this)
      this.parent.children.splice(pos, 1)
      this.parent.keys.splice(pos - 1, 1)
      //каскадно удалять узлы...
      this.parent.key_num -= 1
      if (this.left) this.left.right = this.right
      if (this.right) this.right.left = this.left
      delete this.left
      delete this.right
      delete this.parent
      delete this.leaf
      delete this.pointers
      delete this.children
      delete this.key_num
      delete this.keys
    }
  }
  updateMinMax() {
    const old_min = this.min
    const old_max = this.max
    if (this.leaf) {
      this.max = this.keys[this.key_num - 1]
      this.min = this.keys[0]
    } else {
      this.max = max(this)
      this.min = min(this)
    }
    if (this.parent && (old_min != this.min || old_max != this.max)) {
      this.parent.updateMinMax()
    }
  }

  toJSON() {
    if (this.leaf) {
      return {
        id: this._id,
        keys: [...this.keys].map((i) => (typeof i == 'number' ? i : 'empty')),
        key_num: this.key_num,
        min: this.min,
        max: this.max,
        // pointers: this.pointers,
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
