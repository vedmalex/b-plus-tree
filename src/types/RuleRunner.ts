import { updateValue } from '../methods/updateValue'
import { Rule } from './Rule'

/**
 * нужно прикрепить его к дереву
 */
export class RuleRunner<T extends { id: number }> {
  dependencies: { [key: string]: Array<keyof T> }
  notifiers: { [key: string]: Array<keyof T> }
  setters: { [key: string]: Rule<T> }
  rules: { [key: string]: Rule<T> }

  public fields: Array<keyof T>
  public actions: Array<string>
  constructor(rules: Array<Rule<T>>) {
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
    this.notifiers = {}
    this.dependencies = {}
    this.fields = []
    this.setters = {}
    this.actions = []
    this.rules = {}
    this.runners = new Map()
    rules.forEach((cur) => {
      if (cur.type == 'setter') {
        this.fields.push(cur.field)
        if (!this.setters[cur.field as string]) {
          this.setters[cur.field as string] = cur
        } else {
          throw new Error(`duplicate rule ${cur.field}`)
        }
      } else if (cur.type == 'action') {
        if (!this.rules[cur.name]) {
          this.rules[cur.name] = cur
        } else {
          throw new Error(`duplicate action ${cur.name}`)
        }
        this.actions.push(cur.name)
      }
    })
    this.initDependencies()
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
  lock(node: T, f: keyof T): boolean {
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
  unlock(node: T, f) {
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
  initDependencies() {
    const color: { [key: string]: number } = {}
    this.dependencies = this.fields.reduce((g, c) => {
      g[c as string] = this.setters[c as string].deps
      color[c as string] = 0 /* white */
      return g
    }, {})

    this.findLoops(color)

    this.fields.forEach((f) => {
      if (color[f as string] != 1) {
        this.getDeps(f)
      }
    })
  }

  private findLoops(color: { [key: string]: number }) {
    const loop = []

    const loops = this.fields.reduce((res, f) => {
      const isLoop = this.dfs(f as string, color)
      if (isLoop == 1) {
        loop.push(f)
      }
      this.dfs(f as string, color)
      return res
    }, 0)

    if (loops > 0) {
      throw new Error(`cyclic dependecy loop found ${loop.join(',')}`)
    }
  }

  private dfs(v: string, color: { [key: string]: number }) {
    color[v] = 1 /* gray */
    for (let i = 0; i < this.dependencies[v]?.length; i++) {
      let f = this.fields[i]
      if (!color[f as string]) {
        this.dfs(v, color)
      }
      if (color[f as string] == 1) {
        return 1
      }
    }
    color[v] = 2
    return 0
  }

  private getDeps(f: keyof T, field?: keyof T) {
    const dependency = this.dependencies[f as string]
    field = field ?? f
    if (dependency?.length > 0) {
      for (let i = 0; i < dependency.length; i++) {
        const f = dependency[i]
        this.getDeps(f, field)
        if (!this.notifiers[f as string]) this.notifiers[f as string] = []
        this.notifiers[f as string].push(field)
      }
    }
  }

  updateFields(obj: T, metric: keyof T | '*', batch: boolean = false) {
    if (metric == '*') {
      const metrics = this.fields
      const result = metrics
        .map((metric) => this.updateFields(obj, metric, true))
        .reduce((r, c) => r + c, 0)
      return result
    } else if (
      this.setters[metric as string] &&
      (this.setters[metric as string].condition?.(obj) ?? true)
    ) {
      const rule = this.setters[metric as string]
      if (rule.deps && !batch) {
        rule.deps.forEach((dep) => {
          this.updateFields(obj, dep, batch)
        })
      }
      return updateValue<T>(obj, metric, rule.run)
    } else {
      // nothing to change
      return 0
    }
  }

  executeAction(obj: T, name: string) {
    const action = this.actions[name]
    if (obj && name && action) {
      if (action.condition?.(obj)) {
        if (action.deps) {
          action.deps.forEach((dep) => {
            this.updateFields(obj, dep, true)
          })
        }
        return action.run(obj) ?? 1
      }
    } else {
      return 0
    }
  }
  executeAllActions(obj: T) {
    return this.actions
      .map((name) => this.executeAction(obj, name))
      .reduce((r, c) => r + c, 0)
  }
}
