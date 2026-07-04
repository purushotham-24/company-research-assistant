export const OPENROUTER_MODELS = [
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash (Recommended)" },
  { id: "deepseek/deepseek-chat", name: "DeepSeek Chat" },
  { id: "qwen/qwen-2.5-72b-instruct", name: "Qwen 2.5 72B" },
  { id: "meta-llama/llama-3.1-70b-instruct", name: "Llama 3.1 70B" },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet" },
  { id: "openai/gpt-4o", name: "GPT-4o" },
];

export async function getOpenRouterStream(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<Response> {
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error("OpenRouter API Key is required.");
  }

  const selectedModel = model || "google/gemini-2.5-flash";

  console.log(`Using OpenRouter Model: ${selectedModel}`);

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "AI Company Research Assistant",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        stream: true,
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 1000,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    console.error("OpenRouter Error:", errorText);

    if (response.status === 401) {
      throw new Error(
        "Invalid or missing OpenRouter API Key."
      );
    }

    if (response.status === 402) {
      throw new Error(
        "OpenRouter credits are insufficient. Add credits or use a smaller prompt."
      );
    }

    if (response.status === 429) {
      throw new Error(
        "OpenRouter rate limit exceeded. Please wait and try again."
      );
    }

    throw new Error(
      `OpenRouter Error (${response.status}): ${errorText}`
    );
  }

  return response;
}