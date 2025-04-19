import fs from 'fs';
import path from 'node:path';
import { ucfirst } from './utils/string.ts';
import { parseCommandLineArgs } from './utils/commandLine.ts';
import { systemAsks, systemInfo } from './utils/log.ts';

// Constraints
const agenciesDir = './src/_agencies';
const workflowsDir = './src/_workflows';

// Function to dynamically import and execute a workflow
async function executeWorkflow(workflowName: string) {
  try {
    const workflowModule = await import(
      `./_workflows/${workflowName}/${workflowName}.ts`
    );
    if (workflowModule && workflowModule.testWorkflow) {
      systemInfo(`🚀 Executing workflow ${ucfirst(workflowName)}`);
      console.log('');
      await workflowModule.testWorkflow.execute();
      console.log('');
      systemInfo(`✅ Workflow ${ucfirst(workflowName)} completed.`);
    } else {
      console.error(`No valid workflow export found in "${workflowName}"`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`Error executing workflow ${workflowName}:`, err);
    process.exit(1);
  }
}

// Check if a specific workflow was requested
const requestedWorkflow = parseCommandLineArgs();
if (requestedWorkflow) {
  const { workflowName } = requestedWorkflow;
  const workflowPath = `${workflowsDir}/${workflowName}`;

  if (fs.existsSync(workflowPath) && fs.statSync(workflowPath).isDirectory()) {
    executeWorkflow(workflowName).catch((err) => {
      console.error(`Failed to execute workflow ${workflowName}:`, err);
      process.exit(1);
    });
  } else {
    console.error(`Workflow "${workflowName}" not found!`);
    process.exit(1);
  }
} else {
  // Continue with the interactive menu if no specific workflow was requested
  showInteractiveMenu().then();
}

async function showInteractiveMenu() {
  // Get _agencies and workflow directories
  const agencyFiles = listDirs(agenciesDir);
  const workflowDirs = listDirs(workflowsDir);
  if (agencyFiles.length === 0 && workflowDirs.length === 0) {
    console.error('No Agencies or Workflows found!');
    process.exit(1);
  }

  // Unify the entries in one list
  type Entry = { name: string; filePath: string; type: 'agency' | 'workflow' };
  const entries: Entry[] = [];
  agencyFiles.forEach((file) =>
    entries.push({
      name: ucfirst(file.replace(/\.ts$/, '')),
      filePath: `${agenciesDir}/${file}`,
      type: 'agency',
    }),
  );
  workflowDirs.forEach((file) =>
    entries.push({
      name: ucfirst(file),
      filePath: `${workflowsDir}/${file}`,
      type: 'workflow',
    }),
  );

  // Show selection list
  console.log('Agencies:');
  entries.forEach((entry, index) => {
    if (entry.type === 'agency')
      console.log(`${index + 1}. [${entry.type}] ${entry.name}`);
  });
  console.log('');
  console.log('Workflows:');
  entries.forEach((entry, index) => {
    if (entry.type === 'workflow')
      console.log(`${index + 1}. [${entry.type}] ${entry.name}`);
  });
  console.log('');

  // Ask which entry to run
  const answer = await systemAsks('Which entry do you want to run?');
  const index = parseInt(answer, 10) - 1;
  if (isNaN(index) || index < 0 || index >= entries.length) {
    console.error('Invalid entry!');
    process.exit(1);
  }
  const chosen = entries[index];

  if (chosen.type === 'workflow') {
    // Extract workflow name from path
    const workflowName = path.basename(chosen.filePath);
    await executeWorkflow(workflowName);
  } else {
    // For agencies, we still use the old method for now
    runAgency(chosen);
  }
}

// Run an agency with a new Node.js process (keeping this for agencies only)
function runAgency() {
  console.log(`Agency execution is not yet implemented in the same process.`);
  console.log(`Please update the implementation for agencies.`);
  process.exit(1);
}

function listDirs(dir: string): string[] {
  try {
    return fs
      .readdirSync(dir)
      .filter((file) => fs.statSync(`${dir}/${file}`).isDirectory());
  } catch {
    return [];
  }
}
