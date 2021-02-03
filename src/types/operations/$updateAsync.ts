import { BPlusTree } from '../BPlusTree'
import { direct_update_value } from '../direct_update_value'
import { $forwardIterator } from '../iterators/$forwardIterator'
import { $filter } from '../iterators/$filter'
import { Cursor } from '../eval/Cursor'

export async function $updateAsync<T>(
  source: Iterable<Cursor<T>>,
  action: (T: any) => Promise<T>,
) {
  for (let value of source) {
    var result = await action([value.key, value.value])
    // здесь надо проверить не поменялся ли ключ данного объекта
    direct_update_value(tree, value.node, value.pos, result)
  }
}
