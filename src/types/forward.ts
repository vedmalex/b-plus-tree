import { Node } from './Node'
import { ValueType } from '../btree'

export function forward(
  order: 'forward' | 'reverse',
  getFirst: () => Node,
  getData: (node: Node) => Array<[ValueType, any]>,
  skip: number = 0,
  take: number = -1,
) {
  let f = getFirst()
  let result = []
  let skipped = skip
  let taken = take
  do {
    const lres = getData(f)

    if (lres.length > 0) {
      const resLen = lres.length
      let lskip = skipped
      if (skipped > 0) {
        lskip -= resLen
      }
      if (lskip <= 0) {
        if (taken == -1) {
          // или берем все или только часть вырезаем
          if (skipped == 0) {
            result.push(...lres)
          } else {
            // вырезаем от начального элемента
            result.push(...lres.slice(skipped))
            // следующий слок читаем сначала
            skipped = 0
          }
        } else {
          // if (skipped > 0)
          if (skipped + taken > 0 && skipped + taken < resLen) {
            result.push(...lres.slice(skipped, skipped + taken))
            taken = 0
            break
          } else if (skipped + taken > 0 && skipped + taken >= resLen) {
            if (skipped == 0) {
              result.push(...lres)
            } else {
              result.push(...lres.slice(skipped))
            }
            taken -= resLen - skipped
            skipped = 0
          } else {
            // skipped + taken == 0
            // мы полуили все что нужно
            // и тут оказались случайно
            break
          }
        }
      } else {
        skipped = lskip
      }
      f = f.right
    } else {
      break
    }
  } while (f != null)
  return result
}
