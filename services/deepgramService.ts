/**
 * Deepgram Speech-to-Text Service
 * Professional speech recognition with generous free tier ($200 credits)
 */

import { getEffectiveSettings } from './dbService';

// System default Deepgram API key (from environment variable)
// Users can override this in settings
const SYSTEM_DEEPGRAM_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY;

interface DeepgramResponse {
  metadata: {
    transaction_key: string;
    request_id: string;
    sha256: string;
    created: string;
    duration: number;
    channels: number;
  };
  results: {
    channels: Array<{
      alternatives: Array<{
        transcript: string;
        confidence: number;
        words: Array<{
          word: string;
          start: number;
          end: number;
          confidence: number;
        }>;
      }>;
    }>;
  };
}

interface DeepgramSegment {
  start: number;
  end: number;
  text: string;
}

/**
 * Get the Deepgram API key to use
 * Priority: User's key > System default key
 */
function getDeepgramApiKey(userKey?: string): string | undefined {
  return userKey || SYSTEM_DEEPGRAM_KEY;
}

/**
 * Check if Deepgram API is available and configured
 * Also tests the API key by making a simple validation request
 */
export async function isDeepgramAvailable(): Promise<boolean> {
  const settings = await getEffectiveSettings();
  const apiKey = getDeepgramApiKey(settings.deepgramApiKey);
  
  if (!apiKey) {
    console.log('[Deepgram] ❌ API Key not configured:', {
      hasUserKey: !!settings.deepgramApiKey,
      hasSystemKey: !!SYSTEM_DEEPGRAM_KEY,
    });
    return false;
  }

  console.log('[Deepgram] 🔍 Checking API Key availability:', {
    hasUserKey: !!settings.deepgramApiKey,
    hasSystemKey: !!SYSTEM_DEEPGRAM_KEY,
    usingKey: settings.deepgramApiKey ? 'user' : 'system',
    keyLength: apiKey.length,
    keyPrefix: apiKey.substring(0, 8) + '...'
  });

  // Test API key by making a validation request through proxy (to avoid CORS)
  try {
    const testResponse = await fetch('/api/deepgram-proxy', {
      method: 'GET',
      headers: {
        'X-Deepgram-API-Key': apiKey,
      },
    });

    if (testResponse.ok) {
      const result = await testResponse.json();
      if (result.valid) {
        console.log('[Deepgram] ✅ API Key is valid and working');
        return true;
      } else {
        console.warn('[Deepgram] ⚠️ API Key validation failed:', result);
        return false;
      }
    } else {
      const errorData = await testResponse.json().catch(() => ({ error: 'Unknown error' }));
      console.warn('[Deepgram] ⚠️ API Key validation failed:', {
        status: testResponse.status,
        statusText: testResponse.statusText,
        error: errorData.error || errorData
      });
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('[Deepgram] ⚠️ Failed to validate API Key (network error, but key exists):', {
      error: errorMessage
    });
    // If network error but key exists, assume it might work (could be temporary network issue)
    // Return true to allow attempt, but log the warning
    return true;
  }
}

/**
 * Generate subtitles using Deepgram API
 * Uses Nova-2 model for best accuracy/cost balance
 */
export async function generateSubtitlesWithDeepgram(
  file: File | Blob,
  language?: string,
  onProgress?: (progress: number) => void
): Promise<DeepgramResponse> {
  const settings = await getEffectiveSettings();
  const apiKey = getDeepgramApiKey(settings.deepgramApiKey);

  if (!apiKey) {
    throw new Error('Deepgram API key not configured. Please add VITE_DEEPGRAM_API_KEY to environment variables or configure in settings.');
  }

  const fileSizeMB = file.size / (1024 * 1024);
  const VERCEL_SIZE_LIMIT_MB = 4; // Vercel has 4.5MB limit, use 4MB for safety

  console.log('[Deepgram] Transcribing with Nova-2 model...', {
    fileSize: `${fileSizeMB.toFixed(2)}MB`,
    fileType: file.type,
    language,
    willNeedCompression: fileSizeMB > VERCEL_SIZE_LIMIT_MB
  });

  // For large files (> 4MB), compress audio first
  if (fileSizeMB > VERCEL_SIZE_LIMIT_MB) {
    console.log(`[Deepgram] File too large for direct transfer (${fileSizeMB.toFixed(2)}MB > ${VERCEL_SIZE_LIMIT_MB}MB)`);
    console.log('[Deepgram] Compressing audio to reduce size...');
    
    try {
      // Import audio extraction service
      const { extractAndCompressAudio, isAudioExtractionSupported } = await import('./audioExtractionService');
      
      // Check if audio extraction is supported
      if (!isAudioExtractionSupported()) {
        throw new Error('Audio extraction not supported in this browser. Please use Chrome, Edge, or Firefox.');
      }

      onProgress?.(5);
      
      // Extract and compress audio
      const { audioBlob, originalSize, compressedSize, compressionRatio } = await extractAndCompressAudio(
        file,
        {
          onProgress: (progress, stage) => {
            // Map extraction progress (0-100%) to 5-50% of total progress
            onProgress?.(5 + progress * 0.45);
            console.log(`[Deepgram] ${stage} (${progress.toFixed(0)}%)`);
          },
          targetBitrate: 32000, // 32 kbps - good quality for speech
        }
      );

      onProgress?.(50);
      
      const compressedSizeMB = compressedSize / (1024 * 1024);
      console.log('[Deepgram] Audio compressed successfully:', {
        originalSize: `${fileSizeMB.toFixed(2)}MB`,
        compressedSize: `${compressedSizeMB.toFixed(2)}MB`,
        compressionRatio: `${compressionRatio.toFixed(1)}x`,
        savedSpace: `${((1 - compressedSize / originalSize) * 100).toFixed(1)}%`
      });

      // Check if compressed audio is still too large
      if (compressedSizeMB > VERCEL_SIZE_LIMIT_MB) {
        console.warn(`[Deepgram] Compressed audio still too large (${compressedSizeMB.toFixed(2)}MB > ${VERCEL_SIZE_LIMIT_MB}MB)`);
        console.log('[Deepgram] Attempting to upload to storage (requires Supabase configuration)...');
        
        // Try storage upload as fallback
        try {
          const { uploadFileToStorageWithProgress } = await import('../utils/uploadToStorage');
          
          // Convert Blob to File
          const fileToUpload = new File([audioBlob], 'compressed-audio.wav', { type: 'audio/wav' });
          
          const uploadResult = await uploadFileToStorageWithProgress(fileToUpload, {
            onProgress: (uploadProgress) => {
              onProgress?.(50 + uploadProgress * 0.3);
            },
          });

          onProgress?.(80);
          console.log('[Deepgram] Audio uploaded, using URL mode:', uploadResult.fileUrl);

          // Use Deepgram URL mode
          const params = new URLSearchParams({
            model: 'nova-2',
            smart_format: 'true',
            punctuate: 'true',
            paragraphs: 'false',
            utterances: 'false',
          });

          if (language && language !== 'auto') {
            params.append('language', language);
          }

          params.append('url_mode', 'true');
          const proxyUrl = `/api/deepgram-proxy?${params.toString()}`;

          const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
              'X-Deepgram-API-Key': apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: uploadResult.fileUrl }),
          });

          onProgress?.(90);

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Deepgram API error (${response.status}): ${errorText || response.statusText}`);
          }

          const result: DeepgramResponse = await response.json();
          onProgress?.(100);

          console.log('[Deepgram] Transcription complete (URL mode with compressed audio)');
          return result;
        } catch (uploadError) {
          const uploadErrorMessage = uploadError instanceof Error ? uploadError.message : String(uploadError);
          console.error('[Deepgram] Storage upload failed:', uploadErrorMessage);
          
          throw new Error(
            `压缩后的音频仍然太大 (${compressedSizeMB.toFixed(2)}MB)\n\n` +
            '尝试上传到存储服务失败：\n' +
            uploadErrorMessage + '\n\n' +
            '建议解决方案：\n' +
            '1. 配置 Supabase Storage（设置 SUPABASE_SERVICE_ROLE_KEY）\n' +
            '2. 使用时长更短的视频片段\n' +
            '3. 联系技术支持\n\n' +
            `Compressed audio still too large (${compressedSizeMB.toFixed(2)}MB)\n\n` +
            'Failed to upload to storage:\n' +
            uploadErrorMessage + '\n\n' +
            'Suggested solutions:\n' +
            '1. Configure Supabase Storage (set SUPABASE_SERVICE_ROLE_KEY)\n' +
            '2. Use a shorter video segment\n' +
            '3. Contact technical support'
          );
        }
      }

      // Use compressed audio directly
      console.log('[Deepgram] Using compressed audio for transcription (direct mode)');
      file = audioBlob;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[Deepgram] Audio compression failed:', errorMessage);
      
      // If compression failed, throw descriptive error
      if (errorMessage.includes('not supported')) {
        throw new Error(
          '音频压缩不支持\n\n' +
          '您的浏览器不支持音频提取功能。\n\n' +
          '解决方案：\n' +
          '1. 使用 Chrome、Edge 或 Firefox 浏览器\n' +
          '2. 配置 Supabase Storage 以处理大文件\n' +
          '3. 使用更小的视频文件（< 4MB）\n\n' +
          'Audio compression not supported\n\n' +
          'Your browser does not support audio extraction.\n\n' +
          'Solutions:\n' +
          '1. Use Chrome, Edge, or Firefox browser\n' +
          '2. Configure Supabase Storage for large files\n' +
          '3. Use a smaller video file (< 4MB)'
        );
      }
      
      throw error;
    }
  }

  // For small files (≤ 4MB), use direct upload through proxy
  onProgress?.(10);

  // Build API URL with parameters
  const params = new URLSearchParams({
    model: 'nova-2',
    smart_format: 'true',
    punctuate: 'true',
    paragraphs: 'false',
    utterances: 'false',
  });

  // Add language if specified
  if (language && language !== 'auto') {
    params.append('language', language);
  }

  // Determine content type - Deepgram accepts video files directly
  const contentType = file.type || 'video/mp4';

  // Build proxy URL with query parameters
  const proxyUrl = `/api/deepgram-proxy?${params.toString()}`;

  console.log('[Deepgram] Sending request through proxy (direct mode):', {
    url: proxyUrl,
    contentType,
    hasAuth: !!apiKey,
    keySource: settings.deepgramApiKey ? 'user' : 'system'
  });

  // Call Deepgram API through proxy (to avoid CORS issues)
  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: {
      'X-Deepgram-API-Key': apiKey,
      'Content-Type': contentType,
    },
    body: file,
  });

  onProgress?.(90);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Deepgram] API error:', {
      status: response.status,
      statusText: response.statusText,
      errorBody: errorText,
      headers: Object.fromEntries(response.headers.entries())
    });
    throw new Error(`Deepgram API error (${response.status}): ${errorText || response.statusText}`);
  }

  const result: DeepgramResponse = await response.json();
  onProgress?.(100);

  console.log('[Deepgram] Transcription complete (direct mode)');

  return result;
}

/**
 * Convert Deepgram response to segments
 * Groups words into ~5-second segments for better readability
 */
export function deepgramToSegments(response: DeepgramResponse): DeepgramSegment[] {
  if (!response.results.channels || response.results.channels.length === 0) {
    return [];
  }

  const words = response.results.channels[0].alternatives[0].words;
  if (!words || words.length === 0) {
    return [];
  }

  const segments: DeepgramSegment[] = [];
  const MAX_SEGMENT_DURATION = 5.0; // 5 seconds per segment
  const MAX_WORDS_PER_SEGMENT = 15; // Max words per segment

  let currentSegment: DeepgramSegment = {
    start: words[0].start,
    end: words[0].end,
    text: words[0].word,
  };

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const segmentDuration = word.end - currentSegment.start;
    const wordCount = currentSegment.text.split(' ').length;

    // Start new segment if duration or word count exceeds limit
    if (segmentDuration > MAX_SEGMENT_DURATION || wordCount >= MAX_WORDS_PER_SEGMENT) {
      segments.push(currentSegment);
      currentSegment = {
        start: word.start,
        end: word.end,
        text: word.word,
      };
    } else {
      // Add word to current segment
      currentSegment.text += ' ' + word.word;
      currentSegment.end = word.end;
    }
  }

  // Add last segment
  if (currentSegment.text) {
    segments.push(currentSegment);
  }

  return segments;
}

/**
 * Convert Deepgram response to SRT format
 */
export function deepgramToSrt(response: DeepgramResponse): string {
  const segments = deepgramToSegments(response);

  if (segments.length === 0) {
    const transcript = response.results.channels[0]?.alternatives[0]?.transcript || '';
    return `1\n00:00:00,000 --> 00:00:10,000\n${transcript}\n`;
  }

  return segments.map((segment, index) => {
    const startTime = formatTimestamp(segment.start);
    const endTime = formatTimestamp(segment.end);
    const text = segment.text.trim();

    return `${index + 1}\n${startTime} --> ${endTime}\n${text}\n`;
  }).join('\n');
}

/**
 * Format seconds to SRT timestamp (HH:MM:SS,mmm)
 */
function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}
