// проверяем зависимости
const fields = ['keys', 'size', 'key_num', 'isEmpty', 'min', 'max']

const color = {
  keys: 0,
  size: 0,
  key_num: 0,
  isEmpty: 0,
  min: 0,
  max: 0,
}

const deps = {
  keys: [],
  size: ['keys'],
  key_num: ['keys'],
  isEmpty: ['size'],
  min: ['keys'],
  max: ['keys'],
}

const result_ = {
  keys: ['size', 'key_num', 'min', 'max'],
  size: ['isEmpty'],
  key_num: [],
  isEmpty: [],
  min: [],
  max: [],
}

const dfs = (v) => {
  color[v] = 1 /* gray */
  for (let i = 0; i < deps[v]?.length; i++) {
    let f = fields[i]
    if (!color[f]) {
      dfs(v)
    }
    if (color[f] == 1) {
      return 1
    }
  }
  color[v] = 2
  return 0
}

loop = []

const loops = fields.reduce((res, f) => {
  isLoop = dfs(f)
  if (isLoop == 1) {
    loop.push(f)
  }
  dfs(f)
  return res
}, 0)

const path = {}
const getDeps = (f, field) => {
  const dependency = deps[f]
  field = field ?? f
  if (dependency.length > 0) {
    for (let i = 0; i < dependency.length; i++) {
      const f = dependency[i];
      getDeps(f, field)
      if(!path[f]) path[f] = []
      path[f].push(field)
    }
  }
}

fields.forEach((f) => {
  if (color[f] != 1) {
    getDeps(f)
  }
})

console.log('pathp', path)
console.log('loop', loop)
console.log('color', color)
console.log('loops', loops)
