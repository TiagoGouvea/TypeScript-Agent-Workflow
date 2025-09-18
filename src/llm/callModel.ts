import { zodResponseFormat } from 'openai/helpers/zod';
import OpenAI from 'openai';
import { parseChatCompletion } from 'openai/lib/parser';
import { logError, llmInfo } from '../utils/log.ts';
import type { NodeTool } from '../types/workflow/Tool.ts';
import type {
  ChatCompletion,
  ChatCompletionCreateParamsBase,
} from 'openai/resources/chat/completions.mjs';

export async function callModel({
  systemPrompt,
  messages,
  responseFormat,
  tools,
  debug,
  providerModel,
  llmParams,
}: {
  systemPrompt?: string;
  messages: any[];
  responseFormat?: any;
  tools?: NodeTool[];
  debug?: boolean;
  providerModel?: string;
  llmParams?: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
  };
}) {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set');

  messages = messages ? structuredClone(messages) : [];
  if (systemPrompt) messages.unshift({ role: 'system', content: systemPrompt });
  let firstCall = true;
  let hasToolCalls = false;
  let toolsCalled = false;
  let result;
  let openai: OpenAI;
  let options: // ResponseCreateParams
  ChatCompletionCreateParamsBase;

  try {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    // const validTargetAgentNodes =
    //   targetAgentNodes.length > 0 ? targetAgentNodes : ['endWorkflow'];
    // console.log(validTargetAgentNodes);

    // console.log('responseSchema', responseSchema);
    // console.log(
    //   'response_format',
    //   zodResponseFormat(responseSchema, 'parsed_response'),
    // );

    // console.log('openai tools');
    // console.dir(tools ? tools : false, { depth: null });
    // if tools calls

    // messages && messages.length
    //   ? messages.map((msg) => ({
    //       role: msg.role,
    //       content: msg.content,
    //     }))
    //   : [];

    const toolsValue =
      tools && tools.length
        ? tools.map((tollNode) => ({
            function: tollNode.toolDeclaration,
            type: 'function',
          }))
        : [];

    options = {
      model: providerModel || 'gpt-4.1-mini', // Use provided model or default to gpt-4.1-mini
      // Available models:
      // 'gpt-4.1-mini' - prince i/o : $1.1 • $4.4
      // 'o3-mini' - prince i/o : $1.1 • $4.4
      // 'o1' - prince i/o : $15 • $60
      // 'gpt-4.5-preview' - prince i/o : $75 • $150
      tools: [],
      // Apply LLM parameters if provided
      ...(llmParams?.temperature !== undefined && {
        temperature: llmParams.temperature,
      }),
      ...(llmParams?.top_p !== undefined && { top_p: llmParams.top_p }),
      ...(llmParams?.max_tokens !== undefined && {
        max_tokens: llmParams.max_tokens,
      }),
      ...(llmParams?.frequency_penalty !== undefined && {
        frequency_penalty: llmParams.frequency_penalty,
      }),
      ...(llmParams?.presence_penalty !== undefined && {
        presence_penalty: llmParams.presence_penalty,
      }),

      messages,

      response_format: zodResponseFormat(responseFormat, 'parsed_response'),

      stream: false,
    };

    // if (completionType === CompletionType.completion) {
    // } else {
    //   options.input = messages;
    //   options.text = {
    //     format: {
    //       ...zodResponseFormat(responseFormat, 'parsed_response').json_schema,
    //       type: 'json_schema',
    //     },
    //   };
    // }
  } catch (error) {
    logError('callModel params error', error);
    console.error(error);
    throw error;
  }

  // console.log('options', options);

  try {
    // console.log('messages', messages);

    while (firstCall || hasToolCalls) {
      // console.log('-------------------------');
      // console.dir(options.input || options.messages, { depth: null });
      // console.dir(options.response_format, { depth: null });
      // console.log(
      //   'Pensando ',
      //   tools?.length ? 'com ferramentas' : 'sem ferramentas',
      //   '...',
      // );
      llmInfo('Calling OpenAI'); ///[mode:' + completionType + ']

      // if (completionType === CompletionType.completion) {
      const completion = (await openai.chat.completions.create(
        options,
      )) as ChatCompletion;
      // } else {
      //   completion = await openai.chat.responses.create(options);
      // }
      // console.log('OpenAI response:', completion);
      // console.log('OpenAI response.output:', completion.output);

      let parsedCompletion;
      try {
        parsedCompletion = parseChatCompletion(completion, options);
        // };
        // if (completionType === CompletionType.completion) {
        // parsedCompletion
      } catch (error) {
        console.error(error);
        console.error('🚨 Error parsing completion:');
        // console.log('completion:');
        // console.dir(completion.choices[0].message.content, { depth: null });
        throw error;
      }
      // parseChatCompletion(a);
      // console.log(
      //   'OpenAI completion message:',
      //   completion.choices[0].message,
      // );
      // debugOAI('completion', completion);

      const choice = parsedCompletion.choices[0];
      // completionType === CompletionType.completion
      // ? : completion.output[completion.output.length - 1];

      hasToolCalls = (choice?.message?.tool_calls?.length ?? 0) > 0;

      if (hasToolCalls) {
        if (!tools || !tools.length) throw new Error('No tools found');
        // console.log('hasToolCalls...', completion);

        toolsCalled = true;
        const toolCalls = choice.message?.tool_calls ?? [];
        // if (completionType === CompletionType.completion) {
        // } else {
        //   toolCalls = [{ function: choice }];
        // }
        if (debug) llmInfo('hasToolCalls', toolCalls);

        // Process all tool calls concurrently using Promise.all
        await Promise.all(
          toolCalls.map(async (toolCall) => {
            // Check if it's calling a agent as a tool (wrong way)
            llmInfo('Running tool: ' + toolCall!.function.name);
            if (debug)
              llmInfo(
                'toolCall:',
                toolCall!.function.name,
                toolCall!.function.arguments,
              );
            // find the tool
            const callToolNode = tools.find(
              (t) => t.toolDeclaration.name === toolCall!.function.name,
            );
            if (!callToolNode)
              throw new Error('Tool not found:' + toolCall!.function.name);
            try {
              const args =
                toolCall!.function.parsed_arguments ||
                JSON.parse(toolCall.function.arguments);
              const rr = await callToolNode.run(args);
              // console.log('rr', rr);

              // debugOAI('⏩⏩👉 rest', rest);
              // if (completionType === CompletionType.completion) {
              const rest = {
                role: 'tool',
                name: toolCall!.function.name,
                content: JSON.stringify(rr),
                // tool_call_id: toolCall.id,
              };
              messages.push({ ...rest, functionCall: toolCall });
              // } else {
              //   messages.push(choice);
              //   const rest = {
              //     type: 'function_call_output',
              //     call_id: toolCall.function.call_id,
              //     output: JSON.stringify(rr),
              //   };
              //   // console.log('rest', rest);
              //   messages.push(rest);
              // }
            } catch (error: any) {
              logError(
                '🚨 Error calling tool:',
                toolCall!.function.name,
                'args: ',
                toolCall!.function.arguments,
              );
              console.error(error);
              process.exit(1);
            }
          }),
        );
        // options.tools = undefined;
        // Run completions again
        // @todo add to state
        // if (completionType === CompletionType.completion)
        options.messages = messages;
        // else options.input = messages;
      } else {
        // console.log('choice', choice);
        result = choice.message.parsed;
        // completionType === CompletionType.completion
        //   ?
        //   : choice.content[0].text;
        // console.log('result', result);
        hasToolCalls = false;
      }

      firstCall = false;
    }

    if (responseFormat && typeof result !== 'object') {
      result = JSON.parse(result!);
    }

    return { result, messages: messages };
  } catch (e) {
    logError('callModel error', e);
    // console.log('🚨 Error calling OpenAI:');
    console.error(e);
    logError('callModel options:');
    console.dir(options, { depth: null });
    throw e;
  }
}
