import type { ValueType } from './Node'

export type Comparator<K extends ValueType> = (a?: K, b?: K) => number

export type UnaryFunction<T, R> = (source: T) => R

/* eslint:disable:max-line-length */
export function query<T, K extends ValueType>(): UnaryFunction<T, T>
export function query<T, A>(fn1: UnaryFunction<T, A>): UnaryFunction<T, A>
export function query<T, A, B>(
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
): UnaryFunction<T, B>
export function query<T, A, B, C>(
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
  fn3: UnaryFunction<B, C>,
): UnaryFunction<T, C>
export function query<T, A, B, C, D>(
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
  fn3: UnaryFunction<B, C>,
  fn4: UnaryFunction<C, D>,
): UnaryFunction<T, D>
export function query<T, A, B, C, D, E>(
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
  fn3: UnaryFunction<B, C>,
  fn4: UnaryFunction<C, D>,
  fn5: UnaryFunction<D, E>,
): UnaryFunction<T, E>
export function query<T, A, B, C, D, E, F>(
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
  fn3: UnaryFunction<B, C>,
  fn4: UnaryFunction<C, D>,
  fn5: UnaryFunction<D, E>,
  fn6: UnaryFunction<E, F>,
): UnaryFunction<T, F>
export function query<T, A, B, C, D, E, F, G>(
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
  fn3: UnaryFunction<B, C>,
  fn4: UnaryFunction<C, D>,
  fn5: UnaryFunction<D, E>,
  fn6: UnaryFunction<E, F>,
  fn7: UnaryFunction<F, G>,
): UnaryFunction<T, G>
export function query<T, A, B, C, D, E, F, G, H>(
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
  fn3: UnaryFunction<B, C>,
  fn4: UnaryFunction<C, D>,
  fn5: UnaryFunction<D, E>,
  fn6: UnaryFunction<E, F>,
  fn7: UnaryFunction<F, G>,
  fn8: UnaryFunction<G, H>,
): UnaryFunction<T, H>
export function query<T, A, B, C, D, E, F, G, H, I>(
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
  fn3: UnaryFunction<B, C>,
  fn4: UnaryFunction<C, D>,
  fn5: UnaryFunction<D, E>,
  fn6: UnaryFunction<E, F>,
  fn7: UnaryFunction<F, G>,
  fn8: UnaryFunction<G, H>,
  fn9: UnaryFunction<H, I>,
): UnaryFunction<T, I>
export function query<T, A, B, C, D, E, F, G, H, I>(
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
  fn3: UnaryFunction<B, C>,
  fn4: UnaryFunction<C, D>,
  fn5: UnaryFunction<D, E>,
  fn6: UnaryFunction<E, F>,
  fn7: UnaryFunction<F, G>,
  fn8: UnaryFunction<G, H>,
  fn9: UnaryFunction<H, I>,
  ...fns: Array<UnaryFunction<unknown, unknown>>
): UnaryFunction<T, unknown>
/* eslint:enable:max-line-length */

export function query(
  ...fns: Array<UnaryFunction<unknown, unknown>>
): UnaryFunction<unknown, unknown> {
  return queryFromArray(fns)
}

export function identity<T>(x: T): T {
  return x
}

/** @internal */
export function queryFromArray<T, R>(
  fns: Array<UnaryFunction<T, R>>,
): UnaryFunction<T, R> | ((input: T) => UnaryFunction<T, R>) {
  if (fns.length === 0) {
    return identity as UnaryFunction<T, R>
  }

  if (fns.length === 1) {
    return fns[0]
  }

  return (input: T) => {
    let res: T | R = input
    fns.forEach((fn) => {
      res = fn(res as T)
    })
    return res as unknown as R
    // return fns.reduce(
    //   (prev: T, fn: UnaryFunction<T, R>) => fn(prev),
    //   input as any,
    // )
  }
}

// export interface CursorFunction<T, K extends ValueType> {
//   (source: Generator<Cursor<T, K>> | AsyncGenerator<Cursor<T, K>>):
//     | Generator<Cursor<T, K>>
//     | AsyncGenerator<Cursor<T, K>>
// }
