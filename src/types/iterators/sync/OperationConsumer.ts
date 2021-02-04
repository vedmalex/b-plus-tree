import { ValueType } from '../../ValueType'
import { $eq } from './opconsumers/$eq'
import { Cursor } from '../../eval/Cursor'
import { $ne } from './opconsumers/$ne'
import { $gt } from './opconsumers/$gt'
import { $gte } from './opconsumers/$gte'
import { $lt } from './opconsumers/$lt'
import { $lte } from './opconsumers/$lte'
import { $in } from './opconsumers/$in'
import { $nin } from './opconsumers/$nin'
import { $range } from './opconsumers/$range'
import { $filter } from './opconsumers/$filter'
import { $map } from './opconsumers/$map'
import { $distinct } from './opresults/$distinct'
import { $every } from './opresults/$every'
import { $some } from './opresults/$some'
import { $forEach } from './opresults/$forEach'
import { $forEachAsync } from './opresults/$forEachAsync'
import { $reduce } from './opresults/$reduce'
import { isAsyncFunction } from '../isAsyncFunction'
import { OperationConsumerAsync } from '../async/OperationConsumerAsync'
import { $mapAsync } from './opconsumers/$mapAsync'
import { $reduceAsync } from './opresults/$reduceAsync'
import { $filterAsync } from './opconsumers/$filterAsync'

export class OperationResult<T> {
  iterator: Iterable<Cursor<T>>
  constructor(iterator?: Iterable<Cursor<T>>) {
    this.iterator = iterator
  }
  distinct(): Set<T> {
    return $distinct(this.iterator)
  }
  every(condition: (value: [ValueType, T]) => boolean): boolean {
    return $every(this.iterator, condition)
  }
  some(condition: (value: [ValueType, T]) => boolean): boolean {
    return $some(this.iterator, condition)
  }
  forEach(action: (value: [ValueType, T]) => void) {
    if (isAsyncFunction(action)) {
      return $forEachAsync(this.iterator, action)
    } else {
      return $forEach(this.iterator, action)
    }
  }
  reduce<D>(reducer: (cur: T, res: D) => D, initial?: D): D {
    return $reduce(this.iterator, reducer, initial)
  }
}

export class OperationConsumer<T> {
  iterator: Iterable<Cursor<T>>

  constructor(iterator?: Iterable<Cursor<T>>) {
    this.iterator = iterator
  }

  map<D>(func: (value: [ValueType, T]) => D) {
    return new OperationConsumer<D>($map(this.iterator, func))
  }
  mapAsync<D>(func: (value: [ValueType, T]) => Promise<D>) {
    return new OperationConsumerAsync<D>($mapAsync(this.iterator, func))
  }
  ///
  distinct() {
    return $distinct(this.iterator)
  }
  every(condition: (value: [ValueType, T]) => boolean) {
    return $every(this.iterator, condition)
  }
  some(condition: (value: [ValueType, T]) => boolean) {
    return $some(this.iterator, condition)
  }
  forEach(
    action:
      | ((value: [ValueType, T]) => void)
      | ((value: [ValueType, T]) => Promise<void>),
  ) {
    return $forEach(this.iterator, action)
  }

  forEachAsync(action: (value: [ValueType, T]) => Promise<void>) {
    return $forEachAsync(this.iterator, action)
  }

  reduce<D>(reducer: (cur: T, res: D) => D, initial?: D): D | Promise<D> {
    return $reduce(this.iterator, reducer, initial)
  }

  reduceAsync<D>(
    reducer: (cur: T, res: D) => Promise<D>,
    initial?: D,
  ): D | Promise<D> {
    return $reduceAsync(this.iterator, reducer, initial)
  }

  //
  eq(key: ValueType) {
    return new OperationConsumer<T>($eq(this.iterator, key))
  }
  ne(key: ValueType) {
    return new OperationConsumer<T>($ne(this.iterator, key))
  }
  gt(key: ValueType) {
    return new OperationConsumer<T>($gt(this.iterator, key))
  }
  gte(key: ValueType) {
    return new OperationConsumer<T>($gte(this.iterator, key))
  }
  lt(key: ValueType) {
    return new OperationConsumer<T>($lt(this.iterator, key))
  }
  lte(key: ValueType) {
    return new OperationConsumer<T>($lte(this.iterator, key))
  }
  in(keys: ValueType[]) {
    return new OperationConsumer<T>($in(this.iterator, keys))
  }
  nin(keys: ValueType[]) {
    return new OperationConsumer<T>($nin(this.iterator, keys))
  }

  range(from: ValueType, to: ValueType, fromIncl: boolean, toIncl: boolean) {
    return new OperationConsumer<T>(
      $range(this.iterator, from, to, fromIncl, toIncl),
    )
  }

  filter(filter: (value: [ValueType, T]) => boolean) {
    return new OperationConsumer<T>($filter(this.iterator, filter))
  }

  filterAsync(filter: (value: [ValueType, T]) => Promise<boolean>) {
    return new OperationConsumerAsync<T>($filterAsync(this.iterator, filter))
  }
}
