// Parse command line arguments
export function parseCommandLineArgs() {
  const args = process.argv.slice(2);
  const workflowArg = args.find((arg) => arg.startsWith('--workflow='));

  if (workflowArg) {
    const workflowName = workflowArg.replace('--workflow=', '');
    return { workflowName };
  }

  return null;
}
