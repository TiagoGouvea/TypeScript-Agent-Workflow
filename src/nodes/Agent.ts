import { z } from 'zod';
import { InputSource } from '../types/workflow/Input.ts';
import {
  agentAsks,
  agentSays,
  logDebug,
  logError,
} from '../utils/log.ts';
import { callModel } from '../llm/callModel.ts';
import {
  type BaseNodeParams,
  WorkflowNode,
} from '../types/workflow/WorkflowNode.ts';
import type { NodeTool } from '../types/workflow/Tool.ts';

export interface AgentNodeParams extends BaseNodeParams {
  systemPrompt?: string;
  tools?: NodeTool[];
  providerModel?: string;
}

interface lmresult {
  result: any;
  messages: any[];
}

export class AgentNode extends WorkflowNode {
  public systemPrompt?: string;
  public tools?: NodeTool[];
  public providerModel?: string;

  constructor(params: AgentNodeParams) {
    super(params);
    this.systemPrompt = params.systemPrompt;
    this.tools = params.tools;
    this.providerModel = params.providerModel;
  }

  async execute({ step, stepInput }: { step: any; stepInput: any }) {
    try {
      // @todo SingleShot?
      // Quando ele já deve receber o input, rodar e retornar o retorno final, sem nenhuma interação
      // Deve retornar o output final já, ou o output intermediário?
      // Se não tiver que interagir nem falar nada, já dá pra retonar o final

      // @todo mover pra metodo
      // Explicar os caminhos que pode seguir o modelo
      // Juntar o input no prompt, como user?
      let systemPrompt;
      let responseSchema = z.object({
        // responseStorage: z.object({}).describe('Use it to store information'),
        responseStorage: z.string().describe('Use it to store information'),
        gotToNextStep: z
          .boolean()
          .describe(
            'Termina e etapa atual e deixa o workflow seguir para a próxima etapa',
          ),
      });

      if (step.allowHumanResponse) {
        responseSchema.extend({
          humanResponse: z
            .string()
            .describe(
              'Uma informação para ser apresentada ao usuário humano. Nunca deve conter perguntas.',
            ),
        });
      }

      const allowUserInteraction = [
        InputSource.LastStepAndUserInput,
        InputSource.UserInput,
      ].includes(step.inputSource);

      if (allowUserInteraction) {
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
            ),
        });
      } else {
        // single shot
        systemPrompt = `
          <base_introduction>
            Você faz parte de um workflow de várias etapas, executando uma etapa apenas.
          </base_introduction>
          <workflow>
            Etapa atual:${step.name || step.introductionText}
            <retorno>
              Retorne "gotToNextStep:true" quando o objetivo for alcançado e o workflow deva ir para a etapa seguinte (não descrita aqui)
            </retorno>
          </workflow>
          <step_instructions>
            ${step.systemPrompt}  
          </step_instructions>`;
      }

      if (this.debug) console.log('systemPrompt', systemPrompt);

      // lastResponseSchema = responseSchema;

      let llmResult: lmresult;
      let messages = [
        { role: 'user', content: 'inputData: ' + JSON.stringify(stepInput) },
      ];
      let shouldContinueInThisStep = true;
      let allMessages = [];
      while (shouldContinueInThisStep) {
        // Rodar system prompt
        try {
          // @ todo quais opções o modelo tem?
          // É pra perguntar ao usuário?
          // Terminar o processo todo?
          // Ir para a próxima etapa?

          // logStep(
          //   'responseSchema',
          //   zodResponseFormat(responseSchema, 'parsed_response'),
          // );

          // console.log(
          //   '>>>>>>>>>>>>>>>>>>> will callModel',
          //   'messages.length:',
          //   messages.length,
          // );
          llmResult = await callModel({
            systemPrompt,
            messages,
            responseFormat: z.object({ agentResponse: responseSchema }),
            tools: this.tools,
            debug: step.debug,
            providerModel: this.providerModel,
          });
          // Validate result with schema
          if (this.debug) console.log('llmResult', llmResult);
          // console.log('messages.length:', messages.length);
          const agentResponse = llmResult.result.agentResponse;
          allMessages.push(...llmResult.messages);

          messages.push({
            role: 'assistant',
            content: JSON.stringify(llmResult.result),
          });

          if (agentResponse.humanResponse)
            agentSays(agentResponse.humanResponse);

          if (agentResponse.humanQuestion && allowUserInteraction) {
            const value = await agentAsks(agentResponse.humanQuestion);
            messages.push({ role: 'user', content: value });
          }

          shouldContinueInThisStep =
            !!(agentResponse.humanQuestion && allowUserInteraction) ||
            !agentResponse.gotToNextStep;

          if (step.debug)
            logDebug('shouldContinueInThisStep', shouldContinueInThisStep);
          // if (!shouldContinueInThisStep)
          //   console.log('agentResponse', agentResponse);
        } catch (err: any) {
          logError('Error calling the model:', err.message || err);
          console.error(err);
          process.exit(1);
        }
      }

      // console.log('llmResult', llmResult);

      // Reformat result
      // console.log('>>>>>> executeAgentStep agentResult', {
      //   llmResult,
      //   messages,
      //   responseSchema,
      // });
      agentSays(`I'm formatting the final step results`);
      const agentResult = await formatStepResult(step, allMessages);

      return agentResult;
    } catch (err: any) {
      logError('Error calling the model:', err.message || err);
      process.exit(1);
    }
  }
}

async function formatStepResult(step: any, allMessages: any[]): Promise<any> {
  // @todo quando tenho que rodar outra vez pra formatar o retorno?
  // if (
  //   step.outputSchema &&
  //   JSON.stringify(responseSchema) !== JSON.stringify(step.outputSchema)
  // ) {
  // logStep('Should call LLM again to format output');
  // console.log('system', step.systemPrompt);
  // console.log('messages', messages);
  // Tenho que retornar o output no formato definido....
  // Quando ele mandar terminar, rodar mais uma vez com o outputSchema definido de saída

  // console.log('>>>>>>>>>>>>>allMessages');
  // console.dir(allMessages, { depth: null });

  const messages = [
    ...allMessages,
    {
      role: 'system',
      content:
        'Convert the above output to the following schema: ' +
        JSON.stringify(step.outputSchema),
    },
  ];
  // console.log('>>>>>>>>>>>>>messages');
  // console.log('messages', messages);
  const lastLlmResult = await callModel({
    systemPrompt: step.systemPrompt,
    messages,
    responseFormat: step.outputSchema ? step.outputSchema : undefined,
    providerModel: step.providerModel,
  });
  return lastLlmResult.result;
}
