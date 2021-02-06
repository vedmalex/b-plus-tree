import { direct_update_value } from '../direct_update_value'
import { Cursor } from '../eval/Cursor'
import { BPlusTree } from '../BPlusTree'

export function updateAsync<T>(
  tree: BPlusTree<T>,
  action: (T: any) => Promise<T>,
) {
  return async function* (source: AsyncGenerator<Cursor<T>>) {
    for await (let cursor of source) {
      var result = await action([cursor.key, cursor.value])
      // здесь надо проверить не поменялся ли ключ данного объекта
      direct_update_value(tree, cursor.node, cursor.pos, result)
    }
  }
}
