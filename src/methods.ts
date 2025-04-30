import { BPlusTree } from './BPlusTree'
import { Cursor } from './eval'
import { Node, remove_node, replace_max, replace_min, update_min_max, update_state, ValueType } from './Node'
import { Comparator } from './types'

export function add_initial_nodes<T, K extends ValueType>(
  obj: Node<T, K>,
  nodes: Array<Node<T, K>>,
): void {
  for (let i = 0; i < nodes.length; i++) {
    const right = nodes[i]
    obj.children.push(right.id)
    obj.keys.push(right.min)
    right.parent = obj
  }
  // always remove first
  obj.keys.shift()

  // update node
  update_state(obj)

  // update and push all needed max and min
  update_min_max(obj)
}

export function attach_one_to_right_after<T, K extends ValueType>(
  obj: Node<T, K>,
  right: Node<T, K>,
  after: Node<T, K>,
): void {
  const pos = obj.children.indexOf(after.id)
  obj.children.splice(pos + 1, 0, right.id)
  right.parent = obj

  // update node state (size, key_num)
  // min/max update happens in split after key insertion
  update_state(obj)

  // update and push all needed max and min - Moved to split
  // update_min_max(obj)
}


export function merge_with_left<T, K extends ValueType>(
  node: Node<T, K>,
  left_sibling: Node<T, K>,
  count: number,
): void {
  if (node.leaf) {
    node.keys.unshift(...left_sibling.keys.splice(-count))
    node.pointers.unshift(...left_sibling.pointers.splice(-count))
    // update node
    update_state(node)

    // update and push all needed max and min
    update_min_max(node)

    // update sibling
    update_state(left_sibling)

    update_min_max(left_sibling)

    // not pushin up because we in process of attaching
    // not updating parent yet
  } else {
    if (node.size > 0) node.keys.unshift(node.min)
    node.keys.unshift(...left_sibling.keys.splice(-count))
    if (left_sibling.size != count) node.keys.shift()

    const nodes = node.tree.nodes
    node.children.unshift(
      ...left_sibling.children.splice(-count).map((c) => {
        nodes.get(c).parent = node
        return c
      }),
    )

    // update node
    update_state(node)
    // update and push all needed max and min
    update_min_max(node)
    // update sibling
    update_state(left_sibling)

    update_min_max(left_sibling)
    // not pushin up because we in process of attaching
    // not updating parent yet
  }
}

export function merge_with_right<T, K extends ValueType>(
  node: Node<T, K>,
  right_sibling: Node<T, K>,
  count: number,
): void {
  if (node.leaf) {
    node.keys.push(...right_sibling.keys.splice(0, count))
    node.pointers.push(...right_sibling.pointers.splice(0, count))

    // update node
    update_state(node)

    // update and push all needed max and min

    update_min_max(node)

    // update sibling
    update_state(right_sibling)

    update_min_max(right_sibling)
    // not pushin up because we in process of attaching
    // not updating parent yet
  } else {
    if (node.size > 0) node.keys.push(node.min)
    node.keys.push(...right_sibling.keys.splice(0, count - 1))
    if (right_sibling.size != count) right_sibling.keys.shift()

    const nodes = node.tree.nodes
    node.children.push(
      ...right_sibling.children.splice(0, count).map((c) => {
        nodes.get(c).parent = node
        return c
      }),
    )

    // update node
    update_state(node)

    // update and push all needed max and min

    update_min_max(node)

    // update sibling
    update_state(right_sibling)

    update_min_max(right_sibling)

    // not pushin up because we in process of attaching
    // not updating parent yet
  }
}

export function can_borrow_left<T, K extends ValueType>(
  node: Node<T, K>,
): number {
  const cur = node
  if (cur.left?.size > cur.t - 1 && cur.left?.size > 1) {
    return cur.left?.size - cur.t - 1
  }
  return 0
}

export function can_borrow_right<T, K extends ValueType>(
  node: Node<T, K>,
): number {
  const cur = node
  if (cur.right?.size > cur.t - 1 && cur.right?.size > 1) {
    return cur.right?.size - cur.t - 1
  }
  return 0
}

export type Chainable = {
  left: Chainable
  right: Chainable
}

export function add_sibling(
  a: Chainable,
  b: Chainable,
  order: 'right' | 'left',
): void {
  const right = order
  const left = order == 'left' ? 'right' : 'left'
  b[right] = a[right]
  if (a[right]) {
    b[right][left] = b
  }
  a[right] = b
  b[left] = a
}

export function remove_sibling(a: Chainable, order: 'right' | 'left'): void {
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

export function compare_keys_array_reverse<K extends Array<ValueType>>(
  key1: K,
  key2: K,
): number {
  if (key1 != null && key2 != null) {
    // Compare the keys element by element until a difference is found
    const minLength = Math.min(key1.length, key2.length)
    for (let i = 0; i < minLength; i++) {
      if (key1[i] < key2[i]) {
        return 1
      } else if (key1[i] > key2[i]) {
        return -1
      }
    }

    // If all elements are equal, compare the lengths of the keys
    if (key1.length < key2.length) {
      return 1
    } else if (key1.length > key2.length) {
      return -1
    } else {
      return 0
    }
  } else if (key1 != null) {
    return -1
  } else if (key2 != null) {
    return 1
  } else {
    return 0
  }
}

export function compare_keys_array<K extends Array<ValueType>>(
  key1: K,
  key2: K,
): number {
  if (key1 != null && key2 != null) {
    // Compare the keys element by element until a difference is found
    const minLength = Math.min(key1.length, key2.length)
    for (let i = 0; i < minLength; i++) {
      if (key1[i] < key2[i]) {
        return -1
      } else if (key1[i] > key2[i]) {
        return 1
      }
    }

    // If all elements are equal, compare the lengths of the keys
    if (key1.length < key2.length) {
      return -1
    } else if (key1.length > key2.length) {
      return 1
    } else {
      return 0
    }
  } else if (key1 != null) {
    return 1
  } else if (key2 != null) {
    return -1
  } else {
    return 0
  }
}

export function compare_keys_object_reverse<
  K extends Record<string, ValueType>,
>(key1: K, key2: K): number {
  if (key1 != null && key2 != null) {
    // Iterate over all of the properties in the key objects
    for (const prop of Object.keys(key1)) {
      // If the second key object does not have the property, the first key is greater
      if (!(prop in key2)) {
        return -1
      }

      // If the values of the properties are not equal, return the comparison of the values
      if (key1[prop] !== key2[prop]) {
        return key1[prop] < key2[prop] ? 1 : -1
      }
    }

    // If all of the properties are equal, but the second key object has additional properties,
    // the first key is less
    if (Object.keys(key2).length > Object.keys(key1).length) {
      return 1
    }

    // If all of the properties are equal, the keys are equal
    return 0
  } else if (key1 != null) {
    return -1
  } else if (key2 != null) {
    return 1
  } else {
    return 0
  }
}

export function compare_keys_object<K extends Record<string, ValueType>>(
  key1: K,
  key2: K,
): number {
  if (key1 != null && key2 != null) {
    // Iterate over all of the properties in the key objects
    for (const prop of Object.keys(key1)) {
      // If the second key object does not have the property, the first key is greater
      if (!(prop in key2)) {
        return 1
      }

      // If the values of the properties are not equal, return the comparison of the values
      if (key1[prop] !== key2[prop]) {
        return key1[prop] < key2[prop] ? -1 : 1
      }
    }

    // If all of the properties are equal, but the second key object has additional properties,
    // the first key is less
    if (Object.keys(key2).length > Object.keys(key1).length) {
      return -1
    }

    // If all of the properties are equal, the keys are equal
    return 0
  } else if (key1 != null) {
    return 1
  } else if (key2 != null) {
    return -1
  } else {
    return 0
  }
}

export function compare_keys_primitive_reverse<K extends ValueType>(
  key1?: K,
  key2?: K,
): number {
  if (key1 != null && key2 != null) {
    if (key1 < key2) {
      return 1
    } else if (key1 > key2) {
      return -1
    } else {
      return 0
    }
  } else if (key1 != null) {
    return -1
  } else if (key2 != null) {
    return 1
  } else {
    return 0
  }
}

export function compare_keys_primitive<K extends ValueType>(
  key1?: K,
  key2?: K,
): number {
  if (key1 != null && key2 != null) {
    if (key1 < key2) {
      return -1
    } else if (key1 > key2) {
      return 1
    } else {
      return 0
    }
  } else if (key1 != null) {
    return 1
  } else if (key2 != null) {
    return -1
  } else {
    return 0
  }
}

export function count<T, K extends ValueType>(
  key: K,
  node: Node<T, K>,
): number {
  let lres = 0
  const start = find_first_key(node.keys, key, node.tree.comparator)
  const nodes = node.tree.nodes

  let i = start
  if (node.leaf) {
    while (node.keys[i] == key) {
      lres++
      i++
    }
  } else {
    const len = node.size
    while (i < len) {
      const res = count(key, nodes.get(node.children[i]))
      lres += res
      i++
    }
  }
  return lres
}

export function delete_by_cursor_list<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  cursors: Array<Cursor<T, K>>,
): Array<[K, T]> {
  const result: Array<[K, T]> = []
  const touched_nodes = new Set<number>()
  // сначала удаляем все записи какие есть
  for (const cursor of cursors) {
    const node = tree.nodes.get(cursor.node)
    const { key, pos } = cursor
    result.push([key, node.pointers.splice(pos, 1, undefined)[0]])
    node.keys.splice(pos, 1, undefined)
    touched_nodes.add(cursor.node)
  }
  // обновляем все записи в дереве
  for (const node_id of touched_nodes) {
    const node = tree.nodes.get(node_id)
    const new_keys = []
    const new_pointers = []
    for (let i = 0; i < node.size; i++) {
      if (node.keys[i] !== undefined) {
        new_keys.push(node.keys[i])
        new_pointers.push(node.pointers[i])
      }
    }

    node.keys = new_keys
    node.pointers = new_pointers

    update_state(node)
    if (node.min != node.keys[0]) {
      replace_min(node, node.keys[0])
    }
    if (node.max != node.keys[node.keys.length - 1]) {
      replace_max(node, node.keys[node.keys.length - 1])
    }
  }
  // обновляем дерево
  for (const node_id of touched_nodes) {
    const node = tree.nodes.get(node_id)
    if (node) {
      reflow(tree, node)
      try_to_pull_up_tree(tree)
    }
  }
  return result
}

export function delete_by_cursor<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  cursor: Cursor<T, K>,
): Array<[K, T]> {
  const node = tree.nodes.get(cursor.node)
  const { key, pos } = cursor
  const res: [K, T] = [key, node.pointers.splice(pos, 1)[0]]
  node.keys.splice(pos, 1)
  update_state(node)

  if (pos == 0) {
    replace_min(node, node.keys[0])
  }
  // as far as we splice last item from node it is now at length position
  if (pos == node.keys.length) {
    replace_max(node, node.keys[pos - 1])
  }

  reflow(tree, node)

  try_to_pull_up_tree(tree)
  return [res]
}

export function delete_in_node<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  node: Node<T, K>,
  key: K,
  all = false,
): Array<[K, T]> {
  const result: Array<[K, T]> = []
  if (all) {
    while (find_first_item(node.keys, key, tree.comparator) != -1) {
      result.push(node.remove(key))
    }
  } else {
    result.push(node.remove(key))
  }
  reflow(tree, node)

  try_to_pull_up_tree(tree)
  return result
}

export function direct_update_value<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  id: number,
  pos: number,
  value: T,
): Cursor<T, K> {
  const node = tree.nodes.get(id)
  if (!node.leaf) throw new Error('can not set node')
  node.pointers[pos] = value
  return { done: false, key: node.keys[pos], value: value, node: id, pos: pos }
}

export function find_first_item_remove<K extends ValueType>(
  a: Array<K>,
  key: K,
  comparator: Comparator<K>,
): number {
  // l, r — левая и правая границы
  let l = -1
  let r: number = a.length
  key = (key == null && typeof a[0] == 'string' ? '' : key) as K
  while (l < r - 1) {
    // Запускаем цикл
    const m = (l + r) >> 1 // !m — середина области поиска
    if (comparator(key, a[m]) <= 0) {
      r = m
    } else {
      l = m // Сужение границ
    }
  }
  return comparator(a[r], key) == 0 ? r : -1
}

/**
 * fast search in ordered array
 * @param a array
 * @param key key to find
 * @returns
 */
export function find_first_item<K extends ValueType>(
  a: Array<K>,
  key: K,
  comparator: Comparator<K>,
): number {
  // l, r — левая и правая границы
  let l = -1
  let r: number = a.length
  key = (key == null && typeof a[0] == 'string' ? '' : key) as K
  while (l < r - 1) {
    // Запускаем цикл
    const m = (l + r) >> 1 // !m — середина области поиска
    if (comparator(key, a[m]) > 0) {
      l = m // Сужение границ
    } else {
      r = m
    }
  }
  return comparator(a[r], key) == 0 ? r : -1
}

/**
 * search index of first appearance of the item
 * @param a ordered array
 * @param key value to insert into array
 * @returns the position where the value can be inserted
 */
export function find_first_key<K extends ValueType>(
  a: Array<K>,
  key: K,
  comparator: Comparator<K>,
): number {
  // l, r — левая и правая границы
  let l = -1
  let r: number = a.length
  key = (key == null && typeof a[0] == 'string' ? '' : key) as K
  while (l < r - 1) {
    // Запускаем цикл
    const m = (l + r) >> 1 // m — середина области поиска
    if (comparator(key, a[m]) > 0) {
      l = m
    } else {
      r = m
    } // Сужение границ
  }
  return r
}

export function find_first_node<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  key: K,
): Node<T, K> {
  const nodes = tree.nodes
  let cur = nodes.get(tree.root)
  const comparator = tree.comparator
  while (cur.leaf != true) {
    const i = find_first_key(cur.keys, key, comparator)
    cur = nodes.get(cur.children[i])
    // for non unique index
    if (!tree.unique) {
      if (
        comparator(key, cur.min) <= 0 &&
        comparator(key, cur.left?.max) <= 0
      ) {
        while (comparator(key, cur.left?.max) <= 0) {
          if (cur.left) {
            cur = cur.left
          } else {
            break
          }
        }
      } else if (comparator(cur.max, key) < 0) {
        while (comparator(cur.max, key) < 0) {
          if (cur.right) cur = cur.right
          else break
          if (comparator(key, cur.right?.min) >= 0) break
        }
      }
    }
  }
  return cur
}

/**
 * search index of possible location item
 * @param a ordered array
 * @param key value to insert into array
 * @returns the position where the value can be inserted
 */
export function find_last_item<K extends ValueType>(
  a: Array<K>,
  key: K,
  comparator: Comparator<K>,
): number {
  // l, r — левая и правая границы
  let l = -1
  let r: number = a.length
  key = (key == null && typeof a[0] == 'string' ? '' : key) as K
  while (l < r - 1) {
    // Запускаем цикл
    const m = (l + r) >> 1 // m — середина области поиска
    if (comparator(key, a[m]) >= 0) {
      l = m
    } else {
      r = m
    } // Сужение границ
  }
  // Check index `l` after the loop.
  // If l is valid and a[l] matches the key, it's the last occurrence.
  return l >= 0 && l < a.length && comparator(a[l], key) === 0 ? l : -1
}

/**
 * search index of possible location item
 * @param a ordered array
 * @param key value to insert into array
 * @returns the position where the value can be inserted
 */
export function find_last_key<K extends ValueType>(
  a: Array<K>,
  key: K,
  comparator: Comparator<K>,
): number {
  // l, r — левая и правая границы
  let l = -1
  let r: number = a.length
  key = (key == null && typeof a[0] == 'string' ? '' : key) as K
  while (l < r - 1) {
    // Запускаем цикл
    const m = (l + r) >> 1 // m — середина области поиска
    if (comparator(key, a[m]) >= 0) {
      l = m
    } else {
      r = m
    } // Сужение границ
  }
  return r
}


export function find_last_node<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  key: K,
): Node<T, K> {
  const nodes = tree.nodes
  let cur = nodes.get(tree.root)

  while (cur.leaf != true) {
    const i = find_last_key(cur.keys, key, tree.comparator)
    cur = nodes.get(cur.children[i])
  }
  return cur
}

export function get_items_from_array_slice<T, K>({
  array,
  skip = 0,
  take = -1,
  forward = true,
}: {
  array: Array<T>
  skip?: number
  take?: number
  forward?: boolean
}): Array<T> {
  let result: Array<T>
  if (take == -1) take = array.length - skip
  if (forward) {
    const start = skip
    const end = skip + take
    result = array.slice(start, end)
  } else {
    const length = array.length
    const start = length - skip - 1
    const end = start - take
    result = array.slice(start, end)
    result.reverse()
  }
  return result
}

export function get_items_from_Array<T>({
  array,
  skip = 0,
  take = -1,
  forward = true,
}: {
  array: Array<T>
  skip?: number
  take?: number
  forward?: boolean
}): Array<T> {
  const result = []
  if (take == -1) take = array.length - skip
  if (forward) {
    const start = skip
    const end = skip + take
    for (let i = start; i < end; i++) result.push(array[i])
  } else {
    const length = array.length
    const start = length - skip - 1
    const end = start - take
    for (let i = start; i > end; i--) result.push(array[i])
  }
  return result
}

export function get_items<T, K extends ValueType>(
  node: Node<T, K>,
  key: K = undefined,
): Array<T> {
  const start = find_first_item(node.keys, key, node.tree.comparator)
  let i = start
  if (node.leaf) {
    if (key === undefined) {
      return node.pointers
    } else {
      const lres = []
      while (node.keys[i] == key) {
        lres.push(node.pointers[i])
        i++
      }
      return lres
    }
  } else throw new Error('can be uses on leaf nodes only')
}

export function insert<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  key: K,
  value: T,
): boolean {
  const leaf = find_first_node(tree, key)
  // console.log(`[insert] Found leaf node ${leaf.id} for key ${key}. Leaf size before insert: ${leaf.size}, t=${tree.t}, isFull threshold=${2 * tree.t - 1}`);
  // Check for uniqueness before insertion
  if (tree.unique) {
      const existingIndex = find_first_item(leaf.keys, key, tree.comparator);
      if (existingIndex !== -1 && leaf.keys[existingIndex] !== undefined && tree.comparator(leaf.keys[existingIndex], key) === 0) {
          // console.log(`[insert] Unique constraint violation for key ${key}. Insert failed.`);
          return false;
      }
  }

  leaf.insert([key, value])
  // console.log(`[insert] Inserted [${key}, ${JSON.stringify(value)}] into leaf ${leaf.id}. Leaf size after insert: ${leaf.size}`);

  // Check if the leaf node is full after insertion
  if (leaf.isFull) {
    // console.log(`[insert] Leaf node ${leaf.id} is full (size=${leaf.size}). Calling split...`);
    split(tree, leaf) // Разбиваем узел
  // } else {
     // console.log(`[insert] Leaf node ${leaf.id} is not full (size=${leaf.size}). No split needed.`);
  }
  return true
}

export function max<T, K extends ValueType>(node: Node<T, K>): K {
  const nodes = node.tree.nodes

  return node.leaf
    ? (node.keys[node.key_num - 1] ?? undefined)
    : node.children?.length
      ? nodes.get(node.children[node.size - 1]).max
      : undefined
}

export function min<T, K extends ValueType>(node: Node<T, K>): K {
  const nodes = node.tree.nodes
  return node.leaf
    ? (node.keys[0] ?? undefined)
    : node.children?.length
      ? nodes.get(node.children[0]).min
      : undefined
}

export function reflow<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  node: Node<T, K>,
): void {
  if (node) {
    if (node.key_num < tree.t - 1 || node.isEmpty) {
      const right_sibling = node.right
      const left_sibling = node.left
      const bl = can_borrow_left(node)
      const br = can_borrow_right(node)
      // можем ли взять у соседа данных
      if (bl > 0 || br > 0) {
        // нужно взять до половины
        // берем у кого больше
        if (bl > br) {
          //1. слева есть откуда брать и количество элементов достаточно
          merge_with_left(node, left_sibling, bl)
          node.commit()
        } else {
          // 2. крайний справа элемент есть и в нем достаточно элементов для займа
          merge_with_right(node, right_sibling, br)
          node.commit()
        }
        // reflow(tree, parent)
        // if (parent != right_sibling.parent) reflow(tree, right_sibling.parent)
      } else {
        // не у кого взять данных - удаляем узел
        if (!node.isEmpty) {
          // слева не пустой элемент
          if (left_sibling) {
            merge_with_right(left_sibling, node, node.size)
            // left_sibling.removeSiblingAtRight()
            const parent = node.parent
            if (parent) {
              remove_node(parent, node)
            }
            node.commit()
            reflow(tree, parent)
            if (parent != left_sibling.parent) {
              reflow(tree, left_sibling.parent)
            } else {
              left_sibling.commit()
            }
          } else if (right_sibling) {
            merge_with_left(right_sibling, node, node.size)
            const parent = node.parent
            if (parent) {
              remove_node(parent, node)
            }
            node.commit()
            reflow(tree, parent)
            if (parent != right_sibling.parent) {
              reflow(tree, right_sibling.parent)
            }
          } else if (node.isEmpty) {
            const parent = node.parent
            if (node.right) remove_sibling(node.right, 'left')
            if (node.left) remove_sibling(node.left, 'right')
            if (parent) {
              remove_node(parent, node)
            }
            reflow(tree, parent)
            node.commit()
          }
        } else {
          // пустой узел удалить
          if (left_sibling) {
            remove_sibling(left_sibling, 'right')
          } else if (right_sibling) {
            remove_sibling(right_sibling, 'left')
          }
          const parent = node.parent
          if (parent) {
            remove_node(parent, node)
          }
          node.commit()
          if (parent) {
            reflow(tree, parent)
            if (left_sibling) {
              if (parent != left_sibling.parent) {
                reflow(tree, left_sibling.parent)
              }
            } else if (right_sibling) {
              if (parent != right_sibling.parent) {
                reflow(tree, right_sibling.parent)
              }
            }
          }
        }
        //удаляем узел
        node.delete()
      }
    } else {
      node.commit()
    }
  }
}

export function remove_specific<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  key: K,
  specific: (pointers: T) => boolean,
): Array<[K, T]> {
  const cursors: Array<Cursor<T, K>> = []
  for (const the_one of tree.equalsNulls(key)(tree)) {
    if (specific(the_one.value)) {
      cursors.push(the_one)
    }
  }
  return delete_by_cursor_list<T, K>(tree, cursors)
}

export function remove<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  key: K,
  all = false,
): Array<[K, T]> {
  const result: Array<[K, T]> = []
  let leaf = find_first_node(tree, key)
  if (find_first_item_remove(leaf.keys, key, tree.comparator) > -1) {
    if (all) {
      do {
        result.push(...delete_in_node(tree, leaf, key, all)) // Удалить ключ из вершины
        leaf = find_first_node(tree, key)
      } while (find_first_item_remove(leaf.keys, key, tree.comparator) != -1)
    } else {
      result.push(...delete_in_node(tree, leaf, key, all)) // Удалить ключ из вершины
    }
  }
  return result
}

export function size<T, K extends ValueType>(node: Node<T, K>): number {
  let lres = 0
  const start = 0
  let i = start
  if (node.leaf) {
    return node.key_num
  } else {
    const nodes = node.tree.nodes
    const len = node.size
    while (i < len) {
      const res = size(nodes.get(node.children[i]))
      lres += res
      i++
    }
    return lres
  }
}

export function split<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  node: Node<T, K>,
): void {
  // console.log(`[split] Splitting node ${node.id} (leaf=${node.leaf}, size=${node.size}, key_num=${node.key_num})`); // Log start of split

  // Create the new sibling node
  const new_node = node.leaf ? Node.createLeaf(tree) : Node.createNode(tree)
  // console.log(`[split] Created new node ${new_node.id}`);

  // Link siblings
  add_sibling(node, new_node, 'right')
  // console.log(`[split] Linked siblings: node ${node.id} <-> node ${new_node.id}`);

  // Calculate split point (middle key)
  const splitIndex = Math.floor(node.key_num / 2); // Index of the key to move up (for internal nodes)
  const middleKey = node.keys[splitIndex]; // Key that might move up

  // Move the second half of keys and pointers/children to the new node
  if (node.leaf) {
    // For leaf nodes, move keys and pointers from splitIndex onwards
    // The key at splitIndex *stays* in the left node briefly, then moves up indirectly
    // Or rather, for leaves, we split keys and pointers
    const splitKeyIndex = Math.ceil(node.key_num / 2); // Start moving from here
    new_node.keys = node.keys.splice(splitKeyIndex);
    new_node.pointers = node.pointers.splice(splitKeyIndex);
  } else {
    // For internal nodes, move keys *after* splitIndex and children from splitIndex+1
    new_node.keys = node.keys.splice(splitIndex + 1);
    new_node.children = node.children.splice(splitIndex + 1);
    // Re-assign parent for moved children
    new_node.children.forEach(childId => {
        const childNode = tree.nodes.get(childId);
        if (childNode) childNode.parent = new_node;
    });
  }

  // Key at splitIndex is removed from original node only for internal nodes,
  // as it moves up to the parent.
  if (!node.leaf) {
      node.keys.splice(splitIndex); // Remove the key that moved up and keys after it
  }

  // console.log(`[split] Moved items. Node ${node.id} keys: ${JSON.stringify(node.keys)}, Node ${new_node.id} keys: ${JSON.stringify(new_node.keys)}`);

  // Update state for both nodes
  update_state(node);
  update_state(new_node);
  // console.log(`[split] Updated states. Node ${node.id} size=${node.size}, Node ${new_node.id} size=${new_node.size}`);

  // Update min/max for both nodes (crucial!)
  update_min_max(node);
  update_min_max(new_node);
  // console.log(`[split] Updated min/max. Node ${node.id} min=${node.min},max=${node.max}. Node ${new_node.id} min=${new_node.min},max=${new_node.max}`);


  // Insert the middle key into the parent or create a new root
  if (node.id == tree.root) {
    // console.log(`[split] Node ${node.id} is root. Creating new root.`);
    const newRoot = Node.createRootFrom(tree, node, new_node)
    tree.root = newRoot.id;
    // console.log(`[split] New root is ${newRoot.id}`);
  } else {
    const parent = node.parent
    // For leaves, the key to insert is the first key of the new right node
    // For internal nodes, it's the middleKey that was removed from the original node
    const keyToInsert = node.leaf ? new_node.keys[0] : middleKey;
    // console.log(`[split] Inserting key ${keyToInsert} into parent ${parent.id}`);
    attach_one_to_right_after(parent, new_node, node); // This function needs the key to insert
    // Let's modify attach_one_to_right_after or insert into parent here

    // Modification: Insert key into parent directly here instead of relying on attach_one...
    const parentInsertPos = find_last_key(parent.keys, node.max, tree.comparator); // Find position relative to original node's max
    parent.keys.splice(parentInsertPos, 0, keyToInsert);
    // We already added the child pointer via add_sibling and attach_one...
    // Need to ensure attach_one_to_right_after ONLY adds the child pointer and links siblings
    update_state(parent); // Update parent state
    update_min_max(parent); // Update parent min/max

    // console.log(`[split] Updated parent ${parent.id}. Parent keys: ${JSON.stringify(parent.keys)}`);

    // Check if parent is now full and needs splitting
    if (parent.isFull) {
      // console.log(`[split] Parent node ${parent.id} is now full. Splitting parent.`);
      split(tree, parent)
    }
  }
}

export function try_to_pull_up_tree<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
): void {
  const nodes = tree.nodes
  const root = nodes.get(tree.root)
  if (root.size == 1 && !root.leaf) {
    const node = nodes.get(tree.root)
    const new_root = nodes.get(root.children.pop())
    tree.root = new_root.id
    new_root.parent = undefined
    node.delete()
  }
}
