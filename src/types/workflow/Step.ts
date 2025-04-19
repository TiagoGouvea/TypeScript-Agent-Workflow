import { ZodType } from 'zod';

/**
 * Enum para definir a fonte de entrada de um passo
 */
export enum InputSource {
  LastStep = 'LAST_STEP',
  UserInput = 'USER_INPUT',
  Global = 'GLOBAL',
  Mixed = 'MIXED',
}

/**
 * Interface base para todos os tipos de Step
 */
export interface BaseStep<I, O> {
  name: string;
  inputSchema: ZodType<I>;
  inputSource: InputSource;
  outputSchema: ZodType<O>;
  introductionText: string;
}

// Agent Step
export interface AgentStep<I, O> extends BaseStep<I, O> {
  type: 'AgentStep';
  systemPrompt: string;
  allowUserInteraction?: boolean;
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

// Code step
export interface CodeStep<I, O> extends BaseStep<I, O> {
  type: 'CodeStep';
  run: (input: I) => Promise<O>;
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
