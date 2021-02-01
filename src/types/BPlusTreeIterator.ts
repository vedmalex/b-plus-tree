import { ValueType } from './ValueType'
import { Cursor } from './eval/Cursor'
import { eval_next } from './eval/eval_next'
import { find_first } from './eval/find_first'
import { find_range_start } from './eval/find_range_start'
import { eval_previous } from './eval/eval_previous'
import { TreeOperations } from './TreeOperations'
import { BPlusTree } from './BPlusTree'

export class BPlusTreeIterator<T> implements TreeOperations<T> {
  tree: BPlusTree<T>
  constructor(tree: BPlusTree<T>) {
    this.tree = tree
  }
  eq(key: ValueType): Iterable<Cursor<T>> {
    const tree = this.tree
    return {
      [Symbol.iterator]() {
        let cursor: Cursor<T>
        //initial value
        // let value = tree.min
        return {
          next() {
            if (!cursor) {
              cursor = find_first(tree, key, true)
            } else {
              cursor = eval_next(tree, cursor.node, cursor.pos)
            }

            while (!cursor.done) {
              if (cursor.key != key) {
                cursor.done = true
              } else {
                break
              }
            }

            const result = cursor.done
              ? { value: undefined, done: true }
              : { value: cursor, done: false }
            return result
          },
        }
      },
    }
  }

  lt(key: ValueType): Iterable<Cursor<T>> {
    const tree = this.tree
    return {
      [Symbol.iterator]() {
        let cursor: Cursor<T>
        return {
          next() {
            if (!cursor) {
              cursor = find_range_start(tree, key, false, false)
            } else {
              cursor = eval_previous(tree, cursor.node, cursor.pos)
            }

            const result = cursor.done
              ? { value: undefined, done: true }
              : { value: cursor, done: false }
            return result
          },
        }
      },
    }
  }

  lte(key: ValueType): Iterable<Cursor<T>> {
    const tree = this.tree
    return {
      [Symbol.iterator]() {
        let cursor: Cursor<T>
        return {
          next() {
            if (!cursor) {
              cursor = find_range_start(tree, key, true, false)
            } else {
              cursor = eval_previous(tree, cursor.node, cursor.pos)
            }

            const result = cursor.done
              ? { value: undefined, done: true }
              : { value: cursor, done: false }
            return result
          },
        }
      },
    }
  }

  gt(key: ValueType): Iterable<Cursor<T>> {
    const tree = this.tree
    return {
      [Symbol.iterator]() {
        let cursor: Cursor<T>
        return {
          next() {
            if (!cursor) {
              cursor = find_range_start(tree, key, false, true)
            } else {
              cursor = eval_next(tree, cursor.node, cursor.pos)
            }

            const result = cursor.done
              ? { value: undefined, done: true }
              : { value: cursor, done: false }
            return result
          },
        }
      },
    }
  }

  gte(key: ValueType): Iterable<Cursor<T>> {
    const tree = this.tree
    return {
      [Symbol.iterator]() {
        let cursor: Cursor<T>
        return {
          next() {
            if (!cursor) {
              cursor = find_range_start(tree, key, true, true)
            } else {
              cursor = eval_next(tree, cursor.node, cursor.pos)
            }

            const result = cursor.done
              ? { value: undefined, done: true }
              : { value: cursor, done: false }
            return result
          },
        }
      },
    }
  }

  in(keys: Array<ValueType>): Iterable<Cursor<T>> {
    const tree = this.tree
    return {
      [Symbol.iterator]() {
        let cursor: Cursor<T>
        let i = 0
        return {
          next() {
            do {
              let key = keys[i]
              if (!cursor) {
                cursor = find_first(tree, key, true)
              } else {
                cursor = eval_next(tree, cursor.node, cursor.pos)
              }
              if (!cursor.done && cursor.key != key) {
                i += 1
                if (i == keys.length) {
                  cursor = {
                    node: undefined,
                    pos: undefined,
                    key: undefined,
                    value: undefined,
                    done: true,
                  }
                } else {
                  cursor = undefined
                }
              } else {
                // i += 1
                break
              }
            } while (i < keys.length)

            const result = cursor.done
              ? { value: undefined, done: true }
              : { value: cursor, done: false }
            return result
          },
        }
      },
    }
  }

  nin(keys: Array<ValueType>): Iterable<Cursor<T>> {
    return this.filter((v) => !keys.includes(v))
  }

  forEach(action: (value: T) => void) {
    for (let value of this) {
      action(value[1])
    }
  }

  [Symbol.iterator](): Iterator<Cursor<T>> {
    let cursor: Cursor<T>
    //initial value
    let value = this.tree.min
    const tree = this.tree
    return {
      next() {
        if (!cursor) {
          cursor = tree.cursor(value)
        } else {
          cursor = eval_next(tree, cursor.node, cursor.pos)
        }
        const result = cursor.done
          ? { value: undefined, done: true }
          : { value: cursor, done: false }
        return result
      },
    }
  }
  filter(filter: (ValueType) => boolean): Iterable<Cursor<T>> {
    const tree = this.tree
    return {
      [Symbol.iterator]() {
        let cursor: Cursor<T>
        //initial value
        let value = tree.min
        return {
          next() {
            if (!cursor) {
              cursor = tree.cursor(value)
            } else {
              cursor = eval_next(tree, cursor.node, cursor.pos)
            }

            while (!cursor.done) {
              if (!filter(cursor.value)) {
                cursor = eval_next(tree, cursor.node, cursor.pos)
              } else {
                break
              }
            }
            const result = cursor.done
              ? { value: undefined, done: true }
              : { value: cursor, done: false }
            return result
          },
        }
      },
    }
  }
}
