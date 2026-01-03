import { OpenRouter } from "@openrouter/sdk";

const getApiKey = (): string | undefined => {
  // Vite exposes env vars prefixed with VITE_ via import.meta.env at runtime.
  // When running server-side (Node), fallback to process.env.
  // Do NOT hardcode keys here. Put your key in `.env.local` as `VITE_OPENROUTER_API_KEY`.
  // Example `.env.local`:
  // VITE_OPENROUTER_API_KEY=sk-xxx
  return (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_OPENROUTER_API_KEY) || process.env.VITE_OPENROUTER_API_KEY;
};

const createClient = () => {
  const key = getApiKey();
  if (!key) throw new Error('OpenRouter API key not found. Set VITE_OPENROUTER_API_KEY in your .env.local');
  return new OpenRouter({ apiKey: key });
};

export const generateImageWithOpenRouter = async (prompt: string): Promise<string[]> => {
  const client = createClient();

  try {
    // cast to `any` because the SDK's types are strict and some runtime fields
    // (like `modalities`) may not be reflected in the type definitions.
    const result: any = await client.chat.send({
      model: "google/gemini-3-pro-image-preview",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      // runtime-only option - cast the whole call to any
      modalities: ["image", "text"],
    } as any);

    const message = result?.choices?.[0]?.message;
    const urls: string[] = [];
    if (message?.images) {
      for (const image of message.images) {
        const url = image?.image_url?.url;
        if (url) urls.push(url);
      }
    }

    return urls;
  } catch (err) {
    console.error('OpenRouter image generation error:', err);
    throw err;
  }
};

// Send a non-streaming chat request
export const sendChat = async (messages: any[], model = 'google/gemini-2.0-flash-exp:free') => {
  const client = createClient();
  // Retry/backoff logic to handle transient 429 rate-limit responses.
  const maxAttempts = 4;
  let attempt = 0;
  let delayMs = 1000;

  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

  while (attempt < maxAttempts) {
    try {
      // Cast to any to satisfy SDK typings for Message shape and to allow
      // content arrays (text + image_url) as shown in usage examples.
      return await client.chat.send({ model, messages: messages as any } as any);
    } catch (err: any) {
      attempt += 1;
      const status = err?.status || err?.statusCode || err?.response?.status || (err?.toString && /429/.test(String(err)) ? 429 : undefined);
      const retryAfter = err?.response?.headers?.get ? err.response.headers.get('retry-after') : undefined;

      // If 429 (rate limit), wait and retry; otherwise rethrow immediately.
      if (status === 429 && attempt < maxAttempts) {
        const ra = retryAfter ? parseInt(retryAfter, 10) * 1000 : delayMs;
        console.warn(`OpenRouter 429 received. retrying in ${ra}ms (attempt ${attempt}/${maxAttempts})`);
        await sleep(ra);
        delayMs *= 2;
        continue;
      }

      // If we've exhausted retries or it's not a 429, rethrow with context.
      const message = `OpenRouter sendChat failed${status ? ` (status ${status})` : ''}: ${err?.message || String(err)}`;
      console.error(message, err);
      throw err;
    }
  }
  // Should not reach here, but throw if it does.
  throw new Error('OpenRouter sendChat failed after retries');
};

// Return the async iterator/stream from OpenRouter for streaming responses
export const streamChat = (messages: any[], model = 'google/gemini-2.0-flash-exp:free', streamOptions?: any) => {
  const client = createClient();
  try {
    return client.chat.send({ model, messages: messages as any, stream: true, streamOptions } as any);
  } catch (err: any) {
    const status = err?.status || err?.statusCode || err?.response?.status || (err?.toString && /429/.test(String(err)) ? 429 : undefined);
    if (status === 429) {
      console.error('OpenRouter streamChat failed with 429 rate limit');
      throw new Error('OpenRouter rate limited (429). Consider retrying later or moving requests to a server-side proxy.');
    }
    console.error('OpenRouter streamChat error', err);
    throw err;
  }
};

export default generateImageWithOpenRouter;
