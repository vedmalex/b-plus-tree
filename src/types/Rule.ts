import {
  ActionHookTime,
  ActionHookMethod,
  ValidateHookPerMethod,
} from './methods/ExecutionTme'
import isArrow from 'isarrow'
import { SetterInput, ActionInput, GetSetInput, MethodInput } from './RuleInput'

// один рул одно правило и один вызов
// если много, то метод создает пачку

export type RuleInput<T extends object> = {
  name?: string
  run: (obj: T) => any
  field?: keyof T
  subscribesTo?: keyof T | Array<keyof T>
  subjectFor?: keyof T | Array<keyof T>
  condition?: (obj: T) => boolean
  method?: 'get' | 'set' | 'create' | 'update' | 'patch' | 'clone' | 'delete'
  hooks?: 'before' | 'after' | 'instead'
  type: 'action' | 'setter'
}
export class Rule<T extends object> {
  static createMethod<T extends object>(inp: MethodInput<T>): Array<Rule<T>> {
    const result = new Rule(inp.run)
    result.initMethod(inp.name)
    return [result]
  }
  static createAction<T extends object>(inp: ActionInput<T>): Array<Rule<T>> {
    const result = new Rule(inp.run, inp.condition)
    if (Array.isArray(inp.on)) {
      const result = []
      inp.on.forEach((on) => {
        result.push(...Rule.createAction({ ...inp, on }))
      })
    } else {
      const [hook = 'instead', method] = inp.on.split(':')
      result.initAction(hook as ActionHookTime, method as ActionHookMethod)
    }
    return [result]
  }
  static createProperty<T extends object>(inp: GetSetInput<T>): Array<Rule<T>> {
    const result = new Rule(inp.run, inp.condition)
    result.initProperty(inp.field, inp.method)
    return [result]
  }
  static createSetter<T extends object>(inp: SetterInput<T>): Array<Rule<T>> {
    const result = new Rule(inp.run, inp.condition)
    result.initSetter(inp.field, inp.subscribesTo, inp.subjectFor)
    return [result]
  }
  type: 'action' | 'setter' = 'action'
  field: keyof T
  method: ActionHookMethod
  hook: ActionHookTime
  name: string
  subscribesTo?: Set<keyof T>
  subjectFor?: Set<keyof T>

  condition?: (obj: T) => boolean
  conditionIsArrow: boolean
  run: (obj: T, ...args) => any
  runIsArrow: boolean

  private constructor(run: (obj: T) => any, condition?: (obj: T) => boolean) {
    this.run = run
    this.condition = condition
    this.runIsArrow = isArrow(this.run)
    this.conditionIsArrow = isArrow(this.condition)
  }

  private initAction(hook: ActionHookTime, method: ActionHookMethod) {
    this.type = 'action'
    this.name = `action on ${hook} ${method}`
    this.method = method
    this.hook = hook
    this.checkConsistency()
  }

  private initMethod(name: string) {
    this.type = 'action'
    this.name = name
    this.hook = 'instead'
    this.method = 'run'
    this.checkConsistency()
  }

  private initProperty(field: keyof T, method: ActionHookMethod) {
    this.type = 'action'
    this.field = field
    this.name = `${method}ter method for field: ${field}`
    this.hook = 'before'
    this.method = method
    this.checkConsistency()
  }

  private initSetter(
    field: keyof T,
    subscribesTo: keyof T | Array<keyof T>,
    subjectFor: keyof T | Array<keyof T>,
  ) {
    this.type = 'setter'
    this.field = field
    this.subscribesTo = Array.isArray(subscribesTo)
      ? new Set(subscribesTo)
      : new Set(subscribesTo ? [subscribesTo] : undefined)
    this.subjectFor = Array.isArray(subjectFor)
      ? new Set(subjectFor)
      : new Set(subjectFor ? [subjectFor] : undefined)
    this.name = `setter for ${field}`
  }

  private checkConsistency() {
    const insconsistence = []
    if (!ValidateHookPerMethod(this.method, this.hook)) {
      throw Error(
        `inconsistent event and its time combination for ${this.method} ${this.hook}`,
      )
    }
    if (insconsistence.length > 0) {
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
