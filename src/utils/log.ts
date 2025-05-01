import chalk from 'chalk';
import { rlQuestionPrefixed } from './rlQuestion.ts';
import util from 'util';
import debug from 'debug';

util.inspect.defaultOptions.depth = null;
util.inspect.defaultOptions.colors = true;

export const logStep = debug('taw:workflow:step');

export function critical(message: string, ...args: any[]) {
  console.error(chalk.bgRed(' 🔥 CRITICAL '), chalk.red(message), ...args);
}

export function logError(message: string, ...args: any[]) {
  console.error(chalk.bgRed(' ERROR '), chalk.red(message), ...args);
}

export function warn(message: string, ...args: any[]) {
  console.log(chalk.bgYellow(' WARN '), chalk.yellow(message), ...args);
}

export function systemInfo(message: string, ...args: any[]) {
  console.log(chalk.bgMagenta(' SYSTEM '), chalk.magenta(message), ...args);
}

export function llmInfo(message: string, ...args: any[]) {
  console.log(chalk.bgGray(' LLM '), chalk.gray(message), ...args);
}

export function logDebug(message: string, ...args: any[]) {
  console.log(chalk.bgGray(' DEBUG '), chalk.gray(message), ...args);
}

export function systemAsks(prompt: string) {
  return rlQuestionPrefixed(
    chalk.bgMagenta(' SYSTEM ') + ' ' + chalk.magenta(prompt) + ' ',
  );
}

export function workflowInfo(message: string, ...args: any[]) {
  console.log(chalk.bgCyan(' WORKFLOW '), chalk.cyan(message), ...args);
}

export function agentSays(message: string, ...args: any[]) {
  console.log(chalk.bgBlue(' AGENT SAYS '), chalk.blue(message), ...args);
}

export function agentAsks(prompt: string) {
  return rlQuestionPrefixed(
    chalk.bgBlue(' AGENT ASKS ') + ' ' + chalk.blue(prompt) + ' ',
  );
}
