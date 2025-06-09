# Development Prompt Rules

## Quick Reference for AI Assistant

### Documentation Protocol
- Record all ideas in working file with ✅/❌ markers
- Never delete ideas (avoid revisiting failed approaches)
- Document progress after each successful stage

### Testing Protocol
- Verify new changes don't break existing tests
- Replace stubs with real implementations
- Create granular tests grouped by functionality
- Map test dependencies to prevent regressions

### Debugging Protocol
1. Manual trace with expected results first
2. Log trace in separate markdown file
3. Mark error step location
4. Then debug and fix
5. Build dependency maps from failing tests

### Implementation Checklist
- [ ] Document current thoughts/verification needs
- [ ] Mark ideas as ✅ successful or ❌ failed
- [ ] Verify no existing test breakage
- [ ] Check tests use real implementations (not stubs)
- [ ] Replace any temporary stubs
- [ ] Document stage completion
- [ ] For complex bugs: trace → log → debug → fix
- [ ] Create granular tests by functionality
- [ ] Update test dependency maps

### Quality Gates
- Run full test suite after changes
- Maintain test independence where possible
- Document test dependencies when they exist
- Preserve working functionality during development