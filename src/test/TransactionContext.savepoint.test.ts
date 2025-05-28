import { describe, it, expect, beforeEach } from 'bun:test';
import { BPlusTree } from '../BPlusTree';
import { TransactionContext } from '../TransactionContext';

describe('TransactionContext Savepoint Support', () => {
  let tree: BPlusTree<string, number>;
  let txCtx: TransactionContext<string, number>;

  beforeEach(() => {
    tree = new BPlusTree<string, number>(3, false);
    // Add initial data
    tree.insert(1, 'one');
    tree.insert(2, 'two');
    tree.insert(3, 'three');

    txCtx = new TransactionContext(tree);
  });

  describe('createSavepoint', () => {
    it('should create savepoint with unique ID', async () => {
      const savepointId = await txCtx.createSavepoint('test-savepoint');

      expect(savepointId).toMatch(/^sp-tx-\d+-\w+-1-\d+$/);
      expect(txCtx.listSavepoints()).toHaveLength(1);
      expect(txCtx.listSavepoints()[0]).toContain('test-savepoint');
    });

    it('should snapshot current working state', async () => {
      // Make changes in transaction
      tree.insert_in_transaction(4, 'four', txCtx);
      tree.remove_in_transaction(1, txCtx);

      const savepointId = await txCtx.createSavepoint('after-changes');
      const info = txCtx.getSavepointInfo(savepointId);

      expect(info).toBeDefined();
      if (info) {
        expect(info.name).toBe('after-changes');
        expect(info.workingNodesCount).toBeGreaterThan(0);
      }
    });

    it('should handle multiple savepoints', async () => {
      const sp1 = await txCtx.createSavepoint('savepoint-1');
      tree.insert_in_transaction(10, 'ten', txCtx);

      const sp2 = await txCtx.createSavepoint('savepoint-2');
      tree.insert_in_transaction(20, 'twenty', txCtx);

      const sp3 = await txCtx.createSavepoint('savepoint-3');

      expect(txCtx.listSavepoints()).toHaveLength(3);
      expect(sp1).not.toBe(sp2);
      expect(sp2).not.toBe(sp3);
    });

    it('should reject duplicate savepoint names', async () => {
      await txCtx.createSavepoint('duplicate-name');

      await expect(txCtx.createSavepoint('duplicate-name')).rejects.toThrow(
        "Savepoint with name 'duplicate-name' already exists"
      );
    });

    it('should create savepoint with empty working state', async () => {
      // No changes made yet
      const savepointId = await txCtx.createSavepoint('empty-state');
      const info = txCtx.getSavepointInfo(savepointId);

      expect(info).toBeDefined();
      if (info) {
        expect(info.workingNodesCount).toBe(0);
        expect(info.deletedNodesCount).toBe(0);
      }
    });
  });

  describe('rollbackToSavepoint', () => {
    it('should restore working nodes state', async () => {
      // Create savepoint
      const savepointId = await txCtx.createSavepoint('before-changes');

      // Make changes
      tree.insert_in_transaction(100, 'hundred', txCtx);
      tree.insert_in_transaction(200, 'two-hundred', txCtx);

      expect(tree.find_in_transaction(100, txCtx)).toBeDefined();
      expect(tree.find_in_transaction(200, txCtx)).toBeDefined();

      // Rollback to savepoint
      await txCtx.rollbackToSavepoint(savepointId);

      // Check that changes are reverted
      expect(tree.find_in_transaction(100, txCtx)).toBeUndefined();
      expect(tree.find_in_transaction(200, txCtx)).toBeUndefined();
    });

    it('should restore deleted nodes state', async () => {
      // Create savepoint
      const savepointId = await txCtx.createSavepoint('before-deletion');

      // Delete data
      tree.remove_in_transaction(2, txCtx);
      expect(tree.find_in_transaction(2, txCtx)).toBeUndefined();

      // Rollback to savepoint
      await txCtx.rollbackToSavepoint(savepointId);

      // Check that data is restored
      const result = tree.find_in_transaction(2, txCtx);
      expect(result).toBeDefined();
      expect(result).toEqual(['two']);
    });

    it('should handle nested savepoints correctly', async () => {
      // Create chain of savepoints
      const sp1 = await txCtx.createSavepoint('level-1');
      tree.insert_in_transaction(10, 'ten', txCtx);

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 5));

      const sp2 = await txCtx.createSavepoint('level-2');
      tree.insert_in_transaction(20, 'twenty', txCtx);

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 5));

      const sp3 = await txCtx.createSavepoint('level-3');
      tree.insert_in_transaction(30, 'thirty', txCtx);

      // Rollback to level-2
      await txCtx.rollbackToSavepoint(sp2);

      // Check state - sp2 was created after inserting 10 but before inserting 20
      expect(tree.find_in_transaction(10, txCtx)).toBeDefined(); // Should remain
      expect(tree.find_in_transaction(20, txCtx)).toBeUndefined(); // Should be removed (was added after sp2)
      expect(tree.find_in_transaction(30, txCtx)).toBeUndefined(); // Should be removed

      // Check that savepoint level-3 is removed
      expect(txCtx.listSavepoints()).toHaveLength(2);
    });

    it('should throw error for non-existent savepoint', async () => {
      await expect(txCtx.rollbackToSavepoint('non-existent')).rejects.toThrow(
        'Savepoint non-existent not found'
      );
    });

    it('should restore working root ID', async () => {
      // Create savepoint
      const savepointId = await txCtx.createSavepoint('before-root-change');
      const originalRootId = txCtx.workingRootId;

      // Make changes that might affect root
      for (let i = 100; i < 110; i++) {
        tree.insert_in_transaction(i, `value-${i}`, txCtx);
      }

      // Rollback to savepoint
      await txCtx.rollbackToSavepoint(savepointId);

      // Check that root ID is restored (handle undefined case)
      if (originalRootId !== undefined) {
        expect(txCtx.workingRootId).toBe(originalRootId);
      } else {
        expect(txCtx.workingRootId).toBeUndefined();
      }
    });
  });

  describe('releaseSavepoint', () => {
    it('should remove savepoint data', async () => {
      const savepointId = await txCtx.createSavepoint('to-release');
      expect(txCtx.listSavepoints()).toHaveLength(1);

      await txCtx.releaseSavepoint(savepointId);
      expect(txCtx.listSavepoints()).toHaveLength(0);
    });

    it('should handle release of non-existent savepoint', async () => {
      await expect(txCtx.releaseSavepoint('non-existent')).rejects.toThrow(
        'Savepoint non-existent not found'
      );
    });

    it('should not affect transaction state', async () => {
      // Make changes
      tree.insert_in_transaction(100, 'hundred', txCtx);

      const savepointId = await txCtx.createSavepoint('test-release');

      // Make more changes
      tree.insert_in_transaction(200, 'two-hundred', txCtx);

      // Release savepoint
      await txCtx.releaseSavepoint(savepointId);

      // Check that data remains
      expect(tree.find_in_transaction(100, txCtx)).toBeDefined();
      expect(tree.find_in_transaction(200, txCtx)).toBeDefined();
    });

    it('should release multiple savepoints independently', async () => {
      const sp1 = await txCtx.createSavepoint('sp1');
      const sp2 = await txCtx.createSavepoint('sp2');
      const sp3 = await txCtx.createSavepoint('sp3');

      expect(txCtx.listSavepoints()).toHaveLength(3);

      await txCtx.releaseSavepoint(sp2);
      expect(txCtx.listSavepoints()).toHaveLength(2);

      // Check that sp1 and sp3 still exist
      expect(txCtx.getSavepointInfo(sp1)).toBeDefined();
      expect(txCtx.getSavepointInfo(sp3)).toBeDefined();
      expect(txCtx.getSavepointInfo(sp2)).toBeUndefined();
    });
  });

  describe('listSavepoints and getSavepointInfo', () => {
    it('should list savepoints in sorted order', async () => {
      await txCtx.createSavepoint('zebra');
      await txCtx.createSavepoint('alpha');
      await txCtx.createSavepoint('beta');

      const list = txCtx.listSavepoints();
      expect(list).toHaveLength(3);
      expect(list[0]).toContain('alpha');
      expect(list[1]).toContain('beta');
      expect(list[2]).toContain('zebra');
    });

    it('should return savepoint info correctly', async () => {
      tree.insert_in_transaction(50, 'fifty', txCtx);
      tree.remove_in_transaction(1, txCtx);

      const savepointId = await txCtx.createSavepoint('info-test');
      const info = txCtx.getSavepointInfo(savepointId);

      expect(info).toBeDefined();
      if (info) {
        expect(info.savepointId).toBe(savepointId);
        expect(info.name).toBe('info-test');
        expect(info.timestamp).toBeGreaterThan(0);
        expect(info.workingNodesCount).toBeGreaterThan(0);
      }
    });

    it('should return undefined for non-existent savepoint', () => {
      const info = txCtx.getSavepointInfo('non-existent');
      expect(info).toBeUndefined();
    });

    it('should handle empty savepoints list', () => {
      const list = txCtx.listSavepoints();
      expect(list).toHaveLength(0);
    });
  });

  describe('commit and abort cleanup', () => {
    it('should clear savepoints on commit', async () => {
      await txCtx.createSavepoint('sp1');
      await txCtx.createSavepoint('sp2');
      expect(txCtx.listSavepoints()).toHaveLength(2);

      await txCtx.commit();
      expect(txCtx.listSavepoints()).toHaveLength(0);
    });

    it('should clear savepoints on abort', async () => {
      await txCtx.createSavepoint('sp1');
      await txCtx.createSavepoint('sp2');
      expect(txCtx.listSavepoints()).toHaveLength(2);

      await txCtx.abort();
      expect(txCtx.listSavepoints()).toHaveLength(0);
    });

    it('should clear savepoints on 2PC finalize', async () => {
      tree.insert_in_transaction(99, 'ninety-nine', txCtx);
      await txCtx.createSavepoint('sp1');
      await txCtx.createSavepoint('sp2');
      expect(txCtx.listSavepoints()).toHaveLength(2);

      await txCtx.prepareCommit();
      await txCtx.finalizeCommit();
      expect(txCtx.listSavepoints()).toHaveLength(0);
    });
  });

  describe('complex scenarios', () => {
    it('should handle savepoint with complex tree operations', async () => {
      // Create initial savepoint
      const sp1 = await txCtx.createSavepoint('complex-start');

      // Perform complex operations
      for (let i = 10; i < 20; i++) {
        tree.insert_in_transaction(i, `value-${i}`, txCtx);
      }

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 5));

      const sp2 = await txCtx.createSavepoint('after-inserts');

      // Remove some values
      tree.remove_in_transaction(2, txCtx);
      tree.remove_in_transaction(15, txCtx);

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 5));

      const sp3 = await txCtx.createSavepoint('after-removes');

      // Insert more values
      tree.insert_in_transaction(25, 'twenty-five', txCtx);
      tree.insert_in_transaction(26, 'twenty-six', txCtx);

      // Rollback to after-inserts
      await txCtx.rollbackToSavepoint(sp2);

      // Check state - sp2 was created after inserts (10-19) but before removes
      expect(tree.find_in_transaction(2, txCtx)).toBeDefined(); // Should be restored (was not removed yet in sp2)
      expect(tree.find_in_transaction(15, txCtx)).toBeDefined(); // Should be restored (was not removed yet in sp2)
      expect(tree.find_in_transaction(25, txCtx)).toBeUndefined(); // Should not exist (was added after sp2)
      expect(tree.find_in_transaction(26, txCtx)).toBeUndefined(); // Should not exist (was added after sp2)

      // Check that sp3 was removed
      expect(txCtx.getSavepointInfo(sp3)).toBeUndefined();
    });

    it('should handle savepoint with tree structure changes', async () => {
      const sp1 = await txCtx.createSavepoint('before-structure-change');

      // Insert enough data to potentially change tree structure
      for (let i = 100; i < 150; i++) {
        tree.insert_in_transaction(i, `large-value-${i}`, txCtx);
      }

      const sp2 = await txCtx.createSavepoint('after-structure-change');

      // Remove data to potentially trigger merges
      for (let i = 100; i < 120; i++) {
        tree.remove_in_transaction(i, txCtx);
      }

      // Rollback to before structure change
      await txCtx.rollbackToSavepoint(sp1);

      // Verify original data is intact
      expect(tree.find_in_transaction(1, txCtx)).toBeDefined();
      expect(tree.find_in_transaction(2, txCtx)).toBeDefined();
      expect(tree.find_in_transaction(3, txCtx)).toBeDefined();

      // Verify inserted data is gone
      expect(tree.find_in_transaction(100, txCtx)).toBeUndefined();
      expect(tree.find_in_transaction(149, txCtx)).toBeUndefined();
    });
  });
});