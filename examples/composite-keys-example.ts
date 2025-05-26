/**
 * Composite Keys Example
 *
 * This example demonstrates how to use composite keys (complex indexes)
 * with the B+ Tree library for multi-field indexing.
 */

import { BPlusTree, compare_keys_array } from '../src/index'

// Example 1: Employee database with composite object keys
interface Employee {
  id: number
  name: string
  department: string
  level: number
  salary: number
}

interface DepartmentLevelKey {
  department: string
  level: number
}

// Custom comparator for department-level composite key
const departmentLevelComparator = (a: DepartmentLevelKey, b: DepartmentLevelKey): number => {
  // Compare by department first
  if (a.department !== b.department) {
    return a.department.localeCompare(b.department)
  }
  // Then by level
  return a.level - b.level
}

// Example 2: Time series data with array keys
interface SensorReading {
  sensorId: string
  value: number
  timestamp: Date
}

// Example 3: Product catalog with object keys using custom comparator
interface Product {
  id: number
  name: string
  category: string
  brand: string
  price: number
}

interface CategoryBrandKey {
  category: string
  brand: string
}

export function compositeKeysExample() {
  console.log('🔗 Composite Keys Example\n')

  // 1. Employee Database with Custom Composite Keys
  console.log('1. Employee Database with Department-Level Index...')

  const employeeIndex = new BPlusTree<Employee, DepartmentLevelKey>(
    3,
    false, // Allow duplicates
    departmentLevelComparator
  )

  const employees: Employee[] = [
    { id: 1, name: 'Alice', department: 'Engineering', level: 3, salary: 95000 },
    { id: 2, name: 'Bob', department: 'Engineering', level: 2, salary: 75000 },
    { id: 3, name: 'Charlie', department: 'Marketing', level: 3, salary: 85000 },
    { id: 4, name: 'Diana', department: 'Engineering', level: 3, salary: 98000 }
  ]

  // Insert employees with composite keys
  employees.forEach(emp => {
    employeeIndex.insert({
      department: emp.department,
      level: emp.level
    }, emp)
  })

  console.log(`✅ Inserted ${employees.length} employees`)

  // Find employees by exact department and level
  const engineeringL3Key: DepartmentLevelKey = { department: 'Engineering', level: 3 }
  const engineeringL3Employees = employeeIndex.find(engineeringL3Key)
  console.log(`Engineering Level 3 employees: ${engineeringL3Employees.map(emp => emp.name).join(', ')}`)

  // 2. Time Series Data with Array Keys
  console.log('\n2. Time Series Data with Array Keys...')

  // Using array keys: [year, month, day, hour]
  const timeSeriesIndex = new BPlusTree<SensorReading, [number, number, number, number]>(
    3,
    false,
    compare_keys_array // Built-in array comparator
  )

  const readings: SensorReading[] = [
    {
      sensorId: 'temp-01',
      value: 23.5,
      timestamp: new Date('2024-01-15T10:30:00')
    },
    {
      sensorId: 'temp-02',
      value: 22.8,
      timestamp: new Date('2024-01-15T11:15:00')
    }
  ]

  // Insert readings with time-based array keys
  readings.forEach(reading => {
    const date = reading.timestamp
    const timeKey: [number, number, number, number] = [
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate(),
      date.getHours()
    ]
    timeSeriesIndex.insert(timeKey, reading)
  })

  console.log(`✅ Inserted ${readings.length} sensor readings`)

  // Find reading for specific time
  const searchTime: [number, number, number, number] = [2024, 1, 15, 10]
  const foundReadings = timeSeriesIndex.find(searchTime)
  if (foundReadings.length > 0) {
    console.log(`Reading for 2024-01-15 10:xx: ${foundReadings[0].sensorId} = ${foundReadings[0].value}°C`)
  } else {
    console.log('No reading found for 2024-01-15 10:xx')
  }

  // 3. Product Catalog with Object Keys
  console.log('\n3. Product Catalog with Category-Brand Index...')

  // Custom comparator for category-brand keys
  const categoryBrandComparator = (a: CategoryBrandKey, b: CategoryBrandKey): number => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category)
    }
    return a.brand.localeCompare(b.brand)
  }

  const productIndex = new BPlusTree<Product, CategoryBrandKey>(
    3,
    false,
    categoryBrandComparator
  )

  const products: Product[] = [
    { id: 1, name: 'iPhone 15', category: 'Electronics', brand: 'Apple', price: 999 },
    { id: 2, name: 'Galaxy S24', category: 'Electronics', brand: 'Samsung', price: 899 },
    { id: 3, name: 'Air Max', category: 'Shoes', brand: 'Nike', price: 129 }
  ]

  // Insert products with category-brand composite keys
  products.forEach(product => {
    productIndex.insert({
      category: product.category,
      brand: product.brand
    }, product)
  })

  console.log(`✅ Inserted ${products.length} products`)

  // Find product by category and brand
  const appleElectronicsKey: CategoryBrandKey = { category: 'Electronics', brand: 'Apple' }
  const appleProducts = productIndex.find(appleElectronicsKey)
  if (appleProducts.length > 0) {
    console.log(`Apple Electronics product: ${appleProducts[0].name} - $${appleProducts[0].price}`)
  } else {
    console.log('No Apple Electronics product found')
  }

  // 4. Statistics
  console.log('\n4. Index Statistics...')
  console.log(`Employee index size: ${employeeIndex.size}`)
  console.log(`Time series index size: ${timeSeriesIndex.size}`)
  console.log(`Product index size: ${productIndex.size}`)

  console.log('\n🎉 Composite Keys Example Complete!')
}

// Run the example if this file is executed directly
if (import.meta.main) {
  compositeKeysExample()
}