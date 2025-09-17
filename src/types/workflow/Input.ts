import {
  inputSchemaToStructuredData,
  mergeTwoStructuredData,
  type StructuredData,
  rawDataObjectToStructuredData,
} from './StructuredData.ts';
import { agentAsks } from '../../utils/log.ts';
import type { Workflow } from './Workflow.ts';
import type { WorkflowNode } from './WorkflowNode.ts';
import appState from '../../AppState.ts';

/**
 * Enum para definir a fonte de entrada de um passo
 */
export enum InputSource {
  DataObject = 'DATA_OBJECT',
  LastStep = 'LAST_STEP',
  LastStepAndUserInput = 'LAST_STEP_USER_INPUT',
  DataObjectAndUserInput = 'DATA_OBJECT_USER_INPUT',
  UserInput = 'USER_INPUT',
  Global = 'GLOBAL',
  Mixed = 'MIXED',
}

export const getStepInput = async (
  workflow: Workflow,
  step: WorkflowNode,
  lastStepOutput?: StructuredData<any>,
  inputObject?: Object,
): Promise<StructuredData<any>> => {
  // @todo
  // Mixed input
  // [ ] Handle recursive object on input data
  // [ ] Create type for it
  // 1 - Obter todos os atributos do inputSchema, Criar um objeto com os atributos do inputSchema
  if (step.inputSource == InputSource.Global) {
    return workflow.getGlobal('structuredData');
  }

  if (!step.inputSchema) return {};

  // Draft the StructuredData from schema
  const draftStructuredData: StructuredData<any> = inputSchemaToStructuredData(
    step.inputSchema,
  );
  // console.log('draftStructuredData', draftStructuredData);

  // mergeInputDataObjectToStepInputData
  // console.log('> step.inputSource', step.inputSource);

  // Check if inputData is already provided in the step definition
  if (step.inputSource == InputSource.DataObject && step.inputObject) {
    const dataObject = rawDataObjectToStructuredData(step.inputObject);
    return mergeTwoStructuredData(draftStructuredData, dataObject);
  } else if (step.inputSource == InputSource.LastStep && lastStepOutput) {
    return mergeTwoStructuredData(draftStructuredData, lastStepOutput);
  } else if (step.inputSource == InputSource.UserInput) {
    return getUserInput(draftStructuredData);
  } else if (step.inputSource == InputSource.LastStepAndUserInput) {
    const daftData = mergeTwoStructuredData(
      draftStructuredData,
      lastStepOutput,
    );
    const missingValues = Object.keys(daftData).reduce((acc, key) => {
      if (!daftData[key].value) {
        acc[key] = { description: daftData[key].description, value: undefined };
      }
      return acc;
    }, {});
    if (Object.keys(missingValues).length > 0) {
      const userInput = await getUserInput(missingValues);
      return mergeTwoStructuredData(daftData, userInput);
    }
    return daftData;
  } else if (step.inputSource == InputSource.DataObjectAndUserInput) {
    // console.log('inputObject', inputObject);
    const inputData = rawDataObjectToStructuredData(inputObject);
    // console.log('inputData', inputData);
    const daftData = mergeTwoStructuredData(draftStructuredData, inputData);
    // console.log('daftData', daftData);
    const missingValues = Object.keys(daftData).reduce((acc, key) => {
      if (daftData[key].value === undefined) {
        acc[key] = { description: daftData[key].description, value: undefined };
      }
      return acc;
    }, {});
    if (Object.keys(missingValues).length > 0) {
      const userInput = await getUserInput(missingValues);
      return mergeTwoStructuredData(daftData, userInput);
    }
    return daftData;
  } else throw new Error('input not expected: ', step.inputSource);
  // // Note: InputSource.Mixed would require more complex logic to combine sources,
  // // potentially based on specific configurations per field.
  //
  // return stepInput;
};

async function getUserInput(
  draftStructuredData: StructuredData<any>,
): Promise<StructuredData<any>> {
  // Shame of me workaround
  if (process.env.NODE_ENV === 'test') {
    const curTest = appState.get('CUR_TEST');
    if (curTest == 'UserInput')
      return { firstNumber: { value: 2 }, secondNumber: { value: 3 } };
    else if (curTest == 'LastStepAndUserInput')
      return { secondNumber: { value: 3 } };
    else throw new Error('unknown curTest');
  }
  // console.log('Requesting input from user...');
  const result = structuredClone(draftStructuredData);
  for (const key of Object.keys(draftStructuredData)) {
    let question = draftStructuredData[key].description;
    if (question && !['?', ':'].includes(question[question.length - 1]))
      question = question + ':';
    result[key].value = await agentAsks(question || '?');
  }
  return result;
}
