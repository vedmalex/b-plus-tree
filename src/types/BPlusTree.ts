import print from 'print-tree'
import { Node } from './Node'
import { ValueType } from '../btree'
import { remove } from '../methods/remove'
import { insert } from '../methods/insert'
import { find_key } from '../methods/find_key'
import { findPosInsert } from '../methods/findPosInsert'

export function getItems(node: Node, key: ValueType): Array<[ValueType, any]> {
  if (node.leaf) {
    const lres = []
    node.keys.forEach((k, i) => {
      if (k == key) lres.push(i)
    })
    return lres.map((i) => [i, node.pointers[i]])
  } else {
    const lres = []
    const keys = [...node.keys]
    const pos = findPosInsert(keys, key)
    for (let i = pos; i >= 0; i--) {
      const res = getItems(node.children[i], key)
      if (res.length > 0) {
        lres.push(...res)
      } else {
        break
      }
    }
    return lres
  }
}

export class BPlusTree {
  public t: number // минимальная степень дерева
  public root: Node // указатель на корень дерева
  public unique: boolean
  constructor(t: number, unique: boolean) {
    this.root = Node.createLeaf(t)
    this.t = t
    this.unique = unique
  }

  findAll(key: ValueType, skip: number = 0, take: number = -1) {
    let f = this.find(key)
    let result = []
    let skipped = skip
    let taken = take
    do {
      const lres = getItems(f, key)
      if (lres.length > 0) {
        const resLen = lres.length
        let lskip = skipped
        if (skipped > 0) {
          lskip -= resLen
        }
        if (lskip <= 0) {
          if (taken == -1) {
            // или берем все или только часть вырезаем
            if (skipped == 0) {
              result.unshift(...lres)
            } else {
              // вырезаем от начального элемента
              result.unshift(...lres.slice(skipped))
              // следующий слок читаем сначала
              skipped = 0
            }
          } else {
            // if (skipped > 0)
            if (skipped + taken > 0 && skipped + taken < resLen) {
              result.unshift(...lres.slice(skipped, skipped + taken))
              taken = 0
              break
            } else if (skipped + taken > 0 && skipped + taken >= resLen) {
              if (skipped == 0) {
                result.unshift(...lres)
              } else {
                result.unshift(...lres.slice(skipped))
              }
              taken -= resLen - skipped
            } else {
              // skipped + taken == 0
              // мы полуили все что нужно
              // и тут оказались случайно
              break
            }
          }
        } else {
          skipped = lskip
        }
        f = f.left
      } else {
        break
      }
    } while (f != null)
    return result
  }
  find(key: ValueType): ReturnType<typeof find_key> {
    return find_key.call(this, key)
  }
  insert(key: ValueType, value: any): boolean {
    return insert.call(this, key, value)
  }
  remove(key: ValueType): boolean {
    return remove.call(this, key)
  }
  min() {
    return this.root.min
  }
  max() {
    return this.root.max
  }
  toJSON() {
    return {
      t: this.t,
      unique: this.unique,
      root: this.root.toJSON(),
    }
  }
  print() {
    print(
      this.toJSON().root,
      (node: Node) =>
        `${node.leaf ? 'L' : 'N'}${node.id} <${node.min ?? ''}:${
          node.max ?? ''
        }> ${JSON.stringify(node.keys)} L:${node.leaf ? 'L' : 'N'}${
          node.left ?? '-'
        } R:${node.leaf ? 'L' : 'N'}${node.right ?? '-'} ${
          node.leaf ? node.pointers : ''
        }`,
      (node: Node) => node.children,
    )
  }
}
