/**
 * Basic B+ Tree Usage Example
 *
 * This example demonstrates:
 * - Creating a B+ tree
 * - Basic insert, find, remove operations
 * - Working with different data types
 */

import { BPlusTree } from '../BPlusTree'

console.log('🌳 Basic B+ Tree Usage Example\n')

// Example 1: Simple string-number tree
console.log('📝 Example 1: Simple Key-Value Store')
const simpleTree = new BPlusTree<string, number>(3, true)

// Insert some data
simpleTree.insert(1, 'first')
simpleTree.insert(5, 'fifth')
simpleTree.insert(3, 'third')
simpleTree.insert(2, 'second')
simpleTree.insert(4, 'fourth')

console.log('Tree size:', simpleTree.size)
console.log('Find key 3:', simpleTree.find(3))
console.log('Count of key 3:', simpleTree.count(3))

// Remove operation
console.log('\nRemoving key 3...')
simpleTree.remove(3)
console.log('Tree size after removal:', simpleTree.size)
console.log('Find key 3 after removal:', simpleTree.find(3))

console.log('\n' + '='.repeat(50) + '\n')

// Example 2: Working with objects
console.log('👤 Example 2: User Management System')

interface User {
  id: number
  name: string
  email: string
  age: number
}

const userTree = new BPlusTree<User, number>(3, true)

// Add users
const users: User[] = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', age: 28 },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', age: 34 },
  { id: 3, name: 'Charlie Brown', email: 'charlie@example.com', age: 22 },
  { id: 4, name: 'Diana Prince', email: 'diana@example.com', age: 31 },
  { id: 5, name: 'Eve Wilson', email: 'eve@example.com', age: 26 }
]

users.forEach(user => userTree.insert(user.id, user))

console.log('Total users:', userTree.size)

// Find specific user
const user = userTree.find(3)
console.log('User with ID 3:', user)

// Check if user exists
console.log('Count of user ID 10:', userTree.count(10))
console.log('Count of user ID 2:', userTree.count(2))

// Get all users using list method
console.log('\nAll users:')
const allUsers = userTree.list()
allUsers.forEach((user, index) => {
  console.log(`  User ${index + 1}: ${user.name} (${user.age} years old)`)
})

console.log('\n' + '='.repeat(50) + '\n')

// Example 3: Non-unique keys (allowing duplicates)
console.log('🔄 Example 3: Non-Unique Index (Age Groups)')

const ageIndex = new BPlusTree<User, number>(3, false) // Allow duplicates

// Index users by age
users.forEach(user => ageIndex.insert(user.age, user))

// Add more users with same ages
ageIndex.insert(28, { id: 6, name: 'Frank Miller', email: 'frank@example.com', age: 28 })
ageIndex.insert(22, { id: 7, name: 'Grace Lee', email: 'grace@example.com', age: 22 })

console.log('Total age entries:', ageIndex.size)
console.log('Count of age 28:', ageIndex.count(28))
console.log('Count of age 22:', ageIndex.count(22))

// Find all users of specific age
console.log('\nAll users aged 28:')
const users28 = ageIndex.find(28)
users28.forEach(user => console.log(`  ${user.name}`))

console.log('\nAll users aged 22:')
const users22 = ageIndex.find(22)
users22.forEach(user => console.log(`  ${user.name}`))

console.log('\n✅ Basic usage examples completed!')