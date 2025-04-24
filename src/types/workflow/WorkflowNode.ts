import { ZodType } from 'zod';
import type { InputSource } from './Input.ts';
import type { RawData, StructuredData } from './StructuredData.ts';
import type { NodeRunParams } from './Step.ts';

export interface BaseNodeParams {
  name?: string;
  inputSchema?: ZodType;
  inputSource?: InputSource;
  inputDataObject?: RawData;
  inputData?: StructuredData;
  outputSchema: ZodType;
  introductionText?: string;
  allowHumanResponse?: boolean;
}

export class WorkflowNode {
  public name?: string;
  public inputSchema?: ZodType;
  public inputSource?: InputSource;
  public inputDataObject?: RawData;
  public inputData?: StructuredData;
  public outputSchema!: ZodType;
  public introductionText?: string;
  public allowHumanResponse?: boolean = false;

  constructor(params: any) {
    Object.assign(this, params);
  }

  async execute(params: NodeRunParams): Promise<any> {
    throw new Error('Not implemented');
  }
}
