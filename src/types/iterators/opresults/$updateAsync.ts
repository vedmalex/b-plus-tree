import { direct_update_value } from '../../direct_update_value'
import { Cursor } from '../../eval/Cursor'
import { BPlusTree } from '../../BPlusTree'

export async function $updateAsync<T>(
  tree: BPlusTree<T>,
  source: Iterable<Cursor<T>>,
  action: (T: any) => Promise<T>,
) {
  for (let value of source) {
    var result = await action([value.key, value.value])
    // здесь надо проверить не поменялся ли ключ данного объекта
    direct_update_value(tree, value.node, value.pos, result)
  }
}
