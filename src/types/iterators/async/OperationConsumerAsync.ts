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
import { $filterAsync } from './opconsumers/$filterAsync'
import { $map } from './opconsumers/$map'
import { $mapAsync } from './opconsumers/$mapAsync'
import { $distinct } from './opresults/$distinct'
import { $every } from './opresults/$every'
import { $some } from './opresults/$some'
import { $forEach } from './opresults/$forEach'
import { $forEachAsync } from './opresults/$forEachAsync'
import { $reduce } from './opresults/$reduce'
import { $reduceAsync } from './opresults/$reduceAsync'
import { isAsyncFunction } from '../isAsyncFunction'

export class OperationConsumerAsync<T> {
  iterator: AsyncIterable<Cursor<T>>

  constructor(iterator?: AsyncIterable<Cursor<T>>) {
    this.iterator = iterator
  }

  map<D>(func: (value: [ValueType, T]) => D) {
    return new OperationConsumerAsync<D>($map(this.iterator, func))
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

  forEach(action: (value: [ValueType, T]) => void) {
    return $forEach(this.iterator, action)
  }

  forEachAsync(action: (value: [ValueType, T]) => Promise<void>) {
    return $forEachAsync(this.iterator, action)
  }

  reduce<D>(reducer: (cur: T, res: D) => D, initial?: D) {
    return $reduce(this.iterator, reducer, initial)
  }
  reduceAsync<D>(reducer: (cur: T, res: D) => Promise<D>, initial?: D) {
    return $reduceAsync(this.iterator, reducer, initial)
  }
  //
  eq(key: ValueType) {
    return new OperationConsumerAsync<T>($eq(this.iterator, key))
  }
  ne(key: ValueType) {
    return new OperationConsumerAsync<T>($ne(this.iterator, key))
  }
  gt(key: ValueType) {
    return new OperationConsumerAsync<T>($gt(this.iterator, key))
  }
  gte(key: ValueType) {
    return new OperationConsumerAsync<T>($gte(this.iterator, key))
  }
  lt(key: ValueType) {
    return new OperationConsumerAsync<T>($lt(this.iterator, key))
  }
  lte(key: ValueType) {
    return new OperationConsumerAsync<T>($lte(this.iterator, key))
  }
  in(keys: ValueType[]) {
    return new OperationConsumerAsync<T>($in(this.iterator, keys))
  }
  nin(keys: ValueType[]) {
    return new OperationConsumerAsync<T>($nin(this.iterator, keys))
  }

  range(from: ValueType, to: ValueType, fromIncl: boolean, toIncl: boolean) {
    return new OperationConsumerAsync<T>(
      $range(this.iterator, from, to, fromIncl, toIncl),
    )
  }
  filter(
    filter:
      | ((value: [ValueType, T]) => boolean)
      | ((value: [ValueType, T]) => Promise<boolean>),
  ) {
    if (isAsyncFunction(filter)) {
      return new OperationConsumerAsync<T>($filterAsync(this.iterator, filter))
    } else {
      return new OperationConsumerAsync<T>($filter(this.iterator, filter))
    }
  }
}
