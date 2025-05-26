/**
 * Complete Usage Example - Demonstrates all major exports from b-plus-tree
 *
 * This example shows how to use:
 * - Core B+ Tree functionality
 * - Serialization utilities
 * - Transaction support with 2PC
 * - Query system
 * - Type safety
 */

import {
  // Core classes
  BPlusTree,
  TransactionContext,

  // Serialization utilities
  serializeTree,
  deserializeTree,
  createTreeFrom,

  // Query system
  query,
  map,
  filter,
  reduce,

  // Source functions
  sourceRange,
  sourceEq,

  // Utility functions
  compare_keys_primitive,

  // Types
  type ValueType,
  type Comparator,
  type PortableBPlusTree
} from '../src/index';

// Example data types
interface Employee {
  id: number;
  name: string;
  department: string;
  salary: number;
  joinDate: Date;
}

interface Department {
  id: string;
  name: string;
  budget: number;
}

export async function completeUsageExample() {
  console.log('🌳 Complete B+ Tree Usage Example\n');

  // 1. Create trees with different configurations
  console.log('1. Creating B+ Trees...');

  // Primary index (unique keys)
  const employeeById = new BPlusTree<Employee, number>(3, true);

  // Secondary index (non-unique keys for salary ranges)
  const employeeBySalary = new BPlusTree<Employee, number>(3, false);

  // Department lookup with string keys
  const departmentByCode = new BPlusTree<Department, string>(3, true);

  console.log('✅ Created 3 different B+ trees');

  // 2. Insert sample data
  console.log('\n2. Inserting sample data...');

  const employees: Employee[] = [
    { id: 1, name: 'Alice Johnson', department: 'ENG', salary: 95000, joinDate: new Date('2020-01-15') },
    { id: 2, name: 'Bob Smith', department: 'MKT', salary: 75000, joinDate: new Date('2021-03-10') },
    { id: 3, name: 'Charlie Brown', department: 'ENG', salary: 105000, joinDate: new Date('2019-08-22') },
    { id: 4, name: 'Diana Prince', department: 'HR', salary: 85000, joinDate: new Date('2022-01-05') },
    { id: 5, name: 'Eve Wilson', department: 'ENG', salary: 95000, joinDate: new Date('2020-11-30') }
  ];

  const departments: Department[] = [
    { id: 'ENG', name: 'Engineering', budget: 2000000 },
    { id: 'MKT', name: 'Marketing', budget: 800000 },
    { id: 'HR', name: 'Human Resources', budget: 500000 }
  ];

  // Insert employees into both indexes
  employees.forEach(emp => {
    employeeById.insert(emp.id, emp);
    employeeBySalary.insert(emp.salary, emp);
  });

  // Insert departments
  departments.forEach(dept => {
    departmentByCode.insert(dept.id, dept);
  });

  console.log(`✅ Inserted ${employees.length} employees and ${departments.length} departments`);

  // 3. Basic queries
  console.log('\n3. Basic queries...');

    const alice = employeeById.find(1);
  console.log(`Employee #1: ${alice?.[0]?.name || 'Not found'}`);

  const highEarners = employeeBySalary.find(95000);
  console.log(`Employees earning $95,000: ${highEarners.length} found`);

  const engineering = departmentByCode.find('ENG');
  console.log(`Engineering department budget: $${engineering?.[0]?.budget.toLocaleString() || 'Not found'}`);

  // 4. Advanced queries using query system
  console.log('\n4. Advanced queries...');

  const seniorEngineers = await query(
    employeeById.range(1, 10),
    filter(([id, emp]) => emp.department === 'ENG' && emp.salary > 90000),
    map(([id, emp]) => ({ ...emp, seniority: new Date().getFullYear() - emp.joinDate.getFullYear() })),
    reduce((acc, emp) => {
      acc.push(emp);
      return acc;
    }, [] as Array<Employee & { seniority: number }>)
  )(employeeById);

  console.log(`✅ Found ${Array.isArray(seniorEngineers) ? seniorEngineers.length : 'async'} senior engineers`);

  // 5. Transactions
  console.log('\n5. Transaction operations...');

  const txCtx = new TransactionContext(employeeById);

  // Add new employee in transaction
  const newEmployee: Employee = {
    id: 6,
    name: 'Frank Miller',
    department: 'ENG',
    salary: 110000,
    joinDate: new Date()
  };

  employeeById.insert_in_transaction(newEmployee.id, newEmployee, txCtx);

  // Verify it's visible in transaction but not in main tree
  const inTransaction = employeeById.get_all_in_transaction(6, txCtx);
  const inMainTree = employeeById.find(6);

  console.log(`In transaction: ${inTransaction.length > 0 ? 'visible' : 'not visible'}`);
  console.log(`In main tree: ${inMainTree ? 'visible' : 'not visible'}`);

  await txCtx.commit();
  const afterCommit = employeeById.find(6);
  console.log(`After commit: ${afterCommit && afterCommit.length > 0 ? 'visible' : 'not visible'} in main tree`);

  // 6. Two-Phase Commit (2PC)
  console.log('\n6. Two-Phase Commit...');

  const tx2pc = new TransactionContext(employeeById);

  // Simulate distributed transaction
  employeeById.insert_in_transaction(7, {
    id: 7,
    name: 'Grace Hopper',
    department: 'ENG',
    salary: 120000,
    joinDate: new Date()
  }, tx2pc);

  // Phase 1: Prepare
  await tx2pc.prepareCommit();
  console.log('✅ Phase 1 (prepare) completed');

  // Phase 2: Finalize
  await tx2pc.finalizeCommit();
  console.log('✅ Phase 2 (finalize) completed');

  console.log(`Final employee count: ${employeeById.size}`);

  // 7. Serialization and persistence
  console.log('\n7. Serialization...');

  const serialized = serializeTree(employeeById);
  console.log(`Serialized tree: ${serialized.nodes.length} nodes, ${serialized.t} min degree`);

  // Create backup tree
  const backupTree = createTreeFrom<Employee, number>(serialized);
  console.log(`Backup tree created: ${backupTree.size} employees`);

  // Restore into new tree
  const restoredTree = new BPlusTree<Employee, number>();
  deserializeTree(restoredTree, serialized);
  console.log(`Restored tree: ${restoredTree.size} employees`);

  // 8. Type safety demonstration
  console.log('\n8. Type safety...');

  // Custom comparator
  const customComparator: Comparator<number> = (a, b) => (a ?? 0) - (b ?? 0);
  const customTree = new BPlusTree<string, number>(3, true, customComparator);

  // Portable tree type
  const portableData: PortableBPlusTree<Employee, number> = serialized;

  // Value type constraint
  const validKey: ValueType = 42; // number, string, or boolean only

  console.log('✅ All types are properly constrained and safe');

  // 9. Performance and statistics
  console.log('\n9. Performance statistics...');

  const stats = {
    employeeTreeSize: employeeById.size,
    salaryIndexSize: employeeBySalary.size,
    departmentTreeSize: departmentByCode.size,
    totalNodes: employeeById.nodes.size + employeeBySalary.nodes.size + departmentByCode.nodes.size,
    minDegree: employeeById.t,
    allowsDuplicates: !employeeById.unique
  };

  console.log('📊 Final Statistics:');
  Object.entries(stats).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}`);
  });

  // 10. Cleanup and validation
  console.log('\n10. Validation...');

  // Verify data integrity
  const allEmployees = employeeById.list();
  const uniqueIds = new Set(allEmployees.map((emp) => emp.id));

  console.log(`✅ Data integrity: ${allEmployees.length} employees, ${uniqueIds.size} unique IDs`);
  console.log(`✅ Tree structure: ${employeeById.nodes.size} nodes`);

  console.log('\n🎉 Complete usage example finished successfully!');

  return {
    employeeCount: employeeById.size,
    departmentCount: departmentByCode.size,
    nodeCount: employeeById.nodes.size,
    serializedSize: serialized.nodes.length
  };
}

// Export for use in other examples
export { Employee, Department };

// Run example if this file is executed directly
if (require.main === module) {
  completeUsageExample()
    .then(result => {
      console.log('\n📈 Final Results:', result);
    })
    .catch(console.error);
}