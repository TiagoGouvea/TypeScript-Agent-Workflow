import { describe, it, expect, vi } from 'vitest';
import { slackMessage } from '../../src/tools/slackMessage';

const webhookUrl = process.env.SLACK_WEBHOOK_URL;

describe('slackMessage tool', () => {
  it('should send a basic message successfully', async () => {
    // Real test with environment webhook URL
    const result = await slackMessage.run({
      webhookUrl,
      text:
        'Hello from TypeScript Agent Workflow! - ' + new Date().toISOString(),
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe('Message sent successfully');
    expect(result.timestamp).toBeDefined();
  });
});
