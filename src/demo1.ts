import { BPlusTree } from './types/BPlusTree'
import { print_node } from './types/print_node'
import { Operations } from './types/iterators/Operations'

type Person = {
  id: number
  name: string
  age: number
  ssn: string
}

const tree = new BPlusTree<Person>(2, false)

const addPerson = (inp: Person) => tree.insert(inp.id, inp)

addPerson({ id: 0, name: 'alex', age: 42, ssn: '000-0000-000001' })
addPerson({ id: 1, name: 'jame', age: 45, ssn: '000-0000-000002' })
addPerson({ id: 2, name: 'mark', age: 30, ssn: '000-0000-000003' })
addPerson({ id: 3, name: 'simon', age: 24, ssn: '000-0000-00004' })
addPerson({ id: 4, name: 'jason', age: 19, ssn: '000-0000-000005' })
addPerson({ id: 5, name: 'jim', age: 18, ssn: '000-0000-000006' })
addPerson({ id: 6, name: 'jach', age: 29, ssn: '000-0000-000007' })
addPerson({ id: 7, name: 'monika', age: 30, ssn: '000-0000-000008' })

console.log(print_node(tree).join('\n'))

const op = new Operations(tree)

const res = [
  ...op.in([1, 3, 5]).transform.map(([, person]) => ({
    age: person.age,
    name: person.name,
  })).iterator,
]

console.log(res)
