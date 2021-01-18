import 'jest'
import { Node } from '../../Node'
import { nodeComparator } from '../nodeComparator'

describe('it compares the values', () => {
  it('comapres', () => {
    const node0 = Node.createLeaf()
    node0.insert([1, 1])
    const node1 = Node.createLeaf()
    node1.insert([2, 2])
    const node2 = Node.createLeaf()
    node2.insert([1, 1])
    expect(nodeComparator(node0, node1)).toBe(-1)
    expect(nodeComparator(node1, node0)).toBe(1)
    expect(nodeComparator(node2, node0)).toBe(0)
  })
})
