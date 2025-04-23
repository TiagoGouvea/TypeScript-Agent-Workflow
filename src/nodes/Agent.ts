import { z } from 'zod';
import { InputSource } from '../types/workflow/Input.ts';
import { agentAsks, agentSays, error, logStep } from '../utils/log.ts';
import { callModel } from '../llm/callModel.ts';
import {
  type BaseNodeParams,
  WorkflowNode,
} from '../types/workflow/WorkflowNode.ts';

export interface AgentNodeParams extends BaseNodeParams {
  systemPrompt?: string;
}

export class AgentNode extends WorkflowNode {
  public systemPrompt?: string;

  constructor(params: AgentNodeParams) {
    super(params);
    this.systemPrompt = params.systemPrompt;
  }

  async execute({ step, stepInput }: { step: any; stepInput: any }) {
    try {
      // @todo SingleShot?
      // Quando ele já deve receber o input, rodar e retornar o retorno final, sem nenhuma interação
      // Deve retornar o output final já, ou o output intermediário?
      // Se não tiver que interagir nem falar nada, já dá pra retonar o final

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
          ),
        gotToNextStep: z
          .boolean()
          .describe(
            'Termina e etapa atual e deixa o workflow seguir para a próxima etapa',
          ),
      });

      const allowUserInteraction = step.inputSource == InputSource.UserInput;

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
            ),
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

      // lastResponseSchema = responseSchema;

      let llmResult: any = null;
      let messages = [
        { role: 'user', content: 'inputData: ' + JSON.stringify(stepInput) },
      ];
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
          });
          // Validate result with schema
          // console.log('llmResult', llmResult);
          // console.log('messages.length:', messages.length);

          messages.push({
            role: 'assistant',
            content: JSON.stringify(llmResult),
          });

          if (llmResult.agentResponse.humanResponse)
            agentSays(llmResult.agentResponse.humanResponse);

          if (llmResult.agentResponse.humanQuestion && allowUserInteraction) {
            const value = await agentAsks(
              llmResult.agentResponse.humanQuestion,
            );
            messages.push({ role: 'user', content: value });
          }

          shouldContinueInThisStep =
            !!(llmResult.agentResponse.humanQuestion && allowUserInteraction) ||
            !llmResult.agentResponse.gotToNextStep;
          // console.log('shouldContinueInThisStep?', shouldContinueInThisStep);
        } catch (err: any) {
          error('Error calling the model:', err.message || err);
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
      const agentResult = await formatStepResult(step, {
        llmResult,
        messages,
        responseSchema,
      });

      return agentResult;
    } catch (err: any) {
      error('Error calling the model:', err.message || err);
      process.exit(1);
    }
  }
}

async function formatStepResult(
  step: any,
  lastResponseSchema: any,
): Promise<any> {
  const { llmResult, messages, responseSchema } = lastResponseSchema;

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
  return await callModel({
    systemPrompt: step.systemPrompt,
    messages: [
      ...messages,
      {
        role: 'system',
        content:
          'Convert the above output to the following schema: ' +
          JSON.stringify(step.outputSchema),
      },
    ],
    responseFormat: step.outputSchema ? step.outputSchema : z.any(),
  });
  // } else {
  //   return llmResult;
  // }
}
