import { describe, it, expect, beforeEach } from 'bun:test';
import { BPlusTree } from '../BPlusTree';
import { serializeTree, deserializeTree, createTreeFrom } from '../BPlusTreeUtils';

describe('BPlusTreeUtils Edge Cases and Error Handling', () => {
  let tree: BPlusTree<string, number>;

  beforeEach(() => {
    tree = new BPlusTree<string, number>(3, false);
  });

  describe('serializeTree edge cases', () => {
    it('should serialize an empty tree correctly', () => {
      const serialized = serializeTree(tree);

      expect(serialized).toBeDefined();
      expect(serialized.t).toBe(tree.t);
      expect(serialized.unique).toBe(tree.unique);
      expect(serialized.root).toBe(tree.root);
      expect(serialized.nodes).toBeInstanceOf(Array);
      expect(serialized.nodes.length).toBe(tree.nodes.size);
    });

    it('should serialize a tree with single element', () => {
      tree.insert(1, 'one');
      const serialized = serializeTree(tree);

      expect(serialized.nodes.length).toBe(1);
      expect(serialized.root).toBeDefined();
    });

    it('should handle tree with complex structure', () => {
      // Insert enough elements to create multiple levels
      for (let i = 1; i <= 20; i++) {
        tree.insert(i, `value_${i}`);
      }

      const serialized = serializeTree(tree);
      expect(serialized.nodes.length).toBeGreaterThan(1);
      expect(serialized.nodes.length).toBe(tree.nodes.size);
    });
  });

  describe('deserializeTree edge cases', () => {
    it('should handle empty serialized data gracefully', () => {
      const emptyData = {};

      // Should not throw, but might not change the tree
      expect(() => deserializeTree(tree, emptyData)).not.toThrow();
    });

    it('should handle malformed serialized data', () => {
      const malformedData = {
        t: 'invalid',
        nodes: 'not_an_array'
      };

      // Should handle gracefully without throwing
      expect(() => deserializeTree(tree, malformedData as any)).not.toThrow();
    });

    it('should deserialize simple key-value object format', () => {
      const simpleData = {
        'key1': 'value1',
        'key2': 'value2',
        'key3': 'value3'
      };

      deserializeTree(tree, simpleData);

      expect(tree.size).toBe(3);
      expect(tree.find('key1' as any)).toEqual(['value1']);
      expect(tree.find('key2' as any)).toEqual(['value2']);
      expect(tree.find('key3' as any)).toEqual(['value3']);
    });

    it('should preserve tree state when deserializing invalid data', () => {
      // Setup initial state
      tree.insert(1, 'initial');
      const initialSize = tree.size;

      // Try to deserialize invalid data
      deserializeTree(tree, null as any);

      // Tree should maintain its state
      expect(tree.size).toBe(initialSize);
      expect(tree.find(1)).toEqual(['initial']);
    });
  });

  describe('createTreeFrom edge cases', () => {
    it('should create tree from simple object with default options', () => {
      const simpleData = {
        'a': 'value_a',
        'b': 'value_b'
      };

      const newTree = createTreeFrom(simpleData);

      expect(newTree).toBeInstanceOf(BPlusTree);
      expect(newTree.size).toBe(2);
      expect(newTree.find('a' as any)).toEqual(['value_a']);
    });

    it('should create tree with custom options', () => {
      const data = { 'test': 'value' };
      const options = {
        t: 5,
        unique: true
      };

      const newTree = createTreeFrom(data, options);

      expect(newTree.t).toBe(5);
      expect(newTree.unique).toBe(true);
      expect(newTree.size).toBe(1);
    });

    it('should handle empty data gracefully', () => {
      const emptyData = {};

      const newTree = createTreeFrom(emptyData);

      expect(newTree).toBeInstanceOf(BPlusTree);
      expect(newTree.size).toBe(0);
    });

    it('should override constructor options with serialized data', () => {
      // Create and serialize a tree with specific settings
      const originalTree = new BPlusTree<string, number>(4, true);
      originalTree.insert(1, 'test');
      const serialized = serializeTree(originalTree);

      // Create new tree with different options
      const newTree = createTreeFrom(serialized, {
        t: 2,        // Should be overridden by serialized t=4
        unique: false // Should be overridden by serialized unique=true
      });

      expect(newTree.t).toBe(4);        // From serialized data
      expect(newTree.unique).toBe(true); // From serialized data
      expect(newTree.size).toBe(1);
    });
  });

  describe('Round-trip consistency', () => {
    it('should maintain data integrity through multiple serialize/deserialize cycles', () => {
      // Setup complex tree
      const testData = [
        [1, 'one'], [5, 'five'], [3, 'three'], [7, 'seven'],
        [2, 'two'], [6, 'six'], [4, 'four'], [8, 'eight']
      ];

             testData.forEach(([key, value]) => tree.insert(key as number, value as string));
      const originalList = tree.list();

      // Multiple cycles
      let currentTree = tree;
      for (let cycle = 0; cycle < 3; cycle++) {
        const serialized = serializeTree(currentTree);
        currentTree = createTreeFrom(serialized);

        expect(currentTree.list()).toEqual(originalList);
        expect(currentTree.size).toBe(testData.length);
      }
    });

    it('should preserve tree properties through serialization', () => {
      tree = new BPlusTree<string, number>(5, true); // Custom settings
      tree.insert(10, 'ten');
      tree.insert(20, 'twenty');

      const serialized = serializeTree(tree);
      const restored = createTreeFrom(serialized);

      expect(restored.t).toBe(tree.t);
      expect(restored.unique).toBe(tree.unique);
      expect(restored.size).toBe(tree.size);
      expect(restored.min).toBe(tree.min);
      expect(restored.max).toBe(tree.max);
    });
  });

  describe('Performance and large data', () => {
    it('should handle serialization of large trees efficiently', () => {
      // Create a larger tree
      for (let i = 0; i < 1000; i++) {
        tree.insert(i, `value_${i}`);
      }

      const startTime = performance.now();
      const serialized = serializeTree(tree);
      const serializeTime = performance.now() - startTime;

      expect(serialized.nodes.length).toBe(tree.nodes.size);
      expect(serializeTime).toBeLessThan(100); // Should be fast (< 100ms)
    });

    it('should handle deserialization of large trees efficiently', () => {
      // Create and serialize large tree
      for (let i = 0; i < 1000; i++) {
        tree.insert(i, `value_${i}`);
      }
      const serialized = serializeTree(tree);

      // Deserialize
      const newTree = new BPlusTree<string, number>();
      const startTime = performance.now();
      deserializeTree(newTree, serialized);
      const deserializeTime = performance.now() - startTime;

      expect(newTree.size).toBe(tree.size);
      expect(deserializeTime).toBeLessThan(100); // Should be fast (< 100ms)
    });
  });
});