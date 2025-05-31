import { zodResponseFormat } from 'openai/helpers/zod';
import OpenAI from 'openai';
import { parseChatCompletion } from 'openai/lib/parser';
import { logError, llmInfo } from '../utils/log.ts';
import type { NodeTool } from '../tools/webSearch.ts';
import type { ResponseCreateParams } from 'openai/resources/responses/responses';
import type { CompletionCreateParams } from 'openai/resources/completions';

export async function callModel({
  systemPrompt,
  messages,
  responseFormat,
  tools,
  debug,
  providerModel,
}: {
  systemPrompt?: string;
  messages: any[];
  responseFormat?: any;
  tools?: NodeTool[];
  debug?: boolean;
  providerModel?: string;
}) {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set');

  messages = messages ? structuredClone(messages) : [];
  if (systemPrompt) messages.unshift({ role: 'system', content: systemPrompt });
  let firstCall = true;
  let hasToolCalls = false;
  let completion;
  let toolsCalled = false;
  let result;
  let openai: OpenAI;
  let options: ResponseCreateParams | CompletionCreateParams;

  enum completionTypes {
    response = 'response',
    completion = 'completion',
  }

  const completionType: completionTypes = completionTypes.response;

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
        ? tools.map((tollNode) => tollNode.toolDeclaration)
        : [];

    options = {
      model: providerModel || 'gpt-4.1-mini', // Use provided model or default to gpt-4.1-mini
      // Available models:
      // 'gpt-4.1-mini' - prince i/o : $1.1 • $4.4
      // 'o3-mini' - prince i/o : $1.1 • $4.4
      // 'o1' - prince i/o : $15 • $60
      // 'gpt-4.5-preview' - prince i/o : $75 • $150
      tools: toolsValue,
    };

    if (completionType === completionTypes.completion) {
      options.messages = messages;
      options.response_format = zodResponseFormat(
        responseFormat,
        'parsed_response',
      );
    } else {
      options.input = messages;
      options.text = {
        format: {
          ...zodResponseFormat(responseFormat, 'parsed_response').json_schema,
          type: 'json_schema',
        },
      };
    }
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

      if (completionType === completionTypes.completion) {
        completion = await openai.completions.create(options);
      } else {
        completion = await openai.responses.create(options);
      }
      // console.log('OpenAI response:', completion);
      // console.log('OpenAI response.output:', completion.output);

      try {
        if (completionType === completionTypes.completion) {
          completion = parseChatCompletion(completion, options);
        }
      } catch (error) {
        console.error(error);
        console.error('🚨 Error parsing completion:');
        // console.log('completion:');
        // console.dir(completion.choices[0].message.content, { depth: null });
      }
      // parseChatCompletion(a);
      // console.log(
      //   'OpenAI completion message:',
      //   completion.choices[0].message,
      // );
      // debugOAI('completion', completion);

      const choice =
        completionType === completionTypes.completion
          ? completion.choices[0]
          : completion.output[completion.output.length - 1];

      hasToolCalls =
        choice?.message?.tool_calls?.length > 0 ||
        choice?.type == 'function_call';

      if (hasToolCalls) {
        if (!tools || !tools.length) throw new Error('No tools found');
        // console.log('hasToolCalls...', completion);

        toolsCalled = true;
        let toolCalls;
        if (completionType === completionTypes.completion) {
          toolCalls = choice.message?.tool_calls;
        } else {
          toolCalls = [{ function: choice }];
        }
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
              if (completionType === completionTypes.completion) {
                const rest = {
                  role: 'tool',
                  name: toolCall!.function.name,
                  content: JSON.stringify(rr),
                  // tool_call_id: toolCall.id,
                };
                messages.push({ ...rest, functionCall: toolCall });
              } else {
                messages.push(choice);
                const rest = {
                  type: 'function_call_output',
                  call_id: toolCall.function.call_id,
                  output: JSON.stringify(rr),
                };
                // console.log('rest', rest);
                messages.push(rest);
              }
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
        if (completionType === completionTypes.completion)
          options.messages = messages;
        else options.input = messages;
      } else {
        // console.log('choice', choice);
        result =
          completionType === completionTypes.completion
            ? choice.message.parsed
            : choice.content[0].text;
        // console.log('result', result);
        hasToolCalls = false;
      }

      firstCall = false;
    }

    if (responseFormat && typeof result !== 'object') {
      result = JSON.parse(result);
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
