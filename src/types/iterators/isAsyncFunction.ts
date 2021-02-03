export function isAsyncFunction<T, R>(
  func: ((...args) => R) | ((...args) => Promise<R>),
): func is (...args) => Promise<R> {
  return Object.prototype.toString.call(func) == '[object AsyncFunction]'
}
