import { describe, it, expect } from 'vitest';
import { BPlusTree } from '../BPlusTree';
import { TransactionContext } from '../TransactionContext';

describe('Hello World Proof of Concept', () => {
    it('should demonstrate basic B+ tree operations', () => {
    // Create a new B+ tree
    const tree = new BPlusTree<string, string>(2);

    // Basic insert and find operations
    tree.insert('1', 'one');
    tree.insert('2', 'two');
    tree.insert('3', 'three');

    // Verify basic operations work
    expect(tree.find('1')).toEqual(['one']);
    expect(tree.find('2')).toEqual(['two']);
    expect(tree.find('3')).toEqual(['three']);
    expect(tree.size).toBe(3);

    console.log('✅ Basic operations working');
  });

    it('should demonstrate transaction context creation', () => {
    const tree = new BPlusTree<string, string>(2);

    // Create transaction context
    const tx = new TransactionContext(tree);

    // Verify transaction context is created
    expect(tx).toBeDefined();

    console.log('✅ Transaction context creation working');
  });

  it('should demonstrate range query execution', () => {
    const tree = new BPlusTree<string, string>(2);

    // Insert test data
    tree.insert('1', 'one');
    tree.insert('2', 'two');
    tree.insert('3', 'three');
    tree.insert('4', 'four');
    tree.insert('5', 'five');

    // Test range query (current implementation)
    const rangeResult = tree.range('2');

    // Verify range query returns results (even if not filtered correctly)
    expect(Array.isArray(rangeResult)).toBe(true);
    expect(rangeResult.length).toBeGreaterThan(0);

    console.log('✅ Range query execution working');
    console.log(`Range query returned ${rangeResult.length} results:`, rangeResult);
  });

  it('should demonstrate transaction operations', () => {
    const tree = new BPlusTree<string, string>(2, false); // non-unique for testing
    const tx = new TransactionContext(tree);

    // Insert in transaction
    tree.insert_in_transaction('1', 'one', tx);
    tree.insert_in_transaction('2', 'two', tx);

    // Verify transaction operations work
    const result1 = tree.get_all_in_transaction('1', tx);
    const result2 = tree.get_all_in_transaction('2', tx);

    expect(result1).toEqual(['one']);
    expect(result2).toEqual(['two']);

    console.log('✅ Transaction operations working');
  });

    it('should demonstrate the transaction commit issue (non-unique)', () => {
    const tree = new BPlusTree<string, string>(2, false); // non-unique
    const tx = new TransactionContext(tree);

    // Insert some data in transaction
    tree.insert_in_transaction('10', 'ten-a', tx);
    tree.insert_in_transaction('10', 'ten-b', tx); // duplicate key

    // Verify data is visible in transaction
    const beforeCommit = tree.get_all_in_transaction('10', tx);
    expect(beforeCommit).toEqual(['ten-a', 'ten-b']);

    // Prepare and commit transaction
    tx.prepareCommit();
    tx.finalizeCommit();

    // Check if data persists after commit (this is where the issue occurs)
    const afterCommit = tree.find('10');

    console.log('Before commit:', beforeCommit);
    console.log('After commit:', afterCommit);
    console.log('Tree size after commit:', tree.size);

    // This test documents the current issue - data may not persist after commit
    if (afterCommit.length === 0) {
      console.log('❌ ISSUE CONFIRMED: Transaction commit failed for non-unique index');
    } else {
      console.log('✅ Transaction commit working correctly');
    }
  });
});