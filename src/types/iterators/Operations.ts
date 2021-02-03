import { ValueType } from '../ValueType'
import { BPlusTree } from '../BPlusTree'
import { $eq } from './opsources/$eq'
import { $gt } from './opsources/$gt'
import { $gte } from './opsources/$gte'
import { $lt } from './opsources/$lt'
import { $lte } from './opsources/$lte'
import { $in } from './opsources/$in'
import { $nin } from './opconsumers/$nin'
import { $iterator } from './opsources/$iterator'
import { $range } from './opsources/$range'
import { IOpSrc } from './IOpSrc'
import { IOpCons } from './IOpCons'
import { OperationConsumer } from './OperationConsumer'
import { IOpTr } from './IOpTr'

export class Operations<T> implements IOpSrc<T> {
  tree: BPlusTree<T>
  forward: boolean
  constructor(tree: BPlusTree<T>, forward: boolean = true) {
    this.tree = tree
    this.forward = forward
  }

  eq(key: ValueType): IOpCons<T> {
    return new OperationConsumer<T>($eq(this.tree, key))
  }
  gt(key: ValueType): IOpCons<T> {
    return new OperationConsumer<T>($gt(this.tree, key))
  }
  gte(key: ValueType): IOpCons<T> {
    return new OperationConsumer<T>($gte(this.tree, key))
  }
  lt(key: ValueType): IOpCons<T> {
    return new OperationConsumer<T>($lt(this.tree, key))
  }
  lte(key: ValueType): IOpCons<T> {
    return new OperationConsumer<T>($lte(this.tree, key))
  }
  in(keys: ValueType[]): IOpCons<T> {
    return new OperationConsumer<T>($in(this.tree, keys))
  }
  nin(keys: ValueType[]): IOpCons<T> {
    $iterator(this.tree, this.forward)
    return new OperationConsumer<T>(
      $nin($iterator(this.tree, this.forward), keys),
    )
  }
  range(
    from: ValueType,
    to: ValueType,
    fromIncl: boolean,
    toIncl: boolean,
  ): IOpCons<T> {
    return new OperationConsumer<T>(
      $range(this.tree, from, to, fromIncl, toIncl),
    )
  }
}
