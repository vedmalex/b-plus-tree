import { RuleInput } from './RuleInput'

export class Rule<T extends object> {
  type: 'action' | 'setter' = 'action'
  field: keyof T
  name: string
  deps?: Array<keyof T>
  condition?: (obj: T) => boolean
  run: (obj: T) => any
  constructor({ deps, run, condition, field, name }: RuleInput<T>) {
    this.type = field ? 'setter' : 'action'
    this.deps = deps
    this.run = run
    this.condition = condition
    if (field != 'none') this.field = field
    this.name = name
    if (!name) {
      this.name = `${this.type} for ${field}`
    }
  }
}
