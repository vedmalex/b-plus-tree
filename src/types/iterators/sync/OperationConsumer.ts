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
import { IOpCons } from '../IOpCons'
import { IOpRes } from '../IOpRes'
import { isAsyncFunction } from '../isAsyncFunction'
import { IOpTr } from '../IOpTr'

export class OperationConsumer<T> implements IOpCons<T>, IOpRes<T>, IOpTr<T> {
  iterator: Iterable<Cursor<T>>

  constructor(iterator?: Iterable<Cursor<T>>) {
    this.iterator = iterator
  }

  get transform() {
    return this as IOpTr<T>
  }

  get result() {
    return this as IOpRes<T>
  }

  map<D>(func: (value: [ValueType, T]) => D): IOpRes<D> {
    return new OperationConsumer<D>($map(this.iterator, func))
  }
  ///
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

  reduce<E, D>(reducer: (cur: T | E, res: D) => D, initial?: D): D {
    return $reduce(this.iterator, reducer, initial)
  }
  //
  eq(key: ValueType): IOpRes<T> {
    return new OperationConsumer<T>($eq(this.iterator, key))
  }
  ne(key: ValueType): IOpRes<T> {
    return new OperationConsumer<T>($ne(this.iterator, key))
  }
  gt(key: ValueType): IOpCons<T> | IOpRes<T> | IOpTr<T> {
    return new OperationConsumer<T>($gt(this.iterator, key))
  }
  gte(key: ValueType): IOpCons<T> | IOpRes<T> | IOpTr<T> {
    return new OperationConsumer<T>($gte(this.iterator, key))
  }
  lt(key: ValueType): IOpCons<T> | IOpRes<T> | IOpTr<T> {
    return new OperationConsumer<T>($lt(this.iterator, key))
  }
  lte(key: ValueType): IOpCons<T> | IOpRes<T> | IOpTr<T> {
    return new OperationConsumer<T>($lte(this.iterator, key))
  }
  in(keys: ValueType[]): IOpCons<T> | IOpRes<T> | IOpTr<T> {
    return new OperationConsumer<T>($in(this.iterator, keys))
  }
  nin(keys: ValueType[]): IOpCons<T> {
    return new OperationConsumer<T>($nin(this.iterator, keys))
  }

  range(
    from: ValueType,
    to: ValueType,
    fromIncl: boolean,
    toIncl: boolean,
  ): IOpCons<T> {
    return new OperationConsumer<T>(
      $range(this.iterator, from, to, fromIncl, toIncl),
    )
  }
  filter(filter: (value: [ValueType, T]) => boolean): IOpCons<T> {
    return new OperationConsumer<T>($filter(this.iterator, filter))
  }
}
