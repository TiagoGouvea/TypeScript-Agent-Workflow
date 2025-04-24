# TypeScript Agent Workflow

A TypeScript framework for building and orchestrating AI agent workflows. This project provides a structured way to create multi-step workflows with AI agents, allowing for both automated processes and interactive user experiences.

## Features

- **Workflow Orchestration**: Define and execute multi-step workflows with clear input/output schemas
- **Agent Steps**: Create AI-powered steps that can interact with users or run autonomously
- **Type Safety**: Fully typed with TypeScript for better developer experience and code reliability
- **Schema Validation**: Uses Zod for runtime type validation of inputs and outputs
- **Flexible Input Sources**: Configure steps to receive input from previous steps, global state, or user interaction

## Installation

```bash
git clone https://github.com/TiagoGouvea/TypeScript-Agent-Workflow.git
cd TypeScript-Agent-Workflow
nvm install
nvm use
yarn
echo "OPENAI_API_KEY=your_api_key_goes_here" > .env
```

## Usage

### Running the Project

You can see all agencies and workflow and select one running:
```bash
yarn start
```
This will display a list of available agencies and workflows that you can choose to run.

Or you can run a specific workflow:
```bash
yarn start --workflow=agentTest
```

### Creating a Workflow

Here's an example of how to create a simple workflow:

```typescript
import { z } from 'zod';
import { createAgentStep, InputSource } from "../../types/workflow/Step.ts";
import { Workflow } from "../../types/workflow/Workflow.ts";

// Step 1: Create a character
const agentTest = createAgentStep({
  name: 'Create a character',
  introductionText: 'I will create a character',
  inputSchema: z.object({
    subject: z
      .string()
      .min(1, 'Title is required')
      .describe('Some details about how the character should be'),
  }),
  inputSource: InputSource.UserInput,
  outputSchema: z.object({
    name: z.string(),
    age: z.number(),
    gender: z.string(),
    description: z.string(),
    traits: z.array(z.string()),
    backstory: z.string(),
    goal: z.string(),
    objectives: z.array(z.string()),
  }),
  systemPrompt: `Create a character`,
});

// Step 2: Write a story with the character
const writeStory = createAgentStep({
  name: 'Write a story',
  introductionText: 'I will write a story',
  inputSchema: agentTest.outputSchema,
  inputSource: InputSource.LastStep,
  outputSchema: z
    .string()
    .describe('A one-paragraph story with the character'),
  systemPrompt: `Create a story`,
});

// Create the workflow with the defined steps
export const myWorkflow = new Workflow({ agentTest, writeStory });
```

### Project Structure

- `src/types/workflow/`: Core workflow types and classes
- `src/_workflows/`: Workflow definitions
- `src/_agencies/`: Agency definitions
- `src/utils/`: Utility functions
- `src/llm/`: LLM integration code


## Exemples

- `/src/_workflows/createCharacter/` Simpler - Two steps workflow with user input on the firs step, with LLM interaction on both steps.
- `/src/_workflows/dailyNews/` Simpler - Two steps workflow with user input on the firs step, with LLM interaction on both steps.

## Architecture

The framework is built around these key concepts:

1. **Step**: A single unit of work with defined input and output schemas
2. **Workflow**: A collection of steps that are executed in sequence
3. **InputSource**: Defines where a step gets its input (previous step, user input, etc.)
4. **Agent Step**: A specialized step that uses an AI model to process inputs and generate outputs

## License

ISC

## Author

Tiago Gouvêa









