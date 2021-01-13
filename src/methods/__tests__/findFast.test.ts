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

describe('fidFast works', () => {
  it('return proper item index', () => {
    expect(findFast(orderedArray, 5218838)).toBe(orderedArray.indexOf(5218838))
  })
  it('return -1 if itemnot present', () => {
    expect(findFast(orderedArray, 1)).toBe(-1)
  })
})
