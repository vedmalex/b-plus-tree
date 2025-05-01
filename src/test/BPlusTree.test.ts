import { describe, it, expect, beforeEach } from 'bun:test'
import { BPlusTree } from '../BPlusTree'
import { Node } from '../Node'
import { serializeTree, deserializeTree, createTreeFrom } from '../BPlusTreeUtils'

type Person = {
  id: number
  name: string
}

describe('BPlusTree Core Operations', () => {
  let tree: BPlusTree<Person, number>

  beforeEach(() => {
    // Initialize a new tree before each test
    // Using degree t=2 for easier testing of node splitting/merging logic
    tree = new BPlusTree<Person, number>(2, false)
  })

  it('should insert and find a single item', () => {
    const person: Person = { id: 1, name: 'Alice' }
    const insertResult = tree.insert(person.id, person)
    expect(insertResult).toBe(true)
    expect(tree.size).toBe(1)

    const found = tree.find(1)
    expect(found).toHaveLength(1)
    expect(found[0]).toEqual(person)

    const notFound = tree.find(2)
    expect(notFound).toHaveLength(0)
  })

  it('should handle multiple insertions', () => {
    const persons: Person[] = [
      { id: 5, name: 'Charlie' },
      { id: 2, name: 'Bob' },
      { id: 8, name: 'David' },
      { id: 1, name: 'Alice' }, // Insert out of order
    ]
    persons.forEach(p => tree.insert(p.id, p))

    expect(tree.size).toBe(4)

    // Check if all inserted items can be found
    persons.forEach(p => {
        const found = tree.find(p.id)
        expect(found).toHaveLength(1)
        expect(found[0]).toEqual(p)
    })
  })

   it('should return correct min and max keys', () => {
    const persons: Person[] = [
      { id: 5, name: 'Charlie' },
      { id: 2, name: 'Bob' },
      { id: 8, name: 'David' },
    ]
    persons.forEach(p => tree.insert(p.id, p))

    expect(tree.min).toBe(2)
    expect(tree.max).toBe(8)
  })

  it('should return correct size', () => {
    expect(tree.size).toBe(0)
    tree.insert(1, { id: 1, name: 'A' })
    expect(tree.size).toBe(1)
    tree.insert(2, { id: 2, name: 'B' })
    expect(tree.size).toBe(2)
    tree.insert(1, { id: 1, name: 'A2' }) // Insert duplicate key (allowed as unique=false)
    expect(tree.size).toBe(3)
  })

   it('should handle finding non-existent keys', () => {
    tree.insert(10, { id: 10, name: 'Ten' })
    tree.insert(20, { id: 20, name: 'Twenty' })

    expect(tree.find(5)).toHaveLength(0)
    expect(tree.find(15)).toHaveLength(0)
    expect(tree.find(25)).toHaveLength(0)
  })

  it('should allow duplicate keys when unique is false', () => {
     tree = new BPlusTree<Person, number>(2, false) // Explicitly false
     const person1: Person = { id: 1, name: 'Alice' }
     const person2: Person = { id: 1, name: 'Alicia' }

     tree.insert(person1.id, person1)
     tree.insert(person2.id, person2)

     expect(tree.size).toBe(2)
     const found = tree.find(1)
     expect(found).toHaveLength(2)
     // Order might depend on insertion details, check both are present
     expect(found).toContainEqual(person1)
     expect(found).toContainEqual(person2)
  })

   it('should prevent duplicate keys when unique is true', () => {
     tree = new BPlusTree<Person, number>(2, true) // Explicitly true
     const person1: Person = { id: 1, name: 'Alice' }
     const person2: Person = { id: 1, name: 'Alicia' }

     const insert1Result = tree.insert(person1.id, person1)
     expect(insert1Result).toBe(true)
     const insert2Result = tree.insert(person2.id, person2) // Try inserting duplicate
     expect(insert2Result).toBe(false) // Should fail or overwrite, depends on impl. Assuming false means rejection.

     expect(tree.size).toBe(1)
     const found = tree.find(1)
     expect(found).toHaveLength(1)
     expect(found[0]).toEqual(person1) // Should only contain the first one
   })

  it('should remove a single item', () => {
    const person1: Person = { id: 1, name: 'Alice' }
    const person2: Person = { id: 2, name: 'Bob' }
    tree.insert(person1.id, person1)
    tree.insert(person2.id, person2)
    expect(tree.size).toBe(2)

    const removed = tree.remove(1) // Remove Alice
    expect(removed).toHaveLength(1)
    expect(removed[0]).toEqual([person1.id, person1])
    expect(tree.size).toBe(1)
    expect(tree.find(1)).toHaveLength(0) // Verify Alice is gone
    expect(tree.find(2)).toHaveLength(1) // Verify Bob remains
  })

  it('should handle removing a non-existent key', () => {
    tree.insert(1, { id: 1, name: 'Alice' })
    expect(tree.size).toBe(1)

    const removed = tree.remove(99) // Key doesn't exist
    expect(removed).toHaveLength(0)
    expect(tree.size).toBe(1) // Size should not change
  })

  it('should remove the correct item when duplicates exist (using remove)', () => {
    // remove(key) should remove *one* item matching the key when duplicates exist
    const person1: Person = { id: 1, name: 'Alice' }
    const person2: Person = { id: 1, name: 'Alicia' }
    tree.insert(person1.id, person1)
    tree.insert(person2.id, person2)
    expect(tree.size).toBe(2)

    const removed = tree.remove(1)
    expect(removed).toHaveLength(1)
    // The specific one removed might depend on internal order, just check one was removed
    expect([[person1.id, person1], [person2.id, person2]]).toContainEqual(removed[0])
    expect(tree.size).toBe(1)

    const remaining = tree.find(1)
    expect(remaining).toHaveLength(1)
    // Check that the remaining one is the one *not* removed
    if(removed[0][1].name === 'Alice') {
        expect(remaining[0].name).toBe('Alicia')
    } else {
        expect(remaining[0].name).toBe('Alice')
    }
  })

  it('should remove all items with the same key using removeMany', () => {
     const person1: Person = { id: 1, name: 'Alice' }
     const person2: Person = { id: 1, name: 'Alicia' }
     const person3: Person = { id: 2, name: 'Bob' }
     tree.insert(person1.id, person1)
     tree.insert(person2.id, person2)
     tree.insert(person3.id, person3)
     expect(tree.size).toBe(3)

     const removed = tree.removeMany(1)
     expect(removed).toHaveLength(2)
     // Check both removed items are correct (order might vary)
     expect(removed).toContainEqual([person1.id, person1])
     expect(removed).toContainEqual([person2.id, person2])
     expect(tree.size).toBe(1)
     expect(tree.find(1)).toHaveLength(0) // Verify all Alices are gone
     expect(tree.find(2)).toHaveLength(1) // Verify Bob remains
  })

   it('should list all items in correct order', () => {
     const persons: Person[] = [
       { id: 5, name: 'Charlie' },
       { id: 2, name: 'Bob' },
       { id: 8, name: 'David' },
       { id: 1, name: 'Alice' },
     ]
     persons.forEach(p => tree.insert(p.id, p))

     const listed = tree.list()
     expect(listed).toHaveLength(4)
     expect(listed.map(p => p.id)).toEqual([1, 2, 5, 8]) // Should be sorted by key
     expect(listed).toEqual([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 5, name: 'Charlie' },
        { id: 8, name: 'David' },
     ])
   })

   it('should list items with skip and take', () => {
      const persons: Person[] = [
        { id: 5, name: 'Charlie' },
        { id: 2, name: 'Bob' },
        { id: 8, name: 'David' },
        { id: 1, name: 'Alice' },
        { id: 6, name: 'Eve' },
      ]
      persons.forEach(p => tree.insert(p.id, p)) // Keys: 1, 2, 5, 6, 8

      const listed = tree.list({ skip: 1, take: 2 }) // Skip 1 (Alice), take 2 (Bob, Charlie)
      expect(listed).toHaveLength(2)
      expect(listed.map(p => p.id)).toEqual([2, 5])
      expect(listed).toEqual([
         { id: 2, name: 'Bob' },
         { id: 5, name: 'Charlie' },
      ])
   })

   it('should list items in reverse order', () => {
      const persons: Person[] = [
        { id: 5, name: 'Charlie' },
        { id: 2, name: 'Bob' },
        { id: 8, name: 'David' },
      ]
      persons.forEach(p => tree.insert(p.id, p)) // Keys: 2, 5, 8

      const listed = tree.list({ forward: false })
      expect(listed).toHaveLength(3)
      expect(listed.map(p => p.id)).toEqual([8, 5, 2]) // Reverse order
   })

  it('should find the first item matching a key', () => {
    const person1: Person = { id: 1, name: 'Alice' }
    const person2: Person = { id: 1, name: 'Alicia' } // Duplicate key
    const person3: Person = { id: 2, name: 'Bob' }
    tree.insert(person1.id, person1)
    tree.insert(person2.id, person2)
    tree.insert(person3.id, person3)

    const firstAlice = tree.findFirst(1)
    // The exact first depends on insertion/split logic, but it should be one of them
    expect([person1, person2]).toContainEqual(firstAlice)

    const firstBob = tree.findFirst(2)
    expect(firstBob).toEqual(person3)

    // Should probably return undefined or throw for non-existent key
    // Let's assume undefined for now based on typical find behavior
    expect(tree.findFirst(99)).toBeUndefined()
  })

  it('should find the last item matching a key', () => {
    const person1: Person = { id: 1, name: 'Alice' }
    const person2: Person = { id: 1, name: 'Alicia' } // Duplicate key
    const person3: Person = { id: 2, name: 'Bob' }
    tree.insert(person1.id, person1)
    tree.insert(person2.id, person2)
    tree.insert(person3.id, person3)

    const lastAlice = tree.findLast(1)
    // The exact last depends on insertion/split logic, but it should be one of them
    expect([person1, person2]).toContainEqual(lastAlice)
    // We might need more complex setup to guarantee which one is last

    const lastBob = tree.findLast(2)
    expect(lastBob).toEqual(person3)

    expect(tree.findLast(99)).toBeUndefined()
  })

   it('should create a cursor at the correct position', () => {
     const person1: Person = { id: 1, name: 'Alice' }
     const person2: Person = { id: 5, name: 'Charlie' }
     const person3: Person = { id: 2, name: 'Bob' }
     tree.insert(person1.id, person1)
     tree.insert(person2.id, person2)
     tree.insert(person3.id, person3) // Keys: 1, 2, 5

     const cursorAt2 = tree.cursor(2)
     expect(cursorAt2.done).toBe(false)
     expect(cursorAt2.key).toBe(2)
     expect(cursorAt2.value).toEqual(person3)

     const cursorAtStart = tree.cursor(1)
     expect(cursorAtStart.done).toBe(false)
     expect(cursorAtStart.key).toBe(1)
     expect(cursorAtStart.value).toEqual(person1)

     // Cursor for non-existent key might point to where it *would* be or be 'done'.
     // Based on the code `find_first_key`, it seems to find the first key >= the input key.
     const cursorAt3 = tree.cursor(3) // Should point to 5 (Charlie)
     expect(cursorAt3.done).toBe(false)
     expect(cursorAt3.key).toBe(5) // The *next* key
     expect(cursorAt3.value).toEqual(person2)

     const cursorPastEnd = tree.cursor(10)
     expect(cursorPastEnd.done).toBe(true) // Key greater than max
     expect(cursorPastEnd.value).toBeUndefined()
   })

   it('should count items matching a key', () => {
    const person1: Person = { id: 1, name: 'Alice' }
    const person2: Person = { id: 1, name: 'Alicia' }
    const person3: Person = { id: 2, name: 'Bob' }
    tree.insert(person1.id, person1)
    tree.insert(person2.id, person2)
    tree.insert(person3.id, person3)

    expect(tree.count(1)).toBe(2)
    expect(tree.count(2)).toBe(1)
    expect(tree.count(99)).toBe(0)
   })

   it('should reset the tree', () => {
      // Insert enough items to potentially cause node splitting (e.g., 4 items for t=2)
      const persons: Person[] = [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
          { id: 3, name: 'Charlie' },
          { id: 4, name: 'David' }
      ];
      persons.forEach(p => tree.insert(p.id, p));
      const initialSize = persons.length;
      expect(tree.size).toBe(initialSize);

      // Check if node splitting actually occurred (optional, but good for sanity check)
      // Note: With t=2, inserting 4 items *should* cause a split.
      const nodesBeforeReset = tree.nodes.size;
      // console.log(`Nodes before reset (t=2, ${initialSize} items): ${nodesBeforeReset}`);
      // If splitting occurred, there should be more than 1 node.
      // If the implementation avoids splitting unnecessarily, this might still be 1.
      // Let's make this check less strict or remove if it's not guaranteed.
      // For t=2, 4 items should result in 3 nodes (root, 2 leaves).
       expect(nodesBeforeReset).toBeGreaterThan(1);

      tree.reset()

      expect(tree.size).toBe(0)
      expect(tree.find(1)).toHaveLength(0)
      expect(tree.find(4)).toHaveLength(0)
      expect(tree.nodes.size).toBe(1) // Should only have the new root node
      expect(tree.node(tree.root).leaf).toBe(true)
      expect(tree.node(tree.root).keys).toHaveLength(0)
   })

   it('should remove specific items using a predicate', () => {
      const person1: Person = { id: 1, name: 'Alice' }
      const person2: Person = { id: 1, name: 'Alicia' } // Same key, different name
      const person3: Person = { id: 2, name: 'Bob' }
      tree.insert(person1.id, person1)
      tree.insert(person2.id, person2)
      tree.insert(person3.id, person3)
      expect(tree.size).toBe(3)

      // Remove only the person named 'Alicia' with key 1
      const removed = tree.removeSpecific(1, (p: Person) => p.name === 'Alicia')

      expect(removed).toHaveLength(1)
      expect(removed[0]).toEqual([person2.id, person2])
      expect(tree.size).toBe(2)

      const remainingForKey1 = tree.find(1)
      expect(remainingForKey1).toHaveLength(1)
      expect(remainingForKey1[0]).toEqual(person1) // Only Alice should remain for key 1

      expect(tree.find(2)).toHaveLength(1) // Bob should be unaffected
   })

   it('removeSpecific should not remove items if predicate returns false', () => {
      const person1: Person = { id: 1, name: 'Alice' }
      tree.insert(person1.id, person1)
      expect(tree.size).toBe(1)

      // Predicate always returns false
      const removed = tree.removeSpecific(1, (p: Person) => false)

      expect(removed).toHaveLength(0)
      expect(tree.size).toBe(1)
      expect(tree.find(1)[0]).toEqual(person1)
   })

  // Test node splitting and merging by inserting/removing elements to exceed/go below t

  // --- New Tests ---

   it('toJSON should return a serializable representation', () => {
     tree.insert(1, { id: 1, name: 'Alice' });
     tree.insert(2, { id: 2, name: 'Bob' });

     const json = tree.toJSON();

     expect(json).toBeDefined();
     expect(json.t).toBe(tree.t);
     expect(json.unique).toBe(tree.unique);
     expect(json.root).toBeDefined();
     expect(json.root.id).toBe(tree.root);
     expect(json.root.keys).toBeDefined();
     expect(json.root.pointers).toBeDefined();
     // Deeper checks might be too brittle, just check basic structure
   });

   it('should serialize and deserialize correctly', () => {
     const originalTree = new BPlusTree<Person, number>(2, false);
     const persons: Person[] = [
       { id: 5, name: 'Charlie' },
       { id: 2, name: 'Bob' },
       { id: 8, name: 'David' },
       { id: 1, name: 'Alice' },
     ];
     persons.forEach(p => originalTree.insert(p.id, p));

     const originalSize = originalTree.size;
     const originalMin = originalTree.min;
     const originalMax = originalTree.max;
     const originalList = originalTree.list();

     // Serialize
     const serialized = serializeTree(originalTree);
     expect(serialized).toBeDefined();
     expect(serialized.t).toBe(originalTree.t);
     expect(serialized.unique).toBe(originalTree.unique);
     expect(serialized.root).toBe(originalTree.root);
     expect(serialized.nodes).toBeInstanceOf(Array);
     expect(serialized.nodes.length).toBe(originalTree.nodes.size);

     // Deserialize into a new tree
     const newTree = new BPlusTree<Person, number>();
     deserializeTree(newTree, serialized);

     // Verify the new tree
     expect(newTree.t).toBe(originalTree.t);
     expect(newTree.unique).toBe(originalTree.unique);
     expect(newTree.root).toBe(originalTree.root);
     expect(newTree.nodes.size).toBe(originalTree.nodes.size);
     expect(newTree.size).toBe(originalSize);
     expect(newTree.min).toBe(originalMin);
     expect(newTree.max).toBe(originalMax);

     // Verify content
     expect(newTree.list()).toEqual(originalList);
     persons.forEach(p => {
        const found = newTree.find(p.id);
        expect(found).toHaveLength(1);
        expect(found[0]).toEqual(p);
     });
   });

    it('should createFrom serialized data correctly', () => {
        const originalTree = new BPlusTree<Person, number>(3, true); // Use different t/unique
        const persons: Person[] = [
          { id: 10, name: 'Ten' },
          { id: 20, name: 'Twenty' },
          { id: 5, name: 'Five' },
        ];
        persons.forEach(p => originalTree.insert(p.id, p));

        const serialized = serializeTree(originalTree);

        // Create from serialized data
        const newTree = createTreeFrom(serialized, {
            t: originalTree.t,
            unique: originalTree.unique
        });

        // Verify the new tree
        expect(newTree).toBeInstanceOf(BPlusTree);
        expect(newTree.t).toBe(originalTree.t);
        expect(newTree.unique).toBe(originalTree.unique);
        expect(newTree.size).toBe(originalTree.size);
        expect(newTree.min).toBe(5);
        expect(newTree.max).toBe(20);
        expect(newTree.list()).toEqual(originalTree.list());
    });

  // --- Tests for Node Splitting and Merging (t=2) ---

  it('should split root node when necessary (t=2)', () => {
     // With t=2, max keys in a node is 2*t - 1 = 3. Max pointers is 2*t = 4.
     // Min keys in non-root node is t - 1 = 1. Min pointers is t = 2.
     // A leaf node splits when it has 2*t = 4 pointers (or 3 keys for internal).
     // For a leaf with t=2, it splits when inserting the 4th item (keys = 3).
     tree = new BPlusTree<Person, number>(2, false) // Ensure t=2

     // Insert 1, 2 -> Root (Leaf): [1, 2]
     tree.insert(1, { id: 1, name: 'A' });
     tree.insert(2, { id: 2, name: 'B' });
     let rootNodeBeforeSplit: Node<Person, number> = tree.node(tree.root);
     expect(rootNodeBeforeSplit.leaf).toBe(true);
     expect(rootNodeBeforeSplit.keys).toEqual([1, 2]);
     expect(tree.nodes.size).toBe(1); // Only root node

     // Insert 3 -> Root (Leaf): [1, 2, 3] -> Split!
     // New Root: [2]
     // Left Child (Leaf): [1]
     // Right Child (Leaf): [2, 3]
     tree.insert(3, { id: 3, name: 'C' });
     const rootNodeAfterSplit: Node<Person, number> = tree.node(tree.root); // Get the new root

     expect(rootNodeAfterSplit.leaf).toBe(false); // Root is now internal
     expect(rootNodeAfterSplit.keys).toEqual([2]); // Root key splits the children
     expect(rootNodeAfterSplit.children).toBeDefined(); // Check children array exists
     expect(rootNodeAfterSplit.children.length).toBe(2); // Should have two children pointers (IDs)
     expect(tree.nodes.size).toBe(3); // Root + 2 children

     const leftChildId = rootNodeAfterSplit.children[0]; // Use .children for internal node pointers
     const rightChildId = rootNodeAfterSplit.children[1];
     const leftChild: Node<Person, number> = tree.node(leftChildId);
     const rightChild: Node<Person, number> = tree.node(rightChildId);

     expect(leftChild.leaf).toBe(true);
     expect(leftChild.keys).toEqual([1]);
     expect(leftChild.pointers.length).toBe(1); // Value pointer for key 1
     // In leaf nodes, pointers[i] corresponds to keys[i]
     expect((leftChild.pointers[0] as Person).name).toBe('A');

     expect(rightChild.leaf).toBe(true);
     expect(rightChild.keys).toEqual([2, 3]);
     expect(rightChild.pointers.length).toBe(2); // Value pointers for keys 2, 3
     expect((rightChild.pointers[0] as Person).name).toBe('B');
     expect((rightChild.pointers[1] as Person).name).toBe('C');

     expect(tree.size).toBe(3);
   });

   it('should handle borrowing correctly after deletion (t=2)', () => {
      // Start with a state that required a split
      tree = new BPlusTree<Person, number>(2, false);
      tree.insert(1, { id: 1, name: 'A' });
      tree.insert(2, { id: 2, name: 'B' });
      tree.insert(3, { id: 3, name: 'C' });
      // State: Root [2], Left [1], Right [2, 3]
      expect(tree.nodes.size).toBe(3);
      expect(tree.size).toBe(3);
      const rootBeforeRemove = tree.node(tree.root);
      const leftChildBeforeRemoveId = rootBeforeRemove.children[0];
      const rightChildBeforeRemoveId = rootBeforeRemove.children[1];

      // Remove 1 -> Left leaf [1] becomes [], Right leaf [2, 3] has > t-1 keys.
      // Borrowing should occur from the right sibling.
      // 1. Key 2 from parent moves to Left leaf -> Left becomes [2]
      // 2. Key 2 (first key) from Right leaf moves to parent -> Parent becomes [3]
      // 3. Right leaf loses key 2 -> Right becomes [3]
      // Final state: Root [3], Left [2], Right [3]
      const removed1 = tree.remove(1);
      expect(removed1).toHaveLength(1);
      expect(tree.size).toBe(2);
      expect(tree.nodes.size).toBe(3); // Should still have 3 nodes after borrowing

      const rootNodeBorrowed = tree.node(tree.root);
      expect(rootNodeBorrowed.leaf).toBe(false);
      expect(rootNodeBorrowed.keys).toEqual([3]); // Corrected: Parent key becomes the new min of the right sibling (which is 3)
      expect(rootNodeBorrowed.children).toHaveLength(2);

      const leftChildBorrowedId = rootNodeBorrowed.children[0];
      const rightChildBorrowedId = rootNodeBorrowed.children[1];
      const leftChildBorrowed = tree.node(leftChildBorrowedId);
      const rightChildBorrowed = tree.node(rightChildBorrowedId);

      // Verify left child received the borrowed key
      expect(leftChildBorrowed.leaf).toBe(true);
      expect(leftChildBorrowed.keys).toEqual([2]);
      expect((leftChildBorrowed.pointers[0] as Person).name).toBe('B'); // Value for key 2
      // Verify original left child node ID might have been reused or is different
      // expect(leftChildBorrowedId).toBe(leftChildBeforeRemoveId); // Might not be true if nodes are recreated

      // Verify right child gave up its first key
      expect(rightChildBorrowed.leaf).toBe(true);
      expect(rightChildBorrowed.keys).toEqual([3]);
      expect((rightChildBorrowed.pointers[0] as Person).name).toBe('C'); // Value for key 3
      // Verify original right child node ID might have been reused or is different
      // expect(rightChildBorrowedId).toBe(rightChildBeforeRemoveId); // Might not be true

      // Now, let's test merging: remove key 2
      // State: Root [3], Left [2], Right [3]
      // Remove 2 -> Left becomes [] (underflow). Right sibling [3] has only t-1 keys.
      // Borrowing is not possible. Merge should occur.
      // Merge Left [], Right [3] and separator 3 from parent.
      // New Root (Leaf): [3] <--- Corrected expected merge result
      const removed2 = tree.remove(2);
      expect(removed2).toHaveLength(1);
      expect(tree.size).toBe(1); // Only one value (key 3) should remain
      expect(tree.nodes.size).toBe(1); // Should merge back to a single root node

      const rootNodeMerged: Node<Person, number> = tree.node(tree.root);
      expect(rootNodeMerged.leaf).toBe(true);
      expect(rootNodeMerged.keys).toEqual([3]); // Corrected: Merged node should contain key 3 (value C)
      expect((rootNodeMerged.pointers[0] as Person).name).toBe('C'); // Check remaining value (for key 3)

      // Remove 3 -> Root (Leaf): []
      const removed3 = tree.remove(3);
      expect(removed3).toHaveLength(1);
      expect(tree.size).toBe(0);
      expect(tree.nodes.size).toBe(1);
      const rootNodeFinal0: Node<Person, number> = tree.node(tree.root);
      expect(rootNodeFinal0.leaf).toBe(true);
      expect(rootNodeFinal0.keys).toEqual([]);
   });

})
