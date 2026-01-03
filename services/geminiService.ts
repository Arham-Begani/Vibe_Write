import { GenerationRequest, GeneratedContent, ContentFormat } from "../types";
import generateImageWithOpenRouter, { sendChat, streamChat } from "./openrouterService";

// Note: Using OpenRouter as the primary AI provider. Image generation uses OpenRouter
// via `generateImageWithOpenRouter`. Text generation uses `sendChat` which calls
// the OpenRouter chat API. Video generation is not implemented for OpenRouter here.

// --- Image Generation (via OpenRouter) ---
const generateImage = async (prompt: string): Promise<string | undefined> => {
  try {
    const urls = await generateImageWithOpenRouter(prompt);
    return urls?.[0];
  } catch (error) {
    console.error("Image generation failed:", error);
    throw new Error("Failed to generate image via OpenRouter.");
  }
};

// --- Video Generation ---
// Video generation via OpenRouter is not implemented in this project. If you
// need video generation, supply an alternative provider or implement a video
// workflow supported by your backend.
const generateVideo = async (_prompt: string): Promise<string | undefined> => {
  console.warn('Video generation requested but is not supported with OpenRouter in this setup.');
  return undefined;
};

// --- Main Service Function ---
export const generateContent = async (req: GenerationRequest, updateStatus?: (msg: string) => void): Promise<GeneratedContent> => {
  const modelId = "google/gemini-2.0-flash-exp:free";

  try {
    const isPost = req.format === ContentFormat.Post;
    const isVideo = req.format === ContentFormat.Video;

    // 1. Generate Caption Logic
    const promptText = `
      You are an expert Social Media Manager.
      Task: Create a ${isVideo ? 'video caption' : isPost ? 'post caption' : 'caption for existing image'}.
      Context: "${req.prompt}"
      Platform: ${req.platform}
      Tone: ${req.tone}
      
      Guidelines:
      - Engaging, native to platform.
      - ${isVideo ? 'Short, punchy, matches a fast-paced video.' : 'Complements the visual.'}
      - Include 6-10 hashtags.
    `;

    // Start text generation via OpenRouter
    if (updateStatus) updateStatus("Drafting caption...");
    const textPromise = sendChat([
      { role: 'system', content: 'You are SparkCaption AI. Respond with JSON matching: {"caption": string, "hashtags": string[], "emojis": string[]}. Output ONLY the JSON.' },
      { role: 'user', content: promptText }
    ], modelId);

    // For now: caption-only mode. Skip image/video generation entirely to
    // avoid 429/permission issues and keep flow simple.
    let visualPromise: Promise<string | undefined> = Promise.resolve(undefined);
    if (isPost) {
      if (updateStatus) updateStatus("Image generation skipped; generating caption only...");
    } else if (isVideo) {
      if (updateStatus) updateStatus("Video generation skipped; generating caption only...");
    }

    // Execute
    const [textResponse, visualResult] = await Promise.all([textPromise, visualPromise]);

    // Extract text from OpenRouter response robustly (response shape varies)
    let responseText: string | undefined;
    try {
      const choice = (textResponse as any)?.choices?.[0];
      const msg = choice?.message;
      const content = msg?.content;

      if (typeof content === 'string') {
        responseText = content;
      } else if (Array.isArray(content)) {
        responseText = content.map((c: any) => c?.text ?? '').join('');
      } else if ((textResponse as any)?.text) {
        responseText = (textResponse as any).text;
      } else {
        responseText = JSON.stringify(textResponse);
      }
    } catch (e) {
      responseText = String(textResponse as any);
    }

    if (!responseText) throw new Error("No text generated.");

    let data: GeneratedContent;
    try {
      data = JSON.parse(responseText) as GeneratedContent;
    } catch (e) {
      // If the model did not return strict JSON, fall back to a simple caption.
      data = {
        caption: responseText.trim(),
        hashtags: [],
        emojis: []
      } as GeneratedContent;
    }

    if (isPost && visualResult) data.imageUrl = visualResult;
    if (isVideo && visualResult) data.videoUrl = visualResult;

    return data;

  } catch (error) {
    console.error("Generation Error:", error);
    throw error; 
  }
};

// Expose streaming helper that callers can iterate over
export const streamGenerate = (userPrompt: string, model = 'google/gemini-2.0-flash-exp:free', streamOptions?: any) => {
  const messages = [
    { role: 'system', content: 'You are SparkCaption AI. You may stream reasoning tokens.' },
    { role: 'user', content: userPrompt }
  ];
  return streamChat(messages, model, streamOptions);
};