import { BPlusTree, TransactionContext } from '../src/index';

interface User {
  id: number;
  name: string;
  email: string;
  department: string;
}

async function savepointExample() {
  console.log('🚀 B+ Tree Savepoint Example\n');

  // Create a B+ tree for users
  const userTree = new BPlusTree<User, number>(3, false);

  // Add initial data
  userTree.insert(1, { id: 1, name: 'Alice', email: 'alice@company.com', department: 'Engineering' });
  userTree.insert(2, { id: 2, name: 'Bob', email: 'bob@company.com', department: 'Marketing' });
  userTree.insert(3, { id: 3, name: 'Charlie', email: 'charlie@company.com', department: 'Sales' });

  console.log('📊 Initial tree size:', userTree.size);

  // Start a transaction
  const txCtx = new TransactionContext(userTree);

  try {
    // Phase 1: Add new users
    console.log('\n📝 Phase 1: Adding new users...');
    userTree.insert_in_transaction(4, {
      id: 4, name: 'David', email: 'david@company.com', department: 'Engineering'
    }, txCtx);
    userTree.insert_in_transaction(5, {
      id: 5, name: 'Eve', email: 'eve@company.com', department: 'Marketing'
    }, txCtx);

    // Create savepoint after adding users
    const sp1 = await txCtx.createSavepoint('after-user-additions');
    console.log('💾 Created savepoint:', sp1.substring(0, 20) + '...');

    const sp1Info = txCtx.getSavepointInfo(sp1);
    console.log('📋 Savepoint info:', {
      name: sp1Info?.name,
      workingNodes: sp1Info?.workingNodesCount,
      deletedNodes: sp1Info?.deletedNodesCount
    });

    // Phase 2: Update existing users
    console.log('\n📝 Phase 2: Updating users...');
    userTree.remove_in_transaction(2, txCtx); // Remove Bob
    userTree.insert_in_transaction(6, {
      id: 6, name: 'Frank', email: 'frank@company.com', department: 'HR'
    }, txCtx);

    // Create another savepoint
    const sp2 = await txCtx.createSavepoint('after-updates');
    console.log('💾 Created savepoint:', sp2.substring(0, 20) + '...');

    // Phase 3: Risky operations that might fail
    console.log('\n📝 Phase 3: Risky operations...');
    userTree.insert_in_transaction(7, {
      id: 7, name: 'Grace', email: 'grace@company.com', department: 'Finance'
    }, txCtx);

    // Simulate validation failure
    const shouldFail = Math.random() > 0.5;
    if (shouldFail) {
      console.log('❌ Validation failed! Rolling back to Phase 2...');
      await txCtx.rollbackToSavepoint(sp2);

      // Try alternative approach
      console.log('🔄 Trying alternative approach...');
      userTree.insert_in_transaction(8, {
        id: 8, name: 'Henry', email: 'henry@company.com', department: 'Support'
      }, txCtx);
    } else {
      console.log('✅ Validation passed!');
    }

    // Show current savepoints
    console.log('\n📋 Current savepoints:');
    const savepoints = txCtx.listSavepoints();
    savepoints.forEach(sp => console.log('  -', sp));

    // Check current state
    console.log('\n🔍 Current transaction state:');
    console.log('Users in transaction:');
    for (let i = 1; i <= 10; i++) {
      const users = userTree.get_all_in_transaction(i, txCtx);
      if (users.length > 0) {
        console.log(`  ${i}: ${users[0].name} (${users[0].department})`);
      }
    }

    // Demonstrate nested rollback
    console.log('\n🔄 Demonstrating nested rollback to Phase 1...');
    await txCtx.rollbackToSavepoint(sp1);

    console.log('📋 Savepoints after rollback:');
    const remainingSavepoints = txCtx.listSavepoints();
    remainingSavepoints.forEach(sp => console.log('  -', sp));

    console.log('\n🔍 State after rollback to Phase 1:');
    console.log('Users in transaction:');
    for (let i = 1; i <= 10; i++) {
      const users = userTree.get_all_in_transaction(i, txCtx);
      if (users.length > 0) {
        console.log(`  ${i}: ${users[0].name} (${users[0].department})`);
      }
    }

    // Commit the transaction
    console.log('\n✅ Committing transaction...');
    await txCtx.commit();

    console.log('📊 Final tree size:', userTree.size);
    console.log('🎉 Transaction completed successfully!');

  } catch (error) {
    console.error('❌ Transaction failed:', error);
    await txCtx.abort();
  }
}

// Advanced savepoint example with error recovery
async function errorRecoveryExample() {
  console.log('\n\n🛡️ Error Recovery with Savepoints Example\n');

  const tree = new BPlusTree<string, number>(3, false);
  const txCtx = new TransactionContext(tree);

  try {
    // Add some initial data
    tree.insert_in_transaction(1, 'initial-data-1', txCtx);
    tree.insert_in_transaction(2, 'initial-data-2', txCtx);

    // Create safety checkpoint
    const safetyPoint = await txCtx.createSavepoint('safety-checkpoint');
    console.log('💾 Created safety checkpoint');

    // Simulate batch processing with potential failures
    const dataToProcess = [
      { key: 10, value: 'batch-item-1' },
      { key: 20, value: 'batch-item-2' },
      { key: -1, value: 'invalid-item' }, // This will cause an error
      { key: 30, value: 'batch-item-3' },
    ];

    for (const item of dataToProcess) {
      try {
        // Validate data
        if (item.key < 0) {
          throw new Error(`Invalid key: ${item.key}`);
        }

        tree.insert_in_transaction(item.key, item.value, txCtx);
        console.log(`✅ Processed: ${item.key} -> ${item.value}`);

      } catch (error) {
        console.log(`❌ Error processing ${item.key}: ${error.message}`);
        console.log('🔄 Rolling back to safety checkpoint...');

        await txCtx.rollbackToSavepoint(safetyPoint);

        console.log('🛡️ Recovered to safe state. Continuing with valid data only...');
        break;
      }
    }

    // Show final state
    console.log('\n🔍 Final transaction state:');
    for (let i = 1; i <= 30; i++) {
      const values = tree.get_all_in_transaction(i, txCtx);
      if (values.length > 0) {
        console.log(`  ${i}: ${values[0]}`);
      }
    }

    await txCtx.commit();
    console.log('✅ Error recovery example completed successfully!');

  } catch (error) {
    console.error('❌ Critical error:', error);
    await txCtx.abort();
  }
}

// Run examples
async function main() {
  await savepointExample();
  await errorRecoveryExample();
}

main().catch(console.error);