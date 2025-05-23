import { logError } from '../utils/log.ts';
import {
  type BaseNodeParams,
  WorkflowNode,
} from '../types/workflow/WorkflowNode.ts';
import type { NodeRunParams } from '../types/workflow/Step.ts';

export interface CodeNodeParams extends BaseNodeParams {
  run: (params: CodeNodeRunParams) => Promise<any>;
}

export interface CodeNodeRunParams extends NodeRunParams {}

export class CodeNode extends WorkflowNode {
  public run: (params: CodeNodeRunParams) => Promise<any>;

  constructor(params: CodeNodeParams) {
    super(params);
    this.run = params.run;
  }

  async execute(params: NodeRunParams): Promise<any> {
    try {
      // console.log('params1', params);
      return await this.run(params);
    } catch (err: any) {
      logError('Error calling the model:', err.message || err);
      console.error(err);
      process.exit(1);
    }
  }
}
