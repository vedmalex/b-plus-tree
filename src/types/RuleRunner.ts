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
  actions: Map<string, Set<Rule<T>> | Rule<T>>
  // actions: Map<string, Rule<T>>
  hooks: Map<ActionHookTime, Map<ActionHookMethod, Set<Rule<T>>>>
  //property getter and setters
  props: Map<keyof T, { set?: Set<Rule<T>>; get?: Set<Rule<T>> }>
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
          throw new Error(`duplicate setter for field ${cur.field}`)
        }
      } else if (cur.type == 'action') {
        if (!this.actions.has(cur.name)) {
          this.actions.set(cur.name, cur)
        } else {
          const _cur = this.actions.get(cur.name)
          if (_cur instanceof Set) {
            _cur.add(cur)
          } else {
            this.actions.set(cur.name, new Set([_cur, cur]))
          }
          // throw new Error(`duplicate action ${cur.name}`)
        }
      }
    })
    this.initDependencies()
    this.initExecutationTime()
    this.initProperties()
    this.reorderSetterByWeight()
  }

  initProperties() {
    this.props = new Map<keyof T, { set?: Set<Rule<T>>; get?: Set<Rule<T>> }>()
    this.actions.forEach((setter) => {
      if (setter instanceof Set) {
        setter.forEach((set) => this._initProp(set))
      } else {
        this._initProp(setter)
      }
    })
  }

  private _initProp(setter: Rule<T>) {
    if (setter.method.has('get') && setter.hooks.has('instead')) {
      if (this.props.has(setter.field)) {
        const cur = this.props.get(setter.field)
        if (cur.get instanceof Set) {
          cur.get.add(setter)
        } else {
          const old = cur.get
          cur.get = new Set([old, setter])
        }
      } else {
        this.props.set(setter.field, { set: new Set([setter]) })
      }
    } else if (setter.method.has('set') && setter.hooks.has('instead')) {
      if (this.props.has(setter.field)) {
        const cur = this.props.get(setter.field)
        if (cur.get instanceof Set) {
          cur.get.add(setter)
        } else {
          const old = cur.get
          cur.get = new Set([old, setter])
        }
      } else {
        this.props.set(setter.field, { set: new Set([setter]) })
      }
    }
  }

  //TODO: прикрутить обязательно
  // как геттер и сеттер
  private defineProperty(obj: T, prop: keyof T) {
    const props = this.props.get(prop)
    if (!this.hiddenProps.has(prop)) {
      this.hiddenProps.set(prop, Symbol(prop as string))
    }
    obj[this.hiddenProps.get(prop)] = obj[prop]
    delete obj[prop]
    Object.defineProperty(obj, prop, {
      get() {
        let value = obj[this.hiddenProps.get(prop)]
        if (props.get?.size > 0) {
          const res = { ...obj, [prop]: value }
          props.get.forEach((g) => {
            this.executeAction(res, g.name)
          })
          value = res[prop]
        }
        return value
      },
      set(value: any) {
        if (props.set?.size > 0) {
          const res = { ...obj, [prop]: value }
          props.set.forEach((g) => {
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
      if (rule instanceof Set) {
        rule.forEach((r) => this._initExecutationTime(r))
      } else {
        this._initExecutationTime(rule)
      }
    })
  }

  private _initExecutationTime(rule: Rule<T>) {
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

  createProperties(obj: T) {
    this.hiddenProps.forEach((prop, key) => {
      if (!obj[prop]) {
        this.defineProperty(obj, key)
      }
    })
  }

  removeProperties(obj: T) {
    this.hiddenProps.forEach((prop, key) => {
      if (obj[prop]) {
        delete obj[key]
        obj[key] = obj[prop]
        delete obj[prop]
      }
    })
  }

  create(obj: Partial<T>, ensure: boolean = false) {
    let result: T = this.method(obj as T, 'create', ensure, (obj) => {
      let res: T
      if (this.factory) {
        res = this.factory(obj)
      } else {
        res = obj as T
      }
      this.createProperties(obj)
      this.updateFields(obj, '*', true)
      return res
    })
    return result
  }

  update(obj: T, update: T, ensure: boolean = false) {
    let result: T = this.method(obj as T, 'update', ensure, (obj) => {
      const fields = Object.keys(update)
      let updated: Array<keyof T> = []
      fields.forEach((field) => {
        if (obj[field] != update[field]) {
          obj[field] = update[field]
          updated.push(field as keyof T)
        }
      })
      if (updated.length > 0) {
        this.updateFields(obj, updated, true)
      }
      return obj
    })

    return result
  }

  patch(obj: T, update: Partial<T>, ensure: boolean = false) {
    let result: T = this.method(obj as T, 'patch', ensure, (obj) => {
      const fields = Object.keys(update)
      let updated: Array<keyof T> = []
      fields.forEach((field) => {
        if (obj[field] != update[field]) {
          obj[field] = update[field]
          updated.push(field as keyof T)
        }
      })
      if (updated.length > 0) {
        this.updateFields(obj, updated, true)
      }
      return obj
    })
    return result
  }

  clone(obj: T, ensure: boolean = false) {
    let result: T = this.method(obj as T, 'clone', ensure, (obj) => {
      let res
      if (this.factory) {
        res = this.factory(obj)
      } else {
        res = obj as T
      }
      this.createProperties(obj)
      this.updateFields(obj, Object.keys(res) as Array<keyof T>, true)
      return res
    })
    return result
  }

  delete(obj: T, ensure: boolean = true) {
    let result: T = this.method(obj as T, 'delete', ensure, (obj) => {
      obj[deleted] = true
      return obj
    })
    this.removeProperties(obj)
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
    // array of fields that is need to be updated
    metric: keyof T | Array<keyof T> | '*',
    batch: boolean = false,
  ) {
    if (metric == '*') {
      let result = 0
      this.fieldOrder.forEach((metric) => {
        result += this.updateFields(obj, metric, true)
      })
      return result
    } else if (Array.isArray(metric)) {
      let result = 0
      const toUpdate = metric.filter((f) => this.fieldOrder.includes(f))
      if (toUpdate.length > 0) {
        this.fieldOrder
          .filter((f) => toUpdate.includes(f))
          .forEach((m) => {
            if (metric.indexOf(m) > -1) {
              result += this.updateFields(obj, m, true)
            }
          })
      }
      return result
    } else if (
      this.setters.has(metric) &&
      (this.setters.get(metric).condition?.(obj) ?? true)
    ) {
      const lock = this.lock(obj, metric)
      if (lock) {
        const rule = this.setters.get(metric)
        if (rule.subscribesTo && !batch) {
          rule.subscribesTo.forEach((dep) => {
            this.updateFields(obj, dep, batch)
          })
        }
        const result = updateValue<T>(obj, metric, rule.run)
        this.unlock(obj, metric)
        return result
      } else {
        return 0
      }
    } else {
      // nothing to change
      return 0
    }
  }

  executeAction(obj: T, name: string, ensure: boolean = false) {
    const hasAction = this.actions.has(name)
    if (obj && name && hasAction) {
      const action = this.actions.get(name)
      if (action instanceof Set) {
        let res = 0
        action.forEach(
          (a) => (res += this._executeAction(obj, name, ensure, a)),
        )
        return res
      } else {
        return this._executeAction(obj, name, ensure, action)
      }
    } else {
      return 0
    }
  }
  private _executeAction(
    obj: T,
    name: string,
    ensure: boolean,
    action: Rule<T>,
  ) {
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
