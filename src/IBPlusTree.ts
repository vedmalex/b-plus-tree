import { Cursor } from './eval';
import { ValueType } from './Node';

/**
 * Interface describing the public API of a B+ Tree.
 * T - Type of the value stored in the tree.
 * K - Type of the key used for indexing (must extend ValueType).
 */
export interface IBPlusTree<T, K extends ValueType> {
    /** Minimum key in the tree. */
    readonly min: K | undefined;
    /** Maximum key in the tree. */
    readonly max: K | undefined;
    /** Number of items stored in the tree. */
    readonly size: number;

    // --- Query Source Methods --- //
    // These methods return functions that generate iterators (sources) for queries.

    /** Creates a source generator for keys included in the provided array. */
    includes(keys: Array<K>): (tree: this) => Generator<Cursor<T, K>, void>;
    /** Creates a source generator for items matching the exact key. */
    equals(key: K): (tree: this) => Generator<Cursor<T, K>, void>;
    /** Creates a source generator for items matching the key, handling nulls specifically. */
    equalsNulls(key: K): (tree: this) => Generator<Cursor<T, K>, void>;
    /** Creates a source generator for items within a key range. */
    range(from: K, to: K, fromIncl?: boolean, toIncl?: boolean): (tree: this) => Generator<Cursor<T, K>, void>;
    /** Creates a source generator to iterate over all items. */
    each(forward?: boolean): (tree: this) => Generator<Cursor<T, K>, void>;
    /** Creates a source generator for items with keys greater than the specified key. */
    gt(key: K): (tree: this) => Generator<Cursor<T, K>, void>;
    /** Creates a source generator for items with keys greater than or equal to the specified key. */
    gte(key: K): (tree: this) => Generator<Cursor<T, K>, void>;
    /** Creates a source generator for items with keys less than the specified key. */
    lt(key: K): (tree: this) => Generator<Cursor<T, K>, void>;
    /** Creates a source generator for items with keys less than or equal to the specified key. */
    lte(key: K): (tree: this) => Generator<Cursor<T, K>, void>;

    // --- Direct Access Methods --- //

    /** Finds all values associated with a specific key. */
    find(key?: K, options?: { skip?: number; take?: number; forward?: boolean }): Array<T>;
    /** Lists values in the tree, optionally skipping/taking a subset. */
    list(options?: { skip?: number; take?: number; forward?: boolean }): Array<T>;
    /** Finds the first value associated with the key (implementation-dependent order for duplicates). */
    findFirst(key: K): T | undefined;
    /** Finds the last value associated with the key (implementation-dependent order for duplicates). */
    findLast(key: K): T | undefined;
    /** Creates a cursor pointing to the first item with a key >= the specified key. */
    cursor(key: K): Cursor<T, K>;
    /** Counts the number of items associated with a specific key. */
    count(key: K): number;

    // --- Modification Methods --- //

    /** Inserts a key-value pair into the tree. Returns true if successful, false otherwise (e.g., duplicate in unique tree). */
    insert(key: K, value: T): boolean;
    /** Removes items matching a key based on a predicate function. Returns removed [key, value] pairs. */
    removeSpecific(key: K, specific: (value: T) => boolean): Array<[K, T]>;
    /** Removes the first item matching the key. Returns removed [key, value] pairs (at most one). */
    remove(key: K): Array<[K, T]>;
    /** Removes all items matching the key. Returns removed [key, value] pairs. */
    removeMany(key: K): Array<[K, T]>;
    /** Clears the tree, removing all nodes and data. */
    reset(): void;

    // --- Utility Methods --- //
    /** Returns a JSON representation of the tree structure (primarily for debugging). */
    toJSON(): unknown; // Return type can be complex, keep generic for interface

    // Potentially add other core methods/properties if deemed essential for the public interface.
}