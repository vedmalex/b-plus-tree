/**
 * B+ Tree Serialization Examples
 *
 * This file demonstrates various ways to serialize and deserialize B+ trees
 * for persistence, backup, and data transfer scenarios.
 */

import { BPlusTree } from '../src/BPlusTree';
import { serializeTree, deserializeTree, createTreeFrom } from '../src/BPlusTreeUtils';
import { ValueType } from '../src/Node';
import { writeFile, readFile } from 'fs/promises';

// Example data types
interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  department: string;
}

interface Product {
  sku: string;
  name: string;
  price: number;
  category: string;
  inStock: boolean;
}

/**
 * Example 1: Basic Serialization and Deserialization
 */
export function basicSerializationExample() {
  console.log('=== Basic Serialization Example ===');

  // Create and populate a tree
  const userTree = new BPlusTree<User, number>(3, false);

  const users: User[] = [
    { id: 1, name: 'Alice Johnson', email: 'alice@company.com', age: 30, department: 'Engineering' },
    { id: 2, name: 'Bob Smith', email: 'bob@company.com', age: 25, department: 'Marketing' },
    { id: 3, name: 'Charlie Brown', email: 'charlie@company.com', age: 35, department: 'Engineering' },
    { id: 4, name: 'Diana Prince', email: 'diana@company.com', age: 28, department: 'Sales' },
    { id: 5, name: 'Eve Wilson', email: 'eve@company.com', age: 32, department: 'Engineering' }
  ];

  users.forEach(user => userTree.insert(user.id, user));

  console.log(`Original tree size: ${userTree.size}`);
  console.log(`Original tree structure: t=${userTree.t}, unique=${userTree.unique}`);

  // Serialize the tree
  const serialized = serializeTree(userTree);
  console.log(`Serialized data contains ${serialized.nodes.length} nodes`);

  // Method 1: Deserialize into existing tree
  const newTree1 = new BPlusTree<User, number>();
  deserializeTree(newTree1, serialized);
  console.log(`Deserialized tree 1 size: ${newTree1.size}`);

  // Method 2: Create new tree from serialized data
  const newTree2 = createTreeFrom<User, number>(serialized);
  console.log(`Deserialized tree 2 size: ${newTree2.size}`);

  // Verify data integrity
  const originalUser = userTree.find(3);
  const deserializedUser1 = newTree1.find(3);
  const deserializedUser2 = newTree2.find(3);

  console.log('Data integrity check:');
  console.log('Original:', originalUser);
  console.log('Deserialized 1:', deserializedUser1);
  console.log('Deserialized 2:', deserializedUser2);
  console.log('All match:',
    JSON.stringify(originalUser) === JSON.stringify(deserializedUser1) &&
    JSON.stringify(originalUser) === JSON.stringify(deserializedUser2)
  );
}

/**
 * Example 2: File Persistence
 */
export async function filePersistenceExample() {
  console.log('\n=== File Persistence Example ===');

  // Create product catalog tree
  const productTree = new BPlusTree<Product, string>(4, true);

  const products: Product[] = [
    { sku: 'LAPTOP001', name: 'Gaming Laptop', price: 1299.99, category: 'Electronics', inStock: true },
    { sku: 'MOUSE001', name: 'Wireless Mouse', price: 29.99, category: 'Electronics', inStock: true },
    { sku: 'DESK001', name: 'Standing Desk', price: 399.99, category: 'Furniture', inStock: false },
    { sku: 'CHAIR001', name: 'Ergonomic Chair', price: 249.99, category: 'Furniture', inStock: true },
    { sku: 'MONITOR001', name: '4K Monitor', price: 599.99, category: 'Electronics', inStock: true }
  ];

  products.forEach(product => productTree.insert(product.sku, product));

  // Save to file
  async function saveTreeToFile<T, K extends ValueType>(tree: BPlusTree<T, K>, filename: string): Promise<void> {
    const serialized = serializeTree(tree);
    const json = JSON.stringify(serialized, null, 2);
    await writeFile(filename, json, 'utf8');
    console.log(`Tree saved to ${filename}`);
  }

  // Load from file
  async function loadTreeFromFile<T, K extends ValueType>(filename: string): Promise<BPlusTree<T, K>> {
    const json = await readFile(filename, 'utf8');
    const serialized = JSON.parse(json);
    const tree = createTreeFrom<T, K>(serialized);
    console.log(`Tree loaded from ${filename}`);
    return tree;
  }

  try {
    // Save the tree
    await saveTreeToFile(productTree, 'product-catalog.json');

    // Load the tree
    const loadedTree = await loadTreeFromFile<Product, string>('product-catalog.json');

    console.log(`Original tree size: ${productTree.size}`);
    console.log(`Loaded tree size: ${loadedTree.size}`);

    // Verify specific product
    const originalProduct = productTree.find('LAPTOP001');
    const loadedProduct = loadedTree.find('LAPTOP001');
    console.log('Product verification:', JSON.stringify(originalProduct) === JSON.stringify(loadedProduct));

  } catch (error) {
    console.error('File persistence error:', error);
  }
}

/**
 * Example 3: Simple Key-Value Format
 */
export function simpleFormatExample() {
  console.log('\n=== Simple Key-Value Format Example ===');

  // Simple configuration data
  const configData = {
    'app.name': 'MyApplication',
    'app.version': '1.2.3',
    'db.host': 'localhost',
    'db.port': '5432',
    'cache.ttl': '3600',
    'log.level': 'info'
  };

  // Create tree from simple object
  const configTree = createTreeFrom<string, string>(configData);
  console.log(`Config tree size: ${configTree.size}`);

  // Access configuration values
  console.log('App name:', configTree.find('app.name'));
  console.log('DB host:', configTree.find('db.host'));

  // Add new configuration
  configTree.insert('feature.newFeature', 'enabled');

  // Serialize back to get updated data
  const updatedSerialized = serializeTree(configTree);
  console.log('Updated tree has', updatedSerialized.nodes.length, 'nodes');

  // Convert back to simple format (manual process)
  const allEntries = configTree.list();
  const updatedConfig: Record<string, string> = {};
  allEntries.forEach(([key, value]) => {
    updatedConfig[key] = value;
  });

  console.log('Updated config:', updatedConfig);
}

/**
 * Example 4: Database Integration Simulation
 */
export class TreeRepository {
  private storage = new Map<string, string>();

  async saveTree<T, K extends ValueType>(name: string, tree: BPlusTree<T, K>): Promise<void> {
    const serialized = serializeTree(tree);
    const json = JSON.stringify(serialized);
    this.storage.set(name, json);
    console.log(`Tree '${name}' saved to repository`);
  }

  async loadTree<T, K extends ValueType>(name: string): Promise<BPlusTree<T, K> | null> {
    const json = this.storage.get(name);
    if (!json) {
      console.log(`Tree '${name}' not found in repository`);
      return null;
    }

    const serialized = JSON.parse(json);
    const tree = createTreeFrom<T, K>(serialized);
    console.log(`Tree '${name}' loaded from repository`);
    return tree;
  }

  async restoreTreeInto<T, K extends ValueType>(name: string, tree: BPlusTree<T, K>): Promise<boolean> {
    const json = this.storage.get(name);
    if (!json) {
      console.log(`Tree '${name}' not found for restoration`);
      return false;
    }

    const serialized = JSON.parse(json);
    deserializeTree(tree, serialized);
    console.log(`Tree '${name}' restored into existing instance`);
    return true;
  }

  listTrees(): string[] {
    return Array.from(this.storage.keys());
  }

  async deletTree(name: string): Promise<boolean> {
    const deleted = this.storage.delete(name);
    if (deleted) {
      console.log(`Tree '${name}' deleted from repository`);
    }
    return deleted;
  }
}

export function databaseIntegrationExample() {
  console.log('\n=== Database Integration Example ===');

  const repo = new TreeRepository();

  // Create multiple trees
  const userTree = new BPlusTree<User, number>(3, true);
  const ageIndex = new BPlusTree<User, number>(3, false); // Non-unique for age indexing

  const users: User[] = [
    { id: 1, name: 'Alice', email: 'alice@test.com', age: 25, department: 'Engineering' },
    { id: 2, name: 'Bob', email: 'bob@test.com', age: 30, department: 'Marketing' },
    { id: 3, name: 'Charlie', email: 'charlie@test.com', age: 25, department: 'Sales' }
  ];

  // Populate trees
  users.forEach(user => {
    userTree.insert(user.id, user);
    ageIndex.insert(user.age, user); // Multiple users can have same age
  });

  // Save trees
  Promise.all([
    repo.saveTree('users_by_id', userTree),
    repo.saveTree('users_by_age', ageIndex)
  ]).then(async () => {
    console.log('Available trees:', repo.listTrees());

    // Load trees
    const loadedUserTree = await repo.loadTree<User, number>('users_by_id');
    const loadedAgeIndex = await repo.loadTree<User, number>('users_by_age');

    if (loadedUserTree && loadedAgeIndex) {
      console.log(`Loaded user tree size: ${loadedUserTree.size}`);
      console.log(`Loaded age index size: ${loadedAgeIndex.size}`);

      // Test queries
      const user2 = loadedUserTree.find(2);
      const users25 = loadedAgeIndex.find(25);

      console.log('User with ID 2:', user2);
      console.log('Users aged 25:', users25);
    }

    // Restore into existing tree
    const emptyTree = new BPlusTree<User, number>();
    const restored = await repo.restoreTreeInto('users_by_id', emptyTree);
    if (restored) {
      console.log(`Restored tree size: ${emptyTree.size}`);
    }
  });
}

/**
 * Example 5: Performance Testing
 */
export function performanceExample() {
  console.log('\n=== Performance Testing Example ===');

  // Create large tree
  const largeTree = new BPlusTree<string, number>(5, false);
  const itemCount = 10000;

  console.log(`Creating tree with ${itemCount} items...`);
  const insertStart = performance.now();

  for (let i = 0; i < itemCount; i++) {
    largeTree.insert(i, `value_${i}_${Math.random().toString(36).substr(2, 9)}`);
  }

  const insertTime = performance.now() - insertStart;
  console.log(`Insert time: ${insertTime.toFixed(2)}ms`);

  // Test serialization performance
  console.log('Testing serialization performance...');
  const serializeStart = performance.now();
  const serialized = serializeTree(largeTree);
  const serializeTime = performance.now() - serializeStart;

  console.log(`Serialization time: ${serializeTime.toFixed(2)}ms`);
  console.log(`Serialized size: ${serialized.nodes.length} nodes`);

  // Test deserialization performance
  console.log('Testing deserialization performance...');
  const deserializeStart = performance.now();
  const newTree = createTreeFrom<string, number>(serialized);
  const deserializeTime = performance.now() - deserializeStart;

  console.log(`Deserialization time: ${deserializeTime.toFixed(2)}ms`);
  console.log(`Deserialized tree size: ${newTree.size}`);

  // Verify data integrity
  const sampleKey = Math.floor(Math.random() * itemCount);
  const originalValue = largeTree.find(sampleKey);
  const deserializedValue = newTree.find(sampleKey);

  console.log(`Data integrity check (key ${sampleKey}):`,
    JSON.stringify(originalValue) === JSON.stringify(deserializedValue));

  // Performance summary
  console.log('\nPerformance Summary:');
  console.log(`- Items: ${itemCount}`);
  console.log(`- Serialization: ${serializeTime.toFixed(2)}ms (${(itemCount/serializeTime*1000).toFixed(0)} items/sec)`);
  console.log(`- Deserialization: ${deserializeTime.toFixed(2)}ms (${(itemCount/deserializeTime*1000).toFixed(0)} items/sec)`);
}

/**
 * Example 6: Error Handling and Edge Cases
 */
export function errorHandlingExample() {
  console.log('\n=== Error Handling Example ===');

  const tree = new BPlusTree<string, number>(3, false);
  tree.insert(1, 'test');

  // Test graceful handling of malformed data
  console.log('Testing malformed data handling...');

  const malformedData = {
    t: 'invalid',
    nodes: 'not_an_array',
    root: null
  };

  try {
    // This should not throw
    deserializeTree(tree, malformedData as any);
    console.log('✓ Malformed data handled gracefully');
    console.log(`Tree size after malformed data: ${tree.size}`); // Should still be 1
  } catch (error) {
    console.log('✗ Unexpected error with malformed data:', error);
  }

  // Test with null data
  try {
    deserializeTree(tree, null as any);
    console.log('✓ Null data handled gracefully');
    console.log(`Tree size after null data: ${tree.size}`); // Should still be 1
  } catch (error) {
    console.log('✗ Unexpected error with null data:', error);
  }

  // Test with empty object
  try {
    const emptyTree = createTreeFrom({});
    console.log('✓ Empty object handled gracefully');
    console.log(`Empty tree size: ${emptyTree.size}`); // Should be 0
  } catch (error) {
    console.log('✗ Unexpected error with empty object:', error);
  }

  console.log('Error handling tests completed');
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('🌳 B+ Tree Serialization Examples\n');

  basicSerializationExample();
  await filePersistenceExample();
  simpleFormatExample();
  databaseIntegrationExample();
  performanceExample();
  errorHandlingExample();

  console.log('\n✅ All examples completed successfully!');
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}