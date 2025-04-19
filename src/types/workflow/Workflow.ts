import { InputSource, isAgentStep, isCodeStep, type Step } from './Step.ts';
import { z } from 'zod';
import debug from 'debug';
import { callModel } from '../../llm/callModel.ts';
import { zodResponseFormat } from 'openai/helpers/zod';
import util from 'util';
import { agentAsks, agentSays, workflowInfo } from '../../utils/log.ts';

util.inspect.defaultOptions.depth = null;
util.inspect.defaultOptions.colors = true;

const logStep = debug('taw:workflow:step');

/**
 * Motor de orquestração de steps.
 */
export class Workflow {
  steps: Record<string, Step<any, any>>;
  constructor(steps: Record<string, Step<any, any>>) {
    this.steps = steps;
  }

  /**
   * Executa todos os steps em sequência.
   * @param initial dado inicial que será passado para o primeiro step
   * @returns resultado final após todos os steps
   */
  async execute(initialData?: any): Promise<any> {
    let data: any = initialData;

    // Keep global state between steps
    const globalState: Record<string, { input: any; output: any }> = {};

    const stepKeys = Object.keys(this.steps) as (keyof typeof this.steps)[];
    let lastStepResult: any = null;
    let lastResponseSchema: any = null;
    let stepsCount = 1;

    for (const stepKey of stepKeys) {
      const step = this.steps[stepKey];
      workflowInfo('Step ' + stepsCount++, stepKey, step.name);

      ////// Introdução
      if (step.introductionText) agentSays(step.introductionText);

      let stepResult: any;

      /////////////////////////////////////// Input  /////////////////////////////
      // @todo mover metodo pra obter e validar input
      // @todo Solicita input do usuário ou recebe da etapa anterior?

      // [ ] Handle recursive object on input data
      // [ ] Create type for it

      // 1 - Obter todos os atributos do inputSchema, Criar um objeto com os atributos do inputSchema
      const stepInput = (
        Object.keys(step.inputSchema.shape) as (keyof typeof step.inputSchema)[]
      ).reduce(
        (acc, key) => ({
          ...acc,
          [key]: {
            description: step.inputSchema.shape[key].description,
            value: undefined,
          },
        }),
        {} as Record<string, { description: string; value: any }>,
      );

      // O que diz se o input virá e tal... já receber né.

      // Obter todos os atributos do inputSchema
      // [ ] May have a input schema or not. Global should not require input schema

      if (step.inputSource == InputSource.UserInput) {
        for (const key of Object.keys(stepInput)) {
          const question = !['?', ':'].includes(
            stepInput[key].description[stepInput[key].description.length - 1],
          )
            ? stepInput[key].description + ':'
            : stepInput[key].description;
          stepInput[key].value = await agentAsks(question);
        }
      } else if (step.inputSource == InputSource.LastStep) {
        // console.log('step.input', step.input);
        for (const key of Object.keys(stepInput)) {
          if (lastStepResult) {
            stepInput[key].value = lastStepResult[key];
          }
        }
      }
      // console.log('local stepInput', stepInput);

      // Valida input e executa lógica
      // data = step.inputSchema.parse(inputData);

      // console.log('inputAttrs', inputAttrs);

      //////////////////////////////// Execute step  /////////////////////////////

      // Verificar o tipo de step e executar a lógica apropriada
      if (isAgentStep(step)) {
        // Lógica específica para AgentStep
        await this.executeAgentStep(step, stepInput, lastResponseSchema);
        stepResult = await this.formatStepResult(step, lastResponseSchema);
      } else if (isCodeStep(step)) {
        // Lógica específica para StandardStep
        stepResult = await step.run(stepInput);
      } else {
        throw new Error('Unknown step type: ' + JSON.stringify(step));
      }

      // Salvar o input e output de cada etapa no workflow
      globalState[stepKey] = { input: stepInput, output: stepResult };
      lastStepResult = stepResult;

      // Valida output antes de passar ao próximo
      // data = step.outputSchema.parse(result);

      // @todo Indicar visualmente quando começa e termina uma etapa

      console.log(' ');
      workflowInfo('-----------------------------------------');
      workflowInfo('GlobalState', globalState);
      workflowInfo('-----------------------------------------');
      console.log(' ');

      // console.log('END');
      // process.exit();
    }

    console.log('\n✅ Workflow finished successfully!');

    return data;
  }

  /**
   * Executa um AgentStep
   */
  private async executeAgentStep(
    step: any,
    stepInput: any,
    lastResponseSchema: any,
  ): Promise<any> {
    // @todo SingleShot?
    // Quando ele já deve receber o input, rodar e retornar o retorno final, sem nenhuma interação

    let shouldContinueInThisStep = true;
    // @todo mover pra metodo
    // Explicar os caminhos que pode seguir o modelo
    // Juntar o input no prompt, como user?
    let systemPrompt;
    let responseSchema = z.object({
      humanResponse: z
        .string()
        .describe(
          'Uma informação para ser apresentada ao usuário humano. Nunca deve conter perguntas.',
        )
        .nullable(),
      gotToNextStep: z
        .boolean()
        .describe(
          'Termina e etapa atual e deixa o workflow seguir para a próxima etapa',
        )
        .nullable(),
    });

    const allowUserInteraction = step.allowUserInteraction !== false;

    if (step.inputSource == InputSource.UserInput && allowUserInteraction) {
      systemPrompt = `
          <base_introduction>
            Você faz parte de um workflow de várias etapas, executando uma etapa apenas.
            # Instruções da interação com o usuário
            - Nunca repita as afirmações feitas pelo usuário
            ${
              allowUserInteraction
                ? `- Seja objetivo, siga para o que precisa ser sabido e faça quantas perguntas achar necessário para obter as informações necessárias`
                : `- Nunca faça perguntas ao usuário`
            }
          </base_introduction>
          <workflow>
            Etapa atual:${step.name}
          
            <retorno>
              Retorne "humanResponse" se quiser dizer algo ao usuário, não incluindo perguntas.
              ${
                allowUserInteraction
                  ? `Retorne "humanQuestion" se quiser perguntar algo ao usuário.
                Tanto "humanResponse" quanto "humanQuestion" serão apresentados ao usuário quando houverem, primeiro "humanResponse" e depois "humanQuestion" se houver.
                Caso não envie humanQuestion o processo será concluído e o processo irá para a etapa seguinte.`
                  : `Você não tem permissão para fazer perguntas ao usuário e ele não tem como responder suas perguntas.`
              }
              Retorne "gotToNextStep:true" quando o objetivo for alcançado e o workflow deva ir para a etapa seguinte (não descrita aqui)
            </retorno>
            
          </workflow>
          <step_instructions>
            ${step.systemPrompt}  
          </step_instructions>
      `;
      // const responseSchema = getResponseSchema(validTargetAgentNodes);
      responseSchema = responseSchema.extend({
        humanQuestion: z
          .string()
          .describe(
            'Uma pergunta para o usuário humano, necessária para continuar o processo.',
          )
          .optional(),
      });
    } else {
      // single shot
      systemPrompt = `
          <base_introduction>
            Você faz parte de um workflow de várias etapas, executando uma etapa apenas.
          </base_introduction>
          <workflow>
            Etapa atual:${step.name}
            <retorno>
              Retorne "gotToNextStep:true" quando o objetivo for alcançado e o workflow deva ir para a etapa seguinte (não descrita aqui)
            </retorno>
          </workflow>
          <step_instructions>
            ${step.systemPrompt}  
          </step_instructions>`;
    }

    lastResponseSchema = responseSchema;

    let llmResult: any = null;
    let messages = [{ role: 'user', content: JSON.stringify(stepInput) }];
    while (shouldContinueInThisStep) {
      // Rodar system prompt
      try {
        // @ todo quais opções o modelo tem?
        // É pra perguntar ao usuário?
        // Terminar o processo todo?
        // Ir para a próxima etapa?

        logStep(
          'responseSchema',
          zodResponseFormat(responseSchema, 'parsed_response'),
        );

        llmResult = await callModel({
          systemPrompt,
          messages,
          responseFormat: responseSchema,
        });
        logStep('llmResult', llmResult);

        messages.push({
          role: 'assistant',
          content: JSON.stringify(llmResult),
        });

        if (llmResult.humanResponse) agentSays(llmResult.humanResponse);

        if (llmResult.humanQuestion && allowUserInteraction) {
          const value = await agentAsks(llmResult.humanQuestion);
          messages.push({ role: 'user', content: value });
        }

        shouldContinueInThisStep =
          !!(llmResult.humanQuestion && allowUserInteraction) ||
          !llmResult.gotToNextStep;
        logStep('shouldContinueInThisStep?', shouldContinueInThisStep);
      } catch (err: any) {
        error('Error calling the model:', err.message || err);
        process.exit(1);
      }
    }

    return { llmResult, messages, responseSchema };
  }

  /**
   * Formata o resultado final de um step
   */
  private async formatStepResult(
    step: any,
    lastResponseSchema: any,
  ): Promise<any> {
    const { llmResult, messages, responseSchema } = lastResponseSchema;

    // @todo quando tenho que rodar outra vez pra formatar o retorno?
    if (
      step.outputSchema &&
      JSON.stringify(responseSchema) !== JSON.stringify(step.outputSchema)
    ) {
      logStep('Should call LLM again to format output');
      // Tenho que retornar o output no formato definido....
      // Quando ele mandar terminar, rodar mais uma vez com o outputSchema definido de saída
      return await callModel({
        systemPrompt: step.systemPrompt,
        messages,
        responseFormat: step.outputSchema ? step.outputSchema : z.any(),
      });
    } else {
      return llmResult;
    }
  }
}
