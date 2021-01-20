import { updateValue } from './methods/updateValue'
import { Rule } from './Rule'
import { ActionHookTime, ActionHookMethod } from './methods/ExecutionTme'

export const deleted = Symbol('deleted')
export const state = Symbol('state')
export const methods = Symbol('methods')
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
    this.methods = new Map()
    this.props = new Map()
    this.hiddenProps = new Map()
    rules.forEach((cur) => {
      if (cur.type == 'setter') {
        if (!this.setters.has(cur.field)) {
          this.setters.set(cur.field, cur)
        } else {
          throw new Error(`duplicate setter for field ${cur.field}`)
        }
      } else if (cur.type == 'action') {
        if (cur.method != 'run' && cur.method != 'get' && cur.method != 'set') {
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
        } else {
          if (cur.method == 'get' || cur.method == 'set') {
            this._initProp(cur)
          } else if (cur.method == 'run') {
            this._initMethod(cur)
          }
        }
      }
    })
    this.initDependencies()
    this.initExecutationTime()
    this.reorderSetterByWeight()
  }

  private _initMethod(cur: Rule<T>) {
    if (!this.methods.has(cur.name)) {
      this.methods.set(cur.name, cur)
    } else {
      throw new Error(`method ${cur.name} already exists`)
    }
  }

  private _initProp(setter: Rule<T>) {
    if (setter.method == 'get' && setter.hook == 'before') {
      if (this.props.has(setter.field)) {
        const cur = this.props.get(setter.field)
        if (cur.get instanceof Set) {
          cur.get.add(setter)
        } else {
          const old = cur.get
          if (old) {
            cur.get = new Set([old, setter])
          } else {
            cur.get = new Set([setter])
          }
        }
      } else {
        this.props.set(setter.field, { get: new Set([setter]) })
      }
    } else if (setter.method == 'set' && setter.hook == 'before') {
      if (this.props.has(setter.field)) {
        const cur = this.props.get(setter.field)
        if (cur.set instanceof Set) {
          cur.set.add(setter)
        } else {
          const old = cur.set
          if (old) {
            cur.set = new Set([old, setter])
          } else {
            cur.set = new Set([setter])
          }
        }
      } else {
        this.props.set(setter.field, { set: new Set([setter]) })
      }
    }
  }

  private injectMethods(obj: T) {
    if (!obj.hasOwnProperty(methods)) {
      obj[methods] = true
      const self = this
      this.methods.forEach((method, name) => {
        this.injectMethod(obj, name, method)
      })
    }
  }

  private injectMethod(obj: T, name: string, method: Rule<T>) {
    obj[name] = function (...args) {
      if (method.runIsArrow) {
        return method.run(obj, ...args)
      } else {
        return method.run.apply(obj, args)
      }
    }
  }

  private ejectMethods(obj: T) {
    if (obj.hasOwnProperty(methods)) {
      this.methods.forEach((method, name) => {
        delete obj[name]
      })
      delete obj[methods]
    }
  }

  private defineProperty(obj: T, prop: keyof T) {
    const props = this.props.get(prop)
    if (!this.hiddenProps.has(prop)) {
      this.hiddenProps.set(prop, Symbol(prop as string))
    }
    obj[this.hiddenProps.get(prop)] = obj[prop]
    delete obj[prop]
    const self = this
    const hprop = self.hiddenProps.get(prop)
    Object.defineProperty(obj, prop, {
      get() {
        let value = obj[hprop]
        if (props.get?.size > 0) {
          // const res = { ...obj, [hprop]: value }
          self.ejectProperty(prop, obj)
          const res = obj
          props.get.forEach((rule) => {
            self.executeAction(res, rule)
          })
          value = res[prop]
          self.injectProperty(prop, obj)
        }
        return value
      },
      set(value: any) {
        if (props.set?.size > 0) {
          // const res = { ...obj, [hprop]: value }
          self.ejectProperty(prop, obj)
          obj[prop] = value

          props.set.forEach((rule) => {
            self.executeAction(obj, rule)
          })

          value = obj[prop]
          self.injectProperty(prop, obj)
        } else {
          obj[hprop] = value
        }
      },
      enumerable: true,
      configurable: true,
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
    if (!this.hooks.has(rule.hook)) {
      this.hooks.set(rule.hook, new Map())
    }
    const methods = this.hooks.get(rule.hook)
    if (!methods.has(rule.method)) {
      methods.set(rule.method, new Set())
    }
    methods.get(rule.method).add(rule)
  }

  //подключить методы к объектам
  private runMethodByTemplate(
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
          this.executeAction(obj, rule, ensure)
        })
      }
    }
    const hasInstead =
      this.hooks.has('instead') && this.hooks.get('instead').has(action)
    const instead = hasInstead ? this.hooks.get('instead').get(action) : null
    if (hasInstead && instead) {
      instead.forEach((rule) => {
        this.executeAction(result, rule, ensure)
      })
    } else {
      result = handler(obj) ?? obj
    }
    if (this.hooks.has('after')) {
      const after = this.hooks.get('after')
      if (after.has(action)) {
        after.get(action).forEach((rule) => {
          this.executeAction(result, rule, ensure)
        })
      }
    }
    return result
  }

  injectProperties(obj: T) {
    this.props.forEach((_, key) => {
      this.injectProperty(key, obj)
    })
  }

  private injectProperty(key: keyof T, obj: T) {
    if (this.hiddenProps.has(key)) {
      if (!obj[this.hiddenProps.get(key)]) {
        this.defineProperty(obj, key)
      }
    } else {
      this.defineProperty(obj, key)
    }
  }

  ejectProperties(obj: T) {
    this.props.forEach((_, key) => {
      this.ejectProperty(key, obj)
    })
  }

  private ejectProperty(key: keyof T, obj: T) {
    if (this.hiddenProps.has(key)) {
      const prop = this.hiddenProps.get(key)
      if (obj.hasOwnProperty(prop)) {
        delete obj[key]
        obj[key] = obj[prop]
        delete obj[prop]
      }
    }
  }

  create(obj: Partial<T>, ensure: boolean = false) {
    let result: T = this.runMethodByTemplate(
      obj as T,
      'create',
      ensure,
      (obj) => {
        let res: T
        if (this.factory) {
          res = this.factory(obj)
        } else {
          res = obj as T
        }
        this.injectProperties(obj)
        this.injectMethods(obj)
        this.updateFields(obj, '*', true)
        return res
      },
    )
    return result
  }

  update(obj: T, update: T, ensure: boolean = false) {
    let result: T = this.runMethodByTemplate(
      obj as T,
      'update',
      ensure,
      (obj) => {
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
      },
    )

    return result
  }

  patch(obj: T, update: Partial<T>, ensure: boolean = false) {
    let result: T = this.runMethodByTemplate(
      obj as T,
      'patch',
      ensure,
      (obj) => {
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
      },
    )
    return result
  }

  clone(obj: T, ensure: boolean = false) {
    let result: T = this.runMethodByTemplate(
      obj as T,
      'clone',
      ensure,
      (obj) => {
        let res
        if (this.factory) {
          res = this.factory(obj)
        } else {
          res = obj as T
        }
        this.injectProperties(obj)
        this.injectMethods(obj)
        this.updateFields(obj, Object.keys(res) as Array<keyof T>, true)
        return res
      },
    )
    return result
  }

  delete(obj: T, ensure: boolean = true) {
    let result: T = this.runMethodByTemplate(
      obj as T,
      'delete',
      ensure,
      (obj) => {
        obj[deleted] = true
        return obj
      },
    )
    this.ejectProperties(obj)
    this.ejectMethods(obj)
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

  execute(obj: T, name: string, ...args) {
    if (this.methods.has(name)) {
      this.executeAction(obj, this.methods.get(name), args)
    } else {
      throw new Error(`no such method ${name}`)
    }
  }

  private executeAction(obj: T, rule: Rule<T>, ...args): number {
    if (rule.runIsArrow) {
      return rule.run(obj, ...args)
    } else {
      return rule.run.apply(obj, args)
    }
  }

  executeAllActions(obj: T, ...args): Map<string, any> {
    let result = new Map<string, any>()
    this.methods.forEach((rule, name) => {
      result.set(name, this.executeAction(obj, rule, ...args))
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
