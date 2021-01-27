import 'jest'
import { find_last_key, find_last_key_f } from '../find_last_key'
import { find_first_key, find_first_key_f } from '../find_first_key'

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
    expect(find_last_key(orderedArray, 0)).toBe(0)
    expect(find_last_key(orderedArray, 100)).toBe(1)
    expect(find_last_key(orderedArray, 8310102)).toBe(
      orderedArray.indexOf(8310101) + 1,
    )
  })
  it('insert position', () => {
    expect(find_last_key([0], 1)).toBe(1)
    expect(find_last_key([0, 2], 1)).toBe(1)
    expect(find_last_key([0, 1], 1)).toBe(2)
    expect(find_last_key([0, 6, 9, 13], 9)).toBe(3)
  })
  it('insert position', () => {
    expect(find_last_key([0, 0, 0, 0], 1)).toBe(4)
    expect(find_last_key([0, 1, 1, 3], 1)).toBe(3)
    expect(find_last_key([1, 1, 1, 1], 1)).toBe(4)
    expect(find_last_key([1, 2, 2, 2], 1)).toBe(1)
    expect(find_last_key([-1, 0, 0, 1], 1)).toBe(4)
    expect(find_last_key([-1, 0, 0, 1, 1, 1, 1, 1, 1, 2], 1)).toBe(9)
  })

  it('looking for next position to insert item Fast', () => {
    expect(find_last_key_f(orderedArray, 0)).toBe(0)
    expect(find_last_key_f(orderedArray, 100)).toBe(1)
    expect(find_last_key_f(orderedArray, 8310102)).toBe(
      orderedArray.indexOf(8310101) + 1,
    )
  })
  it('insert position Fast', () => {
    expect(find_last_key_f([0], 1)).toBe(1)
    expect(find_last_key_f([0, 2], 1)).toBe(1)
    expect(find_last_key_f([0, 1], 1)).toBe(2)
    expect(find_last_key_f([0, 6, 9, 13], 9)).toBe(3)
  })
  it('insert position Fast', () => {
    expect(find_last_key_f([0, 0, 0, 0], 1)).toBe(4)
    expect(find_last_key_f([0, 1, 1, 3], 1)).toBe(3)
    expect(find_last_key_f([1, 1, 1, 1], 1)).toBe(4)
    expect(find_last_key_f([1, 2, 2, 2], 1)).toBe(1)
    expect(find_last_key_f([-1, 0, 0, 1], 1)).toBe(4)
    expect(find_last_key_f([-1, 0, 0, 1, 1, 1, 1, 1, 1, 2], 1)).toBe(9)
  })

  it('insert position', () => {
    expect(find_first_key([1, 3, 5, 7], 9)).toBe(4)
    expect(find_first_key([8, 8, 9, 9], 9)).toBe(2)
    expect(find_first_key([0, 0, 0, 0], 1)).toBe(4)
    expect(find_first_key([0, 1, 1, 3], 1)).toBe(1)
    expect(find_first_key([1, 1, 1, 1], 1)).toBe(0)
    expect(find_first_key([1, 2, 2, 2], 1)).toBe(0)
    expect(find_first_key([-1, 0, 0, 1], 1)).toBe(3)
    expect(find_first_key([-1, 0, 0, 1, 1, 1, 1, 1, 1, 2], 1)).toBe(3)
    expect(find_first_key([-1, 0, 0, 2, 2, 2, 2, 2, 2, 2], 1)).toBe(3)
  })
  it('insert position Fast', () => {
    expect(find_first_key_f([1, 3, 5, 7], 9)).toBe(4)
    expect(find_first_key_f([8, 8, 9, 9], 9)).toBe(2)
    expect(find_first_key_f([0, 0, 0, 0], 1)).toBe(4)
    expect(find_first_key_f([0, 1, 1, 3], 1)).toBe(1)
    expect(find_first_key_f([1, 1, 1, 1], 1)).toBe(0)
    expect(find_first_key_f([1, 2, 2, 2], 1)).toBe(0)
    expect(find_first_key_f([-1, 0, 0, 1], 1)).toBe(3)
    expect(find_first_key_f([-1, 0, 0, 1, 1, 1, 1, 1, 1, 2], 1)).toBe(3)
    expect(find_first_key_f([-1, 0, 0, 2, 2, 2, 2, 2, 2, 2], 1)).toBe(3)
  })
})
