import type { BPlusTree } from './BPlusTree'
import { add_initial_nodes, find_first_item, find_last_key, remove_sibling } from './methods'

export type valueOf = { valueOf(): any }
export type ValueType = number | string | boolean | Date | bigint | valueOf
export type Value = unknown

// можно использовать скип, относительное перемещение по страницам... зная их размер,можно просто пропускать сколько нужно
// можно в курсорах указывать: отсюда и 10 элементов
// перемещаться так же можно по ключу --- значению
/**
 * в дереве храняться значения ключевого поля и указатель на запись, по сути это будет id
 * но тут можно хранить и значения
 */
export type PortableBPlusTree<T, K extends ValueType> = {
  t: number
  next_node_id: number
  root: number
  unique: boolean
  nodes: Array<PortableNode<T, K>>
}

// TODO: MAKE NODE SIMPLE OBJECT with static methods?????
export class Node<T, K extends ValueType> {
  static createLeaf<T, K extends ValueType>(tree: BPlusTree<T, K>): Node<T, K> {
    const node = new Node<T, K>()
    node.leaf = true
    // node.t = tree.t
    node.pointers = []
    register_node(tree, node)
    return node
  }
  static createNode<T, K extends ValueType>(tree: BPlusTree<T, K>): Node<T, K> {
    const node = new Node<T, K>()
    node.children = []
    node.leaf = false
    // node.t = tree.t
    register_node(tree, node)
    return node
  }
  static createRootFrom<T, K extends ValueType>(
    tree: BPlusTree<T, K>,
    ...node: Array<Node<T, K>>
  ): Node<T, K> {
    const root = Node.createNode(tree)
    add_initial_nodes(root, node)
    return root
  }
  static serialize<T, K extends ValueType>(
    node: Node<T, K>,
  ): PortableNode<T, K> {
    const {
      id,
      leaf,
      t,
      _parent,
      _left,
      _right,
      isEmpty,
      isFull,
      max,
      min,
      size,
      keys,
      key_num,
      pointers,
      children,
    } = node
    return {
      id,
      leaf,
      t,
      _parent,
      _left,
      _right,
      isEmpty,
      isFull,
      max,
      min,
      size,
      keys: node.tree.keySerializer(keys),
      key_num,
      pointers,
      children,
    }
  }
  static deserialize<T, K extends ValueType>(
    stored: PortableNode<T, K>,
    tree: BPlusTree<T, K>,
  ): Node<T, K> {
    const node = new Node<T, K>()
    node.tree = tree
    node.id = stored.id
    node.leaf = stored.leaf
    // node.t = stored.t
    node._parent = stored._parent
    node._left = stored._left
    node._right = stored._right
    node.isEmpty = stored.isEmpty
    node.isFull = stored.isFull
    node.max = stored.max
    node.min = stored.min
    node.size = stored.size
    node.keys = tree.keyDeserializer(stored.keys)
    node.key_num = stored.key_num
    node.pointers = stored.pointers
    node.children = stored.children
    return node
  }

  id: number
  get t(): number {
    return this.tree?.t ?? 32
  }
  //count of containing elements
  length: number // количество элементов в узле
  // t: number
  leaf: boolean // является ли узел листом
  key_num: number // количество ключей узла
  size: number // значимый размер узла
  keys: Array<K> // ключи узла
  pointers: Array<T> // если лист — указатели на данные
  min: K
  max: K
  isFull: boolean
  isEmpty: boolean
  tree: BPlusTree<T, K>
  private constructor() {
    this.keys = []

    this.key_num = 0
    this.size = 0
    this.isFull = false
    this.isEmpty = true
    this.min = undefined
    this.max = undefined
  }

  delete(): void {
    if (this.tree?.root != this.id) unregister_node(this.tree, this)
  }

  insert(item: [K, T]): void {
    const [key, value] = item
    const pos = find_last_key(this.keys, key, this.tree.comparator)
    this.keys.splice(pos, 0, key)
    this.pointers.splice(pos, 0, value)

    update_state(this)

    if (pos == 0) {
      insert_new_min(this, key)
    }
    if (pos == this.size - 1) {
      insert_new_max(this, key)
    }
  }

  remove(item: K): [K, T] {
    const pos = find_first_item(this.keys, item, this.tree.comparator)
    const res: [K, T] = [item, this.pointers.splice(pos, 1)[0]]
    this.keys.splice(pos, 1)
    update_state(this)

    if (pos == 0) {
      replace_min(this, this.keys[0])
    }
    // as far as we splice last item from node it is now at length position
    if (pos == this.keys.length) {
      replace_max(this, this.keys[pos - 1])
    }
    return res
  }

  commit(): void {
    if (this.key_num == 0 && this.size == 1 && this.parent && !this.leaf) {
      push_node_up(this)
      if (this.parent?.size > 0) {
        this.parent.commit()
      }
    }
  }

  get errors(): Array<string> {
    return validate_node(this)
  }

  toJSON(): PortableNode<T, K> & { errors: Array<string> } {
    if (this.leaf) {
      return {
        t: this.t,
        isEmpty: this.isEmpty,
        size: this.size,
        children: [],
        id: this.id,
        leaf: this.leaf,
        keys: this.tree.keySerializer(this.keys),
        key_num: this.key_num,
        min: this.min,
        max: this.max,
        pointers: this.pointers,
        _left: this._left,
        _right: this._right,
        _parent: this._parent,
        isFull: this.isFull,
        errors: this.errors,
      }
    } else {
      return {
        id: this.id,
        t: this.t,
        isEmpty: this.isEmpty,
        size: this.size,
        leaf: this.leaf,
        keys: this.tree.keySerializer(this.keys),
        key_num: this.key_num,
        min: this.min,
        max: this.max,
        _left: this._left,
        _right: this._right,
        children: this.children,
        pointers: undefined,
        _parent: this._parent,
        isFull: this.isFull,
        errors: this.errors,
      }
    }
  }

  children: Array<number> // ключи на детей узла

  // указатель на отца
  _parent: number

  get parent(): Node<T, K> {
    return this.tree?.nodes.get(this._parent) ?? undefined
  }
  set parent(node: Node<T, K>) {
    this._parent = node?.id ?? undefined
  }
  // указатель на левого брата
  _left: number
  _right: number
  get left(): Node<T, K> {
    return this.tree?.nodes.get(this._left) ?? undefined
  }
  set left(node: Node<T, K>) {
    this._left = node?.id ?? undefined
  }
  // указатель на правого брата
  get right(): Node<T, K> {
    return this.tree?.nodes.get(this._right) ?? undefined
  }
  set right(node: Node<T, K>) {
    this._right = node?.id ?? undefined
  }
}

/**
 * все манипуляции с деревом простое объединение массивов
 * поскольку мы знаем что и откуда надо брать
 * отсюда: все операции это просто функции
 *
 * операции пользователя это вставка... он вставляет только данные а не узлы дерева
 * а это методы дерева
 *
 */

export function validate_node<T, K extends ValueType>(
  node: Node<T, K>,
): Array<string> {
  const res: Array<string> = []
  if (!node.isEmpty) {
    if (!node.leaf) {
      if (node.children.length != node.keys.length + 1) {
        res.push(
          `!children ${node.leaf ? 'L' : 'N'}${node.id} ${
            node.children.length
          } ${node.keys.length}`,
        )
      }
      if (node.keys.length != node.key_num) {
        res.push(`!keys ${node.id}`)
      }
    }
    if (node.size != (node.leaf ? node.key_num : node.children.length)) {
      res.push(`!size ${node.id}`)
    }
  }
  return res
}

export function insert_new_max<T, K extends ValueType>(
  node: Node<T, K>,
  key: K,
): void {
  node.max = key
  let cur = node
  while (cur.parent) {
    const parent = cur.parent
    if (parent.children.indexOf(cur.id) == parent.key_num) {
      parent.max = key
      cur = parent
    } else break
  }
}

export function insert_new_min<T, K extends ValueType>(
  node: Node<T, K>,
  key: K,
): void {
  node.min = key
  let cur = node
  while (cur.parent) {
    const parent = cur.parent
    const pos = parent.children.indexOf(cur.id)
    if (pos > 0) {
      parent.keys[pos - 1] = key
      break
    } else {
      parent.min = key
      cur = parent
    }
  }
}

export type PortableNode<T, K extends ValueType> = {
  id: number
  t: number
  _parent: number
  _left: number
  _right: number
  isEmpty: boolean
  isFull: boolean
  leaf: boolean
  max: K
  min: K
  size: number
  keys: any
  key_num: number
  pointers: Array<T>
  children: Array<number>
  errors?: Array<string>
}

export function push_node_up<T, K extends ValueType>(node: Node<T, K>): void {
  const child = node.tree.nodes.get(node.children.pop())
  const parent = node.parent
  // вставляем на прямо на то же место где и был
  const pos = parent.children.indexOf(node.id)
  parent.children[pos] = child.id
  child.parent = parent
  if (node.right) remove_sibling(node.right, 'left')
  if (node.left) remove_sibling(node.left, 'right')
  node.parent = undefined
  node.delete()
  parent.commit()
}

export function register_node<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  node: Node<T, K>,
): void {
  if (tree.nodes.has(node.id)) throw new Error('already here')
  node.tree = tree
  node.id = tree.get_next_id()
  tree.nodes.set(node.id, node)
}

export function remove_node<T, K extends ValueType>(
  obj: Node<T, K>,
  item: Node<T, K>,
): Node<T, K> {
  const pos = obj.children.indexOf(item.id)
  obj.children.splice(pos, 1)
  if (pos == 0) {
    obj.keys.shift()
  } else {
    obj.keys.splice(pos - 1, 1)
  }
  item.parent = undefined
  if (item.right) remove_sibling(item.right, 'left')
  if (item.left) remove_sibling(item.left, 'right')

  update_state(item)

  update_state(obj)

  const nodes = obj.tree.nodes
  if (pos == 0) {
    const min = nodes.get(obj.children[0])?.min
    insert_new_min(obj, min)
  }
  // as far as we splice last item from node it is now at length position
  if (pos == obj.size) {
    const max = nodes.get(obj.children[obj.key_num])?.max
    insert_new_max(obj, max)
  }
  return item
}

export function replace_max<T, K extends ValueType>(
  node: Node<T, K>,
  key: K,
): void {
  node.max = key
  let cur = node
  while (cur.parent) {
    const parent = cur.parent
    const pos = parent.children.indexOf(cur.id)
    if (pos == parent.children.length - 1) {
      parent.max = key
      cur = parent
    } else break
  }
}

export function replace_min<T, K extends ValueType>(
  node: Node<T, K>,
  key: K,
): void {
  node.min = key
  let cur = node
  while (cur.parent) {
    const parent = cur.parent
    const pos = parent.children.indexOf(cur.id)
    if (pos > 0) {
      parent.keys[pos - 1] = key
      break
    } else {
      parent.min = key
      cur = parent
    }
  }
}

export function unregister_node<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  node: Node<T, K>,
): void {
  if (!tree.nodes.has(node.id)) throw new Error(`already removed ${node.id}`)
  node.tree = undefined
  tree.nodes.delete(node.id)
}

export function update_min_max<T, K extends ValueType>(node: Node<T, K>): void {
  if (!node.isEmpty) {
    const nodes = node.tree.nodes
    if (node.leaf) {
      replace_min(node, node.keys[0])
      replace_max(node, node.keys[node.size - 1])
    } else {
      replace_min(node, nodes.get(node.children[0]).min)
      replace_max(node, nodes.get(node.children[node.size - 1]).max)
    }
  } else {
    node.min = undefined
    node.max = undefined
  }
}

export function update_state<T, K extends ValueType>(node: Node<T, K>): void {
  // Use key_num for fullness check as it represents the number of keys
  node.key_num = node.keys.length
  node.size = node.leaf ? node.key_num : node.children.length

  // Correct fullness check based on key_num and the maximum number of keys (2*t - 1)
  node.isFull = node.key_num >= (2 * node.t - 1) // Node is full if key count reaches the max

  node.isEmpty = node.key_num <= 0 // Node is empty if it has no keys
}
