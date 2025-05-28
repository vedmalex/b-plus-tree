import { describe, it, expect, beforeEach } from 'bun:test';
import { BPlusTree } from '../BPlusTree';
import { TransactionContext } from '../TransactionContext';

describe('Debug Savepoint Issues', () => {
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

  it('debug nested savepoints step by step', async () => {
    console.log('=== Initial state ===');
    console.log('find(1):', tree.find_in_transaction(1, txCtx));
    console.log('find(2):', tree.find_in_transaction(2, txCtx));
    console.log('find(3):', tree.find_in_transaction(3, txCtx));
    console.log('working nodes:', txCtx.workingNodes.size);
    console.log('deleted nodes:', txCtx.deletedNodes.size);

    // Create first savepoint
    const sp1 = await txCtx.createSavepoint('level-1');
    console.log('\n=== After sp1 creation ===');
    console.log('savepoints:', txCtx.listSavepoints().length);

    // Insert data
    tree.insert_in_transaction(10, 'ten', txCtx);
    console.log('\n=== After insert 10 ===');
    console.log('find(10):', tree.find_in_transaction(10, txCtx));
    console.log('working nodes:', txCtx.workingNodes.size);

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    // Create second savepoint
    const sp2 = await txCtx.createSavepoint('level-2');
    console.log('\n=== After sp2 creation ===');
    console.log('savepoints:', txCtx.listSavepoints().length);

    // Debug sp2 snapshot
    const sp2Info = txCtx.getSavepointInfo(sp2);
    console.log('sp2 snapshot working nodes:', sp2Info?.workingNodesCount);
    console.log('Current working nodes before insert 20:');
    for (const [nodeId, node] of txCtx.workingNodes) {
      console.log(`  Node ${nodeId}: keys=[${node.keys.join(',')}], leaf=${node.leaf}`);
    }

    // Insert more data
    tree.insert_in_transaction(20, 'twenty', txCtx);
    console.log('\n=== After insert 20 ===');
    console.log('find(10):', tree.find_in_transaction(10, txCtx));
    console.log('find(20):', tree.find_in_transaction(20, txCtx));
    console.log('working nodes:', txCtx.workingNodes.size);

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    // Create third savepoint
    const sp3 = await txCtx.createSavepoint('level-3');
    console.log('\n=== After sp3 creation ===');
    console.log('savepoints:', txCtx.listSavepoints().length);

    // Insert even more data
    tree.insert_in_transaction(30, 'thirty', txCtx);
    console.log('\n=== After insert 30 ===');
    console.log('find(10):', tree.find_in_transaction(10, txCtx));
    console.log('find(20):', tree.find_in_transaction(20, txCtx));
    console.log('find(30):', tree.find_in_transaction(30, txCtx));
    console.log('working nodes:', txCtx.workingNodes.size);

    // Rollback to level-2
    console.log('\n=== Before rollback to sp2 ===');
    console.log('sp2 info:', txCtx.getSavepointInfo(sp2));

    await txCtx.rollbackToSavepoint(sp2);

    console.log('\n=== After rollback to sp2 ===');
    console.log('find(10):', tree.find_in_transaction(10, txCtx));
    console.log('find(20):', tree.find_in_transaction(20, txCtx));
    console.log('find(30):', tree.find_in_transaction(30, txCtx));
    console.log('working nodes:', txCtx.workingNodes.size);
    console.log('deleted nodes:', txCtx.deletedNodes.size);
    console.log('savepoints:', txCtx.listSavepoints().length);

    // Debug working nodes
    console.log('\n=== Working nodes details ===');
    for (const [nodeId, node] of txCtx.workingNodes) {
      console.log(`Node ${nodeId}: keys=[${node.keys.join(',')}], leaf=${node.leaf}, originalId=${(node as any)._originalNodeId}`);
    }

    // Debug root
    console.log('\n=== Root info ===');
    console.log('workingRootId:', txCtx.workingRootId);
    console.log('snapshotRootId:', txCtx.snapshotRootId);
    const rootNode = txCtx.getRootNode();
    if (rootNode) {
      console.log(`Root node: keys=[${rootNode.keys.join(',')}], leaf=${rootNode.leaf}`);
    } else {
      console.log('Root node: undefined');
    }

    // Check expectations
    expect(tree.find_in_transaction(10, txCtx)).toBeDefined(); // Should remain
    expect(tree.find_in_transaction(20, txCtx)).toBeUndefined(); // Should be removed (was added after sp2)
    expect(tree.find_in_transaction(30, txCtx)).toBeUndefined(); // Should be removed
  });
});