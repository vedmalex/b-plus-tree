import {
  ActionHookTime,
  ActionHookMethod,
  ValidateHookPerMethod,
} from './methods/ExecutionTme'
import { SetterInput, ActionInput } from './RuleInput'

export class Rule<T extends object> {
  static createAction<T extends object>(inp: ActionInput<T>) {
    return new Rule({ ...inp, type: 'action' })
  }
  static createSetter<T extends object>(inp: SetterInput<T>) {
    return new Rule({ ...inp, type: 'setter' })
  }
  type: 'action' | 'setter' = 'action'
  field: keyof T
  /**
   * create   - если создается через фабрику
   * update - передаем весь объект
   * patch - патчим объект
   * delete - перед удаление что нужно сделать
   * clone - клонируем объект
   * работа с полями
   * read - тут можно создать getter и setter и вызывать этот метод
   * readonly - прячем поле и создаем getter
   *  делаем вид что читаем
   * writeonly - прячем поле извне? и открываем на запись?
   */
  method: Set<ActionHookMethod>
  hooks: Set<ActionHookTime>
  name: string
  subscribesTo?: Set<keyof T>
  subjectFor?: Set<keyof T>
  condition?: (obj: T) => boolean
  run: (obj: T) => any
  private constructor({
    name,
    field,
    subscribesTo,
    subjectFor,
    condition,
    run,
    method,
    hooks,
    type,
  }: Partial<SetterInput<T> & ActionInput<T> & { type: 'action' | 'setter' }>) {
    this.type = type
    this.field = field
    if (type == 'setter') {
      this.subscribesTo = Array.isArray(subscribesTo)
        ? new Set(subscribesTo)
        : new Set(subscribesTo ? [subscribesTo] : undefined)
      this.subjectFor = Array.isArray(subjectFor)
        ? new Set(subjectFor)
        : new Set(subjectFor ? [subjectFor] : undefined)
    } else {
      if (!method) {
        method = 'run'
        hooks = 'instead'
      } else if (!hooks) {
        throw new Error('if event set then time must be set as well')
      }
      this.method = new Set(Array.isArray(method) ? method : [method])
      this.hooks = new Set(Array.isArray(hooks) ? hooks : [hooks])
    }
    this.run = run
    this.condition = condition
    if (type == 'setter') {
      this.name = `${type} for ${field}`
    } else if (type == 'action') {
      if (name) {
        this.name = name
      } else {
        this.name = `${type} on ${hooks} ${method}`
      }
      const insconsistence = []
      this.method.forEach((ev) => {
        this.hooks.forEach((ti) => {
          if (!ValidateHookPerMethod(ev, ti)) {
            insconsistence.push([ev, ti])
          }
        })
      })
      if (insconsistence.length > 0) {
        throw Error(
          `inconsistent event and its time combination for ${insconsistence
            .map(([ev, ti]) => `${ev} ${ti}`)
            .join(', ')}`,
        )
      }
    }
  }
}

/**
 * сделдать все варианты запуска
 * доделаь тесты для приложения
 *
 * интегрировать эту штуку в дерево...
 *
 */
