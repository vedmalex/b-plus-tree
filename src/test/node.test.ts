import { describe, it, expect, beforeEach } from 'bun:test';
import { BPlusTree } from '../BPlusTree';
import { Node, update_state, update_min_max, replace_min, replace_max, remove_node } from '../Node';
import { compare_keys_primitive } from '../methods';
import type { Comparator } from '../types';

const comparator: Comparator<number> = compare_keys_primitive;

describe('Node Functions (Node.ts)', () => {
  let tree: BPlusTree<string, number>;
  const T = 2; // Degree for tests

  beforeEach(() => {
    // Create a new tree for each test to ensure isolation
    tree = new BPlusTree<string, number>(T, false, comparator);
  });

  describe('update_state', () => {
    it('should correctly update state for a leaf node', () => {
      const leaf = Node.createLeaf(tree);
      expect(leaf.key_num).toBe(0);
      expect(leaf.size).toBe(0);
      expect(leaf.isEmpty).toBe(true);
      expect(leaf.isFull).toBe(false);

      leaf.keys = [10, 20];
      leaf.pointers = ['A', 'B'];
      update_state(leaf); // Update after manual modification

      expect(leaf.key_num).toBe(2);
      expect(leaf.size).toBe(2); // Size is key_num for leaves
      expect(leaf.isEmpty).toBe(false);
      // isFull check: keys >= 2*t - 1. For t=2, max keys = 3. So 2 keys is not full.
      expect(leaf.isFull).toBe(false);

      // Make it full (t=2 means max 3 keys)
      leaf.keys = [10, 20, 30];
      leaf.pointers = ['A', 'B', 'C'];
      update_state(leaf);
      expect(leaf.key_num).toBe(3);
      expect(leaf.size).toBe(3);
      expect(leaf.isFull).toBe(true);

      // Make it over-full (simulating state before a split)
      leaf.keys = [10, 20, 30, 40];
      leaf.pointers = ['A', 'B', 'C', 'D'];
      update_state(leaf);
      expect(leaf.key_num).toBe(4);
      expect(leaf.size).toBe(4);
      expect(leaf.isFull).toBe(true); // Still true as key_num >= 3

       // Make it empty again
       leaf.keys = [];
       leaf.pointers = [];
       update_state(leaf);
       expect(leaf.key_num).toBe(0);
       expect(leaf.size).toBe(0);
       expect(leaf.isEmpty).toBe(true);
       expect(leaf.isFull).toBe(false);
    });

    it('should correctly update state for an internal node', () => {
      const internal = Node.createNode(tree);
      expect(internal.key_num).toBe(0);
      expect(internal.size).toBe(0); // Size is children.length for internal
      expect(internal.isEmpty).toBe(true);
      expect(internal.isFull).toBe(false);

      // Add children and keys (manually simulating state)
      // Note: In practice, keys/children are added/removed differently
      internal.keys = [20]; // One key separates two children
      internal.children = [0, 1]; // IDs of two dummy children
      update_state(internal);

      expect(internal.key_num).toBe(1);
      expect(internal.size).toBe(2); // Size = children.length
      expect(internal.isEmpty).toBe(false);
      // isFull check: key_num >= 2*t - 1. For t=2, max keys = 3. 1 key is not full.
      expect(internal.isFull).toBe(false);

      // Make it full (t=2 means max 3 keys, so 4 children)
      internal.keys = [20, 40, 60];
      internal.children = [0, 1, 2, 3];
      update_state(internal);
      expect(internal.key_num).toBe(3);
      expect(internal.size).toBe(4);
      expect(internal.isEmpty).toBe(false);
      expect(internal.isFull).toBe(true);

      // Make it empty again
      internal.keys = [];
      internal.children = [];
      update_state(internal);
      expect(internal.key_num).toBe(0);
      expect(internal.size).toBe(0);
      expect(internal.isEmpty).toBe(true);
      expect(internal.isFull).toBe(false);
    });
  });

  describe('Min/Max Update Functions', () => {
    let parent: Node<string, number>;
    let child1: Node<string, number>;
    let child2: Node<string, number>;
    let leaf1: Node<string, number>;
    let leaf2: Node<string, number>;
    let leaf3: Node<string, number>;
    let leaf4: Node<string, number>;

    beforeEach(() => {
      // Recreate tree to ensure IDs are consistent if needed
      tree = new BPlusTree<string, number>(T, false, comparator);
      // Build a small tree structure manually for testing propagation:
      //         parent (id=0) [30]
      //         /        \
      //     child1 (id=1) [15]   child2 (id=2)
      //     /     \            /      \
      // leaf1(id=3) leaf2(id=4) leaf3(id=5) leaf4(id=6)
      // [10]       [15, 20]     [30, 35]    [40]

      parent = Node.createNode(tree); // id=0 (assuming fresh tree)
      child1 = Node.createNode(tree); // id=1
      child2 = Node.createNode(tree); // id=2
      leaf1 = Node.createLeaf(tree);  // id=3
      leaf2 = Node.createLeaf(tree);  // id=4
      leaf3 = Node.createLeaf(tree);  // id=5
      leaf4 = Node.createLeaf(tree);  // id=6

      // Setup leaves
      leaf1.keys = [10]; leaf1.pointers = ['L1']; update_state(leaf1); leaf1.min = 10; leaf1.max = 10;
      leaf2.keys = [15, 20]; leaf2.pointers = ['L2a', 'L2b']; update_state(leaf2); leaf2.min = 15; leaf2.max = 20;
      leaf3.keys = [30, 35]; leaf3.pointers = ['L3a', 'L3b']; update_state(leaf3); leaf3.min = 30; leaf3.max = 35;
      leaf4.keys = [40]; leaf4.pointers = ['L4']; update_state(leaf4); leaf4.min = 40; leaf4.max = 40;

      // Setup internal nodes (children and keys)
      child1.children = [leaf1.id, leaf2.id];
      child1.keys = [leaf2.min]; // Key is min of right child [15]
      update_state(child1);
      child1.min = leaf1.min; // 10
      child1.max = leaf2.max; // 20
      leaf1.parent = child1; leaf2.parent = child1;

      child2.children = [leaf3.id, leaf4.id];
      child2.keys = [leaf4.min]; // Key is min of right child [40]
      update_state(child2);
      child2.min = leaf3.min; // 30
      child2.max = leaf4.max; // 40
      leaf3.parent = child2; leaf4.parent = child2;

      // Setup parent node
      parent.children = [child1.id, child2.id];
      parent.keys = [child2.min]; // Key is min of right child [30]
      update_state(parent);
      parent.min = child1.min; // 10
      parent.max = child2.max; // 40
      child1.parent = parent; child2.parent = parent;

      // Set root
      tree.root = parent.id;
    });

    describe('update_min_max', () => {
      it('should update min/max for a leaf node and propagate', () => {
        leaf1.keys = [5, 8];
        leaf1.pointers = ['L1a', 'L1b'] // Match pointers
        update_state(leaf1);
        update_min_max(leaf1); // Should call replace_min/max internally
        expect(leaf1.min).toBe(5);
        expect(leaf1.max).toBe(8);
        // Check propagation
        expect(child1.min).toBe(5);
        expect(child1.max).toBe(20); // Max should still be from leaf2
        expect(child1.keys[0]).toBe(15); // Key between leaf1/leaf2 shouldn't change yet
        expect(parent.min).toBe(5);
        expect(parent.max).toBe(40);
        expect(parent.keys[0]).toBe(30); // Parent key shouldn't change
      });

      it('should update min/max for an internal node based on children', () => {
        // Simulate child min/max changes
        leaf1.min = 5; leaf1.max = 5; // Change leaf1 directly for test setup
        leaf4.min = 45; leaf4.max = 45; // Change leaf4 directly
        child1.min = 5; // Assume propagation happened to child1
        child2.max = 45; // Assume propagation happened to child2

        // Now call update_min_max on the parent
        update_min_max(parent);

        expect(parent.min).toBe(5); // Should get min from child1
        expect(parent.max).toBe(45); // Should get max from child2
      });

       it('should handle empty node', () => {
         const emptyLeaf = Node.createLeaf(tree);
         update_min_max(emptyLeaf);
         expect(emptyLeaf.min).toBeUndefined();
         expect(emptyLeaf.max).toBeUndefined();
       });
    });

    describe('replace_min', () => {
      it('should update node min and propagate up to parent min', () => {
        replace_min(leaf1, 5); // Replace min of leftmost leaf
        expect(leaf1.min).toBe(5);
        expect(child1.min).toBe(5);
        expect(parent.min).toBe(5);
        // Check parent keys are NOT affected when leftmost child changes min
        expect(parent.keys[0]).toBe(30);
      });

      it('should update node min and propagate up to parent key', () => {
        replace_min(leaf3, 25); // Replace min of a non-first child's leaf (leaf3 belongs to child2)
        expect(leaf3.min).toBe(25);
        expect(child2.min).toBe(25);
        // Parent's min should not change, but the key separating child1/child2 should
        expect(parent.min).toBe(10);
        expect(parent.keys[0]).toBe(25); // Key should become new min of child2
        expect(parent.max).toBe(40);
      });

      it('should handle replacing min in a middle node\'s child', () => {
          replace_min(leaf2, 12); // leaf2 is right child of child1
          expect(leaf2.min).toBe(12);
          expect(child1.min).toBe(10); // child1 min remains leaf1.min
          // parent.min remains child1.min
          expect(parent.min).toBe(10);
          // Key between leaf1 and leaf2 within child1 should update
          expect(child1.keys[0]).toBe(12); // Key becomes min of leaf2
          // Key in parent should NOT update
          expect(parent.keys[0]).toBe(30);
      });

      it('should handle undefined key for empty nodes', () => {
           // Simulate leaf1 becoming empty
           leaf1.keys = [];
           leaf1.pointers = [];
           update_state(leaf1);
           // Call replace_min with undefined (should reflect emptiness)
           replace_min(leaf1, undefined);

           expect(leaf1.min).toBeUndefined();
           // Check propagation
           expect(child1.min).toBeUndefined(); // Child1 min should update
           expect(parent.min).toBeUndefined(); // Parent min should update
       });
    });

    describe('replace_max', () => {
      it('should update node max and propagate up to parent max', () => {
        replace_max(leaf4, 45); // Replace max of rightmost leaf
        expect(leaf4.max).toBe(45);
        expect(child2.max).toBe(45);
        expect(parent.max).toBe(45);
      });

      it('should update node max without affecting parent max if not rightmost child', () => {
        replace_max(leaf2, 25); // Replace max of leaf2 (in child1)
        expect(leaf2.max).toBe(25);
        expect(child1.max).toBe(25);
        // Parent max should remain unchanged (still determined by child2/leaf4)
        expect(parent.max).toBe(40);
      });

       it('should handle undefined key for empty nodes', () => {
           // Simulate leaf4 becoming empty
           leaf4.keys = [];
           leaf4.pointers = [];
           update_state(leaf4);
           replace_max(leaf4, undefined);

           expect(leaf4.max).toBeUndefined();
           expect(child2.max).toBeUndefined();
           expect(parent.max).toBeUndefined();
       });
    });
  });

});

describe('Node remove_node Function', () => {
  let tree: BPlusTree<string, number>;
  let parent: Node<string, number>;
  let child1: Node<string, number>;
  let child2: Node<string, number>;
  let child3: Node<string, number>;
  const T = 2;

  beforeEach(() => {
    tree = new BPlusTree<string, number>(T, false, compare_keys_primitive);
    parent = Node.createNode(tree); // id=0
    child1 = Node.createLeaf(tree); // id=1
    child2 = Node.createLeaf(tree); // id=2
    child3 = Node.createLeaf(tree); // id=3
    tree.root = parent.id;

    // Setup leaves
    child1.keys = [10, 15]; child1.pointers = ['C1A', 'C1B']; update_state(child1); update_min_max(child1);
    child2.keys = [20, 25]; child2.pointers = ['C2A', 'C2B']; update_state(child2); update_min_max(child2);
    child3.keys = [30, 35]; child3.pointers = ['C3A', 'C3B']; update_state(child3); update_min_max(child3);

    // Setup parent
    parent.children = [child1.id, child2.id, child3.id];
    parent.keys = [child2.min, child3.min]; // [20, 30]
    update_state(parent);
    update_min_max(parent);

    // Link children to parent
    child1.parent = parent;
    child2.parent = parent;
    child3.parent = parent;

    // Link siblings (Important for remove_node checks)
    child1.right = child2; child2.left = child1;
    child2.right = child3; child3.left = child2;
  });

  it('should remove a middle child correctly', () => {
    const originalParentKeys = [...parent.keys]; // [20, 30]
    const originalParentChildren = [...parent.children]; // [1, 2, 3]

    const removedNode = remove_node(parent, child2);

    expect(removedNode).toBe(child2);
    expect(child2.parent).toBeUndefined();
    expect(child2.left).toBeUndefined();
    expect(child2.right).toBeUndefined();

    // Check parent
    expect(parent.children).toEqual([child1.id, child3.id]); // child2 removed
    // Removing child2 (at index 1) should remove the key before it (at index 0)
    expect(parent.keys).toEqual([originalParentKeys[1]]); // Should be [30]
    expect(parent.key_num).toBe(1);
    expect(parent.size).toBe(2); // children size
    expect(parent.min).toBe(10); // Should remain child1.min
    expect(parent.max).toBe(35); // Should remain child3.max

    // Check remaining siblings
    expect(child1.right).toBe(child3);
    expect(child3.left).toBe(child1);
  });

  it('should remove the first child correctly', () => {
    const originalParentKeys = [...parent.keys]; // [20, 30]
    const originalParentChildren = [...parent.children]; // [1, 2, 3]

    const removedNode = remove_node(parent, child1);

    expect(removedNode).toBe(child1);
    expect(child1.parent).toBeUndefined();
    expect(child1.left).toBeUndefined();
    expect(child1.right).toBeUndefined();

    // Check parent
    expect(parent.children).toEqual([child2.id, child3.id]); // child1 removed
    // Removing child1 (at index 0) should remove the key *after* it (the first key)
    expect(parent.keys).toEqual([originalParentKeys[1]]); // Should be [30]
    expect(parent.key_num).toBe(1);
    expect(parent.size).toBe(2);
    expect(parent.min).toBe(20); // Should update to child2.min
    expect(parent.max).toBe(35); // Should remain child3.max

    // Check remaining siblings
    expect(child2.left).toBeUndefined();
    expect(child2.right).toBe(child3);
    expect(child3.left).toBe(child2);
  });

  it('should remove the last child correctly', () => {
    const originalParentKeys = [...parent.keys]; // [20, 30]
    const originalParentChildren = [...parent.children]; // [1, 2, 3]

    const removedNode = remove_node(parent, child3);

    expect(removedNode).toBe(child3);
    expect(child3.parent).toBeUndefined();
    expect(child3.left).toBeUndefined();
    expect(child3.right).toBeUndefined();

    // Check parent
    expect(parent.children).toEqual([child1.id, child2.id]); // child3 removed
    // Removing child3 (at index 2) should remove the key before it (at index 1)
    expect(parent.keys).toEqual([originalParentKeys[0]]); // Should be [20]
    expect(parent.key_num).toBe(1);
    expect(parent.size).toBe(2);
    expect(parent.min).toBe(10); // Should remain child1.min
    expect(parent.max).toBe(25); // Should update to child2.max

    // Check remaining siblings
    expect(child1.right).toBe(child2);
    expect(child2.left).toBe(child1);
    expect(child2.right).toBeUndefined();
  });

  // More tests will go here

});