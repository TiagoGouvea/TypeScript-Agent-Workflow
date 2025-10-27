import { z } from 'zod';
import { tool } from '../types/workflow/Tool.ts';
import { SlackService } from '../services/slackService.ts';

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

    return SlackService.sendMessage({
      webhookUrl,
      text,
      username,
      channel,
      iconEmoji,
    });
  },
});
