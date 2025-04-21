import { z } from 'zod';
import { InputSource } from './Input.ts';
import { agentAsks, agentSays, error, logStep } from '../../utils/log.ts';
import { zodResponseFormat } from 'openai/helpers/zod';
import { callModel } from '../../llm/callModel.ts';

export const executeAgentStep = async (step: any, stepInput: any) => {
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

    // lastResponseSchema = responseSchema;

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

        console.log('will callModel');

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

    console.log('llmResult', llmResult);

    return { llmResult, messages, responseSchema };
  } catch (err: any) {
    error('Error calling the model:', err.message || err);
    process.exit(1);
  }
};
