/**
 * Functional Queries and Operations Example
 *
 * This example demonstrates:
 * - Using direct tree methods for queries
 * - Range queries and cursors
 * - Complex data transformations
 * - Performance optimizations
 */

import { BPlusTree } from '../BPlusTree'

console.log('🔍 Functional Queries and Operations Example\n')

interface Employee {
  id: number
  name: string
  department: string
  salary: number
  age: number
  email: string
}

// Create employee database
const employees = new BPlusTree<Employee, number>(3, true)

// Sample employee data
const employeeData: Employee[] = [
  { id: 1, name: 'Alice Johnson', department: 'Engineering', salary: 95000, age: 28, email: 'alice@company.com' },
  { id: 2, name: 'Bob Smith', department: 'Marketing', salary: 65000, age: 34, email: 'bob@company.com' },
  { id: 3, name: 'Charlie Brown', department: 'Engineering', salary: 105000, age: 31, email: 'charlie@company.com' },
  { id: 4, name: 'Diana Prince', department: 'HR', salary: 75000, age: 29, email: 'diana@company.com' },
  { id: 5, name: 'Eve Wilson', department: 'Engineering', salary: 88000, age: 26, email: 'eve@company.com' },
  { id: 6, name: 'Frank Miller', department: 'Sales', salary: 72000, age: 35, email: 'frank@company.com' },
  { id: 7, name: 'Grace Lee', department: 'Marketing', salary: 68000, age: 27, email: 'grace@company.com' },
  { id: 8, name: 'Henry Davis', department: 'Engineering', salary: 92000, age: 30, email: 'henry@company.com' },
  { id: 9, name: 'Ivy Chen', department: 'HR', salary: 78000, age: 32, email: 'ivy@company.com' },
  { id: 10, name: 'Jack Wilson', department: 'Sales', salary: 85000, age: 28, email: 'jack@company.com' }
]

// Insert all employees
employeeData.forEach(emp => employees.insert(emp.id, emp))

console.log('👥 Total employees:', employees.size)

// Example 1: Basic Query Operations
console.log('\n' + '='.repeat(50))
console.log('📊 Example 1: Basic Query Operations')

function basicQueryExample() {
  // Get specific employees by ID and filter by salary
  const targetIds = [1, 3, 5, 7]
  const highSalaryEmployees: { id: number, name: string, department: string, salary: number }[] = []

  for (const id of targetIds) {
    const empList = employees.find(id)
    if (empList.length > 0) {
      const emp = empList[0]
      if (emp.salary > 70000) {
        highSalaryEmployees.push({
          id: emp.id,
          name: emp.name,
          department: emp.department,
          salary: emp.salary
        })
      }
    }
  }

  console.log('High-salary employees (IDs 1,3,5,7):')
  for (const emp of highSalaryEmployees) {
    console.log(`  ${emp.name} - ${emp.department} - $${emp.salary.toLocaleString()}`)
  }
}

basicQueryExample()

// Example 2: Department Analysis
console.log('\n' + '='.repeat(50))
console.log('🏢 Example 2: Department Analysis')

function departmentAnalysis() {
  // Group employees by department and calculate statistics
  const departmentStats = new Map<string, {
    department: string
    count: number
    totalSalary: number
    employees: string[]
  }>()

  const allEmployees = employees.list()

  for (const employee of allEmployees) {
    const dept = employee.department
    if (!departmentStats.has(dept)) {
      departmentStats.set(dept, {
        department: dept,
        count: 0,
        totalSalary: 0,
        employees: []
      })
    }

    const deptData = departmentStats.get(dept)!
    deptData.count++
    deptData.totalSalary += employee.salary
    deptData.employees.push(employee.name)
  }

  console.log('Department Statistics:')
  for (const [dept, stats] of departmentStats) {
    const avgSalary = stats.totalSalary / stats.count
    console.log(`\n  ${dept}:`)
    console.log(`    Employees: ${stats.count}`)
    console.log(`    Average Salary: $${avgSalary.toLocaleString()}`)
    console.log(`    Total Payroll: $${stats.totalSalary.toLocaleString()}`)
    console.log(`    Team: ${stats.employees.join(', ')}`)
  }
}

departmentAnalysis()

// Example 3: Range Queries
console.log('\n' + '='.repeat(50))
console.log('📈 Example 3: Range Queries')

function rangeQueryExample() {
  // Get employees with IDs in range 3-7
  const midRangeEmployees: { id: number, name: string, age: number, department: string }[] = []

  for (let id = 3; id <= 7; id++) {
    const empList = employees.find(id)
    if (empList.length > 0) {
      const emp = empList[0]
      midRangeEmployees.push({
        id: emp.id,
        name: emp.name,
        age: emp.age,
        department: emp.department
      })
    }
  }

  console.log('Employees with IDs 3-7:')
  for (const emp of midRangeEmployees) {
    console.log(`  ID ${emp.id}: ${emp.name} (${emp.age} years) - ${emp.department}`)
  }
}

rangeQueryExample()

// Example 4: Complex Filtering and Transformation
console.log('\n' + '='.repeat(50))
console.log('🎯 Example 4: Complex Filtering and Transformation')

function complexQueryExample() {
  // Find young, high-earning engineers and format their data
  const topYoungEngineers: {
    profile: string
    contact: string
    compensation: string
    seniority: string
  }[] = []

  const allEmployees = employees.list()

  for (const employee of allEmployees) {
    if (employee.department === 'Engineering' &&
        employee.age < 30 &&
        employee.salary > 85000) {
      topYoungEngineers.push({
        profile: `${employee.name} (${employee.age})`,
        contact: employee.email,
        compensation: `$${employee.salary.toLocaleString()}/year`,
        seniority: employee.age < 27 ? 'Junior' : 'Mid-level'
      })
    }
  }

  console.log('Top Young Engineers (< 30 years, > $85k):')
  for (const engineer of topYoungEngineers) {
    console.log(`  ${engineer.profile}`)
    console.log(`    Level: ${engineer.seniority}`)
    console.log(`    Salary: ${engineer.compensation}`)
    console.log(`    Email: ${engineer.contact}`)
    console.log()
  }
}

complexQueryExample()

// Example 5: Aggregation Operations
console.log('\n' + '='.repeat(50))
console.log('📊 Example 5: Aggregation Operations')

function aggregationExample() {
  // Calculate company-wide statistics
  const allEmployees = employees.list()

  const companyStats = {
    totalEmployees: 0,
    totalSalary: 0,
    totalAge: 0,
    salaryRanges: { low: 0, medium: 0, high: 0 },
    ageGroups: { young: 0, middle: 0, senior: 0 }
  }

  for (const employee of allEmployees) {
    companyStats.totalEmployees++
    companyStats.totalSalary += employee.salary
    companyStats.totalAge += employee.age

    // Track salary ranges
    if (employee.salary < 70000) companyStats.salaryRanges.low++
    else if (employee.salary < 90000) companyStats.salaryRanges.medium++
    else companyStats.salaryRanges.high++

    // Track age groups
    if (employee.age < 28) companyStats.ageGroups.young++
    else if (employee.age < 32) companyStats.ageGroups.middle++
    else companyStats.ageGroups.senior++
  }

  console.log('Company Statistics:')
  console.log(`  Total Employees: ${companyStats.totalEmployees}`)
  console.log(`  Average Salary: $${(companyStats.totalSalary / companyStats.totalEmployees).toLocaleString()}`)
  console.log(`  Average Age: ${(companyStats.totalAge / companyStats.totalEmployees).toFixed(1)} years`)

  console.log('\n  Salary Distribution:')
  console.log(`    < $70k: ${companyStats.salaryRanges.low} employees`)
  console.log(`    $70k-$90k: ${companyStats.salaryRanges.medium} employees`)
  console.log(`    > $90k: ${companyStats.salaryRanges.high} employees`)

  console.log('\n  Age Distribution:')
  console.log(`    < 28 years: ${companyStats.ageGroups.young} employees`)
  console.log(`    28-32 years: ${companyStats.ageGroups.middle} employees`)
  console.log(`    > 32 years: ${companyStats.ageGroups.senior} employees`)
}

aggregationExample()

// Example 6: Cursor-based Iteration
console.log('\n' + '='.repeat(50))
console.log('🔄 Example 6: Cursor-based Iteration')

function cursorExample() {
  console.log('Manual cursor iteration:')

  // Get cursor for employee ID 5
  const cursor = employees.cursor(5)
  let count = 0

  // Iterate through employees starting from ID 5
  let currentCursor = cursor
  while (!currentCursor.done && count < 3) {
    const employee = currentCursor.value
    console.log(`  ${employee.name} (ID: ${currentCursor.key}) - ${employee.department}`)

    // Move to next (simplified - in real implementation would use eval_next)
    count++
    if (count < 3) {
      const nextId = currentCursor.key + 1
      const nextEmpList = employees.find(nextId)
      if (nextEmpList.length > 0) {
        currentCursor = employees.cursor(nextId)
      } else {
        break
      }
    }
  }
}

cursorExample()

// Example 7: Performance Comparison
console.log('\n' + '='.repeat(50))
console.log('⚡ Example 7: Performance Comparison')

function performanceExample() {
  console.log('Performance test: Finding all Engineering employees')

  // Method 1: Using direct iteration
  const start1 = performance.now()
  const engineers1: string[] = []
  const allEmployees = employees.list()
  for (const employee of allEmployees) {
    if (employee.department === 'Engineering') {
      engineers1.push(employee.name)
    }
  }
  const time1 = performance.now() - start1

  // Method 2: Using individual find operations
  const start2 = performance.now()
  const engineers2: string[] = []
  for (let id = 1; id <= 10; id++) {
    const empList = employees.find(id)
    if (empList.length > 0) {
      const employee = empList[0]
      if (employee.department === 'Engineering') {
        engineers2.push(employee.name)
      }
    }
  }
  const time2 = performance.now() - start2

  console.log(`  Direct iteration: ${time1.toFixed(2)}ms (found ${engineers1.length} engineers)`)
  console.log(`  Individual finds: ${time2.toFixed(2)}ms (found ${engineers2.length} engineers)`)
  console.log(`  Results match: ${engineers1.length === engineers2.length}`)
}

performanceExample()

console.log('\n✅ All functional query examples completed!')