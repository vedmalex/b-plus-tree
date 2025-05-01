import { describe, it, expect, beforeEach } from 'bun:test';
import { BPlusTree } from '../BPlusTree';
import { Node } from '../Node'; // Assuming Node class is exported or accessible

// Define a simple type for testing values
type TestData = { value: string };

describe('BPlusTree Rebalancing Operations (t=2)', () => {
    let tree: BPlusTree<TestData, number>;
    const T = 2; // Degree for these specific tests

    beforeEach(() => {
        // Initialize a new tree with t=2 before each test
        // Using simple numbers as keys and TestData as values
        tree = new BPlusTree<TestData, number>(T, false); // Allow duplicates for simplicity unless testing unique constraints
    });

    it('should split root node correctly when leaf reaches max size (t=2)', () => {
        // With t=2, max keys/pointers in a leaf is 2*t - 1 = 3.
        // Insertion of the 3rd element should fill the node and trigger split immediately after.

        tree.insert(1, { value: 'A' });
        tree.insert(2, { value: 'B' });

        const rootNodeBeforeSplitId = tree.root;
        const rootNodeBeforeSplit = tree.node(rootNodeBeforeSplitId);

        // Verify state before split-triggering insert
        expect(rootNodeBeforeSplit.leaf).toBe(true);
        expect(rootNodeBeforeSplit.keys).toEqual([1, 2]);
        expect(rootNodeBeforeSplit.pointers.map(p => (p as TestData).value)).toEqual(['A', 'B']);
        expect(rootNodeBeforeSplit.key_num).toBe(2);
        expect(tree.nodes.size).toBe(1);
        expect(tree.size).toBe(2);

        // Insert 3rd element (key 3) - This should trigger the split
        tree.insert(3, { value: 'C' }); // Insert 3: node becomes [1, 2, 3] -> isFull=true -> Split!

        // Expected state after split (splitting node [1, 2, 3]):
        // splitIndex = floor(3/2) = 1
        // keyToInsertInParent = node.keys[1] = 2
        // New Root (Internal): keys=[2]
        // -> Left Child (Leaf): keys=[1], pointers=[A]
        // -> Right Child (Leaf): keys=[2, 3], pointers=[B, C]

        const newRootId = tree.root;
        const newRootNode = tree.node(newRootId);

        // Check new root properties
        expect(newRootId).not.toBe(rootNodeBeforeSplitId); // Root ID should change
        expect(newRootNode.leaf).toBe(false);
        expect(newRootNode.keys).toEqual([2]); // Key separating the two children
        expect(newRootNode.key_num).toBe(1);
        expect(newRootNode.children).toHaveLength(2); // Pointers to the two new leaves
        expect(newRootNode.min).toBe(1); // Min key overall (from left child)
        expect(newRootNode.max).toBe(3); // Max key overall (from right child)

        // Check children nodes
        expect(tree.nodes.size).toBe(3); // New Root + 2 Leaves
        expect(tree.size).toBe(3); // Overall tree size (1, 2, 3 inserted)

        const leftChildId = newRootNode.children[0];
        const rightChildId = newRootNode.children[1];
        const leftChildNode = tree.node(leftChildId);
        const rightChildNode = tree.node(rightChildId);

        // Check left child
        expect(leftChildNode).toBeDefined();
        expect(leftChildNode.leaf).toBe(true);
        expect(leftChildNode.keys).toEqual([1]);
        expect(leftChildNode.key_num).toBe(1);
        expect(leftChildNode.pointers.map(p => (p as TestData).value)).toEqual(['A']);
        expect(leftChildNode.parent?.id).toBe(newRootId); // Check parent link
        expect(leftChildNode.right?.id).toBe(rightChildId); // Check right sibling link
        expect(leftChildNode.left).toBeUndefined(); // Should be leftmost
        expect(leftChildNode.min).toBe(1);
        expect(leftChildNode.max).toBe(1);

        // Check right child
        expect(rightChildNode).toBeDefined();
        expect(rightChildNode.leaf).toBe(true);
        expect(rightChildNode.keys).toEqual([2, 3]);
        expect(rightChildNode.key_num).toBe(2);
        expect(rightChildNode.pointers.map(p => (p as TestData).value)).toEqual(['B', 'C']);
        expect(rightChildNode.parent?.id).toBe(newRootId); // Check parent link
        expect(rightChildNode.left?.id).toBe(leftChildId); // Check left sibling link
        expect(rightChildNode.right).toBeUndefined(); // Should be rightmost
        expect(rightChildNode.min).toBe(2);
        expect(rightChildNode.max).toBe(3);
    });

    it('should borrow from right sibling correctly (leaf node, t=2)', () => {
        // Setup: Create state Root[2] -> Left[1], Right[2, 3]
        tree.insert(1, { value: 'A' });
        tree.insert(2, { value: 'B' });
        tree.insert(3, { value: 'C' });

        const initialRootId = tree.root;
        const initialLeftChildId = tree.node(initialRootId).children[0];
        const initialRightChildId = tree.node(initialRootId).children[1];

        // Verify initial split state (optional)
        expect(tree.node(initialRootId).keys).toEqual([2]);
        expect(tree.node(initialLeftChildId).keys).toEqual([1]);
        expect(tree.node(initialRightChildId).keys).toEqual([2, 3]);
        expect(tree.size).toBe(3);
        expect(tree.nodes.size).toBe(3);

        // Action: Remove key 1 from the left leaf, causing underflow
        const removed = tree.remove(1);
        expect(removed).toHaveLength(1); // Verify one item was removed
        expect(removed[0][1].value).toBe('A');

        // Expected state after borrowing:
        // Root (Internal): keys=[3]
        // -> Left Child (Leaf): keys=[2], pointers=[B]
        // -> Right Child (Leaf): keys=[3], pointers=[C]

        const finalRootNode = tree.node(tree.root);
        const finalLeftChildNode = tree.node(finalRootNode.children[0]);
        const finalRightChildNode = tree.node(finalRootNode.children[1]);

        // Check final state
        expect(tree.size).toBe(2);
        expect(tree.nodes.size).toBe(3); // Should still have 3 nodes

        // Check root
        expect(finalRootNode.keys).toEqual([3]); // Separator key updated
        expect(finalRootNode.key_num).toBe(1);
        expect(finalRootNode.children).toHaveLength(2);
        expect(finalRootNode.min).toBe(2); // New overall min
        expect(finalRootNode.max).toBe(3);

        // Check left child (received borrow)
        expect(finalLeftChildNode).toBeDefined();
        expect(finalLeftChildNode.leaf).toBe(true);
        expect(finalLeftChildNode.keys).toEqual([2]);
        expect(finalLeftChildNode.key_num).toBe(1);
        expect(finalLeftChildNode.pointers.map(p => (p as TestData).value)).toEqual(['B']);
        expect(finalLeftChildNode.parent?.id).toBe(tree.root);
        expect(finalLeftChildNode.right?.id).toBe(finalRightChildNode.id);
        expect(finalLeftChildNode.left).toBeUndefined();
        expect(finalLeftChildNode.min).toBe(2);
        expect(finalLeftChildNode.max).toBe(2);

        // Check right child (gave borrow)
        expect(finalRightChildNode).toBeDefined();
        expect(finalRightChildNode.leaf).toBe(true);
        expect(finalRightChildNode.keys).toEqual([3]);
        expect(finalRightChildNode.key_num).toBe(1);
        expect(finalRightChildNode.pointers.map(p => (p as TestData).value)).toEqual(['C']);
        expect(finalRightChildNode.parent?.id).toBe(tree.root);
        expect(finalRightChildNode.left?.id).toBe(finalLeftChildNode.id);
        expect(finalRightChildNode.right).toBeUndefined();
        expect(finalRightChildNode.min).toBe(3);
        expect(finalRightChildNode.max).toBe(3);
    });

    it('should borrow from left sibling correctly (leaf node, t=2)', () => {
        // Setup: Create state Root[2] -> Left[0, 1], Right[2, 3]
        tree.insert(1, { value: 'B' }); // Insert order matters for exact pointer values
        tree.insert(2, { value: 'C' });
        tree.insert(3, { value: 'D' }); // Root[2] -> Left[1], Right[2, 3]
        tree.insert(0, { value: 'A' }); // Root[2] -> Left[0, 1], Right[2, 3]

        const initialRootId = tree.root;
        const initialLeftChildId = tree.node(initialRootId).children[0];
        const initialRightChildId = tree.node(initialRootId).children[1];

        // Verify initial state
        expect(tree.node(initialRootId).keys).toEqual([2]);
        expect(tree.node(initialLeftChildId).keys).toEqual([0, 1]);
        expect(tree.node(initialLeftChildId).pointers.map(p => (p as TestData).value)).toEqual(['A', 'B']);
        expect(tree.node(initialRightChildId).keys).toEqual([2, 3]);
        expect(tree.node(initialRightChildId).pointers.map(p => (p as TestData).value)).toEqual(['C', 'D']);
        expect(tree.size).toBe(4);
        expect(tree.nodes.size).toBe(3);

        // Action: Remove keys from the right leaf to cause underflow
        let removed = tree.remove(3);
        expect(removed).toHaveLength(1); // Right node is now [2], key_num=1 (ok)
        // --- DEBUG LOG ---
        const problematicNode = tree.node(initialRightChildId);
        console.log(`[TEST LOG] Node ${problematicNode?.id} state before key_num check: keys=${JSON.stringify(problematicNode?.keys)}, key_num=${problematicNode?.key_num}`);
        // --- END DEBUG LOG ---
        expect(tree.node(initialRightChildId).key_num).toBe(1);

        removed = tree.remove(2);
        expect(removed).toHaveLength(1); // Right node is now [], key_num=0 (underflow!)
        // Borrow from left sibling [0, 1] should occur.

        // Expected state after borrowing:
        // Root (Internal): keys=[1]
        // -> Left Child (Leaf): keys=[0], pointers=[A]
        // -> Right Child (Leaf): keys=[1], pointers=[B]

        const finalRootNode = tree.node(tree.root);
        const finalLeftChildNode = tree.node(finalRootNode.children[0]);
        const finalRightChildNode = tree.node(finalRootNode.children[1]);

        // Check final state
        expect(tree.size).toBe(2);
        expect(tree.nodes.size).toBe(3); // Should still have 3 nodes

        // Check root
        expect(finalRootNode.keys).toEqual([1]); // Separator key updated
        expect(finalRootNode.key_num).toBe(1);
        expect(finalRootNode.children).toHaveLength(2);
        expect(finalRootNode.min).toBe(0); // Overall min
        expect(finalRootNode.max).toBe(1); // Overall max

        // Check left child (gave borrow)
        expect(finalLeftChildNode).toBeDefined();
        expect(finalLeftChildNode.leaf).toBe(true);
        expect(finalLeftChildNode.keys).toEqual([0]);
        expect(finalLeftChildNode.key_num).toBe(1);
        expect(finalLeftChildNode.pointers.map(p => (p as TestData).value)).toEqual(['A']);
        expect(finalLeftChildNode.parent?.id).toBe(tree.root);
        expect(finalLeftChildNode.right?.id).toBe(finalRightChildNode.id);
        expect(finalLeftChildNode.left).toBeUndefined();
        expect(finalLeftChildNode.min).toBe(0);
        expect(finalLeftChildNode.max).toBe(0);

        // Check right child (received borrow)
        expect(finalRightChildNode).toBeDefined();
        expect(finalRightChildNode.leaf).toBe(true);
        expect(finalRightChildNode.keys).toEqual([1]);
        expect(finalRightChildNode.key_num).toBe(1);
        expect(finalRightChildNode.pointers.map(p => (p as TestData).value)).toEqual(['B']);
        expect(finalRightChildNode.parent?.id).toBe(tree.root);
        expect(finalRightChildNode.left?.id).toBe(finalLeftChildNode.id);
        expect(finalRightChildNode.right).toBeUndefined();
        expect(finalRightChildNode.min).toBe(1);
        expect(finalRightChildNode.max).toBe(1);
    });

    it('should split leaf node with duplicates correctly (t=2)', () => {
        // With t=2, leaf node splits when key_num reaches 3.

        // Stage 1: Insert 1(A), 1(B)
        tree.insert(1, { value: 'A' });
        tree.insert(1, { value: 'B' });

        let rootId = tree.root;
        let rootNode = tree.node(rootId);
        expect(rootNode.leaf).toBe(true);
        expect(rootNode.keys).toEqual([1, 1]);
        expect(rootNode.pointers.map(p => (p as TestData).value)).toEqual(['A', 'B']);
        expect(rootNode.key_num).toBe(2);
        expect(tree.nodes.size).toBe(1);
        expect(tree.size).toBe(2);

        // Stage 2: Insert 2(C) - triggers the first split
        tree.insert(2, { value: 'C' }); // Node becomes [1:A, 1:B, 2:C] -> Split!

        // Expected state after first split:
        // splitIndex = floor(3/2) = 1. Key copied up: node.keys[1] = 1.
        // New Root (Internal): keys=[1]
        // -> Left Child (Leaf): keys=[1], pointers=[A]  <- INCORRECT Split Logic for Duplicates?
        // -> Right Child (Leaf): keys=[1, 2], pointers=[B, C]
        // Let's re-examine split:
        // Initial keys: [1, 1, 2]. splitIndex=1. keyToInsert=keys[1]=1.
        // new_node.keys = keys.splice(1) = [1, 2]. pointers = [B, C].
        // node.keys = [1]. pointers = [A].
        // Looks correct based on current split code.

        let rootIdAfterSplit1 = tree.root;
        let rootNodeAfterSplit1 = tree.node(rootIdAfterSplit1);
        expect(rootIdAfterSplit1).not.toBe(rootId); // Root changed
        expect(rootNodeAfterSplit1.leaf).toBe(false);
        expect(rootNodeAfterSplit1.keys).toEqual([1]); // Key separating children
        expect(tree.nodes.size).toBe(3);
        expect(tree.size).toBe(3);

        let leftChildId1 = rootNodeAfterSplit1.children[0];
        let rightChildId1 = rootNodeAfterSplit1.children[1];
        let leftChildNode1 = tree.node(leftChildId1);
        let rightChildNode1 = tree.node(rightChildId1);

        expect(leftChildNode1.keys).toEqual([1]);
        expect(leftChildNode1.pointers.map(p => (p as TestData).value)).toEqual(['A']);
        expect(rightChildNode1.keys).toEqual([1, 2]);
        expect(rightChildNode1.pointers.map(p => (p as TestData).value)).toEqual(['B', 'C']);

        // Stage 3: Insert 1(D) - Does NOT trigger split
        tree.insert(1, { value: 'D' });

        rootId = tree.root; // Root ID should still be the same
        rootNode = tree.node(rootId);
        const leftChildIdStage3 = rootNode.children[0];
        const rightChildIdStage3 = rootNode.children[1];
        const leftChildStage3 = tree.node(leftChildIdStage3);
        const rightChildStage3 = tree.node(rightChildIdStage3);

        expect(rootNode.keys).toEqual([1]); // Root unchanged
        expect(leftChildStage3.keys).toEqual([1, 1]); // Left child updated
        expect(leftChildStage3.pointers.map(p => (p as TestData).value)).toEqual(['A', 'D']);
        expect(rightChildStage3.keys).toEqual([1, 2]); // Right child unchanged
        expect(tree.nodes.size).toBe(3);
        expect(tree.size).toBe(4);

        // Stage 4: Insert 1(E) - Triggers SECOND split (of the left child)
        tree.insert(1, { value: 'E' }); // Left child becomes [1:A, 1:D, 1:E] -> Split!

        // Expected state after second split:
        // Left child [1:A, 1:D, 1:E] splits.
        // splitIndex = floor(3/2) = 1. Key copied up: keys[1] = 1.
        // Original Left Child (L1) becomes: keys=[1], pointers=[A]
        // New Middle Child (L3) becomes: keys=[1, 1], pointers=[D, E]
        // Parent Root receives key 1. It was [1], becomes [1, 1].
        // Children order: L1, L3, L2

        let rootIdAfterSplit2 = tree.root;
        let rootNodeAfterSplit2 = tree.node(rootIdAfterSplit2);

        expect(rootNodeAfterSplit2.leaf).toBe(false);
        expect(rootNodeAfterSplit2.keys).toEqual([1, 1]);
        expect(rootNodeAfterSplit2.key_num).toBe(2);
        expect(rootNodeAfterSplit2.children).toHaveLength(3);
        expect(tree.nodes.size).toBe(4); // Root + 3 Leaves
        expect(tree.size).toBe(5); // Overall tree size (A, B, C, D, E)

        let child0Id = rootNodeAfterSplit2.children[0];
        let child1Id = rootNodeAfterSplit2.children[1];
        let child2Id = rootNodeAfterSplit2.children[2];
        let child0Node = tree.node(child0Id);
        let child1Node = tree.node(child1Id);
        let child2Node = tree.node(child2Id);

        // Check child 0 (original left child)
        expect(child0Node.keys).toEqual([1]);
        expect(child0Node.pointers.map(p => (p as TestData).value)).toEqual(['A']);
        expect(child0Node.right?.id).toBe(child1Id);
        expect(child0Node.left).toBeUndefined();

        // Check child 1 (new node L3 from splitting L1)
        expect(child1Node.keys).toEqual([1, 1]); // Corrected expectation
        expect(child1Node.pointers.map(p => (p as TestData).value)).toEqual(['D', 'E']); // Corrected expectation
        expect(child1Node.right?.id).toBe(child2Id);
        expect(child1Node.left?.id).toBe(child0Id);

        // Check child 2 (original right child L2, unchanged by second split)
        expect(child2Node.keys).toEqual([1, 2]);
        expect(child2Node.pointers.map(p => (p as TestData).value)).toEqual(['B', 'C']); // Corrected expectation
        expect(child2Node.right).toBeUndefined();
        expect(child2Node.left?.id).toBe(child1Id);
    });

    // Add more tests here for:
    // - Splitting an internal node
    // - Borrowing from left siblings (leaf and internal)
});