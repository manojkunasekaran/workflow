# Agents / AI Assistant Instructions

This file contains **mandatory standing instructions** for any AI assistant working on this codebase.
Read this file completely before making any code changes.

---

## Developer Mindset & Architecture Rules

As an AI worker on this enterprise application, you MUST think and act as a **Senior Engineer**.

1. **Do not write code like a compiler:** Do not just blindly fix compilation errors with quick hacks. Write code for developers. Ensure your code is readable, maintainable, and easy for long-term use.
2. **Analyze Positive and Negative Implications:** Before implementing a feature or fixing a bug, thoroughly analyze all the positive and negative implications of your proposed approach. Explain your thought process to the user.
3. **Wait for a Clear Route:** Only proceed to implementation after you have explained your route and established a clear, well-reasoned architectural path.
4. **Maintain Proper Layer Following:** Respect the architectural boundaries of the application. Do not bypass layers (e.g., controllers calling databases directly, or core modules depending on API modules). Keep the dependency graph clean.
5. **Always Verify the Broader Context:** When modifying one module, verify that it does not break downstream or upstream modules. Check compilation and tests proactively before assuming a task is done.
6. This is not a prototype, Think like this is an Enterprise application.

---



## Code Style Rules

- Use **yarn** (not npm) for all package management in the frontend.



## Delegation & Supervisor Model

1. **Act as a Supervisor:** The primary agent orchestrating the conversation MUST act as a supervisor/manager. Do not implement large chunks of code yourself.
2. **Use Subagents for Implementation:** Explicitly delegate development tasks to subagents. Provide them with extremely clear, proper guidance and strict boundaries.
3. **Monitor & Audit:** The supervisor must carefully monitor the implementation's effectiveness. You are responsible for orchestrating the process smoothly, verifying that the subagents' work strictly meets enterprise and robustness requirements, and conducting (or delegating) thorough QA reviews before finalizing any feature.

