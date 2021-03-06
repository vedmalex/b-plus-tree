import 'jest'
import { merge_with_left } from '../borrow_left'
import { BPlusTree } from '../../types/BPlusTree'
import { merge_with_right } from '../borrow_right'
import { PortableBPlusTree } from '../../types/PortableBPlusTree'

const stored: PortableBPlusTree<number> = {
  root: 10000,
  unique: false,
  t: 5,
  next_node_id: 1000000,
  nodes: [
    {
      id: 10000,
      leaf: false,
      t: 5,
      _parent: undefined,
      _left: undefined,
      _right: undefined,
      isEmpty: false,
      isFull: false,
      max: 100,
      min: 0,
      size: 2,
      keys: [50],
      key_num: 1,
      pointers: undefined,
      children: [1000, 2000],
    },
    {
      id: 1000,
      leaf: false,
      t: 5,
      _parent: 10000,
      _left: undefined,
      _right: 2000,
      isEmpty: false,
      isFull: false,
      max: 49,
      min: 0,
      size: 5,
      keys: [10, 20, 30, 40],
      key_num: 4,
      pointers: undefined,
      children: [90, 190, 290, 390, 490],
    },
    {
      id: 90,
      leaf: true,
      t: 5,
      _parent: 1000,
      _left: undefined,
      _right: 190,
      isEmpty: false,
      isFull: false,
      max: 9,
      min: 0,
      size: 10,
      keys: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      key_num: 10,
      pointers: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      children: undefined,
    },
    {
      id: 190,
      leaf: true,
      t: 5,
      _parent: 1000,
      _left: 90,
      _right: 290,
      isEmpty: false,
      isFull: false,
      max: 19,
      min: 10,
      size: 10,
      keys: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
      key_num: 10,
      pointers: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
      children: undefined,
    },
    {
      id: 290,
      leaf: true,
      t: 5,
      _parent: 1000,
      _left: 190,
      _right: 390,
      isEmpty: false,
      isFull: false,
      max: 29,
      min: 20,
      size: 10,
      keys: [20, 21, 22, 23, 24, 25, 26, 27, 28, 29],
      key_num: 10,
      pointers: [20, 21, 22, 23, 24, 25, 26, 27, 28, 29],
      children: undefined,
    },
    {
      id: 390,
      leaf: true,
      t: 5,
      _parent: 1000,
      _left: 290,
      _right: 490,
      isEmpty: false,
      isFull: false,
      max: 39,
      min: 30,
      size: 10,
      keys: [30, 31, 32, 33, 34, 35, 36, 37, 38, 39],
      key_num: 10,
      pointers: [30, 31, 32, 33, 34, 35, 36, 37, 38, 39],
      children: undefined,
    },
    {
      id: 490,
      leaf: true,
      t: 5,
      _parent: 1000,
      _left: 390,
      _right: 590,
      isEmpty: false,
      isFull: false,
      max: 49,
      min: 40,
      size: 10,
      keys: [40, 41, 42, 43, 44, 45, 46, 47, 48, 49],
      key_num: 10,
      pointers: [40, 41, 42, 43, 44, 45, 46, 47, 48, 49],
      children: undefined,
    },
    {
      id: 2000,
      leaf: false,
      t: 5,
      _parent: 10000,
      _left: 1000,
      _right: undefined,
      isEmpty: false,
      isFull: false,
      max: 99,
      min: 50,
      size: 5,
      keys: [60, 70, 80, 90],
      key_num: 4,
      pointers: undefined,
      children: [590, 690, 790, 890, 990],
    },
    {
      id: 590,
      leaf: true,
      t: 5,
      _parent: 2000,
      _left: 490,
      _right: 690,
      isEmpty: false,
      isFull: false,
      max: 59,
      min: 50,
      size: 10,
      keys: [50, 51, 52, 53, 54, 55, 56, 57, 58, 59],
      key_num: 10,
      pointers: [50, 51, 52, 53, 54, 55, 56, 57, 58, 59],
      children: undefined,
    },
    {
      id: 690,
      leaf: true,
      t: 5,
      _parent: 2000,
      _left: 590,
      _right: 790,
      isEmpty: false,
      isFull: false,
      max: 69,
      min: 60,
      size: 10,
      keys: [60, 61, 62, 63, 64, 65, 66, 67, 68, 69],
      key_num: 10,
      pointers: [60, 61, 62, 63, 64, 65, 66, 67, 68, 69],
      children: undefined,
    },
    {
      id: 790,
      leaf: true,
      t: 5,
      _parent: 2000,
      _left: 690,
      _right: 890,
      isEmpty: false,
      isFull: false,
      max: 79,
      min: 70,
      size: 10,
      keys: [70, 71, 72, 73, 74, 75, 76, 77, 78, 79],
      key_num: 10,
      pointers: [70, 71, 72, 73, 74, 75, 76, 77, 78, 79],
      children: undefined,
    },
    {
      id: 890,
      leaf: true,
      t: 5,
      _parent: 2000,
      _left: 790,
      _right: 990,
      isEmpty: false,
      isFull: false,
      max: 89,
      min: 80,
      size: 10,
      keys: [80, 81, 82, 83, 84, 85, 86, 87, 88, 89],
      key_num: 10,
      pointers: [80, 81, 82, 83, 84, 85, 86, 87, 88, 89],
      children: undefined,
    },
    {
      id: 990,
      leaf: true,
      t: 5,
      _parent: 2000,
      _left: 890,
      _right: undefined,
      isEmpty: false,
      isFull: false,
      max: 99,
      min: 90,
      size: 10,
      keys: [90, 91, 92, 93, 94, 95, 96, 97, 98, 99],
      key_num: 10,
      pointers: [90, 91, 92, 93, 94, 95, 96, 97, 98, 99],
      children: undefined,
    },
  ],
}
describe('leaf', () => {
  it('loads tree from stored', () => {
    const tree = new BPlusTree<number>(2, false)
    BPlusTree.deserialize(tree, stored)
    const size = tree.size
    expect(size).toBe(100)
    expect(tree.min).toBe(0)
    expect(tree.max).toBe(100)
  })
  it('moved from one to another', () => {
    const tree = new BPlusTree<number>(2, false)
    BPlusTree.deserialize(tree, stored)
    const left = tree.nodes.get(1000)
    const right = tree.nodes.get(2000)
    merge_with_left(right, left, 2)
    expect(right.errors.length).toBe(0)
    expect(left.errors.length).toBe(0)
    merge_with_left(right, left, 3)
    expect(right.errors.length).toBe(0)
    expect(left.errors.length).toBe(0)
    merge_with_right(left, right, 2)
    expect(right.errors.length).toBe(0)
    expect(left.errors.length).toBe(0)
    merge_with_right(left, right, 3)
    expect(right.errors.length).toBe(0)
    expect(left.errors.length).toBe(0)
    merge_with_right(left, right, 5)
    expect(right.errors.length).toBe(0)
    expect(left.errors.length).toBe(0)
  })
})
