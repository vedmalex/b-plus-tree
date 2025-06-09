# Style Guide

## Code Style Standards

### Language Standards
- **Primary Language**: TypeScript
- **Target Version**: TypeScript "next" (latest)
- **Strict Mode**: Enabled
- **Code Comments**: English only
- **Response Language**: Russian (as per user preferences)

### Formatting Rules
- **Indentation**: 2 spaces (no tabs)
- **Line Endings**: LF (Unix-style)
- **Trailing Commas**: Consistent with Biome configuration
- **Semicolons**: Required
- **Quotes**: Consistent (prefer single quotes for strings)

### Naming Conventions

#### Files and Directories
- **Files**: PascalCase for classes (`BPlusTree.ts`, `TransactionContext.ts`)
- **Utilities**: camelCase (`print_node.ts`, `methods.ts`)
- **Directories**: lowercase with hyphens (`memory-bank/`)

#### Code Elements
- **Classes**: PascalCase (`BPlusTree`, `TransactionContext`)
- **Interfaces**: PascalCase with 'I' prefix (`ITransactionContext`)
- **Types**: PascalCase (`ValueType`, `PortableNode`)
- **Functions**: camelCase (`serializeTree`, `deserializeTree`)
- **Variables**: camelCase (`nodeCount`, `transactionId`)
- **Constants**: UPPER_SNAKE_CASE (`DEBUG_BTREE`)

### TypeScript Conventions

#### Type Definitions
```typescript
// Prefer explicit type exports
export type { ValueType, PortableNode } from './Node'

// Use generic constraints appropriately
export class BPlusTree<T, K extends ValueType>

// Prefer interfaces for object shapes
export interface ITransactionContext {
  // ...
}
```

#### Import/Export Style
```typescript
// Named exports preferred
export { BPlusTree } from './BPlusTree'
export { Node } from './Node'

// Group related exports
export * from './query'
export * from './source'
export * from './eval'
```

### Documentation Standards

#### JSDoc Comments
- **Classes**: Full JSDoc with description and examples
- **Public Methods**: JSDoc with parameters and return types
- **Complex Logic**: Inline comments explaining algorithms
- **Type Definitions**: JSDoc for complex types

#### README Structure
- **Features**: Emoji-prefixed bullet points
- **Code Examples**: TypeScript with proper syntax highlighting
- **API Documentation**: Comprehensive with examples
- **Installation**: Multiple package managers supported

### Testing Standards

#### Test Organization
- **Location**: `src/test/` directory
- **Framework**: Vitest
- **Coverage**: 100% target
- **Naming**: `*.test.ts` suffix

#### Test Structure
```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should handle specific case', () => {
      // Test implementation
    })
  })
})
```

### Build Configuration

#### Multiple Formats
- **ESM**: `dist/index.esm.js`
- **CommonJS**: `dist/index.js`
- **TypeScript**: `src/index.ts` (for Bun)
- **Types**: `types/index.d.ts`

#### Package.json Structure
```json
{
  "exports": {
    ".": {
      "types": "./types/index.d.ts",
      "bun": "./src/index.ts",
      "import": "./dist/index.esm.js",
      "require": "./dist/index.js"
    }
  }
}
```

### Error Handling

#### Exception Safety
- **Strong Guarantee**: Operations succeed completely or leave state unchanged
- **Transaction Rollback**: Automatic cleanup on errors
- **Type Safety**: Compile-time error prevention

#### Error Messages
- **Descriptive**: Clear explanation of what went wrong
- **Actionable**: Suggest how to fix the issue
- **Consistent**: Standard format across the library

### Performance Guidelines

#### Memory Management
- **Copy-on-Write**: Minimize memory allocation
- **Structural Sharing**: Reuse immutable parts
- **Lazy Evaluation**: Defer computation until needed

#### Algorithm Efficiency
- **B+ Tree Operations**: O(log n) complexity maintained
- **Transaction Overhead**: Minimal impact on performance
- **Query Optimization**: Efficient execution plans

### Linting Configuration

#### Biome Settings
- **Formatter**: Biome (@biomejs/biome)
- **Rules**: Strict TypeScript rules enabled
- **Auto-fix**: Enabled for formatting issues
- **Integration**: VS Code and CI/CD pipeline

### Git Conventions

#### Commit Messages
- **Format**: Conventional commits preferred
- **Scope**: Component or feature area
- **Description**: Clear and concise

#### Branch Strategy
- **Main**: Production-ready code
- **Feature**: Feature development branches
- **Hotfix**: Critical bug fixes

### Package Management

#### Bun Configuration
- **Primary**: Bun for development and building
- **Compatibility**: npm/yarn for broader ecosystem support
- **Lock File**: `bun.lock` committed to repository