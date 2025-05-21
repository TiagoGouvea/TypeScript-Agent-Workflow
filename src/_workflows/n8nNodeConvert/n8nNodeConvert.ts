import { z } from 'zod';
import { Workflow } from '../../types/workflow/Workflow.ts';
import { InputSource } from '../../types/workflow/Input.ts';
import { AgentNode } from '../../nodes/Agent.ts';
import { crawlbase } from '../../tools/crawlbase.ts';
import { FileNode } from '../../nodes/File.ts';
import path from 'node:path';
import { CodeNode } from '../../nodes/Code.ts';

// Will try to convert a n8n node into a TypeScript-Agent-Workflow node
// Steps
// 1 - findNode - Ask the node to be converted and try to find it
// 2 - loadN8nNodeFile - Read all files from the n8n node
// 2 - Load sample local files
// 3 - Write a equivalent node

const getN8nNodeList = new CodeNode({
  name: 'I will get all n8n nodes from the repository',
  // inputSource: InputSource.None,
  outputSchema: z.object({
    nodes: z.array(z.object({ name: z.string(), url: z.string() })),
  }),
  run: async (params: any): Promise<any> => {
    const response = await fetch(
      'https://api.github.com/repos/n8n-io/n8n/contents/packages/nodes-base/nodes',
    );
    const data = await response.json();
    const nodes = data.map((node: any) => ({
      name: node.name,
      url: node.html_url,
    }));
    console.log('Got ' + nodes.length + ' nodes');
    return {
      nodes: nodes,
    } as any;
  },
});

// Receive the list + talk with the user + return the selected
const selectNode = new AgentNode({
  introductionText:
    'I need to know which n8n node we will convert to a TypeScript-Agent-Workflow node',
  inputSource: InputSource.LastStepAndUserInput,
  inputSchema: getN8nNodeList.outputSchema,
  outputSchema: z.object({
    nodeName: z.string(),
    nodeUrl: z.string(),
    // .startsWith(
    //   'https://github.com/n8n-io/n8n/tree/master/packages/nodes-base/nodes/',
    //   {
    //     message:
    //       "Should start with 'https://github.com/n8n-io/n8n/tree/master/packages/nodes-base/nodes/'",
    //   },
    // ),
  }),
  systemPrompt: `
  You have a list of n8n nodes (name/url).

  You must ask which node the user want convert, asking for the n8n node name.

  If you find more than one node with similar names, ask for the user to choose the right one.
  
  The final result should be just one node, and have the full node source code URL starting with https://github.com/n8n-io/n8n/tree/master/packages/nodes-base/nodes/
  
  If you cannot find the node, tell it to the user, ask him to make sure he have the right node name.
  
  Just continue to the next workflow step when you have found the exactly node.
  `,
  debug: false,
});

const loadN8nNodeFile = new AgentNode({
  introductionText: 'I will read the content of the n8n node files',
  inputSource: InputSource.LastStep,
  inputSchema: selectNode.outputSchema,
  outputSchema: z.object({
    files: z.array(z.object({ path: z.string(), content: z.string() })),
  }),
  tools: [crawlbase],
  systemPrompt: `
  We need the contents from the n8n node {nodeName}.
  
  You must read the contents from the all the code files (.ts, .js, .json) inside the {nodeUrl} e retornar seus conteúdos no formato abaixo.
  
  Starting reading the base {nodeUrl} to see the files and folders, and with the result continue reading all files inside {nodeUrl} recursively.
  
  Do not crawl files outside the {nodeUrl} folder.
  
  Retorno:
  Retornar todo o conteúdo dos arquivos no formato:
  \`\`\`
  # path/fileName.ts
  [file content]
  
  # path/fileName2.ts
  [file content2]
  \`\`\`
  `,
});

const sampleNodeFile = path.join(process.cwd(), 'src', 'nodes', 'File.ts');

const loadLocalFiles = new FileNode({
  introductionText: 'I will read a sample local file',
  inputSource: InputSource.LastStep,
  inputSchema: selectNode.outputSchema,
  outputSchema: z.string(),
  // FileNodeParams
  path: sampleNodeFile,
  mode: 'read',
});

// @todo When inputSouce = global, inputSchema will be...?

const createLocalNode = new AgentNode({
  introductionText: 'I will write the final node',
  inputSource: InputSource.Global,
  inputSchema: z.any(),
  outputSchema: z.object({
    nodeFiles: z.string(),
  }),
  tools: [crawlbase],
  systemPrompt: `
  You are a experienced developer and will "translate" a n8n node to a TypeScript-Agent-Workflow.
  
  You have all the files from n8n node {nodeName}, and you have a sample TypeScript-Agent-Workflow node file.
  
  You must create a TypeScript-Agent-Workflow node file following the sample file.
  
  If some code could not be translated directly, draft some code to represent that the could should do.
  
  Return like this:
  \`\`\`
  # path/fileName.ts
  [file content]
  
  # path/fileName2.ts
  [file content2]
  \`\`\`
  `,
});

// const testWorkflow = new Workflow({ getN8nNodeList, selectNode });
// const testWorkflow = new Workflow({ findNode, loadLocalFiles });
const testWorkflow = new Workflow({
  getN8nNodeList,
  selectNode,
  loadN8nNodeFile,
  loadLocalFiles,
  createLocalNode,
});
// const testWorkflow = new Workflow({ loadLocalFiles });
await testWorkflow.execute();

console.log('🏁 🏁 🏁 🏁 🏁 🏁 🏁 🏁 🏁 🏁 🏁 🏁');
console.log('This is the final node converted!');
const result = testWorkflow.getResult('rawData');
console.log(result);
