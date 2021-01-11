import { ValueType } from '../btree'
import { max } from '../methods/max'
import { min } from '../methods/min'

export class Node {
  id: string
  leaf: boolean // является ли узел листом
  key_num: number // количество ключей узла
  keys: ValueType[] // ключи узла
  parent: Node // указатель на отца
  children: Node[] // указатели на детей узла
  pointers: any[] // если лист — указатели на данные
  left: Node // указатель на левого брата
  right: Node // указатель на правого брата
  constructor(leaf: boolean = false) {
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
}
