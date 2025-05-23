import { ZodType } from 'zod';
import type { InputSource } from './Input.ts';
import type { RawData, StructuredData } from './StructuredData.ts';
import type { NodeRunParams } from './Step.ts';

export interface BaseNodeParams {
  name?: string;
  inputSchema?: ZodType;
  inputSource?: InputSource;
  inputObject?: Object;
  inputData?: StructuredData;
  outputSchema: ZodType;
  introductionText?: string;
  allowHumanResponse?: boolean;
  debug?: boolean;
}

export class WorkflowNode {
  public name?: string;
  public inputSchema?: ZodType;
  public inputSource?: InputSource;
  public inputObject?: Object;
  // public inputStructuredData?: StructuredData;
  public outputSchema!: ZodType;
  public introductionText?: string;
  public allowHumanResponse?: boolean = false;
  public debug?: boolean = false;

  constructor(params: any) {
    Object.assign(this, params);
  }

  async execute(params: NodeRunParams): Promise<any> {
    throw new Error('Not implemented');
  }
}
