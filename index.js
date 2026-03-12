const ENDPOINT = 'https://sandrobuilds.com/api/v1/telm0x/ingest';

function isAsyncGenerator(obj) {
  return obj && typeof obj === 'object' && typeof obj[Symbol.asyncIterator] === 'function';
}

function calculateCost(model, inputTokens, outputTokens) {
  const PRICING = {
    // GPT-5 Family
    'gpt-5-pro': { input: 15.00, output: 120.00 },
    'gpt-5-mini': { input: 0.25, output: 2.00 },
    'gpt-5.3': { input: 1.75, output: 14.00 },
    'gpt-5': { input: 1.25, output: 10.00 },
    // GPT-4o Family
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    // Legacy GPT-4
    'gpt-4-turbo': { input: 10.00, output: 30.00 },
    'gpt-4': { input: 30.00, output: 60.00 },
    'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
    // Claude 4 Family
    'claude-opus-4.6': { input: 5.00, output: 25.00 },
    'claude-opus-4': { input: 5.00, output: 25.00 },
    'claude-sonnet-4.6': { input: 3.00, output: 15.00 },
    'claude-sonnet-4': { input: 3.00, output: 15.00 },
    // Claude 3.5
    'claude-3-5-sonnet': { input: 3.00, output: 15.00 },
    'claude-3-5-haiku': { input: 0.80, output: 4.00 },
    // Claude 3 Legacy
    'claude-3-opus': { input: 15.00, output: 75.00 },
    'claude-3-sonnet': { input: 3.00, output: 15.00 },
    'claude-3-haiku': { input: 0.25, output: 1.25 },
    // Gemini 3 Family
    'gemini-3.1-pro': { input: 2.00, output: 12.00 },
    'gemini-3-pro': { input: 0.50, output: 3.00 },
    'gemini-3-flash': { input: 0.50, output: 3.00 },
    // Gemini 2.5 Family
    'gemini-2.5-pro': { input: 1.25, output: 10.00 },
    'gemini-2.5-flash': { input: 0.30, output: 2.50 },
    'gemini-2.5-flash-lite': { input: 0.10, output: 0.40 },
    // Gemini 2 Family (legacy)
    'gemini-2.0-flash-exp': { input: 0.00, output: 0.00 },
    // Gemini 1.5 Family
    'gemini-1.5-pro': { input: 1.25, output: 5.00 },
    'gemini-1.5-flash': { input: 0.075, output: 0.30 },
    'gemini-1.5-flash-8b': { input: 0.0375, output: 0.15 },
  };

  const lower = model.toLowerCase();
  let key = 'gpt-4o-mini';
  
  // Gemini 3
  if (lower.includes('gemini-3.1-pro')) key = 'gemini-3.1-pro';
  else if (lower.includes('gemini-3-pro')) key = 'gemini-3-pro';
  else if (lower.includes('gemini-3-flash')) key = 'gemini-3-flash';
  // Gemini 2.5
  else if (lower.includes('gemini-2.5-pro')) key = 'gemini-2.5-pro';
  else if (lower.includes('gemini-2.5-flash-lite')) key = 'gemini-2.5-flash-lite';
  else if (lower.includes('gemini-2.5-flash')) key = 'gemini-2.5-flash';
  // Gemini 2
  else if (lower.includes('gemini-2')) key = 'gemini-2.0-flash-exp';
  // Gemini 1.5
  else if (lower.includes('gemini-1.5-pro')) key = 'gemini-1.5-pro';
  else if (lower.includes('gemini-1.5-flash-8b')) key = 'gemini-1.5-flash-8b';
  else if (lower.includes('gemini-1.5-flash')) key = 'gemini-1.5-flash';
  else if (lower.includes('gemini-1')) key = 'gemini-1.5-flash';
  // GPT-5
  else if (lower.includes('gpt-5-pro')) key = 'gpt-5-pro';
  else if (lower.includes('gpt-5-mini')) key = 'gpt-5-mini';
  else if (lower.includes('gpt-5.3') || lower.includes('gpt-5-3')) key = 'gpt-5.3';
  else if (lower.includes('gpt-5')) key = 'gpt-5';
  // GPT-4
  else if (lower.includes('gpt-4o-mini')) key = 'gpt-4o-mini';
  else if (lower.includes('gpt-4o')) key = 'gpt-4o';
  else if (lower.includes('gpt-4-turbo')) key = 'gpt-4-turbo';
  else if (lower.includes('gpt-4') && !lower.includes('turbo') && !lower.includes('4o')) key = 'gpt-4';
  else if (lower.includes('gpt-3.5')) key = 'gpt-3.5-turbo';
  // Claude
  else if (lower.includes('claude-opus-4.6')) key = 'claude-opus-4.6';
  else if (lower.includes('claude-opus-4')) key = 'claude-opus-4';
  else if (lower.includes('claude-opus')) key = 'claude-3-opus';
  else if (lower.includes('claude-sonnet-4.6')) key = 'claude-sonnet-4.6';
  else if (lower.includes('claude-sonnet-4')) key = 'claude-sonnet-4';
  else if (lower.includes('claude-sonnet')) key = 'claude-3-5-sonnet';
  else if (lower.includes('claude-3.5-sonnet')) key = 'claude-3-5-sonnet';
  else if (lower.includes('claude-haiku-3.5') || lower.includes('claude-3.5-haiku')) key = 'claude-3-5-haiku';
  else if (lower.includes('claude-haiku')) key = 'claude-3-haiku';
  else if (lower.includes('claude-3-opus')) key = 'claude-3-opus';
  else if (lower.includes('claude-3-sonnet')) key = 'claude-3-sonnet';

  const rates = PRICING[key] || PRICING['gpt-4o-mini'];
  return ((inputTokens / 1_000_000) * rates.input) + ((outputTokens / 1_000_000) * rates.output);
}

export function wrapClient(client, atApiKey, options = {}) {
  const originalRequest = client.request?.bind(client) 
    || client.chat?.completions?.create?.bind(client.chat.completions)
    || client.chat?.send?.bind(client.chat);
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
