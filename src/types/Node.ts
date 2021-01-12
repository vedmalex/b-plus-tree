import { ValueType } from '../btree'
import { max } from '../methods/max'
import { min } from '../methods/min'

let node = 0
export class Node {
  creation_order: number
  leaf: boolean // является ли узел листом
  key_num: number // количество ключей узла
  keys: ValueType[] // ключи узла
  parent: Node // указатель на отца
  children: Node[] // указатели на детей узла
  pointers: any[] // если лист — указатели на данные
  left: Node // указатель на левого брата
  right: Node // указатель на правого брата
  constructor(leaf: boolean = false) {
    this.creation_order = node++
    this.leaf = leaf
    this.keys = []
    this.pointers = []
    this.key_num = 0
    this.children = []
  }
  commit() {
    if (this.leaf && this.pointers.length != this.key_num) {
      this.pointers.length = this.key_num
    }
    if (this.keys.length != this.key_num) {
      this.keys.length = this.key_num
    }
    if (!this.leaf && this.children.length != this.key_num + 1) {
      this.children.length = this.key_num + 1
    }
  }
  min() {
    return min.call(this)
  }
  max() {
    return max.call(this)
  }
  toJSON() {
    if (this.leaf) {
      return {
        id: this.creation_order,
        keys: [...this.keys],
        key_num: this.key_num,
        // pointers: this.pointers,
        // left: this.left?.creation_order,
        // right: this.right?.creation_order,
      }
    } else {
      return {
        id: this.creation_order,
        keys: [...this.keys],
        key_num: this.key_num,
        // left: this.left?.creation_order,
        // right: this.right?.creation_order,
        children: this.children.map((c) => c.toJSON()),
      }
    }
  }
}
