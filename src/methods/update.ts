import { Node } from '../types/Node'

export function update(this: Node) {
  // обновляем все верхние уровни
  let a = this.parent
  while (a != undefined) {
    // обновляем со второго потомка
    for (let i = 0; i < a.key_num; i++) {
      const min = a.children[i + 1].min
      if (min === undefined) debugger
      a.keys[i] = min // max — возвращает максимальное значение в поддереве.
    }
    a = a.parent // Примечание: max легко находить, если хранить максимум
  }

  // правого поддерева в каждом узле — это значение и будет max(a.sons[i])
}
