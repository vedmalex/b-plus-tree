import 'jest'
import { RuleRunner } from '../RuleRunner'
import { Rule } from '../Rule'
type ID = number
type DTO = {
  id?: ID
  name: string
  age?: number
  birthDate?: string
  fullName?: string
  secondName?: string
  title?: string
  lastName?: string
  active?: boolean
  createdAt?: string
  updatedAt?: string
  deleted?: boolean
}

const user1: DTO = {
  name: 'John',
}
const user2: DTO = {
  name: 'Michel',
}
const user3: DTO = {
  name: 'Trevis',
}

let id = 0
const autoIncrementId = Rule.createSetter<DTO>({
  field: 'id',
  condition: (obj) => obj != null,
  run: (obj) => {
    obj.id = id++
  },
})
const loopIncrement = Rule.createSetter<DTO>({
  field: 'age',
  subscribesTo: 'birthDate',
  condition: (obj) => !!obj?.age,
  run: (obj) => new Date().setFullYear(new Date().getFullYear() - obj.age),
})

const fullName = Rule.createSetter<DTO>({
  field: 'fullName',
  subscribesTo: ['lastName', 'name', 'secondName'],
  condition: (obj) => !!(obj.name || obj.secondName || obj.lastName),
  run: (obj) => {
    const { name, lastName, secondName } = obj
    obj.fullName = `${name ? name : ''}${secondName ? ' ' + secondName : ''}${
      lastName ? ' ' + lastName : ''
    }`
  },
})

const activate = Rule.createMethod<DTO>({
  name: 'activate user',
  run: (obj) => {
    obj.active = true
  },
})

export type TransacationRecord<T> = {
  action: 'create' | 'update' | 'patch' | 'delete' | 'clone' | 'get' | 'set'
  old?: T
  current?: T
  time: string
}

const create = Rule.createAction<DTO>({
  on: 'after:create',
  run: (obj) => {
    obj.createdAt = new Date().toJSON()
  },
})

const updated = Rule.createAction<DTO>({
  on: 'after:update',
  run: (obj) => {
    obj.createdAt = new Date().toJSON()
  },
})

const deleteDto = Rule.createAction<DTO>({
  on: 'before:delete',
  run: (obj) => {
    obj.createdAt = new Date().toJSON()
  },
})

const patch = Rule.createAction<DTO>({
  on: 'after:patch',
  run: (obj) => {
    obj.createdAt = new Date().toJSON()
  },
})

const clone = Rule.createAction<DTO>({
  on: 'after:clone',
  run: (obj) => {
    obj.id = id++
    obj.createdAt = new Date().toJSON()
  },
})

const changelog: Map<ID, Set<TransacationRecord<DTO>>> = new Map()

// создавать через метод
const titleGet = Rule.createProperty<DTO>({
  method: 'get',
  field: 'title',
  run: (obj) => {
    if (!changelog.has(obj.id)) {
      changelog.set(obj.id, new Set())
    }
    changelog.get(obj.id).add({
      action: 'get',
      time: new Date().toJSON(),
    })
    // return value not used at all
  },
})

const titleSet = Rule.createProperty<DTO>({
  method: 'set',
  field: 'title',
  run: (obj) => {
    if (!changelog.has(obj.id)) {
      changelog.set(obj.id, new Set())
    }
    changelog.get(obj.id).add({
      action: 'set',
      time: new Date().toJSON(),
    })
    obj.title = `Mr./Mrs/Ms ${obj.title}`
  },
})

const setters = [...autoIncrementId]
const actions = [
  ...activate,
  ...create,
  ...updated,
  ...patch,
  ...deleteDto,
  ...clone,
]

describe('Rule runner', () => {
  it('accept rules', () => {
    let runner
    expect(() => (runner = new RuleRunner<DTO>(setters))).not.toThrow()
  })
  it('not accept dupes in rules', () => {
    expect(() => {
      new RuleRunner<DTO>([...autoIncrementId, ...autoIncrementId])
    }).toThrow()
  })
  it('accept actions', () => {
    let runner
    expect(() => (runner = new RuleRunner<DTO>(actions))).not.toThrow()
  })
  it('accept dupes in actions', () => {
    expect(
      () => new RuleRunner<DTO>([...activate, ...activate]),
    ).toThrow()
  })
  it('run action', () => {
    let runner = new RuleRunner<DTO>(actions)
    let user: DTO = { ...user1 } as DTO

    const result = runner.execute(user, 'activate user')
    expect(result).toBeUndefined()
    expect(user.active).toBeTruthy()
  })
  it('clone', () => {
    let runner = new RuleRunner<DTO>([
      ...autoIncrementId,
      ...fullName,
      ...activate,
      ...create,
      ...updated,
      ...patch,
      ...deleteDto,
      ...clone,
    ])
    expect(runner.fieldOrder.length).toBe(5)
    expect(runner.setters.size).toBe(2)
    expect(runner.hooks.get('after').size).toBe(4)
    expect(runner.actions.size).toBe(5)
    expect(runner.methods.size).toBe(1)
    expect(runner.hooks.size).toBe(2)
    expect(runner.hooks.get('after').size).toBe(4)
    expect(runner.hooks.get('before').size).toBe(1)
    let user = runner.create({ name: 'Ivan', lastName: 'Gorky' })
    expect(user.id).not.toBeUndefined()
    expect(user.fullName).toBe('Ivan Gorky')
    expect(user.createdAt).not.toBeUndefined()
  })
  it('loop', () => {
    let runner = new RuleRunner<DTO>([
      ...autoIncrementId,
      ...fullName,
      ...activate,
      ...create,
      ...updated,
      ...patch,
      ...deleteDto,
      ...clone,
      ...loopIncrement,
    ])
    expect(runner.fieldOrder.length).toBe(7)
    expect(runner.setters.size).toBe(3)
    expect(runner.hooks.get('after').size).toBe(4)
    expect(runner.actions.size).toBe(5)
    expect(runner.hooks.size).toBe(2)
    expect(runner.methods.size).toBe(1)
    expect(runner.hooks.get('after').size).toBe(4)
    expect(runner.hooks.get('before').size).toBe(1)
    let user = runner.create({ name: 'Ivan', lastName: 'Gorky' })
    expect(user.id).not.toBeUndefined()
    expect(user.fullName).toBe('Ivan Gorky')
    expect(user.createdAt).not.toBeUndefined()
  })

  it('properties get/set', () => {
    let runner = new RuleRunner<DTO>([...titleSet, ...titleGet])
    let user = runner.create({ name: 'Ivan' })
    user.title = 'Ivanius'
    expect(user.title).toBe('Mr./Mrs/Ms Ivanius')
  })
  it('properties set', () => {
    let runner = new RuleRunner<DTO>([...titleSet])
    let user = runner.create({ name: 'Ivan' })
    user.title = 'Ivanius'
    expect(user.title).toBe('Mr./Mrs/Ms Ivanius')
  })
  it('properties get', () => {
    let runner = new RuleRunner<DTO>([...titleGet])
    let user = runner.create({ name: 'Ivan' })
    user.title = 'Ivanius'
    expect(user.title).toBe('Ivanius')
  })
})
