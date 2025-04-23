import { type StructuredData } from './StructuredData.ts';
import type { BaseNodeParams } from './WorkflowNode.ts';

export interface NodeRunParams {
  step: BaseNodeParams;
  stepInput: StructuredData<any>;
}

// export function isCodeStep(step: Step): step is CodeNode {
//   return step.type === 'CodeStep';
// }

/**
 * Union type que representa todos os tipos possíveis de Step
 */
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
