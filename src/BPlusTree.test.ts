import { describe, it, expect, beforeEach } from 'bun:test'
import { BPlusTree } from './BPlusTree'

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
})
