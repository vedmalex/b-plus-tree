import { ActionHookTime, ActionHookMethod } from './methods/ExecutionTme'
export type SetterInput<T> = {
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

export type ActionInput<T> = {
  // название метода или действия
  name?: string
  //действие после дествия над каким-то полем
  fields?: Array<keyof T> | keyof T
  // событие
  method?: Array<ActionHookMethod> | ActionHookMethod
  // когда выполнять
  hooks?: Array<ActionHookTime> | ActionHookTime
  //условие
  condition?: (obj: T) => boolean
  run: (obj: T) => any
}
