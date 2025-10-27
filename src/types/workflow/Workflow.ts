import { agentSays, logDebug, workflowInfo } from '../../utils/log.ts';
import {
  type RawData,
  type StructuredData,
  structuredDataToRawData,
  rawDataObjectToStructuredData,
} from './StructuredData.ts';
import { getStepInput, InputSource } from './Input.ts';
import type { WorkflowNode } from './WorkflowNode.ts';
import { ZodObject } from 'zod';
import { WorkflowStepLogger } from '../../utils/workflowLogger.ts';

export interface WorkflowOptions {
  name?: string;
  logger?: WorkflowStepLogger;
}

export interface ExecuteOptions {
  logger?: WorkflowStepLogger;
  runLabel?: string;
}

/**
 * Motor de orquestração de steps.
 */
export class Workflow {
  steps: Record<string, WorkflowNode>;
  lastStepResult: StructuredData<any> = {};
  globalState: Record<string, { input: any; output: any }> = {};
  private name: string;
  private logger: WorkflowStepLogger;

  constructor(steps: Record<string, WorkflowNode>, options: WorkflowOptions = {}) {
    this.steps = steps;
    this.name = options.name ?? 'workflow';
    this.logger = options.logger ?? new WorkflowStepLogger();
  }

  /**
   * Executa todos os steps em sequência.
   * @param initial dado inicial que será passado para o primeiro step
   * @returns resultado final após todos os steps
   */
  async execute(options: ExecuteOptions = {}): Promise<any> {
    const stepKeys = Object.keys(this.steps) as (keyof typeof this.steps)[];
    let lastStepResult: StructuredData<any> = {};
    const activeLogger = options.logger ?? this.logger;
    const runLabel = options.runLabel ?? new Date().toISOString().replace(/[:.]/g, '-');

    this.globalState = {};
    this.lastStepResult = {} as StructuredData<any>;

    try {
      activeLogger.startRun(this.name, runLabel);

      for (let index = 0; index < stepKeys.length; index++) {
        const stepNumber = index + 1;
        const stepKey = stepKeys[index];
      const stepNode: WorkflowNode = this.steps[stepKey];
      workflowInfo(
        'Step ' +
          stepNumber +
          ' - ' +
          (stepNode.name ? stepNode.name : stepKey),
      );
      let stepResult: any;
      let stepInput: any;

      //////// Validate step
      this.validateStep(stepNode);

      ////// Introduction
      if (stepNode.introductionText) agentSays(stepNode.introductionText);

      /////////////////////////////////////// Input  /////////////////////////////
      stepInput = await getStepInput(
        this,
        stepNode,
        lastStepResult,
        stepNode.inputObject,
      );
      // console.log('> stepInput', stepInput);

      if (stepNode.debug) logDebug('stepInput', stepInput);

      //////////////////////////////// Execute step  /////////////////////////////

      // Verificar o tipo de step e executar a lógica apropriada
      stepResult = await stepNode.execute({ step: stepNode, stepInput });

      if (stepNode.debug) logDebug('stepResult A', stepResult);

      stepResult = rawDataObjectToStructuredData(stepResult);

      if (stepNode.debug) logDebug('stepResult B', stepResult);

      this.lastStepResult = stepResult;

      /////// Validate result
      // @todo validate outputSchema with stepResult

      ////// Join global state
      // Salvar o input e output de cada etapa no workflow
      this.globalState[stepKey] = { input: stepInput, output: stepResult };
      lastStepResult = stepResult;

        const rawOutput = structuredDataToRawData(stepResult);
        const globalStateSnapshot = Object.fromEntries(
          Object.entries(this.globalState).map(([key, value]) => {
            return [key, {
              input: value.input,
              output: structuredDataToRawData(value.output),
            }];
          }),
        );

        try {
          activeLogger.logStep({
            stepIndex: stepNumber,
            stepKey: String(stepKey),
            stepName: stepNode.name,
            input: stepInput,
            structuredOutput: stepResult,
            rawOutput,
            globalStateSnapshot,
          });
        } catch (error) {
          console.warn('Failed to log workflow step', error);
        }

      // Valida output antes de passar ao próximo
      // data = step.outputSchema.parse(result);

      // @todo Indicar visualmente quando começa e termina uma etapa

      // console.log(' ');
      // workflowInfo('Step finished');
      // workflowInfo('GlobalState', this.globalState);
      // workflowInfo('Next step');
      // console.log(' ');

      // console.log('END');
      // process.exit();
      }
      return this.globalState;
    } finally {
      activeLogger.endRun();
    }
  }

  /**
   * Formata o resultado final de um step
   */

  getResult(workflowResulType: 'structuredData' | 'rawData') {
    return workflowResulType === 'structuredData'
      ? this.lastStepResult
      : structuredDataToRawData(this.lastStepResult);
  }

  getGlobal(workflowResulType: 'structuredData' | 'rawData') {
    if (workflowResulType === 'structuredData') return this.globalState;
    // console.log('globalState', this.globalState);
    const result: RawData = {};
    for (const key in this.globalState) {
      // console.log('key', key);
      result[key] = structuredDataToRawData(this.globalState[key].output);
    }
    return result;
  }

  private validateStep(step: WorkflowNode) {
    //@todo add
    // first step cannot use lastResult
    // Error: inputSchema is required when step.inputSource is not InputSource.Global

    if (step.inputSource === InputSource.DataObject && !step.inputObject) {
      throw new Error(
        'inputDataObject is required when step.inputSource is InputSource.DataObject',
      );
    }
    if (
      step.inputSource &&
      step.inputSource !== InputSource.Global &&
      !step.inputSchema
    ) {
      throw new Error(
        'inputSchema is required when step.inputSource is not InputSource.Global',
      );
    }

    if (
      step.outputSchema &&
      step.outputSchema instanceof ZodObject &&
      (!step.outputSchema.shape || typeof step.outputSchema.shape !== 'object')
    ) {
      throw new Error(
        'outputSchema must start with z.object() to be compatible with OpenAI function calling format - step.outputSchema.shape:' +
          step.outputSchema.shape,
      );
    }

    if (step.inputSource == InputSource.UserInput) {
      // Schema must have description on all fields
    }
  }
}
