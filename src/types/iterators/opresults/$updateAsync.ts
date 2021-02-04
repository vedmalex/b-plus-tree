import { direct_update_value } from '../../direct_update_value'
import { Cursor } from '../../eval/Cursor'
import { BPlusTree } from '../../BPlusTree'

export async function $updateAsync<T>(
  tree: BPlusTree<T>,
  source: Iterable<Cursor<T>>,
  action: (T: any) => Promise<T>,
) {
  for (let cursor of source) {
    var result = await action([cursor.key, cursor.value])
    // здесь надо проверить не поменялся ли ключ данного объекта
    direct_update_value(tree, cursor.node, cursor.pos, result)
  }
}
