import { ZodType } from 'zod';
import { type RawData, type StructuredData } from './StructuredData.ts';
import type { InputSource } from './Input.ts';
import type { CodeNode } from '../../nodes/Code.ts';

/**
 * Interface base para todos os tipos de Step
 */
export interface BaseNodeParams {
  name?: string;
  inputSchema?: ZodType<I>;
  inputSource?: InputSource;
  inputDataObject?: RawData;
  inputData?: StructuredData<I>;
  outputSchema: ZodType<O>;
  introductionText?: string;
}

export interface NodeRunParams {
  step: BaseNodeParams;
  stepInput: StructuredData<any>;
}

// export function isCodeStep(step: Step): step is CodeNode {
//   return step.type === 'CodeStep';
// }

// Agent Step
export interface AgentStep extends BaseNodeParams {
  type: 'AgentStep';
  systemPrompt: string;
}

export function createAgentStep(params: Omit<AgentStep, 'type'>): AgentStep {
  return {
    ...params,
    type: 'AgentStep',
  };
}

export function isAgentStep(step: Step): step is AgentStep {
  return step.type === 'AgentStep';
}

/**
 * Union type que representa todos os tipos possíveis de Step
 */
export type Step<I = any, O = any> = AgentStep | CodeStep;

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
