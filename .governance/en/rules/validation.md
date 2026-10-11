# Validation and Evidence

### VAL-001 — Level 0: inspection

Review code, configuration and diffs without claiming runtime checks.

### VAL-002 — Level 1: syntax / compile

Run parser, compiler or syntax checks and report their limited scope.

### VAL-003 — Level 2: static analysis

Only report lint, type or import analysis as passed when actually run.

### VAL-004 — Level 3: unit tests

Use isolated tests and add regression coverage where practical.

### VAL-005 — Level 4: integration tests

Verify interactions across components, configuration and resources.

### VAL-006 — Level 5: smoke tests

Exercise the smallest usable startup, basic operation and shutdown path.

### VAL-007 — Level 6: real environment

Only claim external-service or hardware validation after actual execution.

### VAL-008 — Regression coverage

Check impacted existing APIs, configuration and lifecycle paths.

### VAL-009 — Never weaken tests for green CI

Do not remove meaningful tests or relax assertions simply to pass.

### VAL-010 — Precise validation reporting

Report executed commands, outcomes, scope and remaining gaps.
