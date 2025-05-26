/**
 * Transactional Operations Example
 *
 * This example demonstrates:
 * - Creating and using transactions
 * - Transaction isolation
 * - Commit and abort operations
 * - Two-Phase Commit (2PC)
 */

import { BPlusTree } from '../BPlusTree'
import { TransactionContext } from '../TransactionContext'

console.log('🔄 Transactional Operations Example\n')

interface Product {
  id: number
  name: string
  price: number
  stock: number
}

// Create a product catalog tree
const catalog = new BPlusTree<Product, number>(3, true)

// Add initial products
const initialProducts: Product[] = [
  { id: 1, name: 'Laptop', price: 999.99, stock: 10 },
  { id: 2, name: 'Mouse', price: 29.99, stock: 50 },
  { id: 3, name: 'Keyboard', price: 79.99, stock: 25 },
  { id: 4, name: 'Monitor', price: 299.99, stock: 15 },
  { id: 5, name: 'Headphones', price: 149.99, stock: 30 }
]

initialProducts.forEach(product => catalog.insert(product.id, product))

console.log('📦 Initial catalog size:', catalog.size)

// Example 1: Basic Transaction Usage
console.log('\n' + '='.repeat(50))
console.log('📝 Example 1: Basic Transaction Operations')

async function basicTransactionExample() {
  // Create a transaction context
  const txCtx = new TransactionContext(catalog)

  try {
    // Add new product in transaction
    const newProduct: Product = { id: 6, name: 'Webcam', price: 89.99, stock: 20 }
    catalog.insert_in_transaction(newProduct.id, newProduct, txCtx)

    // Update existing product in transaction
    const updatedLaptop: Product = { id: 1, name: 'Gaming Laptop', price: 1299.99, stock: 8 }
    catalog.insert_in_transaction(updatedLaptop.id, updatedLaptop, txCtx)

    // Check data within transaction (sees uncommitted changes)
    const webcamInTx = catalog.get_all_in_transaction(6, txCtx)
    console.log('Webcam in transaction:', webcamInTx[0]?.name)

    // Check data outside transaction (doesn't see uncommitted changes)
    const webcamOutsideTx = catalog.find(6)
    console.log('Webcam outside transaction:', webcamOutsideTx ? webcamOutsideTx[0]?.name : 'Not found')

    // Commit the transaction
    await txCtx.commit()
    console.log('✅ Transaction committed successfully')

    // Now check data outside transaction (sees committed changes)
    const webcamAfterCommit = catalog.find(6)
    console.log('Webcam after commit:', webcamAfterCommit[0]?.name)

  } catch (error) {
    console.error('❌ Transaction failed:', error)
    await txCtx.abort()
  }
}

await basicTransactionExample()

console.log('\n' + '='.repeat(50))
console.log('🔒 Example 2: Transaction Isolation')

async function isolationExample() {
  // Transaction 1: Adding products
  const tx1 = new TransactionContext(catalog)

  // Transaction 2: Updating prices
  const tx2 = new TransactionContext(catalog)

  try {
    // tx1: Add new products
    catalog.insert_in_transaction(7, { id: 7, name: 'Tablet', price: 399.99, stock: 12 }, tx1)
    catalog.insert_in_transaction(8, { id: 8, name: 'Smartphone', price: 699.99, stock: 8 }, tx1)

    // tx2: Update existing product
    const updatedMouse: Product = { id: 2, name: 'Gaming Mouse', price: 59.99, stock: 45 }
    catalog.insert_in_transaction(updatedMouse.id, updatedMouse, tx2)

    // Check isolation: tx1 cannot see tx2's changes and vice versa
    const tx1Tablet = catalog.get_all_in_transaction(7, tx1)
    const tx2Tablet = catalog.get_all_in_transaction(7, tx2)
    console.log('tx1 sees tablet:', tx1Tablet.length > 0)
    console.log('tx2 sees tablet:', tx2Tablet.length === 0)

    console.log('tx1 sees original mouse price:', catalog.get_all_in_transaction(2, tx1)[0]?.price)
    console.log('tx2 sees updated mouse price:', catalog.get_all_in_transaction(2, tx2)[0]?.price)

    // Commit tx1 first
    await tx1.commit()
    console.log('✅ Transaction 1 committed')

    // tx2 still sees its own snapshot (snapshot isolation)
    console.log('tx2 still sees original mouse after tx1 commit:', catalog.get_all_in_transaction(2, tx2)[0]?.price)

    // Commit tx2
    await tx2.commit()
    console.log('✅ Transaction 2 committed')

    // Now main tree has both changes
    console.log('Final catalog size:', catalog.size)

  } catch (error) {
    console.error('❌ Isolation example failed:', error)
    await tx1.abort()
    await tx2.abort()
  }
}

await isolationExample()

console.log('\n' + '='.repeat(50))
console.log('🔄 Example 3: Transaction Abort')

async function abortExample() {
  const txCtx = new TransactionContext(catalog)

  try {
    // Add some products
    catalog.insert_in_transaction(9, { id: 9, name: 'Speaker', price: 199.99, stock: 15 }, txCtx)
    catalog.insert_in_transaction(10, { id: 10, name: 'Microphone', price: 129.99, stock: 10 }, txCtx)

    console.log('Products added in transaction:', catalog.get_all_in_transaction(9, txCtx).length)
    console.log('Catalog size before abort:', catalog.size)

    // Simulate an error condition
    throw new Error('Simulated business logic error')

  } catch (error) {
    console.log('❌ Error occurred:', error.message)
    console.log('🔄 Aborting transaction...')

    await txCtx.abort()
    console.log('✅ Transaction aborted successfully')

    // Check that changes were rolled back
    const speakerAfterAbort = catalog.find(9)
    console.log('Speaker after abort:', speakerAfterAbort.length === 0 ? 'Not found (rolled back)' : 'Found')
    console.log('Catalog size after abort:', catalog.size)
  }
}

await abortExample()

console.log('\n' + '='.repeat(50))
console.log('🔐 Example 4: Two-Phase Commit (2PC)')

async function twoPCExample() {
  const txCtx = new TransactionContext(catalog)

  try {
    // Add products in transaction
    catalog.insert_in_transaction(11, { id: 11, name: 'Router', price: 89.99, stock: 20 }, txCtx)
    catalog.insert_in_transaction(12, { id: 12, name: 'Switch', price: 149.99, stock: 12 }, txCtx)

    console.log('Products added, starting 2PC...')

    // Phase 1: Prepare
    console.log('📋 Phase 1: Prepare')
    await txCtx.prepareCommit()
    console.log('✅ Prepare phase successful')

    // Phase 2: Finalize commit
    console.log('📋 Phase 2: Finalize commit')
    await txCtx.finalizeCommit()
    console.log('✅ 2PC completed successfully')

    // Verify changes are committed
    const router = catalog.find(11)
    console.log('Router after 2PC:', router[0]?.name)

  } catch (error) {
    console.error('❌ 2PC failed:', error)
    await txCtx.abort()
  }
}

await twoPCExample()

console.log('\n' + '='.repeat(50))
console.log('💼 Example 5: Batch Operations with Error Handling')

async function batchOperationsExample() {
  async function safeBatchInsert(items: Product[]): Promise<boolean> {
    const txCtx = new TransactionContext(catalog)

    try {
      // Insert all items in transaction
      for (const item of items) {
        catalog.insert_in_transaction(item.id, item, txCtx)
      }

      // Commit all changes atomically
      await txCtx.commit()
      console.log(`✅ Successfully inserted ${items.length} products`)
      return true

    } catch (error) {
      console.error('❌ Batch insert failed:', error.message)
      await txCtx.abort()
      console.log('🔄 All changes rolled back')
      return false
    }
  }

  const newProducts: Product[] = [
    { id: 13, name: 'Printer', price: 199.99, stock: 8 },
    { id: 14, name: 'Scanner', price: 149.99, stock: 5 },
    { id: 15, name: 'Projector', price: 599.99, stock: 3 }
  ]

  const sizeBefore = catalog.size
  const success = await safeBatchInsert(newProducts)
  const sizeAfter = catalog.size

  console.log(`Catalog size before: ${sizeBefore}`)
  console.log(`Catalog size after: ${sizeAfter}`)
  console.log(`Items added: ${sizeAfter - sizeBefore}`)
}

await batchOperationsExample()

console.log('\n✅ All transaction examples completed!')
console.log(`Final catalog size: ${catalog.size} products`)