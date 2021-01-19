import {
  ActionHookTime,
  ActionHookMethod,
  FullEventName,
} from './methods/ExecutionTme'
export type SetterInput<T extends object> = {
  // поле
  field: keyof T
  // от кого зависит
  subscribesTo?: keyof T | Array<keyof T>
  //зависимые
  subjectFor?: keyof T | Array<keyof T>
  //условие
  condition?: (obj: T) => boolean
  //что
  run: (obj: T) => any
}

export type GetSetInput<T extends object> = {
  //действие после дествия над каким-то полем
  field: keyof T
  method: 'get' | 'set'
  //условие
  condition?: (obj: T) => boolean
  run: (obj: T) => any
}

export type ActionInput<T extends object> = {
  on: FullEventName | Array<FullEventName>
  //условие
  condition?: (obj: T) => boolean
  run: (obj: T) => any
}

export type MethodInput<T extends object> = {
  // название метода или действия
  name: string
  //условие
  condition?: (obj: T) => boolean
  run: (obj: T) => any
}
