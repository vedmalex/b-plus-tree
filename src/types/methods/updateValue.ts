export function updateValue<T extends object>(
  obj: T,
  prop: keyof T,
  setter: (obj: T) => any,
) {
  const old = obj[prop]
  const value = setter(obj)
  if (old != value) {
    obj[prop] = setter(obj)
    return 1
  } else return 0
}
