/**
 * Mixed Sort Order Example
 *
 * This example demonstrates how to create composite keys with mixed sort orders
 * (some fields ascending, others descending) for complex sorting requirements.
 */

import { BPlusTree } from '../src/index'

// Example 1: Employee ranking system
interface Employee {
  id: number
  name: string
  department: string
  salary: number
  joinDate: Date
  performance: number
}

interface EmployeeRankingKey {
  department: string  // ASC - alphabetical order
  salary: number      // DESC - highest salary first
  joinDate: Date      // ASC - senior employees first
}

// Mixed sort comparator: department ASC, salary DESC, joinDate ASC
const employeeRankingComparator = (a: EmployeeRankingKey, b: EmployeeRankingKey): number => {
  // 1. Department ascending (A-Z)
  if (a.department !== b.department) {
    return a.department.localeCompare(b.department)
  }

  // 2. Salary descending (highest first)
  if (a.salary !== b.salary) {
    return b.salary - a.salary // Reverse order for DESC
  }

  // 3. Join date ascending (senior employees first)
  return a.joinDate.getTime() - b.joinDate.getTime()
}

// Example 2: Product catalog with priority sorting
interface Product {
  id: number
  name: string
  category: string
  price: number
  rating: number
  inStock: boolean
  releaseDate: Date
}

interface ProductSortKey {
  category: string    // ASC - alphabetical
  inStock: boolean    // DESC - in stock items first
  rating: number      // DESC - highest rated first
  price: number       // ASC - cheapest first within same rating
}

const productSortComparator = (a: ProductSortKey, b: ProductSortKey): number => {
  // 1. Category ascending
  if (a.category !== b.category) {
    return a.category.localeCompare(b.category)
  }

  // 2. In stock descending (true > false)
  if (a.inStock !== b.inStock) {
    return b.inStock ? 1 : -1
  }

  // 3. Rating descending (5 stars > 1 star)
  if (a.rating !== b.rating) {
    return b.rating - a.rating
  }

  // 4. Price ascending (cheaper first)
  return a.price - b.price
}

// Example 3: Event scheduling with complex priorities
interface Event {
  id: number
  title: string
  priority: 'high' | 'medium' | 'low'
  startTime: Date
  duration: number
  isUrgent: boolean
}

interface EventScheduleKey {
  priority: string    // Custom order: high > medium > low
  isUrgent: boolean   // DESC - urgent first
  startTime: Date     // ASC - chronological order
  duration: number    // ASC - shorter events first
}

const eventScheduleComparator = (a: EventScheduleKey, b: EventScheduleKey): number => {
  // 1. Priority custom order
  const priorityOrder = { 'high': 1, 'medium': 2, 'low': 3 }
  const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder]
  const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder]

  if (aPriority !== bPriority) {
    return aPriority - bPriority
  }

  // 2. Urgent descending (urgent first)
  if (a.isUrgent !== b.isUrgent) {
    return b.isUrgent ? 1 : -1
  }

  // 3. Start time ascending (chronological)
  if (a.startTime.getTime() !== b.startTime.getTime()) {
    return a.startTime.getTime() - b.startTime.getTime()
  }

  // 4. Duration ascending (shorter first)
  return a.duration - b.duration
}

// Example 4: Version management with stability priority
interface SoftwareVersion {
  id: number
  name: string
  major: number
  minor: number
  patch: number
  isStable: boolean
  releaseDate: Date
  downloads: number
}

interface VersionKey {
  isStable: boolean   // DESC - stable versions first
  major: number       // DESC - latest major first
  minor: number       // DESC - latest minor first
  patch: number       // DESC - latest patch first
}

const versionComparator = (a: VersionKey, b: VersionKey): number => {
  // 1. Stability descending (stable first)
  if (a.isStable !== b.isStable) {
    return b.isStable ? 1 : -1
  }

  // 2. Major version descending
  if (a.major !== b.major) {
    return b.major - a.major
  }

  // 3. Minor version descending
  if (a.minor !== b.minor) {
    return b.minor - a.minor
  }

  // 4. Patch version descending
  return b.patch - a.patch
}

export function mixedSortExample() {
  console.log('🔀 Mixed Sort Order Example\n')

  // 1. Employee Ranking System
  console.log('1. Employee Ranking (Dept ASC, Salary DESC, JoinDate ASC)...')

  const employeeRanking = new BPlusTree<Employee, EmployeeRankingKey>(
    3,
    false,
    employeeRankingComparator
  )

  const employees: Employee[] = [
    {
      id: 1,
      name: 'Alice Johnson',
      department: 'Engineering',
      salary: 120000,
      joinDate: new Date('2020-01-15'),
      performance: 95
    },
    {
      id: 2,
      name: 'Bob Smith',
      department: 'Engineering',
      salary: 110000,
      joinDate: new Date('2019-03-10'),
      performance: 88
    },
    {
      id: 3,
      name: 'Charlie Brown',
      department: 'Engineering',
      salary: 120000,
      joinDate: new Date('2021-06-01'),
      performance: 92
    },
    {
      id: 4,
      name: 'Diana Prince',
      department: 'Marketing',
      salary: 95000,
      joinDate: new Date('2020-08-15'),
      performance: 90
    },
    {
      id: 5,
      name: 'Eve Wilson',
      department: 'Marketing',
      salary: 85000,
      joinDate: new Date('2018-12-01'),
      performance: 87
    }
  ]

  employees.forEach(emp => {
    employeeRanking.insert({
      department: emp.department,
      salary: emp.salary,
      joinDate: emp.joinDate
    }, emp)
  })

  console.log('Employee ranking order:')
  const allEmployees = employeeRanking.list()
  allEmployees.forEach((emp, index) => {
    console.log(`${index + 1}. ${emp.department} - ${emp.name} - $${emp.salary} - ${emp.joinDate.getFullYear()}`)
  })

  // 2. Product Catalog Sorting
  console.log('\n2. Product Catalog (Category ASC, InStock DESC, Rating DESC, Price ASC)...')

  const productCatalog = new BPlusTree<Product, ProductSortKey>(
    3,
    false,
    productSortComparator
  )

  const products: Product[] = [
    {
      id: 1,
      name: 'iPhone 15',
      category: 'Electronics',
      price: 999,
      rating: 4.8,
      inStock: true,
      releaseDate: new Date('2023-09-15')
    },
    {
      id: 2,
      name: 'iPhone 14',
      category: 'Electronics',
      price: 799,
      rating: 4.8,
      inStock: false,
      releaseDate: new Date('2022-09-15')
    },
    {
      id: 3,
      name: 'Samsung Galaxy S24',
      category: 'Electronics',
      price: 899,
      rating: 4.6,
      inStock: true,
      releaseDate: new Date('2024-01-15')
    },
    {
      id: 4,
      name: 'Running Shoes',
      category: 'Apparel',
      price: 129,
      rating: 4.5,
      inStock: true,
      releaseDate: new Date('2023-03-01')
    },
    {
      id: 5,
      name: 'Winter Jacket',
      category: 'Apparel',
      price: 199,
      rating: 4.5,
      inStock: false,
      releaseDate: new Date('2023-10-01')
    }
  ]

  products.forEach(product => {
    productCatalog.insert({
      category: product.category,
      inStock: product.inStock,
      rating: product.rating,
      price: product.price
    }, product)
  })

  console.log('Product catalog order:')
  const allProducts = productCatalog.list()
  allProducts.forEach((product, index) => {
    const stockStatus = product.inStock ? '✅' : '❌'
    console.log(`${index + 1}. ${product.category} - ${product.name} - ${stockStatus} - ⭐${product.rating} - $${product.price}`)
  })

  // 3. Event Scheduling
  console.log('\n3. Event Scheduling (Priority Custom, Urgent DESC, Time ASC, Duration ASC)...')

  const eventSchedule = new BPlusTree<Event, EventScheduleKey>(
    3,
    false,
    eventScheduleComparator
  )

  const events: Event[] = [
    {
      id: 1,
      title: 'Team Meeting',
      priority: 'medium',
      startTime: new Date('2024-01-15T10:00:00'),
      duration: 60,
      isUrgent: false
    },
    {
      id: 2,
      title: 'Client Presentation',
      priority: 'high',
      startTime: new Date('2024-01-15T14:00:00'),
      duration: 90,
      isUrgent: true
    },
    {
      id: 3,
      title: 'Code Review',
      priority: 'high',
      startTime: new Date('2024-01-15T09:00:00'),
      duration: 45,
      isUrgent: false
    },
    {
      id: 4,
      title: 'Lunch Break',
      priority: 'low',
      startTime: new Date('2024-01-15T12:00:00'),
      duration: 60,
      isUrgent: false
    },
    {
      id: 5,
      title: 'Emergency Fix',
      priority: 'high',
      startTime: new Date('2024-01-15T09:00:00'),
      duration: 30,
      isUrgent: true
    }
  ]

  events.forEach(event => {
    eventSchedule.insert({
      priority: event.priority,
      isUrgent: event.isUrgent,
      startTime: event.startTime,
      duration: event.duration
    }, event)
  })

  console.log('Event schedule order:')
  const allEvents = eventSchedule.list()
  allEvents.forEach((event, index) => {
    const urgentFlag = event.isUrgent ? '🚨' : '📅'
    const time = event.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    console.log(`${index + 1}. ${urgentFlag} ${event.priority.toUpperCase()} - ${event.title} - ${time} (${event.duration}min)`)
  })

  // 4. Version Management
  console.log('\n4. Version Management (Stable DESC, Major DESC, Minor DESC, Patch DESC)...')

  const versionManager = new BPlusTree<SoftwareVersion, VersionKey>(
    3,
    false,
    versionComparator
  )

  const versions: SoftwareVersion[] = [
    {
      id: 1,
      name: 'v2.1.0',
      major: 2,
      minor: 1,
      patch: 0,
      isStable: true,
      releaseDate: new Date('2024-01-15'),
      downloads: 10000
    },
    {
      id: 2,
      name: 'v2.2.0-beta',
      major: 2,
      minor: 2,
      patch: 0,
      isStable: false,
      releaseDate: new Date('2024-02-01'),
      downloads: 500
    },
    {
      id: 3,
      name: 'v2.0.5',
      major: 2,
      minor: 0,
      patch: 5,
      isStable: true,
      releaseDate: new Date('2023-12-01'),
      downloads: 15000
    },
    {
      id: 4,
      name: 'v2.1.1-beta',
      major: 2,
      minor: 1,
      patch: 1,
      isStable: false,
      releaseDate: new Date('2024-01-20'),
      downloads: 200
    },
    {
      id: 5,
      name: 'v1.9.9',
      major: 1,
      minor: 9,
      patch: 9,
      isStable: true,
      releaseDate: new Date('2023-11-01'),
      downloads: 25000
    }
  ]

  versions.forEach(version => {
    versionManager.insert({
      isStable: version.isStable,
      major: version.major,
      minor: version.minor,
      patch: version.patch
    }, version)
  })

  console.log('Version order:')
  const allVersions = versionManager.list()
  allVersions.forEach((version, index) => {
    const stability = version.isStable ? '🟢 STABLE' : '🟡 BETA'
    console.log(`${index + 1}. ${version.name} - ${stability} - ${version.downloads} downloads`)
  })

  // 5. Statistics
  console.log('\n5. Index Statistics...')
  console.log(`Employee ranking index size: ${employeeRanking.size}`)
  console.log(`Product catalog index size: ${productCatalog.size}`)
  console.log(`Event schedule index size: ${eventSchedule.size}`)
  console.log(`Version manager index size: ${versionManager.size}`)

  console.log('\n🎉 Mixed Sort Order Example Complete!')
}

// Run the example if this file is executed directly
if (import.meta.main) {
  mixedSortExample()
}
