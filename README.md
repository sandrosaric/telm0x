# sbtelemetry

Two-line observability for AI agents. Track costs, tokens, latency, and reasoning across OpenAI, Anthropic, and OpenRouter.

```
npm install github:sandrobuilds/agent-telemetry
```

## Why AgentTelemetry?

Every AI agent developer has the same problem: **you don't know how much your agent is costing you.**

- GPT-5 makes 50 calls to solve one task
- Claude thinks for 30 seconds (reasoning tokens)
- OpenRouter routes through 3 providers

**You need to see the real cost, not just the API logs.**

AgentTelemetry gives you a dashboard in 2 lines of code.

## Quick Start

```javascript
import OpenAI from 'openai';
import { wrapClient } from 'agent-telemetry';

const client = wrapClient(new OpenAI({ apiKey: process.env.OPENAI_API_KEY }), 'YOUR_API_KEY');

// Use normally - costs tracked automatically
const response = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello' }]
});
```

Get your free API key at: **sandrobuilds.com/tools/agent-telemetry**

## Features

### Multi-Provider Support
- OpenAI (GPT-4o, GPT-4o-mini, GPT-5)
- Anthropic (Claude 4, Claude 3.5)
- OpenRouter (any model)

### Streaming Support
```javascript
const stream = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Write a story' }],
  stream: true
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
// Usage data captured automatically when stream ends
```

### Session Tracking (for Agents)
```javascript
const client = wrapClient(openai, 'YOUR_KEY', { agentName: 'research-agent' });

// Group multiple calls into one session
await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Research competitor X' }],
  metadata: { sessionId: 'research-001' }
});

await client.chat.completions.create({
  model: 'gpt-4o', 
  messages: [{ role: 'user', content: 'Summarize findings' }],
  metadata: { sessionId: 'research-001' }
});
// Both calls grouped under session "research-001"
```

### Custom Endpoint
```javascript
// Use your own endpoint (for enterprise/self-hosted)
const client = wrapClient(openai, 'YOUR_KEY', { 
  endpoint: 'https://your-server.com/api/ingest' 
});
```

## API Reference

### wrapClient(client, apiKey, options)

Wraps an OpenAI/Anthropic client to automatically track usage.

**Parameters:**
- `client` - OpenAI or compatible client instance
- `apiKey` - Your AgentTelemetry API key (get at sandrobuilds.com/tools/agent-telemetry)
- `options` - Optional configuration
  - `endpoint` - Custom ingestion endpoint
  - `agentName` - Name for this agent (for labeling in dashboard)

**Returns:** Wrapped client (drop-in replacement)

### trackUsage(apiKey, payload, endpoint)

Manual tracking function.

```javascript
import { trackUsage } from 'agent-telemetry';

await trackUsage('YOUR_KEY', {
  model: 'gpt-4o',
  provider: 'openai',
  inputTokens: 100,
  outputTokens: 250,
  latencyMs: 1200
});
```

### createTracker(apiKey, options)

Create a tracker instance for repeated use.

```javascript
import { createTracker } from 'agent-telemetry';

const tracker = createTracker('YOUR_KEY', { agentName: 'my-agent' });

// Track any event
tracker.track({
  model: 'gpt-4o',
  inputTokens: 100,
  outputTokens: 250
});
```

## Dashboard

Your dashboard is live at: **sandrobuilds.com/tools/agent-telemetry**

### What it shows:

| Metric | Description |
|--------|-------------|
| Today's Spend | Total cost in last 24 hours |
| 7-Day Total | Total cost in last week |
| Provider Breakdown | Cost per provider (OpenAI, Anthropic, OpenRouter) |
| Model Breakdown | Cost per model with token counts |
| 🧠 Reasoning Tokens | Thinking tokens (from Claude 4, GPT-5) |
| Agent Sessions | Multi-call sessions grouped by sessionId |

## Anonymous Mode

No signup required. 

1. Visit **sandrobuilds.com/tools/agent-telemetry**
2. Copy your auto-generated API key
3. Start tracking

Your data is saved automatically. Claim your dashboard anytime to save history and set budget alerts.

## Pricing

**Free while in beta.**

- Unlimited calls
- 7-day data retention
- All providers included

## Tech Details

- Zero latency impact (fire-and-forget)
- Works with OpenAI SDK v4+
- TypeScript compatible
- 1KB gzipped

## License

MIT
