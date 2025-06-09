# Technical Context

## Technology Stack
- **Language**: TypeScript (next version)
- **Runtime**: Bun (primary), Node.js (supported)
- **Package Manager**: Bun
- **Build Tools**:
  - ESBuild (for bundling)
  - TypeScript Compiler (for type definitions)
  - Bun (for TypeScript builds)

## Build Configuration
- **Multiple Formats**: ESM, CommonJS, TypeScript source
- **Entry Points**:
  - Main: `./dist/index.js` (CommonJS)
  - Import: `./dist/index.esm.js` (ESM)
  - Bun: `./src/index.ts` (TypeScript source)
  - Types: `./types/index.d.ts`

## Testing Framework
- **Primary**: Vitest
- **Coverage**: @vitest/coverage-c8
- **Test Count**: 373/373 passing
- **Coverage**: 100%

## Development Tools
- **Linter**: Biome (@biomejs/biome)
- **Type Checking**: TypeScript
- **Benchmarking**: benchmark package
- **File Watching**: chokidar

## Dependencies
- **Runtime**: Zero dependencies
- **Development**:
  - TypeScript toolchain
  - Testing framework (Vitest)
  - Build tools (ESBuild)
  - Linting (Biome)

## Platform Support
- **Primary**: macOS (current development environment)
- **Supported**: Linux, Windows
- **Node.js**: 18+ (inferred from @types/node)

## Architecture Patterns
- **Data Structure**: B+ Tree
- **Transaction Model**: ACID compliance
- **Concurrency**: Copy-on-Write (CoW)
- **Distributed**: Two-Phase Commit (2PC)
- **Isolation**: Snapshot isolation
- **Persistence**: Serialization support