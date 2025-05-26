# Development Workflow Rules

## Core Principles

### Documentation and Tracking
- **Record all thoughts and ideas** that need verification in the current working file
- **Mark successful ideas** with ✅ and **failed ideas** with ❌
- **Never delete ideas** to avoid revisiting them in future sessions
- **Document progress** after each successful stage and move to the next step

### Testing Strategy
- **Verify new successful ideas don't break existing tests**
- **Ensure tests use actual implementations**, not stubs/mocks
- **If stubs are used temporarily** for implementation progress, remember to replace them with real functionality
- **Create high-granularity tests** and group them by functionality
- **Consider test dependencies** - don't break one test while fixing another

### Debugging Methodology
- **Before debugging complex tests**, perform manual tracing with expected results
- **Mark the step where errors occur** and save the trace log in a separate markdown file
- **Only then proceed** to debugging and fixing
- **Build dependency maps** based on failing tests during current test debugging
- **Track test execution sequence** to avoid breaking other tests

### Implementation Flow
1. Document current thoughts and verification needs
2. Mark ideas as successful ✅ or failed ❌
3. Verify new changes don't break existing functionality
4. Check tests use real implementations, not stubs
5. Fix any temporary stubs with actual functionality
6. Document successful stage completion
7. For complex debugging: trace manually → log → debug → fix
8. Create granular tests grouped by functionality
9. Build test dependency maps to prevent regressions

### Quality Assurance
- Always run full test suite after changes
- Maintain test independence where possible
- Document test dependencies when they exist
- Preserve working functionality while adding new features
- Keep detailed logs of debugging sessions for future reference

## File Organization
- Use dedicated markdown files for debugging traces
- Maintain progress documentation in implementation files
- Keep dependency maps updated as tests evolve
- Preserve failed attempt documentation for learning