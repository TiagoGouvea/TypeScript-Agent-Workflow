import { z } from 'zod';
import { tool } from '../types/workflow/Tool.ts';
import { DiscordService, DiscordEmbed } from '../services/discordService.ts';

export const discordMessage = tool({
  name: 'discordMessage',
  description: 'Send a message to a Discord channel using webhook URL',
  params: z.object({
    webhookUrl: z
      .string()
      .url()
      .describe('Discord webhook URL for the channel'),
    content: z
      .string()
      .optional()
      .describe('Message text to send to the channel'),
    username: z
      .string()
      .optional()
      .describe(
        'Optional custom username for the message. Send "none" for no username override.',
      ),
    avatarUrl: z
      .string()
      .url()
      .optional()
      .describe(
        'Optional avatar URL for the message. Send "none" for no avatar override.',
      ),
    embeds: z
      .array(
        z.object({
          title: z.string().optional().describe('Embed title'),
          description: z.string().optional().describe('Embed description'),
          color: z.number().optional().describe('Embed color (decimal number)'),
          author: z
            .object({
              name: z.string().optional(),
              url: z.string().url().optional(),
              icon_url: z.string().url().optional(),
            })
            .optional()
            .describe('Embed author information'),
          fields: z
            .array(
              z.object({
                name: z.string().describe('Field name'),
                value: z.string().describe('Field value'),
                inline: z
                  .boolean()
                  .optional()
                  .describe('Whether field should be inline'),
              }),
            )
            .optional()
            .describe('Embed fields'),
          thumbnail: z
            .object({
              url: z.string().url().describe('Thumbnail image URL'),
            })
            .optional()
            .describe('Embed thumbnail'),
          image: z
            .object({
              url: z.string().url().describe('Image URL'),
            })
            .optional()
            .describe('Embed image'),
          footer: z
            .object({
              text: z.string().optional().describe('Footer text'),
              icon_url: z.string().url().optional().describe('Footer icon URL'),
            })
            .optional()
            .describe('Embed footer'),
          timestamp: z
            .string()
            .optional()
            .describe('Embed timestamp (ISO string)'),
        }),
      )
      .optional()
      .describe('Optional Discord embeds for rich content'),
  }),
  run: async (params) => {
    const { webhookUrl, content, username, avatarUrl, embeds } = params;

    return DiscordService.sendMessage({
      webhookUrl,
      content: content || '',
      username,
      avatarUrl,
      embeds: embeds as DiscordEmbed[],
    });
  },
});
