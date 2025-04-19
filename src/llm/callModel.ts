import { zodResponseFormat } from 'openai/helpers/zod';
import { jsonrepair } from 'jsonrepair';
import OpenAI from 'openai';
import { parseChatCompletion } from 'openai/lib/parser';

export async function callModel({
  systemPrompt,
  messages,
  responseFormat,
}: {
  systemPrompt?: string;
  messages: any[];
  responseFormat?: any;
}) {
  if (systemPrompt) messages.unshift({ role: 'system', content: systemPrompt });
  return callOpenAI({ messages, responseFormat });
}

async function callOpenAI({
  messages,
  responseFormat,
}: {
  messages: any[];
  responseFormat?: any;
}) {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set');

  try {
    const openai = new OpenAI({
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

    let firstCall = true;
    let hasToolCalls = false;
    let completion;
    let toolsCalled = false;
    let result;

    let options = {
      model: 'gpt-4.1-mini',
      messages:
        messages && messages.length
          ? messages.map((msg) => ({
              role: msg.role,
              content: msg.content,
            }))
          : [],
      response_format: zodResponseFormat(responseFormat, 'parsed_response'),
      // tools: tools,
    };

    // console.log('messages', messages);

    while (firstCall || hasToolCalls) {
      // console.log(
      //   '🛜 Pensando ',
      //   tools?.length ? 'com ferramentas' : 'sem ferramentas',
      //   '...',
      // );
      // completion = await openai.beta.chat.completions.parse(options);
      completion = await openai.chat.completions.create(options);
      try {
        completion = parseChatCompletion(completion, options);
      } catch (error) {
        console.error('🚨 Error parsing completion:', error.split('\n')[0]);
        // console.log('completion:');
        // console.dir(completion.choices[0].message.content, { depth: null });

        function extractFirstJsonObject(input: string) {
          const startIndex = input.indexOf('{');
          const endIndex = input.indexOf('}', startIndex);
          if (startIndex !== -1 && endIndex !== -1)
            return input.substring(startIndex, endIndex + 1);
          return null;
        }

        const fixedContent = extractFirstJsonObject(
          jsonrepair(completion.choices[0].message.content),
        );
        console.log('(try) fix completion content:', fixedContent);
        completion.choices[0].message.content = fixedContent;
        completion = parseChatCompletion(completion, options);
      }
      // parseChatCompletion(a);
      // console.log(
      //   '🛜 OpenAI completion message:',
      //   completion.choices[0].message,
      // );
      // debugOAI('completion', completion);

      hasToolCalls = completion.choices[0].message.tool_calls?.length > 0;

      if (hasToolCalls) {
        // console.log('🛜 hasToolCalls...');
        if (!tools || !tools.length) throw new Error('No tools found');

        toolsCalled = true;
        const toolCalls = completion.choices[0].message.tool_calls;
        // console.log('🛜 toolCall', toolCalls[0]);
        for (let toolCall of toolCalls) {
          // Check if it's calling a agent as a tool (wrong way)
          if (!tools.find((t) => t.function.name === toolCall!.function.name)) {
            const rest = {
              role: 'function',
              name: toolCall!.function.name,
              content:
                toolCall!.function.name +
                ' não é uma tool válida (não confundir agentes com tools)',
            };
            messages.push({ ...rest, functionCall: toolCall });
            console.log('Wrong tool call: ' + toolCall!.function.name);
            console.log('tools');
            console.dir(tools, { depth: null });
            continue;
          } else {
            // console.log(
            //   '🛜 toolCall:',
            //   toolCall!.function.name,
            //   toolCall!.function.arguments,
            // );
            // find the tool
            const callToolNode = toolNode.tools.find(
              (t) => t.name === toolCall!.function.name,
            );
            if (!callToolNode)
              throw new Error('Tool not found:' + toolCall!.function.name);
            try {
              const rr = await callToolNode.invoke(
                toolCall!.function.parsed_arguments,
              );
              const rest = {
                role: 'function',
                name: toolCall!.function.name,
                content: JSON.stringify(rr),
                // tool_call_id: toolCall.id,
              };
              // debugOAI('⏩⏩👉 rest', rest);
              messages.push({ ...rest, functionCall: toolCall });
            } catch (error: any) {
              console.log(
                '🚨 Error calling tool:',
                toolCall!.function.name,
                'args: ',
                toolCall!.function.arguments,
              );
              console.error(error);
              process.exit(1);
            }
          }
        }
        options.tools = undefined;
        // Run completions again
        // @todo add to state
        options.messages = messages;
      } else {
        result = completion.choices[0].message.parsed;
        hasToolCalls = false;
      }

      firstCall = false;
    }

    return result;
  } catch (e) {
    console.log('🚨 Error calling OpenAI:');
    console.error(e);
    throw e;
  }
}
