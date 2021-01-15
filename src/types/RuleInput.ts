export type RuleInput<T> = {
  name?: string
  field?: 'none' | keyof T
  deps?: Array<keyof T>
  condition?: (obj: T) => boolean
  run: (obj: T) => any
}
