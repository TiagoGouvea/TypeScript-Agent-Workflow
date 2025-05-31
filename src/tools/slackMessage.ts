import axios from 'axios';
import chalk from 'chalk';
import { z } from 'zod';
import { tool } from '../types/workflow/Tool.ts';

export const slackMessage = tool({
  name: 'slackMessage',
  description: 'Send a message to a Slack channel using webhook URL',
  params: z.object({
    webhookUrl: z.string().url().describe('Slack webhook URL for the channel'),
    text: z.string().describe('Message text to send to the channel'),
    username: z
      .string()
      .describe(
        'Optional custom username for the message.. Send "none" for no user.',
      ),
    channel: z
      .string()
      .describe(
        'Optional channel override (e.g., #general). Send "none" for no channel.',
      ),
    iconEmoji: z
      .string()
      .describe(
        'Optional emoji icon for the message (e.g., :robot_face:). Send "none" for no icon',
      ),
  }),
  run: async (params) => {
    const { webhookUrl, text, username, channel, iconEmoji } = params;

    console.log(
      chalk.bgBlue(' SLACK MESSAGE '),
      chalk.blue(
        `Sending message to Slack ${username ? `to ${username}` : ''} ${channel ? `on channel: ${channel}` : ''}...`,
      ),
    );

    const payload: any = {
      text,
    };

    if (username === 'none') payload.username = null;
    if (channel === 'none') payload.channel = null;
    if (iconEmoji === 'none') payload.icon_emoji = null;

    if (username) payload.username = username;
    if (channel) payload.channel = channel;
    if (iconEmoji) payload.icon_emoji = iconEmoji;

    try {
      // console.log('webhookUrl', webhookUrl);
      // console.log('payload', payload);
      const response = await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // console.log('response', response);

      if (response.status === 200 && response.data === 'ok') {
        console.log(chalk.green('✓ Message sent successfully to Slack'));
        return {
          success: true,
          message: 'Message sent successfully',
          timestamp: new Date().toISOString(),
        };
      } else {
        console.error('Unexpected response from Slack:', response.data);
        return {
          success: false,
          error: 'Unexpected response from Slack',
          response: response.data,
        };
      }
    } catch (error: any) {
      const errorMessage = error.response?.data || error.message;
      console.error(chalk.red('Error sending message to Slack:'), errorMessage);
      return {
        success: false,
        error: 'Failed to send message to Slack',
        details: errorMessage,
      };
    }
  },
});
