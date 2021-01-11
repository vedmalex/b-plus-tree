import { Node } from '../types/Node'

export function update(this: Node) {
  let a = this.parent
  while (a != null)
    for (let i = 0; i <= a.keys.length; i++) {
      a.keys[i] = a.children[i].min() // max — возвращает максимальное значение в поддереве.
    }
  a = a.parent // Примечание: max легко находить, если хранить максимум

  // правого поддерева в каждом узле — это значение и будет max(a.sons[i])
}
