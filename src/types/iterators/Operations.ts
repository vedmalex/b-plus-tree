import { OperationConsumer } from './sync/OperationConsumer'
import { ValueType } from '../ValueType'
import { BPlusTree } from '../BPlusTree'
import { $eq } from './opsources/$eq'
import { $gt } from './opsources/$gt'
import { $gte } from './opsources/$gte'
import { $lt } from './opsources/$lt'
import { $lte } from './opsources/$lte'
import { $in } from './opsources/$in'
import { $range } from './opsources/$range'
import { $nin } from './sync/opconsumers/$nin'
import { $iterator } from './opsources/$iterator'
import { OperationConsumerAsync } from './async/OperationConsumerAsync'

export class Operations<T> {
  tree: BPlusTree<T>
  forward: boolean
  constructor(tree: BPlusTree<T>, forward: boolean = true) {
    this.tree = tree
    this.forward = forward
  }
  // должна объединять результаты всех курсоров, синхронных или асинхронных

  eq(key: ValueType) {
    return new OperationConsumer<T>($eq(this.tree, key))
  }
  gt(key: ValueType) {
    return new OperationConsumer<T>($gt(this.tree, key))
  }
  gte(key: ValueType) {
    return new OperationConsumer<T>($gte(this.tree, key))
  }
  lt(key: ValueType) {
    return new OperationConsumer<T>($lt(this.tree, key))
  }
  lte(key: ValueType) {
    return new OperationConsumer<T>($lte(this.tree, key))
  }
  in(keys: ValueType[]) {
    return new OperationConsumer<T>($in(this.tree, keys))
  }
  nin(keys: ValueType[]) {
    $iterator(this.tree, this.forward)
    return new OperationConsumer<T>(
      $nin($iterator(this.tree, this.forward), keys),
    )
  }
  range(from: ValueType, to: ValueType, fromIncl: boolean, toIncl: boolean) {
    return new OperationConsumer<T>(
      $range(this.tree, from, to, fromIncl, toIncl),
    )
  }
}
