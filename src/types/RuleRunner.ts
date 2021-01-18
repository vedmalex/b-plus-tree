import { updateValue } from './methods/updateValue'
import { Rule } from './Rule'
import { ActionHookTime, ActionHookMethod } from './methods/ExecutionTme'

export const deleted = Symbol('deleted')
export const state = Symbol('state')

/**
 * нужно прикрепить его к дереву
 * здесь можно использовать сложные структуры типа связанные сущности и прочее..
 * в будущем... пока не надо
 */
export class RuleRunner<T extends { id?: number }> {
  subscriptions: Map<keyof T, Set<keyof T>>
  subjects: Map<keyof T, Set<keyof T>>
  setters: Map<keyof T, Rule<T>>
  actions: Map<string, Rule<T>>
  hooks: Map<ActionHookTime, Map<ActionHookMethod, Set<Rule<T>>>>
  methods: Map<string, Rule<T>>
  factory: (obj: Partial<T>) => T
  hiddenProps: Map<keyof T, symbol>
  fieldOrder: Array<keyof T>
  constructor(rules: Array<Rule<T>>, factory?: (obj: Partial<T>) => T) {
    // задать порядок выполнения правил в автоматическом режиме
    // отсортировать по порядку
    // отследить работу правил
    // перенести логику работы с деревом в правила
    // обновление зависимостей как-то записывать
    // чтобы не было каскадных обновлений
    // допилить остальное..
    // вызывать после обновление ключевого поля, обновления зависимых полей.
    // проставить что мы должны работать в режиме обновления какие поля за текущий запуск обработаны
    //
    this.factory = factory
    this.subjects = new Map()
    this.subscriptions = new Map()
    this.setters = new Map()
    this.actions = new Map()
    this.runners = new Map()
    this.hooks = new Map()
    this.hiddenProps = new Map()
    rules.forEach((cur) => {
      if (cur.type == 'setter') {
        if (!this.setters.has(cur.field)) {
          this.setters.set(cur.field, cur)
        } else {
          throw new Error(`duplicate rule ${cur.field}`)
        }
      } else if (cur.type == 'action') {
        if (!this.actions.has(cur.name)) {
          this.actions.set(cur.name, cur)
        } else {
          throw new Error(`duplicate action ${cur.name}`)
        }
      }
    })
    this.initDependencies()
    this.initExecutationTime()
    this.initProperties()
    this.reorderSetterByWeight()
  }

  initProperties() {}
  //TODO: прикрутить обязательно
  private defineProperty(
    obj,
    prop: keyof T,
    get: Set<Rule<T>>,
    set: Set<Rule<T>>,
  ) {
    this.hiddenProps.set(prop, Symbol(prop as string))
    obj[this.hiddenProps.get(prop)] = obj[prop]
    delete obj[prop]
    Object.defineProperty(obj, prop, {
      get() {
        let value = obj[this.hiddenProps.get(prop)]
        if (get?.size > 0) {
          const res = { ...obj, [prop]: value }
          get.forEach((g) => {
            this.executeAction(res, g.name)
          })
          value = res[prop]
        }
        return value
      },
      set(value: any) {
        if (set?.size > 0) {
          const res = { ...obj, [prop]: value }
          set.forEach((g) => {
            this.executeAction(res, g.name)
          })
          value = res[prop]
        }
        obj[this.hiddenProps.get(prop)] = value
      },
      enumerable: true,
      configurable: false,
    })
  }

  initExecutationTime() {
    this.actions.forEach((rule) => {
      rule.hooks.forEach((hook) => {
        if (!this.hooks.has(hook)) {
          this.hooks.set(hook, new Map())
        }
        const methods = this.hooks.get(hook)
        rule.method.forEach((method) => {
          if (!methods.has(method)) {
            methods.set(method, new Set())
          }
          methods.get(method).add(rule)
        })
      })
    })
  }

  private method(
    obj: T,
    action: ActionHookMethod,
    ensure: boolean,
    handler: (obj: T) => T,
  ) {
    let result = { ...obj }
    if (this.hooks.has('before')) {
      const before = this.hooks.get('before')
      if (before.has(action)) {
        before.get(action).forEach((rule) => {
          this.executeAction(obj, rule.name, ensure)
        })
      }
    }
    const hasInstead =
      this.hooks.has('instead') && this.hooks.get('instead').has(action)
    const instead = hasInstead ? this.hooks.get('instead').get(action) : null
    if (hasInstead && instead) {
      instead.forEach((rule) => {
        this.executeAction(result, rule.name, ensure)
      })
    } else {
      result = handler(obj) ?? obj
    }
    if (this.hooks.has('after')) {
      const after = this.hooks.get('after')
      if (after.has(action)) {
        after.get(action).forEach((rule) => {
          this.executeAction(result, rule.name, ensure)
        })
      }
    }
    return result
  }

  create(obj: Partial<T>, ensure: boolean = false) {
    let result: T = this.method(obj as T, 'create', ensure, (obj) => {
      let res: T
      if (this.factory) {
        res = this.factory(obj)
      } else {
        res = obj as T
      }
      this.updateFields(obj, '*', true)
      return res
    })
    return result
  }

  update(obj: T, update: T, ensure: boolean = false) {
    let result: T = this.method(obj as T, 'update', ensure, (obj) => {
      // if (this.factory) {
      //   res = this.factory(obj)
      // } else {
      //   res = obj as T
      // }
      const res = { ...obj, ...update }
      this.updateFields(obj, '*', true)
      return res
    })

    return result
  }

  patch(obj: T, update: Partial<T>, ensure: boolean = false) {
    let result: T = this.method(obj as T, 'update', ensure, (obj) => {
      // if (this.factory) {
      //   res = this.factory(obj)
      // } else {
      //   res = obj as T
      // }
      const res = { ...obj, ...update }
      this.updateFields(obj, Object.keys(update) as Array<keyof T>, true)
      return res
    })
    return result
  }

  clone(obj: T, ensure: boolean = false) {
    let result: T = this.method(obj as T, 'update', ensure, (obj) => {
      // if (this.factory) {
      //   res = this.factory(obj)
      // } else {
      //   res = obj as T
      // }
      return { ...obj }
    })
    return result
  }

  delete(obj: T, ensure: boolean = true) {
    let result: T = this.method(obj as T, 'update', ensure, (obj) => {
      // if (this.factory) {
      //   res = this.factory(obj)
      // } else {
      //   res = obj as T
      // }
      obj[deleted] = true

      return obj
    })
    return result
  }

  /**
   * логгер обновлений дерева
   * идея: если все обновления запускаются по оптимальному мартшруту,
   * каждое поле будет появляться в таком списке узлов только один раз
   * запускающее процесс обновления поле, должно будет после обновления
   * удалить отсюда запись.
   * процесс работает полностью синхронно
   */
  runners: Map<number, Set<keyof T>>
  /**
   * регистрирует обновление поля для узла
   * @param f поле
   * @returns можно ли продолжать обновление или остановиться
   */
  private lock(node: T, f: keyof T): boolean {
    let current = this.runners.get(node.id)
    if (!current) {
      current = new Set()
      this.runners.set(node.id, current)
    }
    if (!current.has(f)) {
      current.add(f)
      return true
    } else {
      return false
    }
  }
  private unlock(node: T, f) {
    let current = this.runners.get(node.id)
    if (!current) {
      return false
      // throw new Error()
    }
    const pos = current.has(f)
    if (pos) {
      current.delete(f)
      return true
    } else {
      return false
    }
  }
  /**
   * ищем зависимость
   */
  private initDependencies() {
    const color: Map<keyof T, number> = new Map()
    this.subscriptions = new Map()
    // все subjectFor вставляют свое имя в подписки подписчика
    // все циклы будут восстановлены после запуска
    this.setters.forEach((rule) => {
      if (rule.subjectFor.size > 0) {
        rule.subjectFor.forEach((f) => {
          if (this.setters.has(f)) {
            this.setters.get(f).subscribesTo.add(rule.field)
          } else {
            throw new Error(
              `there is no setter for field ${f} mentioned in ${rule.field}`,
            )
          }
        })
      }
    })

    // подписки явно указывают на непосдредственно зависимый объект
    this.setters.forEach((_r, c) => {
      this.subscriptions.set(c, this.setters.get(c).subscribesTo)
      color.set(c, 0) /* white */
    })

    this.findLoops(color)

    this.setters.forEach((_r, f) => {
      if (color.get(f) != 1) {
        this.getDeps(f)
      }
    })
  }

  private reorderSetterByWeight() {
    const order = []
    const weights = new Map<keyof T, number>()

    this.subscriptions.forEach((s, k) => {
      if (!weights.has(k)) {
        weights.set(k, 0)
      }
      weights.set(k, weights.get(k) + s.size)
    })

    this.subjects.forEach((s, k) => {
      if (!weights.has(k)) {
        weights.set(k, 0)
      }
      weights.set(k, weights.get(k) - s.size)
    })
    order.push(
      ...[...weights.entries()].map((e: [keyof T, number]) => ({
        field: e[0],
        weight: e[1],
      })),
    )

    this.fieldOrder = order
      .sort((a, b) => a.weight - b.weight)
      .map((w) => w.field)
  }

  private findLoops(color: Map<keyof T, number>) {
    const loop = []

    let loops = 0
    this.setters.forEach((_r, f) => {
      const isLoop = this.dfs(f, color)
      if (isLoop == 1) {
        loop.push(f)
        loops += 1
      }
    })

    if (loops > 0) {
      throw new Error(`cyclic dependecy loop found ${loop.join(',')}`)
    }
  }
  /**
  // color — массив цветов, изначально все вершины белые
  func dfs(v: vertex):             // v — вершина, в которой мы сейчас находимся
      color[v] = grey
      for (u: vu ∈ E)
          if (color[u] == white)
              dfs(u)
          if (color[u] == grey)
              print()              // вывод ответа
      color[v] = black
   */

  private dfs(v: keyof T, color: Map<keyof T, number>) {
    color.set(v, 1) /* gray */
    let result = 0
    const curDeps = this.subscriptions.get(v)
    const loopFoundMessage = 'loop found'
    try {
      curDeps?.forEach((i) => {
        let f = this.setters.has(i) ? i : null
        if (f && !color.has(f)) {
          this.dfs(v, color)
        }
        if (color.get(f) == 1) {
          result = 1
          throw new Error(loopFoundMessage)
        }
      })
    } catch (e) {
      if (e.message != loopFoundMessage) {
        throw e
      }
    }
    color.set(v, 2)
    return result
  }

  private getDeps(f: keyof T, field?: keyof T) {
    const subscription = this.subscriptions.get(f)
    field = field ?? f
    if (subscription?.size > 0) {
      subscription.forEach((f) => {
        this.getDeps(f, field)
        if (!this.subjects.has(f)) this.subjects.set(f, new Set())
        this.subjects.get(f).add(field)
      })
    }
  }

  updateFields(
    obj: T,
    metric: keyof T | Array<keyof T> | '*',
    batch: boolean = false,
  ) {
    if (metric == '*') {
      const metrics = this.setters
      let result = 0
      metrics.forEach((_r, metric) => {
        result += this.updateFields(obj, metric, true)
      })
      return result
    } else if (Array.isArray(metric)) {
      let result = 0
      metric.forEach((m) => {
        result += this.updateFields(obj, m, true)
      })
      return result
    } else if (
      this.setters.has(metric) &&
      (this.setters.get(metric).condition?.(obj) ?? true)
    ) {
      const rule = this.setters.get(metric)
      if (rule.subscribesTo && !batch) {
        rule.subscribesTo.forEach((dep) => {
          this.updateFields(obj, dep, batch)
        })
      }
      return updateValue<T>(obj, metric, rule.run)
    } else {
      // nothing to change
      return 0
    }
  }

  executeAction(obj: T, name: string, ensure: boolean = false) {
    const hasAction = this.actions.has(name)
    if (obj && name && hasAction) {
      const action = this.actions.get(name)
      this.actions.get(name)
      if (action.condition?.(obj) ?? true) {
        if (ensure) {
          if (action.subscribesTo) {
            action.subscribesTo.forEach((dep) => {
              this.updateFields(obj, dep, true)
            })
          }
        }
        return action.run(obj) ? 1 : 0
      }
    } else {
      return 0
    }
  }

  executeAllActions(obj: T) {
    let result = 0
    this.actions.forEach((_r, name) => {
      result += this.executeAction(obj, name)
    })
    return result
  }
}

/**
 *
 * доделать все недоделанные методы
 * посмотреть как работать с вложенными объектами
 *
 * придумать
 */
