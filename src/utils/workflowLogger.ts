import fs from 'fs';
import path from 'path';

export interface WorkflowStepLogPayload {
  stepIndex: number;
  stepKey: string;
  stepName?: string;
  input: unknown;
  structuredOutput: unknown;
  rawOutput: unknown;
  globalStateSnapshot: Record<string, any>;
}

function safeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return JSON.stringify({ error: 'Unable to serialize value', details: String(error) });
  }
}

export class WorkflowStepLogger {
  private baseDir: string;
  private currentRunDir: string | null = null;

  constructor(baseDir = './temp/workflow-logs') {
    this.baseDir = baseDir;
  }

  startRun(workflowName: string, runLabel?: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const workflowDir = path.join(this.baseDir, safeName(workflowName || 'workflow'));
    const runDir = path.join(workflowDir, safeName(runLabel || timestamp));

    fs.mkdirSync(runDir, { recursive: true });
    this.currentRunDir = runDir;

    return runDir;
  }

  logStep(payload: WorkflowStepLogPayload): void {
    if (!this.currentRunDir) return;

    const { stepIndex, stepKey, stepName, input, structuredOutput, rawOutput, globalStateSnapshot } = payload;

    const fileName = `${String(stepIndex).padStart(2, '0')}-${safeName(stepKey || `step-${stepIndex}`)}.md`;
    const filePath = path.join(this.currentRunDir, fileName);
    const executedAt = new Date().toISOString();

    const content = [
      `# Step ${String(stepIndex).padStart(2, '0')} - ${stepName ?? stepKey}`,
      '',
      `- Step key: ${stepKey}`,
      `- Step name: ${stepName ?? 'none'}`,
      `- Executed at: ${executedAt}`,
      '',
      '## Input',
      '```json',
      formatJson(input),
      '```',
      '',
      '## Output (structured)',
      '```json',
      formatJson(structuredOutput),
      '```',
      '',
      '## Output (raw)',
      '```json',
      formatJson(rawOutput),
      '```',
      '',
      '## Global State Snapshot',
      '```json',
      formatJson(globalStateSnapshot),
      '```',
      '',
    ].join('\n');

    try {
      fs.writeFileSync(filePath, content, 'utf8');
    } catch (error) {
      console.warn(`Failed to write workflow step log to ${filePath}:`, error);
    }
  }

  endRun(): void {
    this.currentRunDir = null;
  }
}
