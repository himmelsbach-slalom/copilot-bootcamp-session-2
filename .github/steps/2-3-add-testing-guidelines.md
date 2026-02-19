# Step 2-3: Add Testing Guidelines

## Goal
Document clear testing guidelines for the TODO app to ensure code quality and reliability across the project. **Note:** there will be another session later on that will focus in much more depth on testing with AI. For now, just focus on defining your testing strategy!

## Instructions

#### :keyboard: Activity: Ask Copilot to create testing guidelines

1. Open the **Copilot** chat panel and switch to **Agent** mode using the dropdown menu.
2. Instruct Copilot to create a new file at `docs/testing-guidelines.md` with your testing principles, for example: require the app to include unit test, integration and end-to-end tests, specify that all new features should include appropriate tests and that the tests should be maintainable.
3. Ask Copilot to update `copilot-instructions.md` to reference the new `testing-guidelines.md` file.
4. Commit and push your changes.

#### Success Criteria
- `docs/testing-guidelines.md` exists and contains a summary of `testing-practices.md` plus the requirements for unit, integration, and end-to-end testing.
- `copilot-instructions.md` is updated to reference `testing-guidelines.md`.

If you encounter any issues, you can:
- Review that `docs/testing-guidelines.md` was created and `copilot-instructions.md` was updated
- Double-check that your changes were pushed to the `feature/context` branch
- Ask Copilot to fix specific problems

## Why?
Clear testing guidelines help all contributors maintain high code quality, catch bugs early, and ensure the application works as intended.
