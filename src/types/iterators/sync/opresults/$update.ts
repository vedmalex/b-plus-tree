import { direct_update_value } from '../../../direct_update_value'
import { Cursor } from '../../../eval/Cursor'
import { BPlusTree } from '../../../BPlusTree'

export function $update<T>(
  tree: BPlusTree<T>,
  source: Iterable<Cursor<T>>,
  action: (T: any) => T,
) {
  for (let cursor of source) {
    var result = action([cursor.key, cursor.value])
    // здесь надо проверить не поменялся ли ключ данного объекта
    // что-то надо придумать, чтобы обновить значение правильно...
    // похоже Cursor должен быть со ссылкой на дерево
    direct_update_value(tree, cursor.node, cursor.pos, result)
  }
}
