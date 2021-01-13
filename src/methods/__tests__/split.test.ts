import 'jest'
import { split } from '../split'
import { BPlusTree } from '../../types/BPlusTree'

const insertion = [0, 9, 3, 14, 12, 13, 6, 10, 2, 1, 4, 8, 5, 11, 7]

describe('split', () => {
  it('split leaf into two sepate', () => {
    const bpt = new BPlusTree(2, true)
    expect(() =>
      insertion.forEach((i, index) => {
        bpt.insert(i, index)
      }),
    ).not.toThrow()

    expect(() => {
      insertion.forEach((item) => {
        const result = bpt.find(item).keys.indexOf(item)
        if (result == -1) throw new Error(`not found ${item}`)
      })
    }).not.toThrow()

    expect(bpt.toJSON()).toMatchSnapshot('B+Tree')
  })
})
