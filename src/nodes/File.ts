import fs from 'fs/promises';
import path from 'node:path';
import { logError } from '../utils/log.ts';
import {
  type BaseNodeParams,
  WorkflowNode,
} from '../types/workflow/WorkflowNode.ts';
import type { NodeRunParams } from '../types/workflow/Step.ts';

export type FileMode = 'read' | 'write';

export interface FileNodeParams extends BaseNodeParams {
  mode: FileMode;
  path: string;
  content?: string; // Only used in write mode
}

export interface FileNodeRunParams extends NodeRunParams {
  mode?: FileMode;
  path?: string;
  content?: string;
}

export class FileNode extends WorkflowNode {
  private mode: FileMode;
  private filePath: string;
  private content?: string;

  constructor(params: FileNodeParams) {
    super(params);
    this.mode = params.mode;
    this.filePath = params.path;
    this.content = params.content;
  }

  async execute(params: FileNodeRunParams): Promise<any> {
    try {
      // Override params if provided in runtime
      const mode = params.mode || this.mode;
      const filePath = params.path || this.filePath;
      const content = params.content || this.content;

      if (mode === 'read') {
        return await this.readFile(filePath);
      } else if (mode === 'write') {
        if (!content) {
          throw new Error('Content is required for write mode');
        }
        return await this.writeFile(filePath, content);
      } else {
        throw new Error(`Invalid mode: ${mode}`);
      }
    } catch (err: unknown) {
      const error = err as Error;
      logError('Error in FileNode:', error.message || String(error));
      console.error(error);
      process.exit(1);
    }
  }

  private async readFile(
    filePath: string,
  ): Promise<string | Record<string, string>> {
    try {
      const stats = await fs.stat(filePath);

      if (stats.isDirectory()) {
        // Lendo um diretório
        const files = await fs.readdir(filePath);
        let joinedContent = ''; // Conteúdo completo como string única
        
        // Ordena os arquivos para ter um resultado consistente
        const sortedFiles = files.sort();
        
        for (const file of sortedFiles) {
          const fullPath = path.join(filePath, file);
          const fileStats = await fs.stat(fullPath);
          
          if (fileStats.isFile()) {
            try {
              // Lê o conteúdo do arquivo
              const fileContent = await fs.readFile(fullPath, 'utf8');
              
              // Adiciona cabeçalho e conteúdo ao resultado
              if (joinedContent) {
                joinedContent += '\n\n'; // Adiciona linha em branco entre arquivos
              }
              
              // Adiciona cabeçalho e conteúdo
              joinedContent += `# ${fullPath}\n${fileContent}`;
            } catch (err) {
              // Ignora erros de leitura de arquivos individuais
              console.error(`Erro ao ler arquivo ${fullPath}:`, err);
            }
          }
        }
        
        // Retorna o conteúdo concatenado como string única
        return joinedContent;
      } else {
        // Lendo um arquivo único
        try {
          const content = await fs.readFile(filePath, 'utf8');
          // Retorna com cabeçalho e conteúdo
          return `# ${filePath}\n${content}`;
        } catch (err) {
          throw new Error(`Failed to read from ${filePath}: ${(err as Error).message}`);
        }
      }
    } catch (err: unknown) {
      const error = err as Error;
      throw new Error(`Failed to read from ${filePath}: ${error.message}`);
    }
  }

  private async writeFile(filePath: string, content: string): Promise<boolean> {
    try {
      const dirPath = path.dirname(filePath);

      // Create directory if it doesn't exist
      await fs.mkdir(dirPath, { recursive: true });

      await fs.writeFile(filePath, content, 'utf8');
      return true;
    } catch (err: unknown) {
      const error = err as Error;
      throw new Error(`Failed to write to ${filePath}: ${error.message}`);
    }
  }
}