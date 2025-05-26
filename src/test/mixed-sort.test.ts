/**
 * Mixed Sort Order Tests
 *
 * Tests for composite keys with mixed sort orders (ASC/DESC combinations)
 */

import { describe, it, expect } from 'bun:test'
import { BPlusTree } from '../index'

// Test data structures
interface Employee {
  id: number
  name: string
  department: string
  salary: number
  joinDate: Date
}

interface EmployeeKey {
  department: string  // ASC
  salary: number      // DESC
  joinDate: Date      // ASC
}

interface Product {
  id: number
  name: string
  category: string
  price: number
  rating: number
  inStock: boolean
}

interface ProductKey {
  category: string    // ASC
  inStock: boolean    // DESC (true > false)
  rating: number      // DESC
  price: number       // ASC
}

interface Event {
  id: number
  title: string
  priority: 'high' | 'medium' | 'low'
  isUrgent: boolean
  startTime: Date
}

interface EventKey {
  priority: string    // Custom order: high > medium > low
  isUrgent: boolean   // DESC
  startTime: Date     // ASC
}

// Comparators
const employeeComparator = (a: EmployeeKey, b: EmployeeKey): number => {
  if (a.department !== b.department) {
    return a.department.localeCompare(b.department) // ASC
  }
  if (a.salary !== b.salary) {
    return b.salary - a.salary // DESC
  }
  return a.joinDate.getTime() - b.joinDate.getTime() // ASC
}

const productComparator = (a: ProductKey, b: ProductKey): number => {
  if (a.category !== b.category) {
    return a.category.localeCompare(b.category) // ASC
  }
  if (a.inStock !== b.inStock) {
    return b.inStock ? 1 : -1 // DESC (true > false)
  }
  if (a.rating !== b.rating) {
    return b.rating - a.rating // DESC
  }
  return a.price - b.price // ASC
}

const eventComparator = (a: EventKey, b: EventKey): number => {
  const priorityOrder = { 'high': 1, 'medium': 2, 'low': 3 }
  const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder]
  const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder]

  if (aPriority !== bPriority) {
    return aPriority - bPriority
  }
  if (a.isUrgent !== b.isUrgent) {
    return b.isUrgent ? 1 : -1 // DESC
  }
  return a.startTime.getTime() - b.startTime.getTime() // ASC
}

describe('Mixed Sort Order Tests', () => {
  describe('Employee Ranking (Dept ASC, Salary DESC, JoinDate ASC)', () => {
    it('should sort employees correctly with mixed order', () => {
      const tree = new BPlusTree<Employee, EmployeeKey>(3, false, employeeComparator)

      const employees: Employee[] = [
        {
          id: 1,
          name: 'Alice',
          department: 'Engineering',
          salary: 120000,
          joinDate: new Date('2020-01-15')
        },
        {
          id: 2,
          name: 'Bob',
          department: 'Engineering',
          salary: 110000,
          joinDate: new Date('2019-03-10')
        },
        {
          id: 3,
          name: 'Charlie',
          department: 'Engineering',
          salary: 120000,
          joinDate: new Date('2021-06-01')
        },
        {
          id: 4,
          name: 'Diana',
          department: 'Marketing',
          salary: 95000,
          joinDate: new Date('2020-08-15')
        },
        {
          id: 5,
          name: 'Eve',
          department: 'Marketing',
          salary: 85000,
          joinDate: new Date('2018-12-01')
        }
      ]

      // Insert employees
      employees.forEach(emp => {
        tree.insert({
          department: emp.department,
          salary: emp.salary,
          joinDate: emp.joinDate
        }, emp)
      })

      // Get sorted list
      const sorted = tree.list()

      // Expected order:
      // 1. Engineering, Alice, $120000, 2020-01-15 (dept ASC, salary DESC, date ASC)
      // 2. Engineering, Charlie, $120000, 2021-06-01 (same dept/salary, later date)
      // 3. Engineering, Bob, $110000, 2019-03-10 (same dept, lower salary)
      // 4. Marketing, Diana, $95000, 2020-08-15 (dept ASC)
      // 5. Marketing, Eve, $85000, 2018-12-01 (same dept, lower salary)

      expect(sorted).toHaveLength(5)
      expect(sorted[0].name).toBe('Alice')
      expect(sorted[1].name).toBe('Charlie')
      expect(sorted[2].name).toBe('Bob')
      expect(sorted[3].name).toBe('Diana')
      expect(sorted[4].name).toBe('Eve')
    })

    it('should handle same department and salary with different join dates', () => {
      const tree = new BPlusTree<Employee, EmployeeKey>(3, false, employeeComparator)

      const employees: Employee[] = [
        {
          id: 1,
          name: 'Senior',
          department: 'Engineering',
          salary: 100000,
          joinDate: new Date('2018-01-01')
        },
        {
          id: 2,
          name: 'Junior',
          department: 'Engineering',
          salary: 100000,
          joinDate: new Date('2022-01-01')
        }
      ]

      employees.forEach(emp => {
        tree.insert({
          department: emp.department,
          salary: emp.salary,
          joinDate: emp.joinDate
        }, emp)
      })

      const sorted = tree.list()
      expect(sorted[0].name).toBe('Senior') // Earlier join date first
      expect(sorted[1].name).toBe('Junior')
    })
  })

  describe('Product Catalog (Category ASC, InStock DESC, Rating DESC, Price ASC)', () => {
    it('should sort products correctly with mixed order', () => {
      const tree = new BPlusTree<Product, ProductKey>(3, false, productComparator)

      const products: Product[] = [
        {
          id: 1,
          name: 'iPhone 15',
          category: 'Electronics',
          price: 999,
          rating: 4.8,
          inStock: true
        },
        {
          id: 2,
          name: 'iPhone 14',
          category: 'Electronics',
          price: 799,
          rating: 4.8,
          inStock: false
        },
        {
          id: 3,
          name: 'Samsung Galaxy',
          category: 'Electronics',
          price: 899,
          rating: 4.6,
          inStock: true
        },
        {
          id: 4,
          name: 'Running Shoes',
          category: 'Apparel',
          price: 129,
          rating: 4.5,
          inStock: true
        },
        {
          id: 5,
          name: 'Winter Jacket',
          category: 'Apparel',
          price: 199,
          rating: 4.5,
          inStock: false
        }
      ]

      products.forEach(product => {
        tree.insert({
          category: product.category,
          inStock: product.inStock,
          rating: product.rating,
          price: product.price
        }, product)
      })

      const sorted = tree.list()

      // Expected order:
      // 1. Apparel, Running Shoes, true, 4.5, $129
      // 2. Apparel, Winter Jacket, false, 4.5, $199
      // 3. Electronics, iPhone 15, true, 4.8, $999
      // 4. Electronics, Samsung Galaxy, true, 4.6, $899
      // 5. Electronics, iPhone 14, false, 4.8, $799

      expect(sorted).toHaveLength(5)
      expect(sorted[0].name).toBe('Running Shoes') // Apparel, in stock
      expect(sorted[1].name).toBe('Winter Jacket') // Apparel, out of stock
      expect(sorted[2].name).toBe('iPhone 15') // Electronics, in stock, highest rating
      expect(sorted[3].name).toBe('Samsung Galaxy') // Electronics, in stock, lower rating
      expect(sorted[4].name).toBe('iPhone 14') // Electronics, out of stock
    })

    it('should prioritize in-stock items within same category', () => {
      const tree = new BPlusTree<Product, ProductKey>(3, false, productComparator)

      const products: Product[] = [
        {
          id: 1,
          name: 'Out of Stock Item',
          category: 'Electronics',
          price: 100,
          rating: 5.0,
          inStock: false
        },
        {
          id: 2,
          name: 'In Stock Item',
          category: 'Electronics',
          price: 200,
          rating: 4.0,
          inStock: true
        }
      ]

      products.forEach(product => {
        tree.insert({
          category: product.category,
          inStock: product.inStock,
          rating: product.rating,
          price: product.price
        }, product)
      })

      const sorted = tree.list()
      expect(sorted[0].name).toBe('In Stock Item') // In stock comes first despite lower rating
      expect(sorted[1].name).toBe('Out of Stock Item')
    })
  })

  describe('Event Scheduling (Priority Custom, Urgent DESC, Time ASC)', () => {
    it('should sort events correctly with custom priority order', () => {
      const tree = new BPlusTree<Event, EventKey>(3, false, eventComparator)

      const events: Event[] = [
        {
          id: 1,
          title: 'Team Meeting',
          priority: 'medium',
          isUrgent: false,
          startTime: new Date('2024-01-15T10:00:00')
        },
        {
          id: 2,
          title: 'Client Presentation',
          priority: 'high',
          isUrgent: true,
          startTime: new Date('2024-01-15T14:00:00')
        },
        {
          id: 3,
          title: 'Code Review',
          priority: 'high',
          isUrgent: false,
          startTime: new Date('2024-01-15T09:00:00')
        },
        {
          id: 4,
          title: 'Lunch Break',
          priority: 'low',
          isUrgent: false,
          startTime: new Date('2024-01-15T12:00:00')
        },
        {
          id: 5,
          title: 'Emergency Fix',
          priority: 'high',
          isUrgent: true,
          startTime: new Date('2024-01-15T08:00:00')
        }
      ]

      events.forEach(event => {
        tree.insert({
          priority: event.priority,
          isUrgent: event.isUrgent,
          startTime: event.startTime
        }, event)
      })

      const sorted = tree.list()

      // Expected order:
      // 1. Emergency Fix (high, urgent, 08:00)
      // 2. Client Presentation (high, urgent, 14:00)
      // 3. Code Review (high, not urgent, 09:00)
      // 4. Team Meeting (medium, not urgent, 10:00)
      // 5. Lunch Break (low, not urgent, 12:00)

      expect(sorted).toHaveLength(5)
      expect(sorted[0].title).toBe('Emergency Fix')
      expect(sorted[1].title).toBe('Client Presentation')
      expect(sorted[2].title).toBe('Code Review')
      expect(sorted[3].title).toBe('Team Meeting')
      expect(sorted[4].title).toBe('Lunch Break')
    })

    it('should sort by time within same priority and urgency', () => {
      const tree = new BPlusTree<Event, EventKey>(3, false, eventComparator)

      const events: Event[] = [
        {
          id: 1,
          title: 'Late Meeting',
          priority: 'high',
          isUrgent: true,
          startTime: new Date('2024-01-15T15:00:00')
        },
        {
          id: 2,
          title: 'Early Meeting',
          priority: 'high',
          isUrgent: true,
          startTime: new Date('2024-01-15T09:00:00')
        }
      ]

      events.forEach(event => {
        tree.insert({
          priority: event.priority,
          isUrgent: event.isUrgent,
          startTime: event.startTime
        }, event)
      })

      const sorted = tree.list()
      expect(sorted[0].title).toBe('Early Meeting') // Earlier time first
      expect(sorted[1].title).toBe('Late Meeting')
    })
  })

  describe('Complex Mixed Sort Scenarios', () => {
    it('should handle boolean fields in mixed sort correctly', () => {
      interface TestItem {
        id: number
        name: string
        isActive: boolean
        priority: number
      }

      interface TestKey {
        isActive: boolean  // DESC (true > false)
        priority: number   // ASC (1, 2, 3...)
      }

      const comparator = (a: TestKey, b: TestKey): number => {
        if (a.isActive !== b.isActive) {
          return b.isActive ? 1 : -1 // DESC
        }
        return a.priority - b.priority // ASC
      }

      const tree = new BPlusTree<TestItem, TestKey>(3, false, comparator)

      const items: TestItem[] = [
        { id: 1, name: 'Inactive High', isActive: false, priority: 1 },
        { id: 2, name: 'Active High', isActive: true, priority: 1 },
        { id: 3, name: 'Active Low', isActive: true, priority: 3 },
        { id: 4, name: 'Inactive Low', isActive: false, priority: 3 }
      ]

      items.forEach(item => {
        tree.insert({
          isActive: item.isActive,
          priority: item.priority
        }, item)
      })

      const sorted = tree.list()

      // Expected order: active items first, then by priority ASC
      expect(sorted[0].name).toBe('Active High')   // true, 1
      expect(sorted[1].name).toBe('Active Low')    // true, 3
      expect(sorted[2].name).toBe('Inactive High') // false, 1
      expect(sorted[3].name).toBe('Inactive Low')  // false, 3
    })

    it('should handle date fields in mixed sort correctly', () => {
      interface TimeItem {
        id: number
        name: string
        category: string
        timestamp: Date
      }

      interface TimeKey {
        category: string  // ASC
        timestamp: Date   // DESC (newest first)
      }

      const comparator = (a: TimeKey, b: TimeKey): number => {
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category) // ASC
        }
        return b.timestamp.getTime() - a.timestamp.getTime() // DESC
      }

      const tree = new BPlusTree<TimeItem, TimeKey>(3, false, comparator)

      const items: TimeItem[] = [
        {
          id: 1,
          name: 'Old A',
          category: 'A',
          timestamp: new Date('2023-01-01')
        },
        {
          id: 2,
          name: 'New A',
          category: 'A',
          timestamp: new Date('2024-01-01')
        },
        {
          id: 3,
          name: 'Old B',
          category: 'B',
          timestamp: new Date('2023-01-01')
        },
        {
          id: 4,
          name: 'New B',
          category: 'B',
          timestamp: new Date('2024-01-01')
        }
      ]

      items.forEach(item => {
        tree.insert({
          category: item.category,
          timestamp: item.timestamp
        }, item)
      })

      const sorted = tree.list()

      // Expected order: category ASC, then timestamp DESC
      expect(sorted[0].name).toBe('New A')  // A, 2024
      expect(sorted[1].name).toBe('Old A')  // A, 2023
      expect(sorted[2].name).toBe('New B')  // B, 2024
      expect(sorted[3].name).toBe('Old B')  // B, 2023
    })
  })

  describe('Performance with Mixed Sort', () => {
    it('should maintain O(log n) performance with complex mixed sort', () => {
      const tree = new BPlusTree<Employee, EmployeeKey>(3, false, employeeComparator)

      // Insert 1000 employees with mixed sort
      const startTime = performance.now()

      for (let i = 0; i < 1000; i++) {
        const employee: Employee = {
          id: i,
          name: `Employee ${i}`,
          department: ['Engineering', 'Marketing', 'Sales'][i % 3],
          salary: 50000 + (i % 100) * 1000,
          joinDate: new Date(2020 + (i % 5), (i % 12), 1)
        }

        tree.insert({
          department: employee.department,
          salary: employee.salary,
          joinDate: employee.joinDate
        }, employee)
      }

      const insertTime = performance.now() - startTime

      // Verify sorting is correct
      const sorted = tree.list()
      expect(sorted).toHaveLength(1000)

      // Check that sorting is maintained
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1]
        const curr = sorted[i]

        const comparison = employeeComparator({
          department: prev.department,
          salary: prev.salary,
          joinDate: prev.joinDate
        }, {
          department: curr.department,
          salary: curr.salary,
          joinDate: curr.joinDate
        })

        expect(comparison).toBeLessThanOrEqual(0) // Previous should be <= current
      }

      // Performance should be reasonable (< 100ms for 1000 items)
      expect(insertTime).toBeLessThan(100)
    })
  })
})