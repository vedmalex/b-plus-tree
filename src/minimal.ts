// Note: This is an inferred interface based on usage analysis.
// The actual interface might differ.

// Assumed type definition for serialized data
interface PortableBPlusTree<K, V> {
  // Structure depends on the library's serialization format
}

// Assumed structure for the cursor yielded by each()
interface Cursor<K, V> {
    key: K;
    value: V;
    // potentially other properties
}

// Interface for BPlusTree instance methods/properties
interface IBPlusTree<K, V> {
  // Properties/Getters
  readonly min: K | undefined; // Smallest key in the tree
  readonly max: K | undefined; // Largest key in the tree
  readonly size: number;       // Number of elements in the tree

  // Methods
  insert(key: K, value: V): unknown; // Return type still unclear
  remove(key: K): unknown; // Removes all values for the key, return type unclear
  removeSpecific(key: K, predicate: (value: V) => boolean): unknown; // Removes specific value, return type unclear

  findFirst(key: K): V | undefined; // Finds the first value associated with the key
  findLast(key: K): V | undefined; // Finds the last value associated with the key
  find?(key: K): V[] | IterableIterator<V>; // Finds all values (if non-unique), exact signature uncertain

  reset(): void; // Clears the tree

  /** Returns a function that, when called with the tree, provides an iterator. */
  each(forward?: boolean): (tree: this) => IterableIterator<Cursor<K, V>>;

  // Standard iteration protocols are likely also supported
  // [Symbol.iterator](): IterableIterator<[K, V]>;
  // entries?(): IterableIterator<[K, V]>;
  // keys?(): IterableIterator<K>;
  // values?(): IterableIterator<V>;
}

// Interface for BPlusTree static methods (and constructor)
interface IBPlusTreeStatic {
  new <K, V>(order?: number, unique?: boolean): IBPlusTree<K, V>;
  serialize<K, V>(tree: IBPlusTree<K, V>): PortableBPlusTree<K, V>;
  createFrom<K, V>(data: PortableBPlusTree<K, V>): IBPlusTree<K, V>; // Creates a new tree instance
  deserialize<K, V>(targetTree: IBPlusTree<K, V>, data: PortableBPlusTree<K, V>): void; // Modifies targetTree in place
}

// Example usage
// declare const BPlusTree: IBPlusTreeStatic;
// const tree1 = new BPlusTree<string, number>(32, false);
// tree1.insert('a', 1);
// tree1.insert('b', 2);
// const treeSize = tree1.size;
// const serialized = BPlusTree.serialize(tree1);
// const tree2 = new BPlusTree<string, number>();
// BPlusTree.deserialize(tree2, serialized); // tree2 now contains data from tree1
// const iteratorFunc = tree1.each();
// for (const cursor of iteratorFunc(tree1)) {
//     console.log(cursor.key, cursor.value);
// }
// tree1.reset(); // tree1 is now empty