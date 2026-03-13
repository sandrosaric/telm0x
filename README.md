# telm0x

**Quiet observability for OpenRouter agents.**

```
npm install telm0x
```

Or install from GitHub:
```
npm install github:sandrosaric/telm0x
```

## Why telm0x?

LLM costs are a black box. Most telemetry tools are too heavy, too loud, or too expensive. You just want to know what your agents are spending without breaking your focus.

**telm0x** is a two-line wrapper for your OpenRouter client. It traces every token and every cent in the background. No latency. No bloat. No complex configuration.

## The Problem

- GPT-5 makes 50 calls to solve one task
- Claude thinks for 30 seconds (reasoning tokens)
- OpenRouter routes through 3 providers

**You need to see the real cost, not just the API logs.**

## The Solution

```javascript
import { wrapClient } from 'telm0x';
import { OpenRouter } from "@openrouter/sdk";

const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY
});
const client = wrapClient(openrouter, process.env.TELM0X_API_KEY);

// Use client.chat.send() - costs tracked automatically
const response = await client.chat.send({
  model: "google/gemini-2.5-flash",
  messages: [{ role: "user", content: "Hello" }]
});
```

Get your free API key at: **sandrobuilds.com/tools/telm0x**

## Quick Setup with AI Agent

Copy this prompt and give it to your coding agent (Cursor, Claude Code, etc.):

```
I want to add telemetry tracking to my OpenRouter API calls using telm0x.

1. First, install telm0x: npm install telm0x

2. Check if I'm using the OpenRouter SDK or raw axios/fetch:
   - If using OpenRouter SDK like: const openrouter = new OpenRouter({...}) 
     → Use wrapClient approach:
     import { wrapClient } from 'telm0x';
     const client = wrapClient(openrouter, process.env.TELM0X_API_KEY);
     Then replace all openrouter.chat.send() calls with client.chat.send()

   - If using raw axios/fetch like: axios.post("https://openrouter.ai/api/v1/chat/completions",...)
     → Use trackUsage after each call:
     import { trackUsage } from 'telm0x';
     After the axios response, add:
     const usage = response.data.usage || {};
     trackUsage(process.env.TELM0X_API_KEY, {
       model: response.data.model,
       provider: 'openrouter',
       inputTokens: usage.prompt_tokens || 0,
       outputTokens: usage.completion_tokens || 0,
       latencyMs: Date.now() - startTime
     }).catch(() => {});

3. Add TELM0X_API_KEY=ghost_your_generated_key to my .env file
   (Get your key at sandrobuilds.com/tools/telm0x)

4. Make sure all API calls are updated and working - test one call
```

### With Raw HTTP (axios/fetch)

If you're using raw axios or fetch instead of the OpenRouter SDK:

```javascript
import { trackUsage } from 'telm0x';

async function getAIResponse(messages) {
  const start = Date.now();
  
  const response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    { model: "openai/gpt-4o", messages, temperature: 0.1 },
    { headers: { "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}` } }
  );
  
  const latencyMs = Date.now() - start;
  const usage = response.data.usage || {};
  
  // Track usage after each call
  trackUsage(process.env.TELM0X_API_KEY, {
    model: response.data.model,
    provider: 'openrouter',
    inputTokens: usage.prompt_tokens || 0,
    outputTokens: usage.completion_tokens || 0,
    latencyMs
  }).catch(() => {}); // Silent failure - never crash your agent
  
  return response.data.choices[0].message;
}
```

For streaming with axios, track after the stream completes:

```javascript
async function* streamAIResponse(messages) {
  const start = Date.now();
  let fullContent = '';
  let usage = null;
  
  const response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    { model: "openai/gpt-4o", messages, stream: true },
    { 
      headers: { "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}` },
      responseType: 'stream' 
    }
  );

  for await (const chunk of response.data) {
    const line = chunk.toString();
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      if (data.choices?.[0]?.delta?.content) {
        fullContent += data.choices[0].delta.content;
      }
      if (data.usage) usage = data.usage;
      if (data.choices?.[0]?.finish_reason) {
        // Stream ended - track now
        const latencyMs = Date.now() - start;
        trackUsage(process.env.TELM0X_API_KEY, {
          model: data.model || 'openai/gpt-4o',
          provider: 'openrouter',
          inputTokens: usage?.prompt_tokens || Math.ceil(fullContent.length / 4),
          outputTokens: usage?.completion_tokens || Math.ceil(fullContent.length / 4),
          latencyMs
        }).catch(() => {});
      }
    }
    yield chunk.toString();
  }
}
```

## Features

### OpenRouter Only
- Works with any model on OpenRouter
- google/gemini-2.5-flash, openai/gpt-4o, anthropic/claude-3.5-sonnet, and more
- Automatic provider detection

### Streaming Support
```javascript
const stream = await client.chat.send({
  model: "google/gemini-2.5-flash",
  messages: [{ role: "user", content: "Write a story" }],
  stream: true,
  streamOptions: { includeUsage: true }
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
// Usage data captured automatically when stream ends
```

### Session Tracking (for Agents)
```javascript
const client = wrapClient(openrouter, 'YOUR_KEY', { agentName: 'research-agent' });

// Group multiple calls into one session
await client.chat.send({
  model: "google/gemini-2.5-flash",
  messages: [{ role: "user", content: "Research competitor X" }],
  metadata: { sessionId: 'research-001' }
});

await client.chat.send({
  model: "google/gemini-2.5-flash", 
  messages: [{ role: "user", content: "Summarize findings" }],
  metadata: { sessionId: 'research-001' }
});
// Both calls grouped under session "research-001"
```

### Custom Endpoint
```javascript
// Use your own endpoint (for enterprise/self-hosted)
const client = wrapClient(openrouter, 'YOUR_KEY', { 
  endpoint: 'https://your-server.com/api/ingest' 
});
```

## API Reference

### wrapClient(client, apiKey, options)

Wraps an OpenRouter client to automatically track usage.

**Parameters:**
- `client` - OpenRouter client instance
- `apiKey` - Your telm0x API key (get at sandrobuilds.com/tools/telm0x)
- `options` - Optional configuration
  - `endpoint` - Custom ingestion endpoint
  - `agentName` - Name for this agent (for labeling in dashboard)

**Returns:** Wrapped client (drop-in replacement)

### trackUsage(apiKey, payload, endpoint)

Manual tracking function.

```javascript
import { trackUsage } from 'telm0x';

await trackUsage('YOUR_KEY', {
  model: 'google/gemini-2.5-flash',
  provider: 'openrouter',
  inputTokens: 100,
  outputTokens: 250,
  latencyMs: 1200
});
```

### createTracker(apiKey, options)

Create a tracker instance for repeated use.

```javascript
import { createTracker } from 'telm0x';

const tracker = createTracker('YOUR_KEY', { agentName: 'my-agent' });

// Track any event
tracker.track({
  model: 'google/gemini-2.5-flash',
  inputTokens: 100,
  outputTokens: 250
});
```

## Dashboard

Your dashboard is live at: **sandrobuilds.com/tools/telm0x**

### What it shows:

| Metric | Description |
|--------|-------------|
| Today's Spend | Total cost in last 24 hours |
| 7-Day Total | Total cost in last week |
| Model Breakdown | Cost per model with token counts |
| Hourly Costs | 24-hour cost chart |
| Agent Sessions | Multi-call sessions grouped by sessionId |

## Anonymous Mode

No signup required. 

1. Visit **sandrobuilds.com/tools/telm0x**
2. Copy your auto-generated API key
3. Start tracking

Your data is saved automatically.

## For Whom

- **For the independent builder** who needs to track margins.
- **For the experimenter** who wants to see which models are actually efficient.
- **For the minimalist** who hates adding heavy dependencies to their package.json.

## Tech Details

- Zero latency impact (fire-and-forget)
- Works with OpenRouter SDK
- TypeScript compatible
- ~1KB gzipped
- Silent failures - SDK never crashes your production agent

## Security

- API key uses high-entropy UUID format (`ghost_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
- Ingestion endpoint is read-only (POST only)
- Keys stored in localStorage (browser) or env vars (server)
- No credentials ever touch the SDK

## License

MIT

---

**The code is open-source. The data is yours. The focus remains on the craft.**
