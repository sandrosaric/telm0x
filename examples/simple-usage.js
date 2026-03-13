import { wrapClient } from 'telm0x';
import { OpenRouter } from "@openrouter/sdk";

const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY
});

const client = wrapClient(openrouter, process.env.TELM0X_API_KEY);

const response = await client.chat.send({
  model: "google/gemini-2.5-flash",
  messages: [{ role: "user", content: "Hello, world!" }]
});

console.log(response.choices[0].message.content);
