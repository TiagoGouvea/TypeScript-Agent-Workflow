import axios from 'axios';
import chalk from 'chalk';

export interface DiscordMessageParams {
  webhookUrl: string;
  content?: string;
  username?: string;
  avatarUrl?: string;
  embeds?: DiscordEmbed[];
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  author?: {
    name?: string;
    url?: string;
    icon_url?: string;
  };
  fields?: {
    name: string;
    value: string;
    inline?: boolean;
  }[];
  thumbnail?: {
    url: string;
  };
  image?: {
    url: string;
  };
  footer?: {
    text?: string;
    icon_url?: string;
  };
  timestamp?: string;
}

export interface DiscordMessageResult {
  success: boolean;
  message?: string;
  timestamp?: string;
  error?: string;
  details?: unknown;
}

export class DiscordService {
  static async sendMessage(
    params: DiscordMessageParams,
  ): Promise<DiscordMessageResult> {
    const { webhookUrl, content, username, avatarUrl, embeds } = params;

    if (!webhookUrl) {
      return {
        success: false,
        error: 'Missing required parameter: webhookUrl',
      };
    }

    if (!content && (!embeds || embeds.length === 0)) {
      return {
        success: false,
        error: 'Missing required parameter: content or embeds',
      };
    }

    console.log(
      chalk.bgMagenta(' DISCORD MESSAGE '),
      chalk.magenta(
        `Sending message to Discord${username ? ` as ${username}` : ''}...`,
      ),
    );

    const payload: Record<string, unknown> = {};

    if (content) payload.content = content;

    if (username === 'none') payload.username = null;
    else if (username) payload.username = username;

    if (avatarUrl === 'none') payload.avatar_url = null;
    else if (avatarUrl) payload.avatar_url = avatarUrl;

    if (embeds && embeds.length > 0) payload.embeds = embeds;

    try {
      const response = await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 204) {
        console.log(chalk.green('✓ Message sent successfully to Discord'));
        return {
          success: true,
          message: 'Message sent successfully',
          timestamp: new Date().toISOString(),
        };
      }

      console.error('Unexpected response from Discord:', response.data);
      return {
        success: false,
        error: 'Unexpected response from Discord',
        details: response.data,
      };
    } catch (error: any) {
      const errorMessage =
        error?.response?.data || error?.message || 'Unknown error';
      console.error(
        chalk.red('Error sending message to Discord:'),
        errorMessage,
      );
      return {
        success: false,
        error: 'Failed to send message to Discord',
        details: errorMessage,
      };
    }
  }
}
