import 'jest'
import { split } from '../split'
import { BPlusTree } from '../../types/BPlusTree'

const insertion = [0, 9, 3, 14, 12, 13, 6, 10, 2, 1, 4, 8, 5, 11, 7]

describe('split', () => {
  it('remove in reverse order by max', () => {
    const bpt = new BPlusTree(2, true)
    expect(() =>
      insertion.forEach((i, index) => {
        bpt.insert(i, index)
      }),
    ).not.toThrow()

    expect(() => {
      bpt.max()
      insertion.forEach((item) => {
        const result = bpt.find(item).keys.indexOf(item)
        if (result == -1) throw new Error(`not found ${item}`)
      })
    }).not.toThrow()
    let last = insertion.length
    expect(() => {
      let result
      do {
        let max
        max = bpt.max()
        result = bpt.remove(max)
        if (!result) throw new Error(`not found ${max} ${last}`)
        const block = bpt.find(max)
        if (block.keys.indexOf(max) != -1)
          throw new Error(`not removed ${max}  ${last}`)
        last--
      } while (last != 0 || result)
    }).not.toThrow()
    expect(last).toBe(0)
  })
  it('remove in reverse order by min', () => {
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

    let last = insertion.length
    expect(() => {
      let result
      do {
        let min
        min = bpt.min()
        result = bpt.remove(min)
        if (!result) throw new Error(`not found ${min} ${last}`)
        const block = bpt.find(min)
        if (block.keys.indexOf(min) != -1)
          throw new Error(`not removed ${min}  ${last}`)
        last--
      } while (last != 0 || result)
    }).not.toThrow()
    expect(last).toBe(0)
  })
  it('remove in reverse order by max', () => {
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

    expect(() => {
      insertion.forEach((item) => {
        const result = bpt.remove(item)
        if (!result) throw new Error(`unable to remove ${item}`)
      })
    }).not.toThrow()

    expect(bpt.toJSON()).toMatchSnapshot('B+Tree')
  })
})
