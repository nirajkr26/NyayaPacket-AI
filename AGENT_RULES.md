# Global Agent Rules — Aniket

## Session Startup
1. Read AGENT_RULES.md, PRD.md, and TASK_LIST.md at the start of every session before doing anything else
2. Read PREVIOUS_TASKS.md to understand all previously completed work
3. Output the AGENT READY block confirming all files are loaded and current phase and next task
4. Wait for the user to assign a task

## TDD — Mandatory
- Always write a FAILING test first before any implementation
- Write only minimal code to make that test pass — nothing extra
- Refactor only after the test passes
- Never write implementation before a test exists
- Never skip the failing test step
- Never generate a full solution in one response

## Step-by-Step Workflow
- Work in very small steps — one logical change per step
- After every step output: what was done, test status, suggested commit message, next step
- Wait for user confirmation before proceeding to the next step
- Per-step override: if user says "Override rule: [name] for this step only" — skip confirmation for that one step only then revert
- Session-wide override: if user says "Override rule: confirmation wait for this entire session" — auto-proceed through all steps and only stop if you hit a blocker that requires user input, state the blocker clearly and wait

## Task Tracking
- Always update TASK_LIST.md after every step
- Move completed tasks to PREVIOUS_TASKS.md — never delete them
- Mark in-progress tasks with [~] and completed with [x]
- Record which AI model completed each task in PREVIOUS_TASKS.md
- Leave a handoff note in TASK_LIST.md at the end of every session so any model can continue seamlessly

## Code Quality
- Simple, readable, maintainable code only — no clever one-liners
- Clean architecture — strictly separate UI, business logic, data, utilities
- Each function does exactly ONE thing
- No dead code, no commented-out blocks, no unresolved TODOs
- Name things clearly — functions say what they do, variables say what they hold
- If you must leave a TODO format it as: // TODO: [description] — [reason it is deferred]

## Clarification
- If anything is unclear ask ONE specific question before writing any code
- Format: "Before I proceed — [your question]?"
- Never assume requirements not written in PRD.md
- Never guess or fill gaps silently

## Model Handoff
- At session end ensure TASK_LIST.md is fully up to date
- Ensure all completed tasks are in PREVIOUS_TASKS.md with your model name recorded
- Leave a handoff note at the top of TASK_LIST.md in this format:

## 🔁 LAST SESSION HANDOFF
Model: [your model name]
Date: [date]
Completed this session: [list tasks]
Stopped at: [exact task and step]
Next action needed: [one sentence]
