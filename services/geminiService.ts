import { GoogleGenAI, GenerateContentResponse, Content } from '@google/genai';
import { fileToBase64 } from '../utils/helpers';

const MODEL_NAME = 'gemini-2.5-pro';

export async function analyzeVideoWithGemini(
  apiKey: string,
  videoFile: File,
  prompt: string
): Promise<string> {
  if (!apiKey) {
    throw new Error('Gemini API key is not configured.');
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const videoBase64 = await fileToBase64(videoFile);

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: videoFile.type,
              data: videoBase64,
            },
          },
          { text: prompt },
        ],
      },
    });

    return response.text;
  } catch (error) {
    console.error('Error analyzing video with Gemini:', error);
    if (error instanceof Error) {
        return `An error occurred during analysis: ${error.message}`;
    }
    return 'An unknown error occurred during analysis.';
  }
}

export async function generateChatResponse(
    apiKey: string,
    history: Content[],
    userMessage: { text: string; imageB64DataUrl?: string },
    videoFile: File,
    subtitlesText: string | null
): Promise<string> {
    if (!apiKey) throw new Error('Gemini API key is not configured.');
    const ai = new GoogleGenAI({ apiKey });

    const userParts: any[] = [];
    // Only add video if it's the very first user message in the whole conversation
    if (history.filter(h => h.role === 'user').length === 0) {
        const videoBase64 = await fileToBase64(videoFile);
        userParts.push({ inlineData: { mimeType: videoFile.type, data: videoBase64 } });
    }
    if (userMessage.imageB64DataUrl) {
        const [meta, data] = userMessage.imageB64DataUrl.split(',');
        const mimeType = meta.split(';')[0].split(':')[1];
        userParts.push({ inlineData: { mimeType, data } });
    }
    userParts.push({ text: userMessage.text });

    const contents = [...history, { role: 'user', parts: userParts }];
    
    let systemInstruction = "You are a helpful AI assistant. You will be answering questions about a video. The user will provide the video in the first message.";
    if (subtitlesText) {
        systemInstruction += `\n\nUse the following transcript as the primary source of information for your answers, but verify with the video content if necessary:\n\nTRANSCRIPT:\n${subtitlesText}`;
    }
    
    const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents,
        config: { systemInstruction },
    });
    return response.text;
}