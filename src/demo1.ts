import { BPlusTree } from './types/BPlusTree'
import axios from 'axios'
import { sourceIn } from './types/pipes/sourceIn'
import { query } from './types/pipes/types'
import { map } from './types/pipes/map'
import { reduce } from './types/pipes/reduce'
import { filter } from './types/pipes/filter'

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
  page: 'http://ya.ru',
})
addPerson({
  id: 1,
  name: 'jame',
  age: 45,
  ssn: '000-0000-000002',
  page: 'http://ya.ru',
})
addPerson({
  id: 2,
  name: 'mark',
  age: 30,
  ssn: '000-0000-000003',
  page: 'http://ya.ru',
})
addPerson({
  id: 3,
  name: 'simon',
  age: 24,
  ssn: '000-0000-00004',
  page: 'http://ya.ru',
})
addPerson({
  id: 4,
  name: 'jason',
  age: 19,
  ssn: '000-0000-000005',
  page: 'http://ya.ru',
})
addPerson({
  id: 5,
  name: 'jim',
  age: 18,
  ssn: '000-0000-000006',
  page: 'http://ya.ru',
})
addPerson({
  id: 6,
  name: 'jach',
  age: 29,
  ssn: '000-0000-000007',
  page: 'http://ya.ru',
})
addPerson({
  id: 7,
  name: 'monika',
  age: 30,
  ssn: '000-0000-000008',
  page: 'http://ya.ru',
})

// console.log(print_node(tree).join('\n'))

async function print() {
  const result = await query(
    sourceIn<Person>([1, 3, 5]),
    filter((v) => v[1].age > 20),
    map(async ([, person]) => ({
      age: person.age,
      name: person.name,
      // page: await axios.get(person.page),
    })),
    reduce((res, cur) => {
      res.set(cur.name, cur)
      return res
    }, new Map<string, any>()),
  )(tree)

  // console.log([...result])
  for await (let p of result) {
    console.log(p)
  }
}

print().then((_) => console.log('done'))
