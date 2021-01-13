import 'jest'
import { findPosInsert } from '../findPosInsert'

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

describe('findPosInsert search position', () => {
  it('looking for next position to insert item', () => {
    expect(findPosInsert(orderedArray, 0)).toBe(0)
    expect(findPosInsert(orderedArray, 100)).toBe(1)
    expect(findPosInsert(orderedArray, 8310102)).toBe(
      orderedArray.indexOf(8310101) + 1,
    )
  })
  it('insert position', () => {
    expect(findPosInsert([0], 1)).toBe(1)
    expect(findPosInsert([0, 2], 1)).toBe(1)
    expect(findPosInsert([0, 1], 1)).toBe(2)
    expect(findPosInsert([0, 6, 9, 13], 9)).toBe(3)
  })
})
