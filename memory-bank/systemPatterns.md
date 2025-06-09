# System Patterns

## Core Architecture

### Main Components
- **BPlusTree**: Core B+ tree implementation with transactional support
- **Node**: Tree node structure with serialization capabilities
- **TransactionContext**: Transaction management and savepoint support
- **Query System**: Functional query pipeline for data operations

### Design Patterns

#### 1. **Repository Pattern**
- `BPlusTree` acts as a repository for key-value data
- Provides CRUD operations with transactional guarantees
- Supports both in-memory and persistent storage

#### 2. **Transaction Pattern**
- `TransactionContext` manages transaction lifecycle
- Implements ACID properties
- Supports nested transactions via savepoints
- Two-Phase Commit (2PC) for distributed scenarios

#### 3. **Copy-on-Write (CoW) Pattern**
- Immutable data structures during transactions
- Efficient memory usage through structural sharing
- Snapshot isolation between concurrent transactions

#### 4. **Strategy Pattern**
- Pluggable comparator functions for different key types
- Support for primitive, array, and object key comparisons
- Customizable sorting and indexing strategies

#### 5. **Builder Pattern**
- Query system uses functional composition
- Chainable operations: `query().filter().map().reduce()`
- Lazy evaluation for performance optimization

#### 6. **Serialization Pattern**
- `PortableBPlusTree` and `PortableNode` for data persistence
- Utilities: `serializeTree`, `deserializeTree`, `createTreeFrom`
- Platform-independent data format

## Module Organization

### Core Modules
```
src/
├── BPlusTree.ts        # Main tree implementation
├── Node.ts             # Node structure and serialization
├── TransactionContext.ts # Transaction management
├── methods.ts          # Core operations and comparators
└── index.ts           # Public API exports
```

### Query System
```
src/
├── query.ts           # Query pipeline entry point
├── source.ts          # Data source functions
├── eval.ts            # Query evaluation engine
├── actions.ts         # Action operations (remove, etc.)
└── types.ts           # Type definitions
```

### Utilities
```
src/
├── BPlusTreeUtils.ts  # Serialization utilities
├── logger.ts          # Logging system
├── debug.ts           # Debug utilities
└── print_node.ts      # Tree visualization
```

## Data Flow Patterns

### 1. **Transaction Flow**
```
Start Transaction → Operations → Validation → Commit/Rollback
                 ↓
              Savepoints → Nested Operations → Rollback to Savepoint
```

### 2. **Query Flow**
```
Source → Filter → Transform → Aggregate → Execute
```

### 3. **Persistence Flow**
```
In-Memory Tree → Serialize → Storage → Deserialize → Restore Tree
```

## Concurrency Patterns

### 1. **Snapshot Isolation**
- Each transaction sees a consistent snapshot
- No dirty reads or phantom reads
- Optimistic concurrency control

### 2. **Copy-on-Write**
- Modifications create new versions
- Original data remains unchanged
- Efficient memory usage through sharing

### 3. **Two-Phase Commit**
- Prepare phase: validate all operations
- Commit phase: apply all changes atomically
- Supports distributed transactions

## Error Handling Patterns

### 1. **Exception Safety**
- Strong exception safety guarantee
- Operations either succeed completely or leave state unchanged
- Automatic cleanup on transaction abort

### 2. **Validation Pattern**
- Pre-validation before operations
- Type checking at compile time
- Runtime validation for data integrity

## Performance Patterns

### 1. **Lazy Evaluation**
- Query operations are not executed until needed
- Efficient memory usage
- Optimized execution plans

### 2. **Structural Sharing**
- Immutable data structures share common parts
- Reduced memory footprint
- Fast copy operations

### 3. **Batch Operations**
- Multiple operations in single transaction
- Reduced overhead
- Better performance for bulk operations