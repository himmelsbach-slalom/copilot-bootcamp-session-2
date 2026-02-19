# Coding Guidelines

This document summarizes the coding style and quality principles for the To-Do app project. The goal is to keep the codebase clean, consistent, maintainable, and easy to evolve.

## Coding Style and Readability

- Write code for humans first: prioritize clarity over cleverness.
- Use descriptive names for files, functions, classes, variables, and constants.
- Keep functions and components focused on a single responsibility.
- Favor simple control flow and early returns to reduce nesting.
- Keep files cohesive and avoid mixing unrelated concerns.

## General Formatting Rules

- Use the project’s formatter and linter defaults as the source of truth.
- Keep indentation, spacing, and line wrapping consistent across the codebase.
- Use consistent naming conventions by language and framework conventions.
- Avoid commented-out code and stale TODO notes.
- Ensure markdown and documentation files use consistent heading and list structure.

## Import Organization

- Group imports in a consistent order:
  1. Standard library and platform modules
  2. Third-party dependencies
  3. Internal application modules
  4. Relative/local modules
- Keep one import group per block with a blank line between groups.
- Remove unused imports and avoid duplicate import paths.
- Prefer explicit imports over wildcard imports for readability and tooling support.

## Linting and Static Quality Checks

- Run linting locally before committing changes.
- Treat linter warnings as actionable quality signals, not optional noise.
- Use static checks to catch common errors early (unused code, bad patterns, inconsistent style).
- Keep linting configuration stable and aligned across frontend and backend.

## DRY and Reuse Principles

- Apply the DRY principle by extracting repeated logic into shared utilities.
- Avoid premature abstraction; refactor duplicated code once patterns are proven.
- Reuse existing helpers and components before adding new ones.
- Keep abstractions small, well-named, and well-tested.

## Error Handling and Validation

- Validate inputs at boundaries (UI forms, API endpoints, and service layers).
- Return clear, actionable error messages.
- Fail safely and avoid exposing internal details in user-facing errors.
- Log errors consistently to support debugging and operations.

## Testing and Quality Gates

- Add or update tests with every meaningful behavior change.
- Cover critical paths with unit and integration tests.
- Keep tests deterministic, isolated, and readable.
- Ensure CI quality gates pass before merging.

## SDLC and DevOps Best Practices

- Keep commits small and logically scoped with clear commit messages.
- Use pull requests with focused descriptions and reviewer-friendly diffs.
- Enforce CI checks for linting, tests, and build validation.
- Use branch protections and required reviews for mainline branches.
- Track technical debt items intentionally and resolve them incrementally.
- Keep dependencies up to date and monitor security advisories.

## Documentation and Maintainability

- Update documentation when behavior, architecture, or conventions change.
- Keep README and `docs/` references accurate and current.
- Prefer straightforward code patterns that future contributors can quickly understand.
- Refactor regularly to reduce complexity and preserve long-term maintainability.
