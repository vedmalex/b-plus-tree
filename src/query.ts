import type { ValueType } from './Node'
import type { Cursor } from './eval'

export function distinct<T, K extends ValueType>(): (
  source: Generator<Cursor<T, K, T>> | AsyncGenerator<Cursor<T, K, T>>,
) => AsyncGenerator {
  return reduce<T, K, Set<T>>((res, cur) => {
    res.add(cur)
    return res
  }, new Set())
}

export function eq<T, K extends ValueType>(
  key: K,
): (
  source:
    | Generator<Cursor<T, K>, void, unknown>
    | AsyncGenerator<Cursor<T, K>, void, unknown>,
) => AsyncGenerator<Cursor<T, K>, void, unknown> {
  return filter<T, K>(([k]) => k == key)
}

export function every<T, K extends ValueType>(
  func: (value: [K, T]) => boolean | Promise<boolean>,
) {
  return async function* (
    source: Generator<Cursor<T, K>> | AsyncGenerator<Cursor<T, K>>,
  ): AsyncGenerator<boolean, void, unknown> {
    for await (const cursor of source) {
      if (!(await func([cursor.key, cursor.value]))) {
        yield false
        return
      }
    }
    yield true
  }
}

export function filter<T, K extends ValueType>(
  filter: (value: [K, T]) => Promise<boolean> | boolean,
) {
  return async function* (
    source: Generator<Cursor<T, K>> | AsyncGenerator<Cursor<T, K>>,
  ): AsyncGenerator<Cursor<T, K>, void, unknown> {
    for await (const cursor of source) {
      if (await filter([cursor.key, cursor.value])) {
        yield cursor
      }
    }
  }
}

export function forEach<T, K extends ValueType>(
  action: (value: [K, T]) => Promise<void> | void,
) {
  return async function* (
    source: Generator<Cursor<T, K>> | AsyncGenerator<Cursor<T, K>>,
  ): AsyncGenerator<Cursor<T, K>, void> {
    for await (const cursor of source) {
      await action([cursor.key, cursor.value])
      yield cursor
    }
  }
}

export function gt<T, K extends ValueType>(
  key: K,
): (
  source:
    | Generator<Cursor<T, K>, void, unknown>
    | AsyncGenerator<Cursor<T, K>, void, unknown>,
) => AsyncGenerator<Cursor<T, K>, void, unknown> {
  return filter<T, K>(([k]) => k > key)
}


export function gte<T, K extends ValueType>(
  key: K,
): (
  source:
    | Generator<Cursor<T, K>, void, unknown>
    | AsyncGenerator<Cursor<T, K>, void, unknown>,
) => AsyncGenerator<Cursor<T, K>, void, unknown> {
  return filter<T, K>(([k]) => k >= key)
}


export function includes<T, K extends ValueType>(
  key: Array<ValueType>,
): (
  source:
    | Generator<Cursor<T, K>, void, unknown>
    | AsyncGenerator<Cursor<T, K>, void, unknown>,
) => AsyncGenerator<Cursor<T, K>, void, unknown> {
  return filter<T, K>(([k]) => key.includes(k))
}

export function lt<T, K extends ValueType>(
  key: K,
): (
  source:
    | Generator<Cursor<T, K>, void, unknown>
    | AsyncGenerator<Cursor<T, K>, void, unknown>,
) => AsyncGenerator<Cursor<T, K>, void, unknown> {
  return filter<T, K>(([k]) => k < key)
}


export function lte<T, K extends ValueType>(
  key: K,
): (
  source:
    | Generator<Cursor<T, K>, void, unknown>
    | AsyncGenerator<Cursor<T, K>, void, unknown>,
) => AsyncGenerator<Cursor<T, K>, void, unknown> {
  return filter<T, K>(([k]) => k <= key)
}

export function map<T, K extends ValueType, R>(
  func: (value: [K, T]) => R | Promise<R>,
) {
  return async function* (
    source: Generator<Cursor<T, K>> | AsyncGenerator<Cursor<T, K>>,
  ): AsyncGenerator<Cursor<T, K, R>, void> {
    for await (const cursor of source) {
      const value = await func([cursor.key, cursor.value])
      yield {
        ...cursor,
        value,
      }
    }
  }
}

export function mapReduce<T, K extends ValueType, D, V, O = Map<K, V>>(
  map: (inp: [K, T]) => D | Promise<D>,
  reduce: (inp: [K, D]) => V | Promise<V>,
  finalize?: (inp: Map<K, V>) => O | Promise<O>,
) {
  return async function* (
    source: Generator<Cursor<T, K>>,
  ): AsyncGenerator<Map<K, V> | O, void, unknown> {
    const result: Map<K, V> = new Map()
    for (const cursor of source) {
      const value = await map([cursor.key, cursor.value])
      const res = await reduce([cursor.key, value])
      result.set(cursor.key, res)
    }
    yield (await finalize?.(result)) ?? result
  }
}

export function ne<T, K extends ValueType>(
  key: K,
): (
  source:
    | Generator<Cursor<T, K>, void, unknown>
    | AsyncGenerator<Cursor<T, K>, void, unknown>,
) => AsyncGenerator<Cursor<T, K>, void, unknown> {
  return filter<T, K>(([k]) => k != key)
}

export function nin<T, K extends ValueType>(
  keys: Array<ValueType>,
): (
  source:
    | Generator<Cursor<T, K>, void, unknown>
    | AsyncGenerator<Cursor<T, K>, void, unknown>,
) => AsyncGenerator<Cursor<T, K>, void, unknown> {
  return filter<T, K>(([key]) => !keys.includes(key))
}

export function range<T, K extends ValueType>(
  from: ValueType,
  to: ValueType,
  fromIncl = true,
  toIncl = true,
): (
  source:
    | Generator<Cursor<T, K>, void, unknown>
    | AsyncGenerator<Cursor<T, K>, void, unknown>,
) => AsyncGenerator<Cursor<T, K>, void, unknown> {
  return filter<T, K>(
    ([k]) =>
      (k > from || (fromIncl && k == from)) && (k < to || (toIncl && k == to)),
  )
}

export function reduce<T, K extends ValueType, D>(
  reducer: (res: D, cur: T) => Promise<D> | D,
  initial?: D,
) {
  return async function* (
    source: Generator<Cursor<T, K>> | AsyncGenerator<Cursor<T, K>>,
  ): AsyncGenerator<D, void> {
    let result = initial
    for await (const cursor of source) {
      result = await reducer(result, cursor.value)
    }
    yield result
  }
}

export function some<T, K extends ValueType>(func: (value: [K, T]) => boolean) {
  return async function* (
    source: Generator<Cursor<T, K>> | AsyncGenerator<Cursor<T, K>>,
  ): AsyncGenerator<boolean, void> {
    for await (const cursor of source) {
      if (func([cursor.key, cursor.value])) {
        yield true
        return
      }
    }
    yield false
    return
  }
}
