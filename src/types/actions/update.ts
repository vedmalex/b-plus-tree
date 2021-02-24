import { direct_update_value } from '../../methods/direct_update_value'
import { Cursor } from '../eval/Cursor'
import { BPlusTree } from '../BPlusTree'
import { ValueType } from '../ValueType'

export function update<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  action: (T: any) => T | Promise<T>,
) {
  return async function* (
    source: Generator<Cursor<T, K>> | AsyncGenerator<Cursor<T, K>>,
  ) {
    for await (const cursor of source) {
      const result = action([cursor.key, cursor.value])
      // здесь надо проверить не поменялся ли ключ данного объекта
      // что-то надо придумать, чтобы обновить значение правильно...
      // похоже Cursor должен быть со ссылкой на дерево
      direct_update_value(tree, cursor.node, cursor.pos, result)
    }
  }
}
