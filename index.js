const ENDPOINT = 'https://sandrobuilds.com/api/v1/agent-telemetry/ingest';

function isAsyncGenerator(obj) {
  return obj && typeof obj === 'object' && typeof obj[Symbol.asyncIterator] === 'function';
}

function calculateCost(model, inputTokens, outputTokens) {
  const PRICING = {
    'gpt-5': { input: 2.5, output: 10.0 },
    'gpt-4o': { input: 5.0, output: 15.0 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'gpt-4-turbo': { input: 10.0, output: 30.0 },
    'gpt-4': { input: 30.0, output: 60.0 },
    'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
    'claude-sonnet-4': { input: 3.0, output: 15.0 },
    'claude-3-5-sonnet': { input: 3.0, output: 15.0 },
    'claude-3-5-haiku': { input: 1.0, output: 5.0 },
    'claude-3-opus': { input: 15.0, output: 75.0 },
    'claude-3-sonnet': { input: 3.0, output: 15.0 },
    'claude-3-haiku': { input: 0.25, output: 1.25 },
  };

  const lower = model.toLowerCase();
  let key = 'gpt-4o-mini';
  if (lower.includes('gpt-5')) key = 'gpt-5';
  else if (lower.includes('gpt-4o-mini')) key = 'gpt-4o-mini';
  else if (lower.includes('gpt-4o')) key = 'gpt-4o';
  else if (lower.includes('gpt-4-turbo')) key = 'gpt-4-turbo';
  else if (lower.includes('gpt-4') && !lower.includes('turbo')) key = 'gpt-4';
  else if (lower.includes('gpt-3.5')) key = 'gpt-3.5-turbo';
  else if (lower.includes('claude-opus')) key = 'claude-3-opus';
  else if (lower.includes('claude-sonnet')) key = 'claude-3-5-sonnet';
  else if (lower.includes('claude-haiku')) key = 'claude-3-haiku';

  const rates = PRICING[key] || PRICING['gpt-4o-mini'];
  return ((inputTokens / 1_000_000) * rates.input) + ((outputTokens / 1_000_000) * rates.output);
}

export function wrapClient(client, atApiKey, options = {}) {
  const originalRequest = client.request?.bind(client) || client.chat?.completions?.create?.bind(client.chat.completions);
  const baseEndpoint = options.endpoint || ENDPOINT;
  const agentName = options.agentName;

  if (!originalRequest) {
    console.warn('agent-telemetry: Could not find request method to wrap');
    return client;
  }

  client.request = async function(params) {
    const start = Date.now();
    const isStreaming = params?.stream || params?.body?.stream;
    const sessionId = params?.sessionId || params?.body?.session_id || params?.metadata?.sessionId;
    const callMetadata = params?.metadata || {};

    let response;
    try {
      response = await originalRequest(params);
    } catch (e) {
      throw e;
    }

    if (isStreaming && response && isAsyncGenerator(response)) {
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let totalReasoningTokens = 0;
      let modelName = params?.body?.model || params?.model;
      let providerName = 'openai';

      return (async function*() {
        for await (const chunk of response) {
          if (chunk.usage) {
            totalInputTokens = chunk.usage.prompt_tokens || chunk.usage.input_tokens || 0;
            totalOutputTokens = chunk.usage.completion_tokens || chunk.usage.output_tokens || 0;
            totalReasoningTokens = chunk.usage.reasoning_tokens || 0;
            modelName = chunk.model || modelName;
            providerName = chunk.provider || providerName;

            const end = Date.now();
            const cost = calculateCost(modelName, totalInputTokens, totalOutputTokens);

            fetch(baseEndpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                apiKey: atApiKey,
                model: modelName,
                provider: providerName,
                inputTokens: totalInputTokens,
                outputTokens: totalOutputTokens,
                reasoningTokens: totalReasoningTokens,
                totalTokens: totalInputTokens + totalOutputTokens,
                latencyMs: end - start,
                cost,
                agentName,
                sessionId,
                metadata: { ...callMetadata, stream: true }
              })
            }).catch(() => {});
          }
          yield chunk;
        }
      })();
    }

    if (!isStreaming && response) {
      const end = Date.now();
      const usage = response.usage || {};
      const inputTokens = usage.prompt_tokens || usage.input_tokens || 0;
      const outputTokens = usage.completion_tokens || usage.output_tokens || 0;
      const reasoningTokens = usage.reasoning_tokens || 0;
      const model = response.model || params?.body?.model;
      const provider = response.provider || 'openai';

      if (model) {
        const cost = calculateCost(model, inputTokens, outputTokens);

        fetch(baseEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: atApiKey,
            model,
            provider,
            inputTokens,
            outputTokens,
            reasoningTokens,
            totalTokens: inputTokens + outputTokens,
            latencyMs: end - start,
            cost,
            agentName,
            sessionId,
            metadata: callMetadata
          })
        }).catch(() => {});
      }
    }

    return response;
  };

  return client;
}

export async function trackUsage(apiKey, payload, endpoint = ENDPOINT) {
  const cost = calculateCost(payload.model, payload.inputTokens, payload.outputTokens);
  return fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, cost, apiKey })
  });
}

export function createTracker(apiKey, options = {}) {
  const baseEndpoint = options.endpoint || ENDPOINT;
  return {
    track(payload) {
      return trackUsage(apiKey, payload, baseEndpoint);
    }
  };
}

export default wrapClient;
