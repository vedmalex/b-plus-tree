import { ValueType } from './ValueType'
import { Cursor } from './eval/Cursor'
import { eval_next } from './eval/eval_next'
import { find_first } from './eval/find_first'
import { find_range_start } from './eval/find_range_start'
import { eval_previous } from './eval/eval_previous'
import { TreeOperations } from './TreeOperations'
import { BPlusTree } from './BPlusTree'
import { direct_update_value } from './direct_update_value'

export function $update<T>(
  tree: BPlusTree<T>,
  action: (T: any) => T,
  filter?: (value: [ValueType, T]) => boolean,
) {
  const iterator = filter ? $forwardIterator(tree) : $filter(tree, filter)
  for (let value of iterator) {
    var result = action([value.key, value.value])
    // здесь надо проверить не поменялся ли ключ данного объекта
    direct_update_value(tree, value.node, value.pos, result)
  }
}

export async function $updateAsync<T>(
  tree: BPlusTree<T>,
  action: (T: any) => Promise<T>,
  filter?: (value: [ValueType, T]) => boolean,
) {
  const iterator = filter ? $forwardIterator(tree) : $filter(tree, filter)
  for await (let value of iterator) {
    var result = await action([value.key, value.value])
    // здесь надо проверить не поменялся ли ключ данного объекта
    direct_update_value(tree, value.node, value.pos, result)
  }
}

export function $forEach<T>(
  tree: BPlusTree<T>,
  action: (value: [ValueType, T]) => void,
) {
  const iterator = $forwardIterator(tree)
  for (let value of iterator) {
    action([value.key, value.value])
  }
}

export async function $forEachAsync<T>(
  tree: BPlusTree<T>,
  action: (value: [ValueType, T]) => Promise<void>,
) {
  const iterator = $forwardIterator(tree)
  for (let value of iterator) {
    await action([value.key, value.value])
  }
}

export function $forwardIterator<T>(tree: BPlusTree<T>): Iterable<Cursor<T>> {
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
          const result = cursor.done
            ? { value: undefined, done: true }
            : { value: cursor, done: false }
          return result
        },
      }
    },
  }
}

export function $reverseIterator<T>(tree: BPlusTree<T>): Iterable<Cursor<T>> {
  return {
    [Symbol.iterator]() {
      let cursor: Cursor<T>
      //initial value
      let value = tree.max
      return {
        next() {
          if (!cursor) {
            cursor = tree.cursor(value)
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

export function $forwardAsyncIterator<T, D>(
  tree: BPlusTree<T>,
  extractor: (value: [ValueType, T]) => Promise<D>,
): AsyncIterable<Cursor<D>> {
  return {
    [Symbol.asyncIterator]() {
      let cursor: Cursor<T>
      //initial value
      let value = tree.min
      return {
        async next() {
          if (!cursor) {
            cursor = tree.cursor(value)
          } else {
            cursor = eval_next(tree, cursor.node, cursor.pos)
          }

          const result = cursor.done
            ? { value: undefined, done: true }
            : {
                value: {
                  ...cursor,
                  value: await extractor([cursor.key, cursor.value]),
                },
                done: false,
              }
          return result
        },
      }
    },
  }
}

export function $reverseAsyncIterator<T, D>(
  tree: BPlusTree<T>,
  extractor: (value: [ValueType, T]) => Promise<D>,
): AsyncIterable<Cursor<D>> {
  return {
    [Symbol.asyncIterator]() {
      let cursor: Cursor<T>
      //initial value
      let value = tree.max
      return {
        async next() {
          if (!cursor) {
            cursor = tree.cursor(value)
          } else {
            cursor = eval_previous(tree, cursor.node, cursor.pos)
          }

          const result = cursor.done
            ? { value: undefined, done: true }
            : {
                value: {
                  ...cursor,
                  value: await extractor([cursor.key, cursor.value]),
                },
                done: false,
              }
          return result
        },
      }
    },
  }
}

export function $filter<T>(
  tree: BPlusTree<T>,
  filter: (value: [ValueType, T]) => boolean,
): Iterable<Cursor<T>> {
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
            if (!filter([cursor.key, cursor.value])) {
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

export function $filterAsync<T>(
  tree: BPlusTree<T>,
  filter: (value: [ValueType, T]) => Promise<boolean>,
): AsyncIterable<Cursor<T>> {
  return {
    [Symbol.asyncIterator]() {
      let cursor: Cursor<T>
      //initial value
      let value = tree.min
      return {
        async next() {
          if (!cursor) {
            cursor = tree.cursor(value)
          } else {
            cursor = eval_next(tree, cursor.node, cursor.pos)
          }

          while (!cursor.done) {
            if (!(await filter([cursor.key, cursor.value]))) {
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

export function $eq<T>(
  tree: BPlusTree<T>,
  key: ValueType,
): Iterable<Cursor<T>> {
  return {
    [Symbol.iterator]() {
      let cursor: Cursor<T>
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

export function $lt<T>(
  tree: BPlusTree<T>,
  key: ValueType,
): Iterable<Cursor<T>> {
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

export function $lte<T>(
  tree: BPlusTree<T>,
  key: ValueType,
): Iterable<Cursor<T>> {
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

export function $gt<T>(
  tree: BPlusTree<T>,
  key: ValueType,
): Iterable<Cursor<T>> {
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

export function $gte<T>(
  tree: BPlusTree<T>,
  key: ValueType,
): Iterable<Cursor<T>> {
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

export function $in<T>(
  tree: BPlusTree<T>,
  keys: Array<ValueType>,
): Iterable<Cursor<T>> {
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

export function $nin<T>(
  tree: BPlusTree<T>,
  keys: Array<ValueType>,
): Iterable<Cursor<T>> {
  return $filter(tree, ([key]) => !keys.includes(key))
}

export function $range<T>(
  tree: BPlusTree<T>,
  from: ValueType,
  to: ValueType,
  fromIncl: boolean = true,
  toIncl: boolean = true,
): Iterable<Cursor<T>> {
  return {
    [Symbol.iterator]() {
      const endCursor = find_range_start(tree, to, toIncl, false)
      let cursor: Cursor<T>
      let finish = false
      return {
        next() {
          if (!finish) {
            if (!cursor) {
              cursor = find_range_start(tree, from, fromIncl, true)
            } else {
              cursor = eval_next(tree, cursor.node, cursor.pos)
              if (
                cursor.node == endCursor.node &&
                cursor.pos == endCursor.pos
              ) {
                finish = true
              }
            }
          } else {
            cursor = {
              done: true,
              key: undefined,
              pos: undefined,
              node: undefined,
              value: undefined,
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

export function map<T, D>(
  tree: BPlusTree<T>,
  func: (value: [ValueType, T]) => D,
) {
  for (let current of $forwardIterator(tree)) {
    if (func([current.key, current.value])) {
      return true
    }
  }
  return false
}

export async function reduce<T, E, D>(
  tree: BPlusTree<T>,
  reducer: (cur: T | E, res: D) => D,
  extractor: (value: [ValueType, T]) => Promise<E>,
  filter?: (value: [ValueType, T]) => Promise<boolean>,
  initial?: D,
): Promise<D> {
  const iterator = filter
    ? $filterAsync(tree, filter)
    : $forwardAsyncIterator(tree, extractor)
  let result = initial
  for await (let current of iterator) {
    result = reducer(current.value, result)
  }
  return result
}

export function some<T>(
  tree: BPlusTree<T>,
  func: (value: [ValueType, T]) => boolean,
) {
  for (let current of $forwardIterator(tree)) {
    if (func([current.key, current.value])) {
      return true
    }
  }
  return false
}

export function every<T, D>(
  tree: BPlusTree<T>,
  func: (value: [ValueType, T]) => boolean,
) {
  for (let current of $forwardIterator(tree)) {
    if (!func([current.key, current.value])) {
      return false
    }
  }
  return true
}

export function distinct() {}
// принимает курсор одного типа возвращает курсор другого типа
// и возвращаемое знанчение

export function mapReduce<T, D, V, O = BPlusTree<V>>({
  tree,
  map,
  reduce,
  finalize,
}: {
  tree: BPlusTree<T>
  map: (inp: T) => D
  reduce: (inp: D) => V
  finalize?: (inp: BPlusTree<V>) => O
}): O {
  const result = new BPlusTree<V>(tree.t, tree.unique)
  const iterator = $forwardIterator(tree)
  for (let current of iterator) {
    const value = map(current.value)
    const res = reduce(value)
    result.insert(current.key, res)
  }
  return finalize ? finalize(result) : ((result as unknown) as O)
}

export async function mapReduceAsync<T, D, V, O = BPlusTree<V>>({
  tree,
  map,
  reduce,
  finalize,
}: {
  tree: BPlusTree<T>
  map: (inp: [ValueType, T]) => D | Promise<D>
  reduce: (inp: [ValueType, D]) => V | Promise<V>
  finalize?: (inp: BPlusTree<V>) => O | Promise<O>
}): Promise<O> {
  const result = new BPlusTree<V>(tree.t, tree.unique)
  const iterator = $forwardIterator(tree)
  for (let current of iterator) {
    const value = map([current.key, current.value])
    const res = reduce([
      current.key,
      value instanceof Promise ? await value : value,
    ])
    result.insert(current.key, res instanceof Promise ? await res : res)
  }
  return finalize ? finalize(result) : ((result as unknown) as O)
}
