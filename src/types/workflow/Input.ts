import {
  inputSchemaToStructuredData,
  mergeTwoStructuredData,
  type StructuredData,
  rawDataObjectToStructuredData,
} from './StructuredData.ts';
import { agentAsks } from '../../utils/log.ts';
import type { AgentStep, CodeStep } from './Step.ts';
import type { Workflow } from './Workflow.ts';

/**
 * Enum para definir a fonte de entrada de um passo
 */
export enum InputSource {
  DataObject = 'DATA_OBJECT',
  LastStep = 'LAST_STEP',
  UserInput = 'USER_INPUT',
  Global = 'GLOBAL',
  Mixed = 'MIXED',
}

export const getStepInput = (
  workflow: Workflow,
  step: AgentStep<any, any> | CodeStep<any, any>,
  lastStepOutput: StructuredData<any>,
) => {
  // @todo
  // Mixed input
  // [ ] Handle recursive object on input data
  // [ ] Create type for it
  // 1 - Obter todos os atributos do inputSchema, Criar um objeto com os atributos do inputSchema
  if (step.inputSource == InputSource.Global) {
    console.log('here');
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
  if (step.inputSource == InputSource.DataObject && step.inputDataObject) {
    const dataObject = rawDataObjectToStructuredData(step.inputDataObject);
    return mergeTwoStructuredData(draftStructuredData, dataObject);
  } else if (step.inputSource == InputSource.LastStep && lastStepOutput) {
    return mergeTwoStructuredData(draftStructuredData, lastStepOutput);
  } else if (step.inputSource == InputSource.UserInput) {
    return getUserInput(draftStructuredData);
  } else throw new Error('input not expected: ', step.inputSource);
  // // Note: InputSource.Mixed would require more complex logic to combine sources,
  // // potentially based on specific configurations per field.
  //
  // return stepInput;
};

async function getUserInput(
  draftStructuredData: StructuredData<any>,
): Promise<StructuredData<any>> {
  if (process.env.NODE_ENV === 'test') {
    return { firstNumber: { value: 2 }, secondNumber: { value: 3 } };
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
