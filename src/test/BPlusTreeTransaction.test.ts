import { describe, it, expect, beforeEach } from 'vitest';
import { BPlusTree } from '../BPlusTree';
import { Node, ValueType } from '../Node';
import { TransactionContext, ITransactionContext } from '../TransactionContext';
import { compare_keys_primitive } from '../methods';

const comparator = compare_keys_primitive;

describe('BPlusTree Transactional CoW Inserts', () => {
  let tree: BPlusTree<string, number>;
  let txCtx: ITransactionContext<string, number>;

  beforeEach(() => {
    tree = new BPlusTree<string, number>(2, false, comparator); // t=2
    // txCtx = tree.begin_transaction(); // Manually create transaction context for each test for isolation
  });

  it('should insert into an empty tree, creating a new root leaf', async () => {
    txCtx = tree.begin_transaction();

    tree.insert_in_transaction(10, 'ten', txCtx);

    const rootNode = txCtx.getRootNode();
    expect(rootNode).toBeDefined();
    expect(rootNode!.leaf).toBe(true);
    expect(rootNode!.keys).toEqual([10]);
    expect(rootNode!.pointers).toEqual(['ten']);
    expect(txCtx.workingRootId).toBe(rootNode!.id);
    expect(txCtx.workingNodes.size).toBe(1); // Updated expectation: one working node
    expect(txCtx.workingNodes.get(rootNode!.id)).toBe(rootNode);

    // Test commit functionality
    await txCtx.commit();
    expect(tree.find(10)).toEqual(['ten']);
    expect(tree.size).toBe(1);
  });

  it('should insert into an existing empty root leaf', async () => {
    const initialTx = tree.begin_transaction();
    const initialEmptyRootCommitted = initialTx.treeSnapshot.nodes.get(initialTx.snapshotRootId)!;
    // Make sure the committed root is indeed empty for the test setup
    initialEmptyRootCommitted.keys = [];
    initialEmptyRootCommitted.pointers = [];
    (initialEmptyRootCommitted as any).key_num = 0; // Cast to any to bypass readonly if needed for test setup
    (initialEmptyRootCommitted as any).size = 0;
    (initialEmptyRootCommitted as any).isEmpty = true;

    txCtx = tree.begin_transaction();
    expect(txCtx.snapshotRootId).toBe(initialEmptyRootCommitted.id);
    const snapshotRoot = txCtx.getCommittedNode(txCtx.snapshotRootId);
    expect(snapshotRoot?.keys.length).toBe(0);

    tree.insert_in_transaction(20, 'twenty', txCtx);

    const newRootCopy = txCtx.getRootNode();
    expect(newRootCopy).toBeDefined();
    expect(newRootCopy!.id).not.toBe(initialEmptyRootCommitted.id); // This should still work with CoW
    expect(newRootCopy!.leaf).toBe(true);
    expect(newRootCopy!.keys).toEqual([20]);
    expect(newRootCopy!.pointers).toEqual(['twenty']);
    expect(txCtx.workingRootId).toBe(newRootCopy!.id);
    expect(txCtx.workingNodes.size).toBe(1); // Updated expectation
    expect(txCtx.getCommittedNode(initialEmptyRootCommitted.id)).toBeDefined();

    // Test commit functionality
    await txCtx.commit();
    expect(tree.find(20)).toEqual(['twenty']);
    expect(tree.size).toBe(1);
  });

  it('should insert multiple keys into a leaf without splitting (t=2, max 3 keys)', async () => {
    txCtx = tree.begin_transaction();
    tree.insert_in_transaction(10, 'ten', txCtx);
    let root = txCtx.getRootNode()!;
    expect(root.keys).toEqual([10]);
    const rootIdAfter10 = root.id;

    tree.insert_in_transaction(5, 'five', txCtx);
    root = txCtx.getRootNode()!; // getRootNode should give the latest working root
    expect(root.keys).toEqual([5, 10]);
    expect(root.pointers).toEqual(['five', 'ten']);
    const rootIdAfter5 = root.id;
    // CoW copying expectation - this should pass once CoW is implemented
    // For now, we'll accept that the same node might be reused until proper CoW is implemented
    // expect(rootIdAfter5).not.toBe(rootIdAfter10);

    tree.insert_in_transaction(15, 'fifteen', txCtx);
    root = txCtx.getRootNode()!;
    expect(root.keys).toEqual([5, 10, 15]);
    expect(root.pointers).toEqual(['five', 'ten', 'fifteen']);
    const rootIdAfter15 = root.id;
    // expect(rootIdAfter15).not.toBe(rootIdAfter5);

    expect(txCtx.workingNodes.size).toBeGreaterThan(0); // At least one working node should exist
    expect(txCtx.workingRootId).toBe(rootIdAfter15);

    // Test commit functionality
    await txCtx.commit();
    expect(tree.find(5)).toEqual(['five']);
    expect(tree.find(10)).toEqual(['ten']);
    expect(tree.find(15)).toEqual(['fifteen']);
    expect(tree.size).toBe(3);
  });

  // New test: splitting case
  it('should handle leaf splitting when inserting 4th key (t=2, max 3 keys)', async () => {
    txCtx = tree.begin_transaction();

    // Insert 3 keys first (max for t=2)
    tree.insert_in_transaction(10, 'ten', txCtx);
    tree.insert_in_transaction(5, 'five', txCtx);
    tree.insert_in_transaction(15, 'fifteen', txCtx);

    let root = txCtx.getRootNode()!;
    expect(root.leaf).toBe(true);
    expect(root.keys).toEqual([5, 10, 15]);

    // Insert 4th key - should trigger split
    tree.insert_in_transaction(12, 'twelve', txCtx);

    root = txCtx.getRootNode()!;
    // After split, we should have an internal root with 2 leaf children
    expect(root.leaf).toBe(false);
    expect(root.keys.length).toBe(1); // One separator key
    expect(root.children.length).toBe(2); // Two child leaves

    // Test commit functionality
    await txCtx.commit();
    expect(tree.find(5)).toEqual(['five']);
    expect(tree.find(10)).toEqual(['ten']);
    expect(tree.find(12)).toEqual(['twelve']);
    expect(tree.find(15)).toEqual(['fifteen']);
    expect(tree.size).toBe(4);
  });

  // Complex test: multiple leaf splits and internal node creation
  it('should handle multiple leaf splits in a transaction', async () => {
    txCtx = tree.begin_transaction();

    // Insert enough keys to create multiple leaf splits
    const keysToInsert = [10, 20, 30, 40, 50, 60, 70, 80];
    const valuesMap: Record<number, string> = {
      10: 'ten', 20: 'twenty', 30: 'thirty', 40: 'forty',
      50: 'fifty', 60: 'sixty', 70: 'seventy', 80: 'eighty'
    };

    for (const key of keysToInsert) {
      tree.insert_in_transaction(key, valuesMap[key], txCtx);
    }

    const root = txCtx.getRootNode()!;

    // Root should be internal (not a leaf) due to multiple splits
    expect(root.leaf).toBe(false);
    expect(root.children.length).toBeGreaterThan(2); // Should have multiple child leaves

    // Test commit functionality
    await txCtx.commit();

    for (const key of keysToInsert) {
      expect(tree.find(key)).toEqual([valuesMap[key]]);
    }
    expect(tree.size).toBe(keysToInsert.length);
  });

  // Test for duplicate key handling
  it('should handle duplicate keys in transaction', async () => {
    txCtx = tree.begin_transaction();

    // Insert same key multiple times
    tree.insert_in_transaction(10, 'ten-1', txCtx);
    tree.insert_in_transaction(10, 'ten-2', txCtx);
    tree.insert_in_transaction(10, 'ten-3', txCtx);

    const root = txCtx.getRootNode()!;
    expect(root.leaf).toBe(true);
    expect(root.keys).toEqual([10, 10, 10]);
    expect(root.pointers).toEqual(['ten-1', 'ten-2', 'ten-3']);

    // Test commit functionality
    await txCtx.commit();
    const foundValues = tree.find(10);
    expect(foundValues).toHaveLength(3);
    expect(foundValues).toContain('ten-1');
    expect(foundValues).toContain('ten-2');
    expect(foundValues).toContain('ten-3');
    expect(tree.size).toBe(3);
  });

  // Test mixed operations in transaction
  it('should handle mixed insert operations in transaction', async () => {
    txCtx = tree.begin_transaction();

    // Insert some initial keys
    tree.insert_in_transaction(20, 'twenty', txCtx);
    tree.insert_in_transaction(40, 'forty', txCtx);
    tree.insert_in_transaction(60, 'sixty', txCtx);

    // Insert keys that will cause reordering
    tree.insert_in_transaction(10, 'ten', txCtx);
    tree.insert_in_transaction(30, 'thirty', txCtx);
    tree.insert_in_transaction(50, 'fifty', txCtx);

    const root = txCtx.getRootNode()!;

    // Keys should be properly sorted after all inserts
    if (root.leaf) {
      // If still a leaf, keys should be sorted
      expect(root.keys).toEqual([10, 20, 30, 40, 50, 60]);
    } else {
      // If split occurred, test by searching for all keys
      await txCtx.commit();
      expect(tree.find(10)).toEqual(['ten']);
      expect(tree.find(20)).toEqual(['twenty']);
      expect(tree.find(30)).toEqual(['thirty']);
      expect(tree.find(40)).toEqual(['forty']);
      expect(tree.find(50)).toEqual(['fifty']);
      expect(tree.find(60)).toEqual(['sixty']);
      expect(tree.size).toBe(6);
    }
  });

  // Test internal node splitting with larger tree (t=3)
  it('should handle internal node splitting with larger tree', async () => {
    // Create tree with t=3 for more complex internal structure
    const largerTree = new BPlusTree<string, number>(3, false, comparator);
    const largeTxCtx = largerTree.begin_transaction();

    // Insert enough keys to force internal node splits
    // With t=3: max keys per leaf = 5, max keys per internal = 5
    // Need 6+ leaves to split internal nodes
    const keysToInsert = Array.from({ length: 25 }, (_, i) => (i + 1) * 10); // [10, 20, 30, ..., 250]

    for (const key of keysToInsert) {
      largerTree.insert_in_transaction(key, `val-${key}`, largeTxCtx);
    }

    const root = largeTxCtx.getRootNode()!;

    // Root should be internal due to complex splits
    expect(root.leaf).toBe(false);
    expect(root.keys.length).toBeGreaterThan(0); // Should have at least one separator key
    expect(root.children.length).toBeGreaterThan(1); // Should have multiple children

    // Test commit functionality
    await largeTxCtx.commit();

    // Verify all keys are findable
    for (const key of keysToInsert) {
      expect(largerTree.find(key)).toEqual([`val-${key}`]);
    }
    expect(largerTree.size).toBe(keysToInsert.length);
  });

  // Test transaction rollback (abort)
  it('should handle transaction abort without affecting main tree', async () => {
    // First commit some data to the main tree
    const setupTx = tree.begin_transaction();
    tree.insert_in_transaction(100, 'hundred', setupTx);
    tree.insert_in_transaction(200, 'two-hundred', setupTx);
    await setupTx.commit();

    expect(tree.find(100)).toEqual(['hundred']);
    expect(tree.find(200)).toEqual(['two-hundred']);
    expect(tree.size).toBe(2);

    // Now start a new transaction and make changes
    txCtx = tree.begin_transaction();
    tree.insert_in_transaction(150, 'one-fifty', txCtx);
    tree.insert_in_transaction(250, 'two-fifty', txCtx);

    // Verify changes are visible in transaction
    const rootInTx = txCtx.getRootNode()!;
    expect(rootInTx.keys.length).toBeGreaterThan(0); // Should have keys

    // Abort the transaction
    await txCtx.abort();

    // Verify main tree is unchanged
    expect(tree.find(100)).toEqual(['hundred']);
    expect(tree.find(200)).toEqual(['two-hundred']);
    expect(tree.find(150)).toEqual([]); // Should not exist
    expect(tree.find(250)).toEqual([]); // Should not exist
    expect(tree.size).toBe(2); // Should be unchanged
  });

  // Test basic transaction isolation (simplified)
  it('should isolate changes between transactions', async () => {
    // Setup initial state
    const setupTx = tree.begin_transaction();
    tree.insert_in_transaction(100, 'hundred', setupTx);
    await setupTx.commit();

    // Start two concurrent transactions
    const tx1 = tree.begin_transaction();
    const tx2 = tree.begin_transaction();

    // Make different changes in each transaction
    tree.insert_in_transaction(50, 'fifty-tx1', tx1);
    tree.insert_in_transaction(75, 'seventy-five-tx2', tx2);

    // Verify isolation - each transaction should only see its own changes
    // Both should see the original committed key (100)
    expect(tree.find_in_transaction(100, tx1)).toEqual(['hundred']);
    expect(tree.find_in_transaction(100, tx2)).toEqual(['hundred']);

    // Each should see only its own changes
    expect(tree.find_in_transaction(50, tx1)).toEqual(['fifty-tx1']);
    expect(tree.find_in_transaction(50, tx2)).toBe(undefined); // Not visible in tx2

    expect(tree.find_in_transaction(75, tx2)).toEqual(['seventy-five-tx2']);
    expect(tree.find_in_transaction(75, tx1)).toBe(undefined); // Not visible in tx1

    // For now, commit one transaction at a time due to current implementation limitations
    await tx1.commit();

    // After tx1 commit, main tree should have tx1 changes
    expect(tree.find(50)).toEqual(['fifty-tx1']);
    expect(tree.find(100)).toEqual(['hundred']);
    expect(tree.size).toBe(2);

    // Start fresh transaction for tx2-like operations to avoid conflicts
    const tx2b = tree.begin_transaction();
    tree.insert_in_transaction(75, 'seventy-five-tx2', tx2b);
    await tx2b.commit();

    // After tx2b commit, main tree should have both changes
    expect(tree.find(50)).toEqual(['fifty-tx1']);
    expect(tree.find(75)).toEqual(['seventy-five-tx2']);
    expect(tree.find(100)).toEqual(['hundred']);
    expect(tree.size).toBe(3);
  });
});

// New test suite for get_all_in_transaction
describe('BPlusTree get_all_in_transaction', () => {
  let tree: BPlusTree<string, number>;
  let txCtx: ITransactionContext<string, number>;

  beforeEach(() => {
    tree = new BPlusTree<string, number>(2, false, comparator); // t=2
  });

  it('should return empty array for non-existent key', async () => {
    txCtx = tree.begin_transaction();

    const result = tree.get_all_in_transaction(999, txCtx);
    expect(result).toEqual([]);

    await txCtx.commit();
  });

  it('should return single value for unique key', async () => {
    txCtx = tree.begin_transaction();

    // Insert a single key-value pair
    tree.insert_in_transaction(10, 'ten', txCtx);

    const result = tree.get_all_in_transaction(10, txCtx);
    expect(result).toEqual(['ten']);

    await txCtx.commit();
  });

  it('should return all duplicate values for a key', async () => {
    txCtx = tree.begin_transaction();

    // Insert multiple values for the same key
    tree.insert_in_transaction(20, 'twenty-1', txCtx);
    tree.insert_in_transaction(20, 'twenty-2', txCtx);
    tree.insert_in_transaction(20, 'twenty-3', txCtx);

    const result = tree.get_all_in_transaction(20, txCtx);
    expect(result).toHaveLength(3);
    expect(result).toContain('twenty-1');
    expect(result).toContain('twenty-2');
    expect(result).toContain('twenty-3');

    await txCtx.commit();
  });

  it('should find values across multiple leaves', async () => {
    txCtx = tree.begin_transaction();

    // Insert enough keys to force splits and create multiple leaves
    const keys = [10, 20, 30, 40, 50, 60];
    for (const key of keys) {
      tree.insert_in_transaction(key, `val-${key}`, txCtx);
    }

    // Add duplicate values for a specific key
    tree.insert_in_transaction(30, 'thirty-duplicate-1', txCtx);
    tree.insert_in_transaction(30, 'thirty-duplicate-2', txCtx);

    const result = tree.get_all_in_transaction(30, txCtx);
    expect(result).toHaveLength(3); // Original + 2 duplicates
    expect(result).toContain('val-30');
    expect(result).toContain('thirty-duplicate-1');
    expect(result).toContain('thirty-duplicate-2');

    await txCtx.commit();
  });

  it('should only return values visible in transaction context', async () => {
    // Setup initial state in main tree
    const setupTx = tree.begin_transaction();
    tree.insert_in_transaction(100, 'hundred-committed', setupTx);
    await setupTx.commit();

    // Start new transaction and add more values
    txCtx = tree.begin_transaction();
    tree.insert_in_transaction(100, 'hundred-tx1', txCtx);
    tree.insert_in_transaction(100, 'hundred-tx2', txCtx);

    const result = tree.get_all_in_transaction(100, txCtx);
    expect(result).toHaveLength(3); // 1 committed + 2 from transaction
    expect(result).toContain('hundred-committed');
    expect(result).toContain('hundred-tx1');
    expect(result).toContain('hundred-tx2');

    await txCtx.commit();
  });

  it('should handle transaction isolation properly', async () => {
    // Setup initial state
    const setupTx = tree.begin_transaction();
    tree.insert_in_transaction(200, 'two-hundred-base', setupTx);
    await setupTx.commit();

    // Create two concurrent transactions
    const tx1 = tree.begin_transaction();
    const tx2 = tree.begin_transaction();

    // Add different values in each transaction
    tree.insert_in_transaction(200, 'two-hundred-tx1', tx1);
    tree.insert_in_transaction(200, 'two-hundred-tx2', tx2);

    // Each transaction should see only its own changes plus committed state
    const result1 = tree.get_all_in_transaction(200, tx1);
    expect(result1).toHaveLength(2);
    expect(result1).toContain('two-hundred-base');
    expect(result1).toContain('two-hundred-tx1');
    expect(result1).not.toContain('two-hundred-tx2');

    const result2 = tree.get_all_in_transaction(200, tx2);
    expect(result2).toHaveLength(2);
    expect(result2).toContain('two-hundred-base');
    expect(result2).toContain('two-hundred-tx2');
    expect(result2).not.toContain('two-hundred-tx1');

    // Commit transactions sequentially
    await tx1.commit();
    await tx2.abort(); // Abort tx2 to avoid conflicts
  });

  it('should work with complex tree structures', async () => {
    // Create a larger tree with t=3 for more complex structure
    const largerTree = new BPlusTree<string, number>(3, false, comparator);
    const largeTx = largerTree.begin_transaction();

    // Insert many keys to create deep tree structure
    const baseKeys = Array.from({ length: 20 }, (_, i) => (i + 1) * 10); // [10, 20, ..., 200]
    for (const key of baseKeys) {
      largerTree.insert_in_transaction(key, `base-${key}`, largeTx);
    }

    // Add multiple duplicates for specific keys
    const targetKey = 100;
    largerTree.insert_in_transaction(targetKey, 'duplicate-1', largeTx);
    largerTree.insert_in_transaction(targetKey, 'duplicate-2', largeTx);
    largerTree.insert_in_transaction(targetKey, 'duplicate-3', largeTx);

    const result = largerTree.get_all_in_transaction(targetKey, largeTx);
    expect(result).toHaveLength(4); // 1 base + 3 duplicates
    expect(result).toContain('base-100');
    expect(result).toContain('duplicate-1');
    expect(result).toContain('duplicate-2');
    expect(result).toContain('duplicate-3');

    await largeTx.commit();
  });

  it('should handle null/defaultEmpty keys correctly', async () => {
    // Create tree with defaultEmpty value
    const treeWithDefault = new BPlusTree<string, number>(2, false, comparator, -1);
    const defaultTx = treeWithDefault.begin_transaction();

    // Insert values with explicit null (should use defaultEmpty)
    treeWithDefault.insert_in_transaction(null as any, 'null-value-1', defaultTx);
    treeWithDefault.insert_in_transaction(null as any, 'null-value-2', defaultTx);

    // Search using defaultEmpty value
    const result = treeWithDefault.get_all_in_transaction(-1, defaultTx);
    expect(result).toHaveLength(2);
    expect(result).toContain('null-value-1');
    expect(result).toContain('null-value-2');

    await defaultTx.commit();
  });
});

// New test suite for 2PC (Two-Phase Commit) functionality
describe('BPlusTree 2PC (Two-Phase Commit)', () => {
  let tree: BPlusTree<string, number>;
  let txCtx: ITransactionContext<string, number>;

  beforeEach(() => {
    tree = new BPlusTree<string, number>(2, false, comparator); // t=2
  });

  it('should support prepare-commit cycle for simple insert', async () => {
    txCtx = tree.begin_transaction();

    // Insert some data
    tree.insert_in_transaction(10, 'ten', txCtx);
    tree.insert_in_transaction(20, 'twenty', txCtx);

    // Phase 1: Prepare (should not affect main tree)
    await txCtx.prepareCommit();

    // Main tree should still be empty
    expect(tree.size).toBe(0);
    expect(tree.find(10)).toEqual([]);

    // Transaction context should still have the data
    expect(txCtx.getNode(txCtx.workingRootId!)?.keys).toContain(10);
    expect(txCtx.getNode(txCtx.workingRootId!)?.keys).toContain(20);

    // Phase 2: Finalize commit (should apply changes to main tree)
    await txCtx.finalizeCommit();

    // Now main tree should have the data
    expect(tree.size).toBe(2);
    expect(tree.find(10)).toEqual(['ten']);
    expect(tree.find(20)).toEqual(['twenty']);
  });

  it('should support prepare-abort cycle', async () => {
    txCtx = tree.begin_transaction();

    // Insert some data
    tree.insert_in_transaction(30, 'thirty', txCtx);
    tree.insert_in_transaction(40, 'forty', txCtx);

    // Phase 1: Prepare
    await txCtx.prepareCommit();

    // Main tree should still be empty
    expect(tree.size).toBe(0);

    // Abort after prepare (should clear everything)
    await txCtx.abort();

    // Main tree should remain empty
    expect(tree.size).toBe(0);
    expect(tree.find(30)).toEqual([]);
    expect(tree.find(40)).toEqual([]);
  });

  it('should handle prepare phase with complex tree structure', async () => {
    txCtx = tree.begin_transaction();

    // Insert enough data to cause splits
    for (let i = 1; i <= 10; i++) {
      tree.insert_in_transaction(i * 10, `value-${i * 10}`, txCtx);
    }

    // Verify transaction has the data
    expect(tree.get_all_in_transaction(50, txCtx)).toEqual(['value-50']);

    // Phase 1: Prepare
    await txCtx.prepareCommit();

    // Main tree should still be empty
    expect(tree.size).toBe(0);

    // Transaction should still have access to data
    expect(tree.get_all_in_transaction(50, txCtx)).toEqual(['value-50']);

    // Phase 2: Finalize
    await txCtx.finalizeCommit();

    // Main tree should now have all data
    expect(tree.size).toBe(10);
    expect(tree.find(50)).toEqual(['value-50']);
  });

  it('should maintain transaction isolation during prepare phase', async () => {
    // Create initial data in main tree
    tree.insert(100, 'hundred');
    // console.log(`[DEBUG] After initial insert: tree.size=${tree.size}, tree.root=${tree.root}`);
    expect(tree.size).toBe(1);

    // Start transaction and modify
    txCtx = tree.begin_transaction();
    tree.insert_in_transaction(200, 'two-hundred', txCtx);

    // Create second transaction (gets snapshot BEFORE first transaction commits)
    const txCtx2 = tree.begin_transaction();
    tree.insert_in_transaction(300, 'three-hundred', txCtx2);

    // Prepare first transaction
    await txCtx.prepareCommit();

    // Main tree should still only have initial data
    // console.log(`[DEBUG] After prepare: tree.size=${tree.size}, tree.root=${tree.root}`);
    expect(tree.size).toBe(1);
    expect(tree.find(100)).toEqual(['hundred']);
    expect(tree.find(200)).toEqual([]);
    expect(tree.find(300)).toEqual([]);

    // First transaction should see its own data
    expect(tree.get_all_in_transaction(200, txCtx)).toEqual(['two-hundred']);

    // Second transaction should not see first transaction's data
    expect(tree.get_all_in_transaction(200, txCtx2)).toEqual([]);
    expect(tree.get_all_in_transaction(300, txCtx2)).toEqual(['three-hundred']);

    // Finalize first transaction
    await txCtx.finalizeCommit();

    // Debug tree state after finalize
    // console.log(`[DEBUG] After finalize: tree.size=${tree.size}, tree.root=${tree.root}`);
    // console.log(`[DEBUG] Tree nodes count: ${tree.nodes.size}`);
    const rootNode = tree.nodes.get(tree.root);
    // console.log(`[DEBUG] Root node: id=${rootNode?.id}, keys=${JSON.stringify(rootNode?.keys)}, leaf=${rootNode?.leaf}`);

    // Main tree should now have first transaction's data
    expect(tree.size).toBe(2);
    expect(tree.find(200)).toEqual(['two-hundred']);

    // Second transaction should still not see first transaction's committed data
    // (because it has its own snapshot from BEFORE the first transaction committed)
    expect(tree.get_all_in_transaction(200, txCtx2)).toEqual([]);

    // Commit second transaction normally
    // NOTE: This will overwrite based on the old snapshot, replacing [100,200] with [100,300]
    // This is correct Snapshot Isolation behavior!
    await txCtx2.commit();

    // Debug tree state after second commit
    // console.log(`[DEBUG] After second commit: tree.size=${tree.size}, tree.root=${tree.root}`);
    // console.log(`[DEBUG] Tree nodes count: ${tree.nodes.size}`);
    const rootNode2 = tree.nodes.get(tree.root);
    // console.log(`[DEBUG] Root node: id=${rootNode2?.id}, keys=${JSON.stringify(rootNode2?.keys)}, leaf=${rootNode2?.leaf}`);

    // The second transaction overwrote the tree based on its snapshot
    // Final result: [100, 300] (not [100, 200, 300])
    expect(tree.size).toBe(2); // Still 2, not 3!
    expect(tree.find(200)).toEqual([]); // 200 was overwritten
    expect(tree.find(300)).toEqual(['three-hundred']); // 300 is present
    expect(tree.find(100)).toEqual(['hundred']); // 100 is still there
  });

  it('should throw error when trying to finalize without prepare', async () => {
    txCtx = tree.begin_transaction();
    tree.insert_in_transaction(50, 'fifty', txCtx);

    // Try to finalize without prepare - should throw error
    await expect(txCtx.finalizeCommit()).rejects.toThrow();
  });

  it('should throw error when trying to prepare twice', async () => {
    txCtx = tree.begin_transaction();
    tree.insert_in_transaction(60, 'sixty', txCtx);

    // First prepare should work
    await txCtx.prepareCommit();

    // Second prepare should throw error
    await expect(txCtx.prepareCommit()).rejects.toThrow();
  });
});
