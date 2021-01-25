import 'jest'
import { findFast } from './../findFast'

const orderedArray = [
  97,
  1601,
  114131,
  477275,
  1526626,
  1679359,
  3644322,
  5218838,
  5647301,
  5696333,
  7310713,
  7499978,
  8310101,
  8768835,
  9654580,
]

describe('find_fast works', () => {
  it('return proper item index', () => {
    expect(findFast(orderedArray, 5218838)).toBe(orderedArray.indexOf(5218838))
  })
  it('return -1 if itemnot present', () => {
    expect(findFast(orderedArray, 1)).toBe(-1)
  })
  it('it it return first appearance of item or -1 if not found', () => {
    expect(findFast([11, 12, 13, 15, 15, 15, 15, 17], 15)).toBe(3)
    expect(findFast([0, 0, 0, 0, 1], 1)).toBe(4)
    expect(findFast([0, 1, 1, 3], 1)).toBe(1)
    expect(findFast([1, 1, 1, 1], 1)).toBe(0)
    expect(findFast([1, 2, 2, 2], 1)).toBe(0)
    expect(findFast([-1, 0, 0, 1], 1)).toBe(3)
    expect(findFast([-1, 0, 0, 1, 1, 1, 1, 1, 1, 2], 1)).toBe(3)
    expect(findFast([-1, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2], 1)).toBe(3)
    expect(findFast([-1, 0, 0, 2, 2, 2, 2, 2, 2, 2], 1)).toBe(-1)
  })
})
