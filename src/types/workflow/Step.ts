import { ZodType } from 'zod';
import { type RawData, type StructuredData } from './StructuredData.ts';
import type { InputSource } from './Input.ts';

/**
 * Interface base para todos os tipos de Step
 */
export interface BaseStep<I, O> {
  name?: string;
  inputSchema?: ZodType<I>;
  inputSource?: InputSource;
  inputDataObject?: RawData;
  inputData?: StructuredData<I>;
  outputSchema: ZodType<O>;
  introductionText?: string;
}

// Agent Step
export interface AgentStep<I, O> extends BaseStep<I, O> {
  type: 'AgentStep';
  systemPrompt: string;
}

export function createAgentStep<I, O>(
  params: Omit<AgentStep<I, O>, 'type'>,
): AgentStep<I, O> {
  return {
    ...params,
    type: 'AgentStep',
  };
}

export function isAgentStep<I, O>(step: Step<I, O>): step is AgentStep<I, O> {
  return step.type === 'AgentStep';
}

type CodeStepRunParams = {
  step: CodeStep<any, any>;
  stepInput: StructuredData<any>;
};

// Code step
export interface CodeStep<I, O> extends BaseStep<I, O> {
  type: 'CodeStep';
  run: (params: CodeStepRunParams) => Promise<O>;
}

export function createCodeStep<I, O>(
  params: Omit<CodeStep<I, O>, 'type'>,
): CodeStep<I, O> {
  return {
    ...params,
    type: 'CodeStep',
  };
}

export function isCodeStep<I, O>(step: Step<I, O>): step is CodeStep<I, O> {
  return step.type === 'CodeStep';
}

/**
 * Union type que representa todos os tipos possíveis de Step
 */
export type Step<I = any, O = any> = AgentStep<I, O> | CodeStep<I, O>;

export interface StepResult<Input = any, Output = any> {
  stepId: string; // identificador único do step
  input: Input;
  output: Output;
  status: 'success' | 'error' | 'pending';
  error?: string | Error; // mensagem de erro caso ocorra
  logs?: string[]; // logs ou mensagens geradas durante o step
  startedAt?: Date | string;
  finishedAt?: Date | string;

  [key: string]: any; // para extensibilidade futura
}
