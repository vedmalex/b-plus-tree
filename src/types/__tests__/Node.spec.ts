import 'jest'
import { Node } from '../Node'
import { findFast } from '../../methods/findFast'
describe('node is work', () => {
  it('if leaf is created: pointers is initiated', () => {
    const node = Node.createLeaf()
    expect(node.pointers).toHaveLength(0)
  })
  it('if node is created: children is initiated', () => {
    const node = Node.createNode()
    expect(node.children).toHaveLength(0)
    expect(node).toHaveProperty('leaf')
    expect(node.leaf).toBeFalsy()
  })
  it('if leaf is created: pointers is initiated', () => {
    const node = Node.createLeaf()
    expect(node).toHaveProperty('min')
    expect(node.min).toBeUndefined()
    expect(node).toHaveProperty('max')
    expect(node.max).toBeUndefined()
    expect(node).toHaveProperty('isFull')
    expect(node.isFull).toBeFalsy()
    expect(node).toHaveProperty('isEmpty')
    expect(node.isEmpty).toBeTruthy()
    expect(node).toHaveProperty('keys')
    expect(node.keys).toHaveLength(0)
    expect(node).toHaveProperty('key_num')
    expect(node.key_num).toBe(0)
    expect(node).toHaveProperty('size')
    expect(node.size).toBe(0)
  })
  it('updates keys', () => {
    const node = Node.createLeaf()
    node.keys.push(1, 2, 3, 4, 5)
    node.commit()
    expect(node.key_num).toBe(5)
    expect(node.size).toBe(5)
  })

  it('updates keys', () => {
    const node = Node.createLeaf()
    node.keys.push(1, 2, 3, 4, 5)
    node.commit()
    expect(node.key_num).toBe(5)
    expect(node.size).toBe(5)
    expect(node.min).toBe(1)
    expect(node.max).toBe(5)
  })

  it('update parent metrics', () => {
    const root = Node.createNode()
    const parent = Node.createNode()
    const parent2 = Node.createNode()
    const leaf = Node.createLeaf()
    const leaf2 = Node.createLeaf()
    const leaf3 = Node.createLeaf()
    const leaf4 = Node.createLeaf()

    leaf.insertMany([1, '1'], [2, '2'])
    leaf.commit()
    expect(leaf.min).toBe(1)
    expect(leaf.max).toBe(2)
    expect(leaf.keys.indexOf(1)).toBe(0)
    expect(leaf.keys.indexOf(2)).toBe(1)
    leaf2.insertMany([3, '3'], [4, '4'])
    leaf2.commit()
    expect(leaf2.min).toBe(3)
    expect(leaf2.max).toBe(4)
    expect(leaf2.keys.indexOf(3)).toBe(0)
    expect(leaf2.keys.indexOf(4)).toBe(1)
    leaf3.insertMany([5, '5'], [6, '6'])
    leaf3.commit()
    expect(leaf3.min).toBe(5)
    expect(leaf3.max).toBe(6)
    expect(leaf3.keys.indexOf(5)).toBe(0)
    expect(leaf3.keys.indexOf(6)).toBe(1)
    leaf4.insertMany([7, '7'], [8, '8'])
    leaf4.commit()
    expect(leaf4.min).toBe(7)
    expect(leaf4.max).toBe(8)
    expect(leaf4.keys.indexOf(7)).toBe(0)
    expect(leaf4.keys.indexOf(8)).toBe(1)
    // проверяем что порядок вставки узла не важен
    parent.insertMany(leaf2, leaf)

    expect(parent.children[0]).toBe(leaf)
    expect(parent.children[1]).toBe(leaf2)
    parent2.insert(leaf4)
    parent2.insert(leaf3)
    expect(parent2.children.indexOf(leaf3)).toBe(0)
    expect(parent2.children.indexOf(leaf4)).toBe(1)
    parent.commit()
    parent2.commit()
    root.insert(parent2)
    root.insert(parent)
    expect(root.children[0]).toBe(parent)
    expect(root.children[1]).toBe(parent2)
    // expect(root.toJSON()).toMatchSnapshot('root')
  })
  it('throws to add empty node to parent', () => {
    const node = Node.createLeaf()
    node.insert([1, '1'])
    node.commit()
    const parent = Node.createNode()
    expect(() => parent.insert(node)).not.toThrow()
    expect(() => parent.insert(Node.createNode())).toThrow(
      "can't attach empty children to node",
    )
  })
  it('adds many items', () => {
    expect(() => Node.createLeaf().insertMany([1, '1'], [2, '2'])).not.toThrow()
  })

  it('adds sibling at right', () => {
    const node1 = Node.createLeaf()
    const node2 = Node.createLeaf()
    const node3 = Node.createLeaf()
    node1.addSiblingAtRight(node2)
    node2.addSiblingAtRight(node3)
    expect(() => node1.right.right).not.toThrow()
    expect(() => node3.left.left).not.toThrow()
    expect(node1.left).toBeUndefined()
    expect(node1.right).toBe(node2)
    expect(node2.left).toBe(node1)
    expect(node2.right).toBe(node3)
    expect(node3.left).toBe(node2)
    expect(node3.right).toBeUndefined()
  })

  it('removes', () => {
    const node = Node.createLeaf()
    node.insertMany([1, 1], [2, 2], [3, 3])

    expect(() => {
      const pos = findFast(node.keys, 2)
      node.keys.splice(pos, 1)
      if (node.leaf) {
        node.pointers.splice(pos, 1)
      } else {
        node.children.splice(pos + 1, 1)
      }
    }).not.toThrow()
  })
})
