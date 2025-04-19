import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import chalk from 'chalk';

export async function rlQuestion(prompt: string): Promise<string> {
  const rl = readline.createInterface({ input, output });
  // const answer = await rl.question(chalk.green(prompt) + ' ');
  const answer = await rl.question(
    chalk.bgMagenta(' SYSTEM ') + ' ' + chalk.magenta(prompt) + ' ',
  );
  rl.close();
  return answer;
}

export async function rlQuestionPrefixed(prompt: string): Promise<string> {
  const rl = readline.createInterface({ input, output });
  // const answer = await rl.question(chalk.green(prompt) + ' ');
  const answer = await rl.question(prompt);
  rl.close();
  return answer;
}
