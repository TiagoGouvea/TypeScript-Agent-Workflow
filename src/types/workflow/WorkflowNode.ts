import { ZodType } from 'zod';
import { type NodeRunParams } from './Step';
import type { InputSource } from './Input.ts';
import type { RawData, StructuredData } from './StructuredData.ts';

export class WorkflowNode<I = any, O = any> {
  public name?: string;
  public inputSchema?: ZodType<I>;
  public inputSource?: InputSource;
  public inputDataObject?: RawData;
  public inputData?: StructuredData<I>;
  public outputSchema!: ZodType<O>;
  public introductionText?: string;

  constructor(params: any) {
    Object.assign(this, params);
  }

  async execute(params: NodeRunParams): Promise<any> {
    throw new Error('Not implemented');
  }
}

export interface BaseNodeParams {
  name?: string;
  inputSchema?: ZodType<I>;
  inputSource?: InputSource;
  inputDataObject?: RawData;
  inputData?: StructuredData<I>;
  outputSchema: ZodType<O>;
  introductionText?: string;
}
