import { agentSays, logDebug, workflowInfo } from '../../utils/log.ts';
import {
  type RawData,
  type StructuredData,
  structuredDataToRawData,
  rawDataObjectToStructuredData,
} from './StructuredData.ts';
import { getStepInput, InputSource } from './Input.ts';
import type { WorkflowNode } from './WorkflowNode.ts';

/**
 * Motor de orquestração de steps.
 */
export class Workflow {
  steps: Record<string, WorkflowNode>;
  lastStepResult: StructuredData<any> = {};
  globalState: Record<string, { input: any; output: any }> = {};

  constructor(steps: Record<string, WorkflowNode>) {
    this.steps = steps;
  }

  /**
   * Executa todos os steps em sequência.
   * @param initial dado inicial que será passado para o primeiro step
   * @returns resultado final após todos os steps
   */
  async execute(): Promise<any> {
    const stepKeys = Object.keys(this.steps) as (keyof typeof this.steps)[];
    let lastStepResult: StructuredData<any> = {};
    let stepsCount = 1;
    // console.log('stepKeys', stepKeys);

    for (const stepKey of stepKeys) {
      const stepNode: WorkflowNode = this.steps[stepKey];
      workflowInfo(
        'Step ' +
          stepsCount++ +
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
      stepInput = await getStepInput(this, stepNode, lastStepResult);
      // console.log('> stepInput', stepInput);

      if (stepNode.debug) logDebug('stepInput', stepInput);

      //////////////////////////////// Execute step  /////////////////////////////

      // Verificar o tipo de step e executar a lógica apropriada
      stepResult = await stepNode.execute({ step: stepNode, stepInput });

      if (stepNode.debug) logDebug('stepResult A', stepResult);

      stepResult = rawDataObjectToStructuredData(stepResult);

      if (stepNode.debug) logDebug('stepResult B', stepResult);

      // console.log('> stepResult', stepResult);
      this.lastStepResult = stepResult;

      /////// Validate result
      // @todo validate outputSchema with stepResult

      ////// Join global state
      // Salvar o input e output de cada etapa no workflow
      this.globalState[stepKey] = { input: stepInput, output: stepResult };
      lastStepResult = stepResult;

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

    if (step.inputSource === InputSource.DataObject && !step.inputDataObject) {
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
      (!step.outputSchema.shape || typeof step.outputSchema.shape !== 'object')
    ) {
      throw new Error(
        'outputSchema must start with z.object() to be compatible with OpenAI function calling format',
      );
    }

    if (step.inputSource == InputSource.UserInput) {
      // Schema must have description on all fields
    }
  }
}
