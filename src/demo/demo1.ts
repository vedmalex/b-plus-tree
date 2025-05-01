import { BPlusTree } from '../BPlusTree'
import { query } from '../types'
import { print_node } from '../print_node'
import axios from 'axios'
import { filter, map, reduce } from 'src/query'
// import { remove } from 'src/methods'

type Person = {
  id?: number
  name: string
  age: number
  ssn: string
  page?: string
}

const tree = new BPlusTree<Person, number>(2, false)

const addPerson = (inp: Person) => tree.insert(inp.id, inp)

addPerson({
  id: 0,
  name: 'alex',
  age: 42,
  ssn: '000-0000-000001',
  page: 'https://ya.ru/',
})
addPerson({
  id: 1,
  name: 'jame',
  age: 45,
  ssn: '000-0000-000002',
  page: 'https://ya.ru/',
})
addPerson({
  // id: 2,
  name: 'mark',
  age: 30,
  ssn: '000-0000-000003',
  page: 'https://ya.ru/',
})
addPerson({
  id: 3,
  name: 'simon',
  age: 24,
  ssn: '000-0000-00004',
  page: 'https://ya.ru/',
})
addPerson({
  id: 4,
  name: 'jason',
  age: 19,
  ssn: '000-0000-000005',
  page: 'https://ya.ru/',
})
addPerson({
  id: 5,
  name: 'jim',
  age: 18,
  ssn: '000-0000-000006',
  page: 'https://ya.ru/',
})
addPerson({
  id: 6,
  name: 'jach',
  age: 29,
  ssn: '000-0000-000007',
  page: 'https://ya.ru/',
})
addPerson({
  id: 7,
  name: 'monika',
  age: 30,
  ssn: '000-0000-000008',
  page: 'https://ya.ru/',
})

// console.log(print_node(tree).join('\n'))

async function print() {
  const result = query(
    tree.includes([1, 3, 5]),
    filter<Person, number>((v) => v[1].age > 20),
    map(async ([, person]) => ({
      age: person.age,
      name: person.name,
      page: await axios.get(person.page),
    })),
    reduce((res, cur) => {
      res.set(cur.name, cur)
      return res
    }, new Map<string, unknown>()),
  )(tree)

  // console.log([...result])
  for await (const p of result) {
    console.log(p)
  }
}
// придумать and / or
// обход по всем входящим итераторам +
// и обработка по условию, все элементы курсора или в любом или только во всех...

// print().then((_) => console.log('done'))

//@ts-ignore
async function print1() {
  const result = query(
    tree.includes([1, 3, 5]),
    filter<Person, number>((v) => v[1].age > 20),
    // filter((v) => v[1].age > 20 && v[1].age < 30),
    // filter((v) => v[1].age < 30),
    // remove<Person, number>(tree, 1),
  )(tree)

  console.log(result)
  console.log(tree.size)
  console.log(print_node(tree).join('\n'))
  for await (const p of result) {
    console.log(p)
    console.log(tree.find(p[0]))
  }
  console.log(print_node(tree).join('\n'))
}

// print1().then((_) => console.log('done'))
print().then((_) => console.log('done'))
