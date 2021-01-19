import * as Benchmark from 'benchmark'
import { RuleRunner } from './types/RuleRunner'
import { Rule } from './types/Rule'
import { makeObservable, observable, computed, autorun } from 'mobx'

type ID = number
type DTO = {
  id?: ID
  name: string
  age?: number
  birthDate?: string
  fullName?: string
  secondName?: string
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
  condition: (obj) => !obj.active,
  run: (obj) => (obj.active = true),
})

export type TransacationRecord<T> = {
  action: 'create' | 'update' | 'patch' | 'delete' | 'clone'
  old: T
  current: T
  time: string
}
const changelog: Map<ID, Set<TransacationRecord<DTO>>> = new Map()

const create = Rule.createAction<DTO>({
  on: 'after:create',
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
  on: ['after:patch', 'after:update'],
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

let runner = new RuleRunner<DTO>([
  ...autoIncrementId,
  ...fullName,
  ...activate,
  ...create,
  ...patch,
  ...deleteDto,
  ...clone,
])

class User {
  id?: ID
  name: string = ''
  age?: number
  birthDate?: string
  secondName?: string = ''
  lastName: string = ''
  active?: boolean
  createdAt?: string
  updatedAt?: string
  deleted?: boolean
  constructor(name, lastName) {
    makeObservable(this, {
      name: observable,
      lastName: observable,
      secondName: observable,
      fullName: computed,
    })
    this.name = name
    this.lastName = lastName
    this.createdAt = new Date().toJSON()
    this.id = id++
  }

  get fullName() {
    const { name, lastName, secondName } = this
    return `${name ? name : ''}${secondName ? ' ' + secondName : ''}${
      lastName ? ' ' + lastName : ''
    }`
  }
}

var suite = new Benchmark.Suite()
const stop = autorun(() => {})

suite
  .add('mobx', function () {
    const user = new User('Ivan', 'Gorky')
    const fullName = user.fullName
    const id = user.id
    const createdAt = user.createdAt
  })
  .add('runner', function () {
    runner.create({ name: 'Ivan', lastName: 'Gorky' })
  })
  .add('static', function () {
    let user: Partial<DTO> = { name: 'Ivan', lastName: 'Gorky' }
    user.id = id++
    const { name, lastName, secondName } = user
    user.fullName = `${name ? name : ''}${secondName ? ' ' + secondName : ''}${
      lastName ? ' ' + lastName : ''
    }`
    user.createdAt = new Date().toJSON()
  })
  .on('cycle', function (event) {
    console.log(String(event.target))
  })
  .on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name'))
  })
suite.run()
// stop()

// const stop = autorun(() => {})
// const user = new User('Ivan', 'Gorky')
// console.log(user.fullName)
// console.log(user.id)
// console.log(user.createdAt)

// stop()
