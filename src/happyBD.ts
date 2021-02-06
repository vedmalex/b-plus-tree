export function Okonchanie(S: number, P: number) {
  const Okon = ['й', 'го']
  let result
  if (P == 0) {
    result = ' '
  } else {
    switch (S) {
      case 0:
        result = `${Okon[0]} `
        break
      case 1:
        result = `${Okon[1]} `
        break
      case 2:
        result = `${Okon[1]} `
        break
      case 3:
        result = `${Okon[0]} `
        break
      case 4:
        result = `${Okon[0]} `
        break
      case 5:
        result = `${Okon[1]} `
        break
    }
  }
  return result
}

export function main() {
  let S: number, P: number, i: number, j: number, Podch: string, Glav: string

  const Su = ['Любви', 'Здоровья', 'Счастья', 'Удачи', 'Доброты', 'Настроения']

  const Pril = [
    'Много',
    'Крепко',
    'Огромно',
    'Вечно',
    'Постоянно',
    'Хороше',
    'Большо',
    'Добро',
  ]

  console.log(
    'Папа, мы с Мироном поздравляем тебя с Днём Рождения и желаем тебе:\n',
  )

  for (i = 0; i < 15; i++) {
    let pad = ''
    for (j = 0; j < i; j++) {
      pad += ' '
    }
    S = Math.trunc(Math.random() * 6)
    P = Math.trunc(Math.random() * 8)
    Glav = Su[S]
    Podch = Pril[P]
    console.log(pad, Podch + Okonchanie(S, P), Glav)
  }
}

main()
