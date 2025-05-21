import type { Tool } from 'openai/resources/responses/responses';

export type NodeTool = {
  toolDeclaration: Tool;
  run: any;
};
