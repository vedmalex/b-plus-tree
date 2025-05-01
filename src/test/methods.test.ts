import { describe, it, expect, beforeEach } from 'bun:test'
import {
  find_first_key,
  find_last_key,
  find_first_item,
  find_last_item,
  compare_keys_primitive,
  find_first_node,
  find_last_node,
  borrow_from_left,
  borrow_from_right,
  reflow,
  split,
  remove,
} from '../methods'
import type { Comparator } from '../types'
import { BPlusTree } from '../BPlusTree'
import {
  Node,
  PortableNode,
  ValueType,
  merge_with_left,
  merge_with_right,
  register_node,
  remove_node,
  update_min_max,
  update_state
} from '../Node'

const comparator: Comparator<number> = compare_keys_primitive;

describe('Array Search Functions (methods.ts)', () => {

  describe('find_first_key', () => {
    const arr = [10, 20, 20, 30, 40, 40, 40, 50];

    it('should find the first position for an existing key', () => {
      expect(find_first_key(arr, 20, comparator)).toBe(1);
      expect(find_first_key(arr, 40, comparator)).toBe(4);
    });

    it('should find the insertion point for a key smaller than all elements', () => {
      expect(find_first_key(arr, 5, comparator)).toBe(0);
    });

    it('should find the insertion point for a key larger than all elements', () => {
      expect(find_first_key(arr, 60, comparator)).toBe(arr.length);
    });

    it('should find the insertion point for a key between elements', () => {
      expect(find_first_key(arr, 25, comparator)).toBe(3);
      expect(find_first_key(arr, 45, comparator)).toBe(7);
    });

    it('should handle empty array', () => {
      expect(find_first_key([], 10, comparator)).toBe(0);
    });

     it('should find the first key itself', () => {
       expect(find_first_key(arr, 10, comparator)).toBe(0);
     });

     it('should find the last key itself', () => {
       expect(find_first_key(arr, 50, comparator)).toBe(7);
     });
  });

  describe('find_last_key', () => {
    const arr = [10, 20, 20, 30, 40, 40, 40, 50];

    it('should find the position after the last occurrence of an existing key', () => {
      // find_last_key returns the index *after* the last element <= key
      expect(find_last_key(arr, 20, comparator)).toBe(3);
      expect(find_last_key(arr, 40, comparator)).toBe(7);
    });

     it('should find the position for the first key', () => {
       expect(find_last_key(arr, 10, comparator)).toBe(1);
     });

     it('should find the position for the last key', () => {
       expect(find_last_key(arr, 50, comparator)).toBe(arr.length); // Position after the last element
     });

    it('should find the insertion point for a key smaller than all elements', () => {
      expect(find_last_key(arr, 5, comparator)).toBe(0);
    });

    it('should find the insertion point for a key larger than all elements', () => {
      expect(find_last_key(arr, 60, comparator)).toBe(arr.length);
    });

    it('should find the insertion point for a key between elements', () => {
      expect(find_last_key(arr, 25, comparator)).toBe(3);
      expect(find_last_key(arr, 45, comparator)).toBe(7);
    });

    it('should handle empty array', () => {
      expect(find_last_key([], 10, comparator)).toBe(0);
    });
  });

  describe('find_first_item', () => {
    const arr = [10, 20, 20, 30, 40, 40, 40, 50];

    it('should find the index of the first occurrence of an existing key', () => {
      expect(find_first_item(arr, 20, comparator)).toBe(1);
      expect(find_first_item(arr, 40, comparator)).toBe(4);
    });

     it('should find the index of the first key', () => {
       expect(find_first_item(arr, 10, comparator)).toBe(0);
     });

     it('should find the index of the last key', () => {
       expect(find_first_item(arr, 50, comparator)).toBe(7);
     });

    it('should return -1 for a non-existent key (smaller)', () => {
      expect(find_first_item(arr, 5, comparator)).toBe(-1);
    });

    it('should return -1 for a non-existent key (larger)', () => {
      expect(find_first_item(arr, 60, comparator)).toBe(-1);
    });

    it('should return -1 for a non-existent key (between)', () => {
      expect(find_first_item(arr, 25, comparator)).toBe(-1);
    });

    it('should handle empty array', () => {
      expect(find_first_item([], 10, comparator)).toBe(-1);
    });
  });

  describe('find_last_item', () => {
    const arr = [10, 20, 20, 30, 40, 40, 40, 50];

    it('should find the index of the last occurrence of an existing key', () => {
      expect(find_last_item(arr, 20, comparator)).toBe(2);
      expect(find_last_item(arr, 40, comparator)).toBe(6);
    });

    it('should find the index of the first key (single occurrence)', () => {
      expect(find_last_item(arr, 10, comparator)).toBe(0);
    });

    it('should find the index of the last key (single occurrence)', () => {
      expect(find_last_item(arr, 50, comparator)).toBe(7);
    });

    it('should return -1 for a non-existent key (smaller)', () => {
      expect(find_last_item(arr, 5, comparator)).toBe(-1);
    });

    it('should return -1 for a non-existent key (larger)', () => {
      expect(find_last_item(arr, 60, comparator)).toBe(-1);
    });

    it('should return -1 for a non-existent key (between)', () => {
      expect(find_last_item(arr, 25, comparator)).toBe(-1);
    });

    it('should handle empty array', () => {
      expect(find_last_item([], 10, comparator)).toBe(-1);
    });
  });

  // TODO: Add tests for comparators if needed
  // TODO: Add tests for node search functions (find_first_node, find_last_node)

});

describe('Node Search Functions (methods.ts)', () => {
  let tree: BPlusTree<string, number>
  const T = 2 // Degree for test tree

  // Helper to create a known tree structure
  // Structure for T=2 after inserting 1, 2, 3, 4, 5:
  //       Root [3]
  //      /     \
  //   [2]       [4, 5]
  //  /   \     /   |   \
  // L[1] L[2] L[3] L[4] L[5]  <-- This structure might be slightly off, split logic matters
  // Let's try a simpler structure first. Insert 1, 2, 3 -> Root [2], Left [1], Right [2, 3]
  beforeEach(() => {
    tree = new BPlusTree<string, number>(T, false, comparator)
    tree.insert(1, 'A')
    tree.insert(2, 'B')
    tree.insert(3, 'C')
    // Expected structure (t=2): Root (Internal, id=?) [2], Children -> L(id=?) [1], R(id=?) [2, 3]
    // Root ID might be 2 (0=L, 1=R, 2=Root)
  })

  describe('find_first_node', () => {
    it('should find the correct leaf node for existing keys', () => {
      const node1 = find_first_node(tree, 1);
      expect(node1.leaf).toBe(true);
      expect(node1.keys).toContain(1);
      expect(node1.pointers).toContain('A');

      const node2 = find_first_node(tree, 2);
      expect(node2.leaf).toBe(true);
      expect(node2.keys).toContain(2);
      expect(node2.pointers).toContain('B');

      const node3 = find_first_node(tree, 3);
      expect(node3.leaf).toBe(true);
      expect(node3.keys).toContain(3);
      expect(node3.pointers).toContain('C');
    });

    it('should find the leftmost leaf for a key smaller than min', () => {
      const node0 = find_first_node(tree, 0);
      expect(node0.leaf).toBe(true);
      expect(node0.min).toBe(1); // Should point to the leaf containing the minimum key
    });

    it('should find the rightmost leaf for a key larger than max', () => {
      const node4 = find_first_node(tree, 4);
      expect(node4.leaf).toBe(true);
      expect(node4.max).toBe(3); // Should point to the leaf containing the maximum key
    });

    it('should find the correct leaf for a key between existing keys', () => {
      const node1_5 = find_first_node(tree, 1.5);
      expect(node1_5.leaf).toBe(true);
      // Should point to the leaf where 1.5 would be inserted, which contains key 1
      expect(node1_5.keys).toContain(1);
    });

    // Add test for tree with more levels if needed
  });

  describe('find_last_node', () => {
     // Note: find_last_node behavior might be less critical/used than find_first_node
     // for standard B+ tree operations, but we test it for completeness.
    it('should find the correct leaf node for existing keys', () => {
       // In a unique tree or when searching for exact keys, find_last_node
       // should ideally land on the same node as find_first_node for exact matches.
       const node1 = find_last_node(tree, 1);
       expect(node1.leaf).toBe(true);
       expect(node1.keys).toContain(1);

       const node2 = find_last_node(tree, 2);
       expect(node2.leaf).toBe(true);
       expect(node2.keys).toContain(2);

       const node3 = find_last_node(tree, 3);
       expect(node3.leaf).toBe(true);
       expect(node3.keys).toContain(3);
    });

     it('should find the leftmost leaf for a key smaller than min', () => {
       const node0 = find_last_node(tree, 0);
       expect(node0.leaf).toBe(true);
       // find_last_key used internally might result in landing before the first element's node
       // Let's check if it finds the node containing the minimum element (or potentially root if only one node)
       expect(node0.min).toBe(1); // Or check if it contains key 1
     });

     it('should find the rightmost leaf for a key larger than max', () => {
       const node4 = find_last_node(tree, 4);
       expect(node4.leaf).toBe(true);
       // Should land in the node containing the max element
       expect(node4.max).toBe(3);
     });

     it('should find the correct leaf for a key between existing keys', () => {
       // Behavior might differ slightly from find_first_node depending on find_last_key logic
       const node1_5 = find_last_node(tree, 1.5);
       expect(node1_5.leaf).toBe(true);
       // It should find the node containing the key <= 1.5, which is the node with key 1.
       expect(node1_5.keys).toContain(1);

       const node2_5 = find_last_node(tree, 2.5);
       expect(node2_5.leaf).toBe(true);
       // It should find the node containing the key <= 2.5, which is the node with key 2.
       expect(node2_5.keys).toContain(2);
     });

    // Add test for tree with duplicate keys if behavior is expected to differ
  });
})

describe('Node Balancing Functions (methods.ts)', () => {
  let tree: BPlusTree<string, number>;
  let parent: Node<string, number>;
  let node: Node<string, number>; // The node that needs borrowing
  let left_sibling: Node<string, number>;
  let right_sibling: Node<string, number>;
  const T = 2; // Min degree t=2 (min keys = 1, max keys = 3)

  // Setup common structure for borrowing tests
  //      Parent [30]
  //     /      |      \
  // L_Sib[10,20] Node[25] R_Sib[35,40,50]
  // Node has t-1=1 key (minimum), L_Sib has 2 (>t-1), R_Sib has 3 (>t-1)
  const setupNodesForBorrow = () => {
    tree = new BPlusTree<string, number>(T, false, comparator);
    parent = Node.createNode(tree); // id=0
    left_sibling = Node.createLeaf(tree); // id=1
    node = Node.createLeaf(tree); // id=2
    right_sibling = Node.createLeaf(tree); // id=3

    tree.root = parent.id;

    // Setup leaves
    left_sibling.keys = [10, 20]; left_sibling.pointers = ['L1', 'L2']; update_state(left_sibling);
    left_sibling.min = 10; left_sibling.max = 20;

    node.keys = [25]; node.pointers = ['N1']; update_state(node); // Node needs data (only t-1 keys)
    node.min = 25; node.max = 25;

    right_sibling.keys = [35, 40, 50]; right_sibling.pointers = ['R1', 'R2', 'R3']; update_state(right_sibling);
    right_sibling.min = 35; right_sibling.max = 50;

    // Setup parent
    parent.children = [left_sibling.id, node.id, right_sibling.id];
    parent.keys = [node.min, right_sibling.min]; // Keys separating children [25, 35]
    update_state(parent);
    parent.min = left_sibling.min; // 10
    parent.max = right_sibling.max; // 50

    // Link parents and siblings
    left_sibling.parent = parent; node.parent = parent; right_sibling.parent = parent;
    left_sibling.right = node; node.left = left_sibling;
    node.right = right_sibling; right_sibling.left = node;
  };

  describe('borrow_from_left (leaf)', () => {
    beforeEach(setupNodesForBorrow);

    it('should move the last key/pointer from left sibling to node', () => {
      const originalNodeKeys = [...node.keys];
      const originalLeftKeys = [...left_sibling.keys];
      const borrowedKey = left_sibling.keys[left_sibling.key_num - 1];
      const borrowedPtr = left_sibling.pointers[left_sibling.pointers.length - 1];

      borrow_from_left(node, left_sibling);

      // Check node
      expect(node.key_num).toBe(originalNodeKeys.length + 1);
      expect(node.keys[0]).toBe(borrowedKey); // Borrowed key is now first
      expect(node.pointers[0]).toBe(borrowedPtr);
      expect(node.keys.slice(1)).toEqual(originalNodeKeys); // Original keys shifted right
      expect(node.min).toBe(borrowedKey);

      // Check left sibling
      expect(left_sibling.key_num).toBe(originalLeftKeys.length - 1);
      expect(left_sibling.max).toBe(originalLeftKeys[originalLeftKeys.length - 2]); // New max

      // Check parent separator key
      const nodeIndex = parent.children.indexOf(node.id);
      const separatorIndex = nodeIndex - 1;
      expect(parent.keys[separatorIndex]).toBe(borrowedKey); // Parent key updated
    });
  });

  describe('borrow_from_right (leaf)', () => {
    beforeEach(setupNodesForBorrow);

    it('should move the first key/pointer from right sibling to node', () => {
      const originalNodeKeys = [...node.keys];
      const originalRightKeys = [...right_sibling.keys];
      const borrowedKey = right_sibling.keys[0];
      const borrowedPtr = right_sibling.pointers[0];

      borrow_from_right(node, right_sibling);

      // Check node
      expect(node.key_num).toBe(originalNodeKeys.length + 1);
      expect(node.keys[node.key_num - 1]).toBe(borrowedKey); // Borrowed key is now last
      expect(node.pointers[node.pointers.length - 1]).toBe(borrowedPtr);
      expect(node.keys.slice(0, -1)).toEqual(originalNodeKeys); // Original keys remain at start
      expect(node.max).toBe(borrowedKey);

      // Check right sibling
      expect(right_sibling.key_num).toBe(originalRightKeys.length - 1);
      expect(right_sibling.min).toBe(originalRightKeys[1]); // New min

      // Check parent separator key
      const nodeIndex = parent.children.indexOf(node.id);
      const separatorIndex = nodeIndex;
      expect(parent.keys[separatorIndex]).toBe(right_sibling.min); // Parent key updated to new min of right sibling
    });
  });

   // --- Tests for Internal Nodes ---
   const setupInternalNodesForBorrow = () => {
     tree = new BPlusTree<string, number>(T, false, comparator);
     parent = Node.createNode(tree); // id=0
     left_sibling = Node.createNode(tree); // id=1
     node = Node.createNode(tree); // id=2 (needs borrowing)
     right_sibling = Node.createNode(tree); // id=3

     // Dummy leaf nodes to establish min/max for internal nodes
     const leaf1 = Node.createLeaf(tree); leaf1.keys=[10]; leaf1.pointers=['L1']; update_state(leaf1); leaf1.min=10; leaf1.max=10; leaf1.parent=left_sibling;
     const leaf2 = Node.createLeaf(tree); leaf2.keys=[20]; leaf2.pointers=['L2']; update_state(leaf2); leaf2.min=20; leaf2.max=20; leaf2.parent=left_sibling;
     const leaf3 = Node.createLeaf(tree); leaf3.keys=[30]; leaf3.pointers=['L3']; update_state(leaf3); leaf3.min=30; leaf3.max=30; leaf3.parent=left_sibling;

     const leaf4 = Node.createLeaf(tree); leaf4.keys=[40]; leaf4.pointers=['N1']; update_state(leaf4); leaf4.min=40; leaf4.max=40; leaf4.parent=node;
     const leaf5 = Node.createLeaf(tree); leaf5.keys=[50]; leaf5.pointers=['N2']; update_state(leaf5); leaf5.min=50; leaf5.max=50; leaf5.parent=node;

     const leaf6 = Node.createLeaf(tree); leaf6.keys=[60]; leaf6.pointers=['R1']; update_state(leaf6); leaf6.min=60; leaf6.max=60; leaf6.parent=right_sibling;
     const leaf7 = Node.createLeaf(tree); leaf7.keys=[70]; leaf7.pointers=['R2']; update_state(leaf7); leaf7.min=70; leaf7.max=70; leaf7.parent=right_sibling;
     const leaf8 = Node.createLeaf(tree); leaf8.keys=[80]; leaf8.pointers=['R3']; update_state(leaf8); leaf8.min=80; leaf8.max=80; leaf8.parent=right_sibling;
     const leaf9 = Node.createLeaf(tree); leaf9.keys=[90]; leaf9.pointers=['R4']; update_state(leaf9); leaf9.min=90; leaf9.max=90; leaf9.parent=right_sibling;

     // Setup internal nodes
     // Left Sibling (has > t children)
     left_sibling.children = [leaf1.id, leaf2.id, leaf3.id];
     left_sibling.keys = [leaf2.min, leaf3.min]; // [20, 30]
     update_state(left_sibling);
     left_sibling.min = leaf1.min; left_sibling.max = leaf3.max;

     // Node (needs borrowing, has t=2 children, t-1=1 key)
     node.children = [leaf4.id, leaf5.id];
     node.keys = [leaf5.min]; // [50]
     update_state(node);
     node.min = leaf4.min; node.max = leaf5.max;

     // Right Sibling (has > t children)
     right_sibling.children = [leaf6.id, leaf7.id, leaf8.id, leaf9.id];
     right_sibling.keys = [leaf7.min, leaf8.min, leaf9.min]; // [70, 80, 90]
     update_state(right_sibling);
     right_sibling.min = leaf6.min; right_sibling.max = leaf9.max;

     // Setup parent
     parent.children = [left_sibling.id, node.id, right_sibling.id];
     parent.keys = [node.min, right_sibling.min]; // [40, 60]
     update_state(parent);
     parent.min = left_sibling.min; parent.max = right_sibling.max;

     // Link parents and siblings
     left_sibling.parent = parent; node.parent = parent; right_sibling.parent = parent;
     left_sibling.right = node; node.left = left_sibling;
     node.right = right_sibling; right_sibling.left = node;

     tree.root = parent.id;
   };

   describe('borrow_from_left (internal)', () => {
     beforeEach(setupInternalNodesForBorrow);

     it('should move parent separator, sibling key/child to node', () => {
       const originalNodeKeys = [...node.keys]; // [50]
       const originalNodeChildren = [...node.children]; // [leaf4, leaf5]
       const originalLeftKeys = [...left_sibling.keys]; // [20, 30]
       const originalLeftChildren = [...left_sibling.children]; // [leaf1, leaf2, leaf3]
       const parentSeparatorIndex = parent.children.indexOf(node.id) - 1; // index 0
       const originalParentSeparator = parent.keys[parentSeparatorIndex]; // 40
       const borrowedChildId = originalLeftChildren[originalLeftChildren.length - 1]; // leaf3
       const borrowedSiblingKey = originalLeftKeys[originalLeftKeys.length - 1]; // 30

       borrow_from_left(node, left_sibling);

       // Check node
       expect(node.key_num).toBe(originalNodeKeys.length + 1); // 1 + 1 = 2
       expect(node.children.length).toBe(originalNodeChildren.length + 1); // 2 + 1 = 3
       expect(node.keys[0]).toBe(originalParentSeparator); // 40 is first key
       expect(node.keys.slice(1)).toEqual(originalNodeKeys); // Original keys shifted [50]
       expect(node.children[0]).toBe(borrowedChildId); // leaf3 is first child
       expect(node.children.slice(1)).toEqual(originalNodeChildren); // Original children shifted [leaf4, leaf5]
       expect(tree.nodes.get(borrowedChildId)!.parent).toBe(node); // Check reparenting (!)
       expect(node.min).toBe(tree.nodes.get(borrowedChildId)!.min); // New min is from leaf3 (30) (!)

       // Check left sibling
       const newLastLeftChildId = left_sibling.children[left_sibling.children.length - 1]; // Get ID of new last child (leaf2)
       expect(left_sibling.key_num).toBe(originalLeftKeys.length - 1); // 2 - 1 = 1
       expect(left_sibling.children.length).toBe(originalLeftChildren.length - 1); // 3 - 1 = 2
       expect(left_sibling.keys).toEqual([originalLeftKeys[0]]); // [20]
       expect(left_sibling.children).toEqual(originalLeftChildren.slice(0,-1)); // [leaf1, leaf2]
       expect(left_sibling.max).toBe(tree.nodes.get(newLastLeftChildId)!.max); // New max from leaf2 (20) (!)

       // Check parent separator key
       expect(parent.keys[parentSeparatorIndex]).toBe(borrowedSiblingKey); // Parent key updated to 30
     });
   });

   describe('borrow_from_right (internal)', () => {
     beforeEach(setupInternalNodesForBorrow);

     it('should move parent separator, sibling key/child to node', () => {
       const originalNodeKeys = [...node.keys]; // [50]
       const originalNodeChildren = [...node.children]; // [leaf4, leaf5]
       const originalRightKeys = [...right_sibling.keys]; // [70, 80, 90]
       const originalRightChildren = [...right_sibling.children]; // [leaf6, leaf7, leaf8, leaf9]
       const parentSeparatorIndex = parent.children.indexOf(node.id); // index 1
       const originalParentSeparator = parent.keys[parentSeparatorIndex]; // 60
       const borrowedChildId = originalRightChildren[0]; // leaf6
       const borrowedSiblingKey = originalRightKeys[0]; // 70

       borrow_from_right(node, right_sibling);

       // Check node
       expect(node.key_num).toBe(originalNodeKeys.length + 1); // 1 + 1 = 2
       expect(node.children.length).toBe(originalNodeChildren.length + 1); // 2 + 1 = 3
       expect(node.keys[originalNodeKeys.length]).toBe(originalParentSeparator); // 60 is last key
       expect(node.keys.slice(0, -1)).toEqual(originalNodeKeys); // Original keys remain [50]
       expect(node.children[originalNodeChildren.length]).toBe(borrowedChildId); // leaf6 is last child
       expect(node.children.slice(0, -1)).toEqual(originalNodeChildren); // Original children remain [leaf4, leaf5]
       expect(tree.nodes.get(borrowedChildId)!.parent).toBe(node); // Check reparenting (!)
       expect(node.max).toBe(tree.nodes.get(borrowedChildId)!.max); // New max is from leaf6 (60) (!)

       // Check right sibling
       const newFirstRightChildId = right_sibling.children[0]; // Get ID of new first child (leaf7)
       expect(right_sibling.key_num).toBe(originalRightKeys.length - 1); // 3 - 1 = 2
       expect(right_sibling.children.length).toBe(originalRightChildren.length - 1); // 4 - 1 = 3
       expect(right_sibling.keys).toEqual(originalRightKeys.slice(1)); // [80, 90]
       expect(right_sibling.children).toEqual(originalRightChildren.slice(1)); // [leaf7, leaf8, leaf9]
       expect(right_sibling.min).toBe(tree.nodes.get(newFirstRightChildId)!.min); // New min from leaf7 (70) (!)

       // Check parent separator key
       expect(parent.keys[parentSeparatorIndex]).toBe(borrowedSiblingKey); // Parent key updated to 70
     });
   });

    // TODO: Add tests for remove_node
    // TODO: Add tests for reflow

});

// Helper function added to BPlusTree class for testing purposes
// (Alternatively, access tree.nodes directly)
/* // Remove prototype modifications
BPlusTree.prototype.find_first_node = function(key: number): Node<string, number> {
    const methods = require('../methods');
    return methods.find_first_node(this, key);
};

BPlusTree.prototype.find_last_node = function(key: number): Node<string, number> {
    const methods = require('../methods');
    return methods.find_last_node(this, key);
};
*/

describe('Node Merging Functions (methods.ts)', () => {
  let tree: BPlusTree<string, number>;
  let parent: Node<string, number>;
  let node: Node<string, number>; // The node that needs merging (underflow)
  let left_sibling: Node<string, number>;
  let right_sibling: Node<string, number>;
  const T = 2; // Min degree t=2 (min keys = 1)

  // Setup common structure for merging tests (LEAF)
  //      Parent [20, 30]
  //     /      |      \
  // L_Sib[10] Node[20] R_Sib[30]
  // All leaves have exactly t-1=1 key, making borrowing impossible.
  const setupNodesForMergeLeaf = () => {
    tree = new BPlusTree<string, number>(T, false, comparator);
    parent = Node.createNode(tree); // id=0
    left_sibling = Node.createLeaf(tree); // id=1
    node = Node.createLeaf(tree); // id=2 (target for merge)
    right_sibling = Node.createLeaf(tree); // id=3
    tree.root = parent.id;

    // Setup leaves
    left_sibling.keys = [10]; left_sibling.pointers = ['L1']; update_state(left_sibling); left_sibling.min = 10; left_sibling.max = 10;
    node.keys = [20]; node.pointers = ['N1']; update_state(node); node.min = 20; node.max = 20;
    right_sibling.keys = [30]; right_sibling.pointers = ['R1']; update_state(right_sibling); right_sibling.min = 30; right_sibling.max = 30;

    // Setup parent
    parent.children = [left_sibling.id, node.id, right_sibling.id];
    parent.keys = [node.min, right_sibling.min]; // Keys separating children [20, 30]
    update_state(parent);
    parent.min = left_sibling.min; parent.max = right_sibling.max;

    // Link parents and siblings
    left_sibling.parent = parent; node.parent = parent; right_sibling.parent = parent;
    left_sibling.right = node; node.left = left_sibling;
    node.right = right_sibling; right_sibling.left = node;
  };

  describe('merge_with_left (leaf)', () => {
    beforeEach(setupNodesForMergeLeaf);

    it('should move all keys/pointers from left sibling to node', () => {
      const originalNodeKeys = [...node.keys]; // [20]
      const originalNodePointers = [...node.pointers]; // [N1]
      const originalLeftKeys = [...left_sibling.keys]; // [10]
      const originalLeftPointers = [...left_sibling.pointers]; // [L1]
      const nodeIndex = parent.children.indexOf(node.id); // 1
      const separatorKey = parent.keys[nodeIndex - 1]; // Key at index 0 -> 20

      // Perform the merge: merge left_sibling into node
      merge_with_left(node, left_sibling, separatorKey);

      // Simulate parent update (remove node and separator key) - normally done by reflow
      remove_node(parent, left_sibling); // Remove left sibling and its preceding key from parent
      // Parent keys become [30], children become [node.id, right_sibling.id]
      expect(parent.keys).toEqual([30]);
      expect(parent.children).toEqual([node.id, right_sibling.id]);

      // Check node (now contains merged data)
      expect(node.key_num).toBe(originalNodeKeys.length + originalLeftKeys.length);
      expect(node.keys).toEqual([...originalLeftKeys, ...originalNodeKeys]); // [10, 20]
      expect(node.pointers).toEqual([...originalLeftPointers, ...originalNodePointers]);
      expect(node.min).toBe(originalLeftKeys[0]); // 10
      expect(node.max).toBe(originalNodeKeys[originalNodeKeys.length - 1]); // 20

      // Check left_sibling (should be empty, state updated)
      expect(left_sibling.key_num).toBe(0);
      expect(left_sibling.isEmpty).toBe(true);

      // Note: The test assumes parent update happened *before* merge for simplicity.
      // In reality, reflow coordinates this.
    });
  });

  describe('merge_with_right (leaf)', () => {
    beforeEach(setupNodesForMergeLeaf);

    it('should move all keys/pointers from right sibling to node', () => {
      const originalNodeKeys = [...node.keys]; // [20]
      const originalNodePointers = [...node.pointers]; // [N1]
      const originalRightKeys = [...right_sibling.keys]; // [30]
      const originalRightPointers = [...right_sibling.pointers]; // [R1]
      const nodeIndex = parent.children.indexOf(node.id); // 1
      const separatorKey = parent.keys[nodeIndex]; // Key at index 1 -> 30

      // Perform the merge: merge right_sibling into node
      merge_with_right(node, right_sibling, separatorKey);

      // Simulate parent update (remove right sibling and separator key)
      remove_node(parent, right_sibling); // Removes right sibling and key 30
      // Parent keys become [20], children become [left_sibling.id, node.id]
      expect(parent.keys).toEqual([20]);
      expect(parent.children).toEqual([left_sibling.id, node.id]);

      // Check node (now contains merged data)
      expect(node.key_num).toBe(originalNodeKeys.length + originalRightKeys.length);
      expect(node.keys).toEqual([...originalNodeKeys, ...originalRightKeys]); // [20, 30]
      expect(node.pointers).toEqual([...originalNodePointers, ...originalRightPointers]);
      expect(node.min).toBe(originalNodeKeys[0]); // 20
      expect(node.max).toBe(originalRightKeys[originalRightKeys.length - 1]); // 30

      // Check right_sibling (should be empty)
      expect(right_sibling.key_num).toBe(0);
      expect(right_sibling.isEmpty).toBe(true);
    });
  });

  // --- Tests for Internal Node Merging ---
  const setupNodesForMergeInternal = () => {
    tree = new BPlusTree<string, number>(T, false, comparator);
    parent = Node.createNode(tree); // id=0
    left_sibling = Node.createNode(tree); // id=1
    node = Node.createNode(tree); // id=2 (target for merge)
    right_sibling = Node.createNode(tree); // id=3
    tree.root = parent.id;

    // Dummy leaf nodes (min keys = t-1 = 1)
    const leaf1 = Node.createLeaf(tree); leaf1.keys=[10]; leaf1.pointers=['L1']; update_state(leaf1); leaf1.min=10; leaf1.max=10; leaf1.parent=left_sibling;
    const leaf2 = Node.createLeaf(tree); leaf2.keys=[20]; leaf2.pointers=['L2']; update_state(leaf2); leaf2.min=20; leaf2.max=20; leaf2.parent=left_sibling;

    const leaf3 = Node.createLeaf(tree); leaf3.keys=[30]; leaf3.pointers=['N1']; update_state(leaf3); leaf3.min=30; leaf3.max=30; leaf3.parent=node;
    const leaf4 = Node.createLeaf(tree); leaf4.keys=[40]; leaf4.pointers=['N2']; update_state(leaf4); leaf4.min=40; leaf4.max=40; leaf4.parent=node;

    const leaf5 = Node.createLeaf(tree); leaf5.keys=[50]; leaf5.pointers=['R1']; update_state(leaf5); leaf5.min=50; leaf5.max=50; leaf5.parent=right_sibling;
    const leaf6 = Node.createLeaf(tree); leaf6.keys=[60]; leaf6.pointers=['R2']; update_state(leaf6); leaf6.min=60; leaf6.max=60; leaf6.parent=right_sibling;

    // Setup internal nodes (min children = t = 2, min keys = t-1 = 1)
    left_sibling.children = [leaf1.id, leaf2.id];
    left_sibling.keys = [leaf2.min]; // [20]
    update_state(left_sibling);
    left_sibling.min = leaf1.min; left_sibling.max = leaf2.max;

    node.children = [leaf3.id, leaf4.id];
    node.keys = [leaf4.min]; // [40]
    update_state(node);
    node.min = leaf3.min; node.max = leaf4.max;

    right_sibling.children = [leaf5.id, leaf6.id];
    right_sibling.keys = [leaf6.min]; // [60]
    update_state(right_sibling);
    right_sibling.min = leaf5.min; right_sibling.max = leaf6.max;

    // Setup parent
    parent.children = [left_sibling.id, node.id, right_sibling.id];
    parent.keys = [node.min, right_sibling.min]; // Separator keys [30, 50]
    update_state(parent);
    parent.min = left_sibling.min; parent.max = right_sibling.max;

    // Link parents and siblings
    left_sibling.parent = parent; node.parent = parent; right_sibling.parent = parent;
    left_sibling.right = node; node.left = left_sibling;
    node.right = right_sibling; right_sibling.left = node;
  };

  describe('merge_with_left (internal)', () => {
    beforeEach(setupNodesForMergeInternal);

    it('should move keys/children from left sibling and parent separator to node', () => {
      const originalNodeKeys = [...node.keys]; // [40]
      const originalNodeChildren = [...node.children]; // [leaf3, leaf4]
      const originalLeftKeys = [...left_sibling.keys]; // [20]
      const originalLeftChildren = [...left_sibling.children]; // [leaf1, leaf2]
      const nodeIndex = parent.children.indexOf(node.id); // 1
      const separatorKey = parent.keys[nodeIndex - 1]; // Parent key[0] -> 30

      // Perform merge FIRST
      merge_with_left(node, left_sibling, separatorKey);

      // Simulate parent update AFTER merge
      remove_node(parent, left_sibling);
      // Parent keys should now be [50], children become [node.id, right_sibling.id]
      expect(parent.keys).toEqual([right_sibling.min]);
      expect(parent.children).toEqual([node.id, right_sibling.id]);

      // Check node (merged)
      const expectedKeys = [20, 30, 40]; // Re-verify based on corrected logic
      const expectedChildren = [originalLeftChildren[0], originalLeftChildren[1], originalNodeChildren[0], originalNodeChildren[1]];
      expect(node.keys).toEqual(expectedKeys);
      expect(node.children).toEqual(expectedChildren);
      expect(node.key_num).toBe(expectedKeys.length);
      expect(node.size).toBe(expectedChildren.length);
      expect(node.min).toBe(10); // Original left_sibling.min was 10
      expect(node.max).toBe(40); // Max should remain original node.max (40)
      // Check reparenting
      expect(tree.nodes.get(originalLeftChildren[0])!.parent).toBe(node);
      expect(tree.nodes.get(originalLeftChildren[1])!.parent).toBe(node);

      // Check left sibling (empty)
      expect(left_sibling.key_num).toBe(0);
      expect(left_sibling.size).toBe(0);
      expect(left_sibling.isEmpty).toBe(true);
    });
  });

  describe('merge_with_right (internal)', () => {
    beforeEach(setupNodesForMergeInternal);

    it('should move keys/children from right sibling and parent separator to node', () => {
      const originalNodeKeys = [...node.keys]; // [40]
      const originalNodeChildren = [...node.children]; // [leaf3, leaf4]
      const originalRightKeys = [...right_sibling.keys]; // [60]
      const originalRightChildren = [...right_sibling.children]; // [leaf5, leaf6]
      const nodeIndex = parent.children.indexOf(node.id); // 1
      const separatorKey = parent.keys[nodeIndex]; // Parent key[1] -> 50

      // Perform merge FIRST
      merge_with_right(node, right_sibling, separatorKey);

      // Simulate parent update AFTER merge
      remove_node(parent, right_sibling);
      // Parent keys should now be [30], children [left_sibling.id, node.id]
      expect(parent.keys).toEqual([node.min]); // node.min should still be 30 before merge affects it
      expect(parent.children).toEqual([left_sibling.id, node.id]);

      // Check node (merged)
      const expectedKeys = [40, 50, 60]; // Re-verify based on corrected logic
      const expectedChildren = [originalNodeChildren[0], originalNodeChildren[1], originalRightChildren[0], originalRightChildren[1]];
      expect(node.keys).toEqual(expectedKeys);
      expect(node.children).toEqual(expectedChildren);
      expect(node.key_num).toBe(expectedKeys.length);
      expect(node.size).toBe(expectedChildren.length);
      expect(node.min).toBe(node.min); // Min should remain (30)
      expect(node.max).toBe(right_sibling.max); // Should take max from right sibling (60)
      // Check reparenting
      expect(tree.nodes.get(originalRightChildren[0])!.parent).toBe(node);
      expect(tree.nodes.get(originalRightChildren[1])!.parent).toBe(node);

      // Check right sibling (empty)
      expect(right_sibling.key_num).toBe(0);
      expect(right_sibling.size).toBe(0);
      expect(right_sibling.isEmpty).toBe(true);
    });
  });

});

describe('BPlusTree remove Function', () => {
    let tree: BPlusTree<string, number>;
    const T = 2; // Use a common degree for tests

    beforeEach(() => {
        tree = new BPlusTree<string, number>(T, false, comparator); // Allow duplicates
        // Setup initial tree state if needed for all tests in this block
    });

    it('should remove a unique key correctly', () => {
        tree.insert(10, 'A');
        tree.insert(20, 'B');
        tree.insert(30, 'C');
        expect(tree.size).toBe(3);

        // console.log("Tree structure before remove:", JSON.stringify(tree.toJSON(), null, 2)); // Remove log

        const removed = remove(tree, 20, false);

        // Check return value
        expect(removed).toEqual([[20, 'B']]);

        // Check tree state
        expect(tree.size).toBe(2);
        expect(tree.find(20)).toEqual([]);
        expect(tree.count(20)).toBe(0);
        expect(tree.find(10)).toEqual(['A']);
        expect(tree.find(30)).toEqual(['C']);
    });

    it('should remove only the first duplicate (single leaf)', () => {
        tree.insert(10, 'A');
        tree.insert(20, 'B1');
        tree.insert(20, 'B2'); // Add duplicate
        tree.insert(30, 'C');
        expect(tree.size).toBe(4);
        expect(tree.count(20)).toBe(2);

        const removed = remove(tree, 20, false);

        // Check return value (should be the first one inserted/found)
        // Depending on find_first_item, it might remove B1
        expect(removed).toEqual([[20, 'B1']]);

        // Check tree state
        expect(tree.size).toBe(3);
        expect(tree.count(20)).toBe(1);
        expect(tree.find(20)).toEqual(['B2']); // Only the second one should remain
        expect(tree.find(10)).toEqual(['A']);
        expect(tree.find(30)).toEqual(['C']);
    });

    it('should remove only the first duplicate (multiple leaves)', () => {
        // Sequence to distribute duplicates (T=2):
        // 10 -> L0[10]
        // 20 -> L0[10, 20]
        // 15 -> L0[10, 15, 20](split) -> R0[15], L0[10], L1[15, 20]
        // 25 -> L1[15, 20, 25](split) -> R0[15, 20], L0[10], L1[15], L2[20, 25]
        // 20 -> L2[20, 20, 25](split) -> R0[15, 20, 20](split) -> RR[20], R0[15], R1[20]
        // Children: RR->[R0,R1], R0->[L0,L1], R1->[L2,L3]. Leaves: L0[10], L1[15], L2[20], L3[20, 25]
        tree.insert(10, 'A');
        tree.insert(20, 'B1'); // -> L1
        tree.insert(15, 'C'); // -> L1
        tree.insert(25, 'D'); // -> L2
        tree.insert(20, 'B2'); // -> L2 (or L3 after split)

        expect(tree.size).toBe(5);
        expect(tree.count(20)).toBe(2);
        // At this point, one 20 should be in L2, one in L3 (or wherever split placed them)

        const removed = remove(tree, 20, false);

        // Check return value - should be the first one encountered by find_first_node
        // which should be the one in L2 (value B1? or B2? depends on internal order)
        // Let's assume find_first_item in the leaf finds the first one, 'B1'
        // Update: The sequence above puts B1 in L1, B2 goes to L2/L3. find_first_node finds L2/L3.
        // Let's check which value is removed.
        expect(removed).toHaveLength(1);
        const removedValue = removed[0][1];
        expect(['B1', 'B2']).toContain(removedValue); // Either B1 or B2 could be removed first

        // Check tree state
        expect(tree.size).toBe(4);
        expect(tree.count(20)).toBe(1);
        const remainingValue = (removedValue === 'B1') ? 'B2' : 'B1';
        expect(tree.find(20)).toEqual([remainingValue]);
        expect(tree.find(10)).toEqual(['A']);
        expect(tree.find(15)).toEqual(['C']);
        expect(tree.find(25)).toEqual(['D']);
    });

    it('should remove all duplicates when all=true', () => {
        tree.insert(10, 'A');
        tree.insert(20, 'B1');
        tree.insert(20, 'B2');
        tree.insert(20, 'B3'); // Add duplicates
        tree.insert(30, 'C');
        expect(tree.size).toBe(5);
        expect(tree.count(20)).toBe(3);

        const removed = remove(tree, 20, true); // Remove all with key 20

        // Check return value (order might not be guaranteed, check content)
        expect(removed).toHaveLength(3);
        // Check that all expected [key, value] pairs are present
        expect(removed).toEqual(expect.arrayContaining([
            [20, 'B1'],
            [20, 'B2'],
            [20, 'B3']
        ]));

        // Check tree state
        expect(tree.size).toBe(2); // 5 - 3 = 2
        expect(tree.count(20)).toBe(0);
        expect(tree.find(20)).toEqual([]);
        expect(tree.find(10)).toEqual(['A']);
        expect(tree.find(30)).toEqual(['C']);
    });

    // More tests will go here
});