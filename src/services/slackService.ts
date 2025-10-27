import axios from 'axios';
import chalk from 'chalk';

export interface SlackMessageParams {
  webhookUrl: string;
  text: string;
  username?: string;
  channel?: string;
  iconEmoji?: string;
}

export interface SlackMessageResult {
  success: boolean;
  message?: string;
  timestamp?: string;
  error?: string;
  details?: unknown;
}

export class SlackService {
  static async sendMessage(params: SlackMessageParams): Promise<SlackMessageResult> {
    const { webhookUrl, text, username, channel, iconEmoji } = params;

    if (!webhookUrl) {
      return {
        success: false,
        error: 'Missing required parameter: webhookUrl',
      };
    }

    if (!text) {
      return {
        success: false,
        error: 'Missing required parameter: text',
      };
    }

    console.log(
      chalk.bgBlue(' SLACK MESSAGE '),
      chalk.blue(
        `Sending message to Slack${username ? ` as ${username}` : ''}${channel ? ` on ${channel}` : ''}...`,
      ),
    );

    const payload: Record<string, unknown> = {
      text,
    };

    if (username === 'none') payload.username = null;
    else if (username) payload.username = username;

    if (channel === 'none') payload.channel = null;
    else if (channel) payload.channel = channel;

    if (iconEmoji === 'none') payload.icon_emoji = null;
    else if (iconEmoji) payload.icon_emoji = iconEmoji;

    try {
      const response = await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200 && response.data === 'ok') {
        console.log(chalk.green('✓ Message sent successfully to Slack'));
        return {
          success: true,
          message: 'Message sent successfully',
          timestamp: new Date().toISOString(),
        };
      }

      console.error('Unexpected response from Slack:', response.data);
      return {
        success: false,
        error: 'Unexpected response from Slack',
        details: response.data,
      };
    } catch (error: any) {
      const errorMessage = error?.response?.data || error?.message || 'Unknown error';
      console.error(chalk.red('Error sending message to Slack:'), errorMessage);
      return {
        success: false,
        error: 'Failed to send message to Slack',
        details: errorMessage,
      };
    }
  }
}
