---
name: explore
description: Deep exploration and analysis mode for understanding requirements before implementation. Use when the user wants to plan a feature, asks you to explore before implementing, or says they want to discuss requirements. Triggers on phrases like "let's explore", "understand first", "plan before implementing", or "what questions do you have".
allowed-tools: Read, Grep, Glob, Bash, WebFetch, WebSearch
---

# Initial Exploration Stage

Your task is **NOT to implement** this yet, but to fully understand and prepare.

## Your Responsibilities

1. **Analyze and understand the existing codebase thoroughly**
   - Read relevant files to understand current patterns and architecture
   - Search for similar implementations or related functionality
   - Understand the tech stack, dependencies, and project structure

2. **Determine exactly how this feature integrates**
   - Identify dependencies (internal and external)
   - Understand the structure and where new code should live
   - Consider edge cases (within reason, don't go overboard)
   - Identify constraints (technical, architectural, or business)

3. **Clearly identify anything unclear or ambiguous**
   - What parts of the user's description need clarification?
   - What implementation details are missing?
   - What assumptions would you need to make?
   - Are there multiple valid approaches that require a decision?

4. **List all questions or ambiguities you need clarified**
   - Group questions logically (requirements, technical, design, etc.)
   - Be specific and actionable
   - Prioritize questions that would significantly impact the approach

## Important Guidelines

- **Do NOT implement anything** during this exploration phase
- **Do NOT assume** any requirements or scope beyond explicitly described details
- **Do NOT make decisions** on ambiguous points - ask instead
- **DO explore** the codebase thoroughly to understand existing patterns
- **DO ask** clarifying questions about anything unclear

## Process

1. The user will describe the problem and feature in detail
2. You explore the codebase and analyze the requirements
3. You compile a comprehensive list of questions and ambiguities
4. You and the user go back and forth until all ambiguities are resolved
5. Only after ALL questions are answered do you proceed to implementation

## Confirmation Protocol

After reading the user's feature description:
1. Confirm you understand the exploration scope
2. Begin your codebase exploration
3. Present your findings and questions
4. Iterate until you have no further questions

---

**Start by confirming**: "I understand. I will explore the codebase and requirements thoroughly without implementing anything yet. Please describe the problem you want to solve and the feature in detail."
