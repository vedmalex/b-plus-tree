import { ValueType } from '../ValueType'
import { Cursor } from '../eval/Cursor'
import { eval_previous } from '../eval/eval_previous'
import { BPlusTree } from '../BPlusTree'

export function $reverseAsyncIterator<T, D>(
  tree: BPlusTree<T>,
  extractor: (value: [ValueType, T]) => Promise<D>,
): AsyncIterable<Cursor<D>> {
  return {
    [Symbol.asyncIterator]() {
      let cursor: Cursor<T>
      //initial value
      let value = tree.max
      return {
        async next() {
          if (!cursor) {
            cursor = tree.cursor(value)
          } else {
            cursor = eval_previous(tree, cursor.node, cursor.pos)
          }

          const result = cursor.done
            ? { value: undefined, done: true }
            : {
                value: {
                  ...cursor,
                  value: await extractor([cursor.key, cursor.value]),
                },
                done: false,
              }
          return result
        },
      }
    },
  }
}
