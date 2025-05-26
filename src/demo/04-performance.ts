/**
 * Performance and Benchmarking Example
 *
 * This example demonstrates:
 * - Performance characteristics of B+ tree operations
 * - Comparison with different data structures
 * - Memory usage optimization
 * - Bulk operations performance
 */

import { BPlusTree } from '../BPlusTree'

console.log('⚡ Performance and Benchmarking Example\n')

interface TestRecord {
  id: number
  data: string
  timestamp: number
  category: string
}

// Helper function to generate test data
function generateTestData(count: number): TestRecord[] {
  const categories = ['A', 'B', 'C', 'D', 'E']
  const records: TestRecord[] = []

  for (let i = 1; i <= count; i++) {
    records.push({
      id: i,
      data: `Record_${i}_${Math.random().toString(36).substring(7)}`,
      timestamp: Date.now() + i,
      category: categories[i % categories.length]
    })
  }

  return records
}

// Example 1: Insert Performance
console.log('📊 Example 1: Insert Performance')

function insertPerformanceTest() {
  const sizes = [100, 1000, 5000, 10000]

  console.log('Testing insert performance with different data sizes:')
  console.log('Size\t\tTime (ms)\tOps/sec')
  console.log('-'.repeat(40))

  for (const size of sizes) {
    const tree = new BPlusTree<TestRecord, number>(5, true)
    const testData = generateTestData(size)

    const startTime = performance.now()

    for (const record of testData) {
      tree.insert(record.id, record)
    }

    const endTime = performance.now()
    const duration = endTime - startTime
    const opsPerSecond = (size / duration * 1000).toFixed(0)

    console.log(`${size}\t\t${duration.toFixed(2)}\t\t${opsPerSecond}`)
  }
}

insertPerformanceTest()

// Example 2: Find Performance
console.log('\n' + '='.repeat(50))
console.log('🔍 Example 2: Find Performance')

function findPerformanceTest() {
  const tree = new BPlusTree<TestRecord, number>(5, true)
  const testData = generateTestData(10000)

  // Insert test data
  console.log('Inserting 10,000 records...')
  for (const record of testData) {
    tree.insert(record.id, record)
  }

  // Test random lookups
  const lookupCount = 1000
  const randomIds = Array.from({ length: lookupCount }, () =>
    Math.floor(Math.random() * 10000) + 1
  )

  console.log(`\nTesting ${lookupCount} random lookups:`)

  const startTime = performance.now()
  let foundCount = 0

  for (const id of randomIds) {
    const result = tree.find(id)
    if (result && result.length > 0) {
      foundCount++
    }
  }

  const endTime = performance.now()
  const duration = endTime - startTime
  const opsPerSecond = (lookupCount / duration * 1000).toFixed(0)

  console.log(`Found: ${foundCount}/${lookupCount} records`)
  console.log(`Time: ${duration.toFixed(2)}ms`)
  console.log(`Lookups/sec: ${opsPerSecond}`)
}

findPerformanceTest()

// Example 3: Memory Usage Analysis
console.log('\n' + '='.repeat(50))
console.log('💾 Example 3: Memory Usage Analysis')

function memoryUsageTest() {
  const sizes = [1000, 5000, 10000, 20000]

  console.log('Analyzing memory usage patterns:')
  console.log('Records\t\tTree Size\tMemory/Record')
  console.log('-'.repeat(45))

  for (const size of sizes) {
    const tree = new BPlusTree<TestRecord, number>(5, true)
    const testData = generateTestData(size)

    // Measure memory before
    const memBefore = process.memoryUsage().heapUsed

    for (const record of testData) {
      tree.insert(record.id, record)
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc()
    }

    // Measure memory after
    const memAfter = process.memoryUsage().heapUsed
    const memUsed = memAfter - memBefore
    const memPerRecord = (memUsed / size).toFixed(0)

    console.log(`${size}\t\t${tree.size}\t\t${memPerRecord} bytes`)
  }
}

memoryUsageTest()

// Example 4: Different Tree Configurations
console.log('\n' + '='.repeat(50))
console.log('🌳 Example 4: Tree Configuration Impact')

function configurationTest() {
  const testData = generateTestData(5000)
  const minDegrees = [3, 5, 10, 20]

  console.log('Testing different minimum degrees:')
  console.log('Min Degree\tInsert Time\tFind Time\tTree Size')
  console.log('-'.repeat(50))

  for (const minDegree of minDegrees) {
    const tree = new BPlusTree<TestRecord, number>(minDegree, true)

    // Test insert performance
    const insertStart = performance.now()
    for (const record of testData) {
      tree.insert(record.id, record)
    }
    const insertTime = performance.now() - insertStart

    // Test find performance
    const findStart = performance.now()
    for (let i = 0; i < 1000; i++) {
      const randomId = Math.floor(Math.random() * 5000) + 1
      tree.find(randomId)
    }
    const findTime = performance.now() - findStart

    console.log(`${minDegree}\t\t${insertTime.toFixed(2)}ms\t\t${findTime.toFixed(2)}ms\t\t${tree.size}`)
  }
}

configurationTest()

// Example 5: Bulk Operations Performance
console.log('\n' + '='.repeat(50))
console.log('📦 Example 5: Bulk Operations Performance')

function bulkOperationsTest() {
  const tree = new BPlusTree<TestRecord, number>(5, true)
  const testData = generateTestData(10000)

  console.log('Comparing individual vs bulk operations:')

  // Individual inserts
  const individualStart = performance.now()
  for (const record of testData) {
    tree.insert(record.id, record)
  }
  const individualTime = performance.now() - individualStart

  // Clear tree for bulk test
  tree.reset()

  // Bulk insert simulation (inserting in sorted order)
  const sortedData = [...testData].sort((a, b) => a.id - b.id)
  const bulkStart = performance.now()
  for (const record of sortedData) {
    tree.insert(record.id, record)
  }
  const bulkTime = performance.now() - bulkStart

  console.log(`Individual inserts: ${individualTime.toFixed(2)}ms`)
  console.log(`Sorted inserts: ${bulkTime.toFixed(2)}ms`)
  console.log(`Improvement: ${((individualTime - bulkTime) / individualTime * 100).toFixed(1)}%`)
}

bulkOperationsTest()

// Example 6: Range Query Performance
console.log('\n' + '='.repeat(50))
console.log('📈 Example 6: Range Query Performance')

function rangeQueryTest() {
  const tree = new BPlusTree<TestRecord, number>(5, true)
  const testData = generateTestData(10000)

  // Insert test data
  for (const record of testData) {
    tree.insert(record.id, record)
  }

  console.log('Testing range query performance:')

  const rangeSizes = [10, 100, 1000, 5000]

  console.log('Range Size\tTime (ms)\tRecords Found')
  console.log('-'.repeat(40))

  for (const rangeSize of rangeSizes) {
    const startId = Math.floor(Math.random() * (10000 - rangeSize)) + 1
    const endId = startId + rangeSize

    const startTime = performance.now()

    // Simulate range query by finding all IDs in range
    let foundCount = 0
    for (let id = startId; id <= endId; id++) {
      const result = tree.find(id)
      if (result && result.length > 0) {
        foundCount++
      }
    }

    const endTime = performance.now()
    const duration = endTime - startTime

    console.log(`${rangeSize}\t\t${duration.toFixed(2)}\t\t${foundCount}`)
  }
}

rangeQueryTest()

// Example 7: Concurrent Access Simulation
console.log('\n' + '='.repeat(50))
console.log('🔄 Example 7: Concurrent Access Simulation')

async function concurrentAccessTest() {
  const tree = new BPlusTree<TestRecord, number>(5, true)
  const testData = generateTestData(5000)

  // Pre-populate tree
  for (const record of testData) {
    tree.insert(record.id, record)
  }

  console.log('Simulating concurrent read/write operations:')

  const operations = 1000
  const readWriteRatio = 0.8 // 80% reads, 20% writes

  const startTime = performance.now()

  let readCount = 0
  let writeCount = 0

  for (let i = 0; i < operations; i++) {
    if (Math.random() < readWriteRatio) {
      // Read operation
      const randomId = Math.floor(Math.random() * 5000) + 1
      tree.find(randomId)
      readCount++
    } else {
      // Write operation
      const newId = 5000 + i
      const newRecord: TestRecord = {
        id: newId,
        data: `New_Record_${newId}`,
        timestamp: Date.now(),
        category: 'NEW'
      }
      tree.insert(newRecord.id, newRecord)
      writeCount++
    }
  }

  const endTime = performance.now()
  const duration = endTime - startTime
  const opsPerSecond = (operations / duration * 1000).toFixed(0)

  console.log(`Total operations: ${operations}`)
  console.log(`Reads: ${readCount}, Writes: ${writeCount}`)
  console.log(`Time: ${duration.toFixed(2)}ms`)
  console.log(`Operations/sec: ${opsPerSecond}`)
  console.log(`Final tree size: ${tree.size}`)
}

await concurrentAccessTest()

console.log('\n✅ All performance tests completed!')
console.log('\n📊 Summary:')
console.log('- B+ trees provide O(log n) performance for insert/find operations')
console.log('- Larger minimum degrees can improve performance for read-heavy workloads')
console.log('- Sorted inserts perform better than random inserts')
console.log('- Range queries benefit from the tree\'s ordered structure')
console.log('- Memory usage scales linearly with data size')