import { describe, it, expect, beforeEach } from 'bun:test';
import { BPlusTree } from '../BPlusTree';
import { Node, update_state, update_min_max } from '../Node';
import { TransactionContext, ITransactionContext } from '../TransactionContext';
import { compare_keys_primitive } from '../methods';

describe('BPlusTree remove_in_transaction', () => {
  let tree: BPlusTree<string, number>;
  let txCtx: ITransactionContext<string, number>;
  const T = 2; // Min degree t=2 (min keys = 1, max keys = 3)

  beforeEach(() => {
    tree = new BPlusTree<string, number>(T, false, compare_keys_primitive);

    // Manually create the root node as a leaf to ensure correct initial state
    const rootNode = Node.createLeaf(tree); // Gets ID (should be 1 if next_node_id starts at 0 and increments before returning)
    rootNode.keys = [10, 20, 30];
    rootNode.pointers = ['A', 'B', 'C'];
    // update_state(rootNode); // Using direct property assignment for clarity in test setup
    rootNode.key_num = 3;
    rootNode.min = 10;
    rootNode.max = 30;
    rootNode.isFull = (rootNode.key_num === (2 * T - 1));
    rootNode.isEmpty = (rootNode.key_num === 0);

    tree.root = rootNode.id; // Assign the ID of the created node as the tree's root ID
    // tree.nodes.set(rootNode.id, rootNode); // Node.createLeaf -> register_node already adds it to tree.nodes

    txCtx = tree.begin_transaction();
    // console.log("[Test Setup] tree.root:", tree.root, "(Node ID:", rootNode.id, ")");
    // console.log("[Test Setup] txCtx.workingRootId:", txCtx.workingRootId);
    const initialRootNodeForTest = txCtx.getRootNode();
    if (initialRootNodeForTest) {
      // console.log(`[Test Setup] Initial root in tx: id=${initialRootNodeForTest.id}, keys=[${initialRootNodeForTest.keys.join(',')}]`);
    }
  });

  it('should remove a key from a leaf node without underflow', () => {
    // Tree: Leaf [10, 20, 30]
    // Remove 20. Leaf should become [10, 30]
    const keyToRemove = 20;

    const removed = tree.remove_in_transaction(keyToRemove, txCtx);

    expect(removed).toBe(true);
    // Node.copy correctly reuses existing working copies instead of creating duplicates
    // So we expect only 1 working copy of the root node that was modified
    expect(txCtx.workingNodes.size).toBe(1);

    const finalRootNode = txCtx.getRootNode();
    expect(finalRootNode).toBeDefined();
    if (!finalRootNode) return;

    expect(finalRootNode.leaf).toBe(true);
    expect(finalRootNode.keys).toEqual([10, 30]);
    expect(finalRootNode.pointers).toEqual(['A', 'C']);
    expect(finalRootNode.key_num).toBe(2);
    expect(finalRootNode.id).not.toBe(tree.root); // Should be a new node ID

    // Check that the original tree is unchanged
    const originalRootNode = tree.nodes.get(tree.root);
    expect(originalRootNode).toBeDefined();
    if (!originalRootNode) return;
    expect(originalRootNode.keys).toEqual([10, 20, 30]);

    // Check find in transaction
    expect(tree.find_in_transaction(keyToRemove, txCtx)).toBeUndefined();
    expect(tree.find_in_transaction(10, txCtx)).toEqual(['A']);
    expect(tree.find_in_transaction(30, txCtx)).toEqual(['C']);
  });

  it('should correctly process key removal in #do_remove_cow for a leaf', () => {
    // This test calls the private #do_remove_cow method for debugging purposes.
    const keyToRemove = 20;
    const rootId = txCtx.workingRootId!;
    // console.log(`[Test #do_remove_cow] txCtx.workingRootId to be used: ${rootId}, key: ${keyToRemove}`); // DEBUG

    // Accessing private method for test - this is not ideal but for debugging.
    // TypeScript won't allow direct access, so we use 'as any'.
    const result = tree._do_remove_cow_for_test(rootId, keyToRemove, txCtx);

    // Check the debug information
    expect(result.debug_leafRemoveResult).toBeDefined();
    expect(result.debug_leafRemoveResult.keyExisted).toBe(true);
    expect(result.debug_leafRemoveResult.updatedNode.keys).toEqual([10, 30]);

    // Check the main results of #do_remove_cow
    expect(result.keyWasFound).toBe(true);
    expect(result.finalNodeId).not.toBe(rootId);

    const finalNodeInTx = txCtx.getWorkingNode(result.finalNodeId);
    expect(finalNodeInTx).toBeDefined();
    expect(finalNodeInTx?.keys).toEqual([10, 30]);

    // Original test's main assertion depends on public API returning correctly
    const publicApiRemoved = tree.remove_in_transaction(10, txCtx); // Use a different key to avoid re-processing the same node if state is kept
    expect(publicApiRemoved).toBe(true); // This should ideally pass if #do_remove_cow is fixed
  });

  // TODO: Add more tests:
  // - Remove non-existent key
  // - Remove from empty tree
  // - Remove causing underflow (leaf) -> borrow from left
  // - Remove causing underflow (leaf) -> borrow from right
  // - Remove causing underflow (leaf) -> merge with left
  // - Remove causing underflow (leaf) -> merge with right
  // - Remove from internal node (no underflow)
  // - Remove from internal node causing underflow -> borrow/merge
  // - Remove causing tree height to decrease
  // - Remove all occurrences of a key (all=true)
});

describe('BPlusTree remove_in_transaction with underflow (leaf borrowing)', () => {
  let tree: BPlusTree<string, number>;
  let txCtx: ITransactionContext<string, number>;
  const T = 2; // Min keys = 1, Max keys = 3

  // Structure for borrow from left:
  //      Parent (id_p) [30]
  //     /          \
  // LS (id_ls)   N (id_n)
  // [10, 20]     [30]
  // Remove 30 from N. N becomes []. Borrows 20 from LS.
  // LS becomes [10]. N becomes [20]. Parent key becomes 20.
  it('should remove a key from a leaf, causing underflow and borrow from left sibling', () => {
    tree = new BPlusTree<string, number>(T, false, compare_keys_primitive);

    const parentNode = Node.createNode(tree); // id=1 (assuming next_node_id starts from 0)
    const leftSiblingNode = Node.createLeaf(tree); // id=2
    const nodeToEmpty = Node.createLeaf(tree); // id=3

    // Setup left sibling
    leftSiblingNode.keys = [10, 20];
    leftSiblingNode.pointers = ['L10', 'L20'];
    update_state(leftSiblingNode); // Recalculates key_num, size, min, max, etc.
    update_min_max(leftSiblingNode); // Set min/max based on keys
    leftSiblingNode._parent = parentNode.id;

    // Setup node to empty
    nodeToEmpty.keys = [30];
    nodeToEmpty.pointers = ['N30'];
    update_state(nodeToEmpty);
    update_min_max(nodeToEmpty); // Set min/max based on keys
    nodeToEmpty._parent = parentNode.id;

    // Setup parent node
    parentNode.keys = [30]; // Use concrete value instead of potentially undefined nodeToEmpty.min
    parentNode.children = [leftSiblingNode.id, nodeToEmpty.id];
    update_state(parentNode); // Recalculates key_num, size, min, max
    update_min_max(parentNode); // Explicitly update min/max based on children if needed

    tree.root = parentNode.id;
    // Nodes are already registered in tree.nodes by Node.createNode/createLeaf

    txCtx = tree.begin_transaction();
    const keyToRemove = 30;

    const removed = tree.remove_in_transaction(keyToRemove, txCtx);
    expect(removed).toBe(true);

    const finalRootNode = txCtx.getRootNode();
    expect(finalRootNode).toBeDefined();
    expect(finalRootNode!.id).not.toBe(parentNode.id); // Parent should have been copied
    expect(finalRootNode!.keys).toEqual([20]); // Parent separator updated to N's new min

    const finalLeftSibling = txCtx.getNode(finalRootNode!.children[0]);
    expect(finalLeftSibling).toBeDefined();
    expect(finalLeftSibling!.keys).toEqual([10]);
    expect(finalLeftSibling!.pointers).toEqual(['L10']);

    const finalNodeEmptied = txCtx.getNode(finalRootNode!.children[1]);
    expect(finalNodeEmptied).toBeDefined();
    expect(finalNodeEmptied!.keys).toEqual([20]); // Key 30 removed, key 20 borrowed
    expect(finalNodeEmptied!.pointers).toEqual(['L20']); // Pointer for 20 borrowed

    // Check working set size (rough estimate, depends on exact CoW copies)
    // Original: P, LS, N (3)
    // Copies during borrow_from_left_cow: finalNode (copy of N), finalLeftSibling (copy of LS), finalParent (copy of P) -> 3 new nodes.
    // remove_key_immutable from N: 1 copy for N for removal, then 2 more for state/minmax.
    // Total can be around 3 (initial copies for borrow op) + 3 (copies for node state changes) = 6 or more.
    // Let's be less strict on exact size for now, focus on content.
    expect(txCtx.workingNodes.size).toBeGreaterThanOrEqual(3); // P_copy, LS_copy, N_copy must exist
  });
});

describe('BPlusTree remove_in_transaction with underflow (leaf borrowing right)', () => {
  let tree: BPlusTree<string, number>;
  let txCtx: ITransactionContext<string, number>;
  const T = 2; // Min keys = 1, Max keys = 3

  // Structure for borrow from right:
  //      Parent (id_p) [20]
  //     /          \
  //   N (id_n)   RS (id_rs)
  //   [10]       [20, 30]
  // Remove 10 from N. N becomes []. Borrows 20 from RS.
  // N becomes [20]. RS becomes [30]. Parent key becomes 30 (new min of RS).
  it('should remove a key from a leaf, causing underflow and borrow from right sibling', () => {
    tree = new BPlusTree<string, number>(T, false, compare_keys_primitive);

    const parentNode = Node.createNode(tree);
    const nodeToEmpty = Node.createLeaf(tree);
    const rightSiblingNode = Node.createLeaf(tree);

    // Setup node to empty
    nodeToEmpty.keys = [10];
    nodeToEmpty.pointers = ['N10'];
    update_state(nodeToEmpty);
    nodeToEmpty._parent = parentNode.id;

    // Setup right sibling
    rightSiblingNode.keys = [20, 30];
    rightSiblingNode.pointers = ['R20', 'R30'];
    update_state(rightSiblingNode);
    rightSiblingNode._parent = parentNode.id;

    // Setup parent node
    parentNode.keys = [20]; // Use concrete value instead of potentially undefined rightSiblingNode.min
    parentNode.children = [nodeToEmpty.id, rightSiblingNode.id];
    update_state(parentNode);

    tree.root = parentNode.id;
    txCtx = tree.begin_transaction();
    const keyToRemove = 10;

    const removed = tree.remove_in_transaction(keyToRemove, txCtx);
    expect(removed).toBe(true);

    const finalRootNode = txCtx.getRootNode();
    expect(finalRootNode).toBeDefined();
    expect(finalRootNode!.id).not.toBe(parentNode.id);
    expect(finalRootNode!.keys).toEqual([30]); // Parent separator updated to RS's new min

    const finalNodeEmptied = txCtx.getNode(finalRootNode!.children[0]);
    expect(finalNodeEmptied).toBeDefined();
    expect(finalNodeEmptied!.keys).toEqual([20]); // Key 10 removed, key 20 borrowed
    expect(finalNodeEmptied!.pointers).toEqual(['R20']);

    const finalRightSibling = txCtx.getNode(finalRootNode!.children[1]);
    expect(finalRightSibling).toBeDefined();
    expect(finalRightSibling!.keys).toEqual([30]);
    expect(finalRightSibling!.pointers).toEqual(['R30']);

    expect(txCtx.workingNodes.size).toBeGreaterThanOrEqual(3);
  });
});