import { logError, logStep, loopInfo, workflowInfo } from '../utils/log.ts';
import {
  type BaseNodeParams,
  WorkflowNode,
} from '../types/workflow/WorkflowNode.ts';
import type { NodeRunParams } from '../types/workflow/Step.ts';
import { structuredDataToRawData } from '../types/workflow/StructuredData.ts';

export interface LoopNodeParams extends BaseNodeParams {
  childNode: WorkflowNode;
  arrayPath?: string; // Optional path to extract array from input (e.g., "data.items")
}

export interface LoopNodeRunParams extends NodeRunParams {
  childNode?: WorkflowNode;
  arrayPath?: string;
}

export class LoopNode extends WorkflowNode {
  public childNode: WorkflowNode;
  public arrayPath?: string;

  constructor(params: LoopNodeParams) {
    super(params);
    this.childNode = params.childNode;
    this.arrayPath = params.arrayPath;
  }

  async execute(params: NodeRunParams): Promise<{ results: any[] }> {
    try {
      const childNode =
        (params as LoopNodeRunParams).childNode || this.childNode;
      const arrayPath =
        (params as LoopNodeRunParams).arrayPath || this.arrayPath;

      if (!childNode) {
        throw new Error('LoopNode requires a childNode to execute');
      }

      // console.log('params.stepInput', params.stepInput);

      // Convert structured data to raw data first
      const rawInput = structuredDataToRawData(params.stepInput);

      // Extract array from input data
      let inputArray: any[];

      if (arrayPath) {
        // Navigate through object path (e.g., "data.items" -> rawInput.data.items)
        const pathParts = arrayPath.split('.');
        let current = rawInput;

        for (const part of pathParts) {
          if (current && typeof current === 'object' && part in current) {
            current = (current as any)[part];
          } else {
            throw new Error(
              `Array path '${arrayPath}' not found in input data`,
            );
          }
        }

        inputArray = current as any[];
      } else {
        // If no path specified, assume the entire stepInput is the array
        inputArray = rawInput as any;
      }

      if (!Array.isArray(inputArray)) {
        throw new Error(
          `Expected array but got ${typeof inputArray}${arrayPath ? ` at path '${arrayPath}'` : ''}`,
        );
      }

      loopInfo(`Starting to process ${inputArray.length} items sequentially`);

      const results: any[] = [];

      // Execute child node for each item in the array sequentially
      for (let i = 0; i < inputArray.length; i++) {
        const item = inputArray[i];

        loopInfo(
          `Processing item ${i + 1}/${inputArray.length} (${Math.round(((i + 1) / inputArray.length) * 100)}%)`,
        );

        // if (this.debug) {
        //   logStep(`LoopNode: Processing item ${i + 1}/${inputArray.length}`);
        // }

        try {
          // Create execution parameters for child node
          const childParams: NodeRunParams = {
            step: params.step,
            stepInput: item,
          };

          // Execute child node with current item
          const result = await childNode.execute(childParams);
          results.push(result);

          // if (this.debug) {
          //   logStep(`LoopNode: Completed item ${i + 1}/${inputArray.length}`);
          // }
        } catch (error) {
          logError(`LoopNode: Error processing item ${i + 1}:`, error);
          // Depending on requirements, you might want to:
          // 1. Continue with next item: results.push({ error: error.message });
          // 2. Stop execution: throw error;
          // For now, we'll stop execution on first error
          throw error;
        }
      }

      loopInfo(`LoopNode: Completed processing all ${inputArray.length} items`);
      return { results };
    } catch (err: unknown) {
      const error = err as Error;
      logError('Error in LoopNode:', error.message || String(error));
      console.error(error);
      process.exit(1);
    }
  }
}
