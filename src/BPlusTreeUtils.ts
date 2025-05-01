import { BPlusTree } from './BPlusTree';
import { Node, PortableBPlusTree, ValueType, PortableNode } from './Node';
import { Comparator } from './types'; // Assuming Comparator might be needed for createFrom options eventually
// import { IBPlusTree } from './IBPlusTree'; // Import the interface

/**
 * Serializes a BPlusTree instance into a portable format.
 * @param tree The BPlusTree instance (or conforming object) to serialize.
 * @returns A portable object representing the tree's state.
 */
export function serializeTree<T, K extends ValueType>(
  // Accept a wider type, but require the necessary public properties for serialization.
  // We know the concrete BPlusTree class has these.
  tree: Pick<BPlusTree<T, K>, 't' | 'root' | 'unique' | 'nodes' | 'next_node_id'>
): PortableBPlusTree<T, K> {
  // Access public properties directly from the tree instance
  const { t, root, unique, nodes, next_node_id } = tree;
  return {
    t,
    next_node_id, // Assuming next_node_id remains needed for serialization state
    root,
    unique,
    nodes: [...nodes.values()].map((n) => Node.serialize(n)), // Node.serialize is still static
  };
}

/**
 * Deserializes data from a portable format into an existing BPlusTree instance.
 * @param tree The BPlusTree instance to populate.
 * @param stored The portable object containing the tree's state.
 */
export function deserializeTree<T, K extends ValueType>(
  tree: BPlusTree<T, K>,
  stored: PortableBPlusTree<T, K> | Record<string, T> // Allow object format too
): void {
    // Check if it's the full PortableBPlusTree format
    if (stored && typeof stored === 'object' && 't' in stored && 'root' in stored && 'nodes' in stored) {
        const { t, next_node_id, root, unique, nodes } = stored as PortableBPlusTree<T, K>;
        tree.nodes.clear(); // Clear existing nodes
        tree.t = t;
        tree.next_node_id = next_node_id; // Assuming next_node_id is public or accessible
        tree.root = root;
        tree.unique = unique;
        nodes.forEach((n: PortableNode<T,K>) => {
            const node = Node.deserialize<T, K>(n, tree); // Node.deserialize needs tree instance
            tree.nodes.set(n.id, node);
        });
    } else if (stored && typeof stored === 'object') {
        // Handle simple key-value pair object serialization (like original deserialize part)
         tree.reset(); // Start fresh for key-value loading
        for (const [key, value] of Object.entries(stored)) {
            // We might need type assertions or checks here if K isn't string
            tree.insert(key as K, value as T);
        }
    } else {
        console.warn("Invalid data format provided for deserialization.");
    }
}

/**
 * Creates a new BPlusTree instance from serialized data.
 * @param stored The portable object containing the tree's state.
 * @param options Optional parameters for the new tree constructor (e.g., t, unique, comparator).
 *                These will be overridden by values in 'stored' if present in the full format.
 * @returns A new BPlusTree instance populated with the deserialized data.
 */
export function createTreeFrom<T, K extends ValueType>(
  stored: PortableBPlusTree<T, K> | Record<string, T>,
  options?: {
      t?: number;
      unique?: boolean;
      comparator?: Comparator<K>;
      defaultEmpty?: K;
      keySerializer?: (keys: Array<K>) => any;
      keyDeserializer?: (keys: any) => Array<K>;
  }
): BPlusTree<T, K> {
  // Create a new tree with provided options or defaults
  const res = new BPlusTree<T, K>(
      options?.t,
      options?.unique,
      options?.comparator,
      options?.defaultEmpty,
      options?.keySerializer,
      options?.keyDeserializer
  );
  // Deserialize the data into the new tree
  deserializeTree(res, stored);
  return res;
}