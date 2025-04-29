import { find_last_key } from '../find_last_key'
import { find_first_key } from '../find_first_key'
import { find_first_item } from '../find_first_item'
import { find_first_item_remove } from '../find_first_item_remove'
import { compare_keys_primitive } from '../utils/comparator_primitive'

function find_key(
  a: Array<number>,
  key: number,
  forward: boolean,
  include: boolean,
) {
  let index: number
  if (forward) {
    if (include) {
      index = find_first_key(a, key, compare_keys_primitive)
    } else {
      index = find_last_key(a, key, compare_keys_primitive)
    }
  } else {
    if (include) {
      index = find_last_key(a, key, compare_keys_primitive) - 1
    } else {
      index = find_first_key(a, key, compare_keys_primitive) - 1
    }
  }
  return index
}

describe('find keys ', () => {
  it('works as expected', () => {
    expect(find_first_item([78, 89, 91, 98], 79, compare_keys_primitive)).toBe(-1)
    expect(
      find_first_item(
        [null, '1a', '1a', '1a', '1a', '3f', '5c', 'penthouse'],
        '1a',
        compare_keys_primitive
      ),
    ).toBe(1)
    expect(
      find_first_item_remove(
        [null, '1a', '1a', '1a', '1a', '3f', '5c', 'penthouse'],
        '1a',
        compare_keys_primitive
      ),
    ).toBe(1)
    expect(find_first_item([78, 89, 91, 98], null, compare_keys_primitive)).toBe(-1)
    expect(find_first_item([null, 78, 89, 91, 98], null, compare_keys_primitive)).toBe(0)
    expect(find_first_item([null, '78', '89', '91', '98'], null, compare_keys_primitive)).toBe(0)
    expect(
      find_first_item(
        [null, '78', '78', '78', '89', '89', '89', '89', '91', '98'],
        '78',
        compare_keys_primitive
      ),
    ).toBe(1)
    expect(find_first_item(['78', '89', '91', '98'], null, compare_keys_primitive)).toBe(-1)
    expect(find_last_key([95], 95, compare_keys_primitive)).toBe(1)
    expect(find_last_key([95, 95, 97, 97], 96, compare_keys_primitive)).toBe(2)
    expect(find_last_key([95, 95, 96, 97, 97], 96, compare_keys_primitive)).toBe(3)
    expect(find_last_key([95, 95, 96, 97, 97], null, compare_keys_primitive)).toBe(0)
    expect(find_last_key(['95', '95', '96', '97', '97'], null, compare_keys_primitive)).toBe(0)

    expect(find_last_key([95, 95, 95, 95, 95, 100], 96, compare_keys_primitive)).toBe(5)
    expect(find_first_key([55, 55, 95, 95, 95, 100], 95, compare_keys_primitive)).toBe(2)

    expect(find_first_key([95, 95, 95, 95, 100], 95, compare_keys_primitive)).toBe(0)
    expect(find_first_key([95, 95, 95, 95, 100], null, compare_keys_primitive)).toBe(0)
    expect(find_first_key(['100', '95', '95', '95', '95'], null, compare_keys_primitive)).toBe(0)
  })
  it('find_range_start', () => {
    expect(
      // find first including the item
      find_key([0, 1, 1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 1, true, true),
    ).toBe(1)
    expect(
      // find first excluding the item
      find_key([0, 1, 1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 1, true, false),
    ).toBe(4)
    expect(
      // find last including the item
      find_key([1, 2, 3, 4, 5, 6, 7, 8, 9, 9, 9, 10], 9, false, true),
    ).toBe(10)
    expect(
      // find last excluding the item
      find_key([1, 2, 3, 4, 5, 6, 7, 8, 9, 9, 9, 10], 9, false, false),
    ).toBe(7)
    // крайняя позиция
    expect(
      // find first including the item
      find_key([0, 1, 1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0, true, true),
    ).toBe(0)
    expect(
      // find first excluding the item
      find_key([0, 1, 1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0, true, false),
    ).toBe(1)
    expect(
      // find last including the item
      find_key([1, 2, 3, 4, 5, 6, 7, 8, 9, 9, 9, 10], 10, false, true),
    ).toBe(11)
    expect(
      // find last excluding the item
      find_key([1, 2, 3, 4, 5, 6, 7, 8, 9, 9, 9, 10], 10, false, false),
    ).toBe(10)
    //
    expect(
      // find first including the item
      find_key([0, 1, 1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0, false, true),
    ).toBe(0)
    expect(
      // find first excluding the item
      find_key([0, 1, 1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0, false, false),
    ).toBe(-1)
    expect(
      // find last including the item
      find_key([1, 2, 3, 4, 5, 6, 7, 8, 9, 9, 9, 10], 10, true, true),
    ).toBe(11)
    expect(
      // find last excluding the item
      find_key([1, 2, 3, 4, 5, 6, 7, 8, 9, 9, 9, 10], 10, true, false),
    ).toBe(12)
  })
})

const orderedArray = [
  97, 1601, 114131, 477275, 1526626, 1679359, 3644322, 5218838, 5647301,
  5696333, 7310713, 7499978, 8310101, 8768835, 9654580,
]

describe('findPosInsert search position', () => {
  it('looking for next position to insert item', () => {
    expect(find_last_key(orderedArray, 0, compare_keys_primitive)).toBe(0)
    expect(find_last_key(orderedArray, 100, compare_keys_primitive)).toBe(1)
    expect(find_last_key(orderedArray, 8310102, compare_keys_primitive)).toBe(
      orderedArray.indexOf(8310101) + 1,
    )
  })
  it('insert position', () => {
    expect(find_last_key([0], 1, compare_keys_primitive)).toBe(1)
    expect(find_last_key([0, 2], 1, compare_keys_primitive)).toBe(1)
    expect(find_last_key([0, 1], 1, compare_keys_primitive)).toBe(2)
    expect(find_last_key([0, 6, 9, 13], 9, compare_keys_primitive)).toBe(3)
  })
  it('insert position', () => {
    expect(find_last_key([0, 0, 0, 0], 1, compare_keys_primitive)).toBe(4)
    expect(find_last_key([0, 1, 1, 3], 1, compare_keys_primitive)).toBe(3)
    expect(find_last_key([1, 1, 1, 1], 1, compare_keys_primitive)).toBe(4)
    expect(find_last_key([1, 2, 2, 2], 1, compare_keys_primitive)).toBe(1)
    expect(find_last_key([-1, 0, 0, 1], 1, compare_keys_primitive)).toBe(4)
    expect(find_last_key([-1, 0, 0, 1, 1, 1, 1, 1, 1, 2], 1, compare_keys_primitive)).toBe(9)
  })
  it('insert position', () => {
    expect(find_first_key([1, 3, 5, 7], 9, compare_keys_primitive)).toBe(4)
    expect(find_first_key([8, 8, 9, 9], 9, compare_keys_primitive)).toBe(2)
    expect(find_first_key([0, 0, 0, 0], 1, compare_keys_primitive)).toBe(4)
    expect(find_first_key([0, 1, 1, 3], 1, compare_keys_primitive)).toBe(1)
    expect(find_first_key([1, 1, 1, 1], 1, compare_keys_primitive)).toBe(0)
    expect(find_first_key([1, 2, 2, 2], 1, compare_keys_primitive)).toBe(0)
    expect(find_first_key([-1, 0, 0, 1], 1, compare_keys_primitive)).toBe(3)
    expect(find_first_key([-1, 0, 0, 1, 1, 1, 1, 1, 1, 2], 1, compare_keys_primitive)).toBe(3)
    expect(find_first_key([-1, 0, 0, 2, 2, 2, 2, 2, 2, 2], 1, compare_keys_primitive)).toBe(3)
  })
})
