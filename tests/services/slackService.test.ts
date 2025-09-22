import { describe, it, expect } from 'vitest';
import { SlackService } from '../../src/services/slackService';

const webhookUrl = process.env.SLACK_WEBHOOK_URL;
const hasWebhookUrl = !!webhookUrl;

describe('SlackService', () => {
  it('should validate missing parameters', async () => {
    const result = await SlackService.sendMessage({
      webhookUrl: '',
      text: '',
    } as any);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Missing required parameter: webhookUrl');
  });
});

describe.skipIf(!hasWebhookUrl)('SlackService (integration)', () => {
  it('should send a message successfully', async () => {
    const result = await SlackService.sendMessage({
      webhookUrl: webhookUrl!,
      text: 'Hello from TypeScript Agent Workflow Service! - ' + new Date().toISOString(),
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe('Message sent successfully');
    expect(result.timestamp).toBeDefined();
  });
});
