import 'jest'
import {
  findLastPosToInsert,
  find_first_pos_to_insert,
} from '../find_first_pos_to_insert'

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
    expect(findLastPosToInsert(orderedArray, 0)).toBe(0)
    expect(findLastPosToInsert(orderedArray, 100)).toBe(1)
    expect(findLastPosToInsert(orderedArray, 8310102)).toBe(
      orderedArray.indexOf(8310101) + 1,
    )
  })
  it('insert position', () => {
    expect(findLastPosToInsert([0], 1)).toBe(1)
    expect(findLastPosToInsert([0, 2], 1)).toBe(1)
    expect(findLastPosToInsert([0, 1], 1)).toBe(2)
    expect(findLastPosToInsert([0, 6, 9, 13], 9)).toBe(3)
  })
  it('insert position', () => {
    expect(findLastPosToInsert([0, 0, 0, 0], 1)).toBe(4)
    expect(findLastPosToInsert([0, 1, 1, 3], 1)).toBe(3)
    expect(findLastPosToInsert([1, 1, 1, 1], 1)).toBe(4)
    expect(findLastPosToInsert([1, 2, 2, 2], 1)).toBe(1)
    expect(findLastPosToInsert([-1, 0, 0, 1], 1)).toBe(4)
    expect(findLastPosToInsert([-1, 0, 0, 1, 1, 1, 1, 1, 1, 2], 1)).toBe(9)
  })
  it('insert position', () => {
    expect(find_first_pos_to_insert([1, 3, 5, 7], 9)).toBe(4)
    expect(find_first_pos_to_insert([8, 8, 9, 9], 9)).toBe(2)
    expect(find_first_pos_to_insert([0, 0, 0, 0], 1)).toBe(4)
    expect(find_first_pos_to_insert([0, 1, 1, 3], 1)).toBe(1)
    expect(find_first_pos_to_insert([1, 1, 1, 1], 1)).toBe(0)
    expect(find_first_pos_to_insert([1, 2, 2, 2], 1)).toBe(0)
    expect(find_first_pos_to_insert([-1, 0, 0, 1], 1)).toBe(3)
    expect(find_first_pos_to_insert([-1, 0, 0, 1, 1, 1, 1, 1, 1, 2], 1)).toBe(3)
    expect(find_first_pos_to_insert([-1, 0, 0, 2, 2, 2, 2, 2, 2, 2], 1)).toBe(3)
  })
})
