import { BPlusTree } from './types/BPlusTree'
import { print_node } from './types/print_node'
import { Operations } from './types/iterators/Operations'
import axios from 'axios'

type Person = {
  id: number
  name: string
  age: number
  ssn: string
  page: string
}

const tree = new BPlusTree<Person>(2, false)

const addPerson = (inp: Person) => tree.insert(inp.id, inp)

addPerson({
  id: 0,
  name: 'alex',
  age: 42,
  ssn: '000-0000-000001',
  page: 'ya.ru',
})
addPerson({
  id: 1,
  name: 'jame',
  age: 45,
  ssn: '000-0000-000002',
  page: 'ya.ru',
})
addPerson({
  id: 2,
  name: 'mark',
  age: 30,
  ssn: '000-0000-000003',
  page: 'ya.ru',
})
addPerson({
  id: 3,
  name: 'simon',
  age: 24,
  ssn: '000-0000-00004',
  page: 'ya.ru',
})
addPerson({
  id: 4,
  name: 'jason',
  age: 19,
  ssn: '000-0000-000005',
  page: 'ya.ru',
})
addPerson({
  id: 5,
  name: 'jim',
  age: 18,
  ssn: '000-0000-000006',
  page: 'ya.ru',
})
addPerson({
  id: 6,
  name: 'jach',
  age: 29,
  ssn: '000-0000-000007',
  page: 'ya.ru',
})
addPerson({
  id: 7,
  name: 'monika',
  age: 30,
  ssn: '000-0000-000008',
  page: 'ya.ru',
})

console.log(print_node(tree).join('\n'))

const op = new Operations(tree)

const res = [
  ...op.in([1, 3, 5]).map(([, person]) => ({
    age: person.age,
    name: person.name,
  })).iterator,
]
console.log(res)
async function print() {
  const asop = op
    .in([1, 3, 5])
    .mapAsync(async ([, person]) => ({
      age: person.age,
      name: person.name,
      page: await axios.get(person.page),
    }))
    .reduce((cur, res) => {
      res.set(cur.name, cur)
      return res
    }, new Map<string, any>()) as Promise<any>
}
