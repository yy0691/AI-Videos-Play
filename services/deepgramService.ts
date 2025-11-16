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
    willUseStorage: fileSizeMB > VERCEL_SIZE_LIMIT_MB
  });

  // For large files (> 4MB), upload to storage and use URL mode
  if (fileSizeMB > VERCEL_SIZE_LIMIT_MB) {
    console.log(`[Deepgram] File too large for direct transfer (${fileSizeMB.toFixed(2)}MB > ${VERCEL_SIZE_LIMIT_MB}MB)`);
    console.log('[Deepgram] Uploading to object storage first...');
    
    try {
      // Upload to Supabase Storage
      onProgress?.(5);
      const { uploadFileToStorageWithProgress } = await import('../utils/uploadToStorage');
      
      // Convert Blob to File if necessary
      const fileToUpload = file instanceof File ? file : new File([file], 'video.mp4', { type: file.type || 'video/mp4' });
      
      const uploadResult = await uploadFileToStorageWithProgress(fileToUpload, {
        onProgress: (uploadProgress) => {
          // Map upload progress (0-100%) to 5-50% of total progress
          onProgress?.(5 + uploadProgress * 0.45);
        },
      });

      onProgress?.(50);
      console.log('[Deepgram] File uploaded, using URL mode:', uploadResult.fileUrl);

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

      // Add url_mode flag to proxy
      params.append('url_mode', 'true');

      const proxyUrl = `/api/deepgram-proxy?${params.toString()}`;

      console.log('[Deepgram] Sending URL request through proxy:', {
        url: proxyUrl,
        fileUrl: uploadResult.fileUrl,
        hasAuth: !!apiKey,
        keySource: settings.deepgramApiKey ? 'user' : 'system'
      });

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
        console.error('[Deepgram] API error:', {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText,
        });
        throw new Error(`Deepgram API error (${response.status}): ${errorText || response.statusText}`);
      }

      const result: DeepgramResponse = await response.json();
      onProgress?.(100);

      console.log('[Deepgram] Transcription complete (URL mode)');
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[Deepgram] URL mode failed:', errorMessage);
      
      // Check if it's a storage error
      if (errorMessage.includes('not authenticated') || errorMessage.includes('not configured')) {
        throw new Error(
          '无法上传大文件到存储服务\n\n' +
          '对于大文件（> 4MB），需要先上传到对象存储，但：\n' +
          errorMessage + '\n\n' +
          '解决方案：\n' +
          '1. 登录账户（Supabase Storage 需要认证）\n' +
          '2. 确保 Supabase 已正确配置\n' +
          '3. 或使用更小的视频文件（< 4MB）\n\n' +
          'Failed to upload large file to storage\n\n' +
          'For large files (> 4MB), we need to upload to object storage first, but:\n' +
          errorMessage + '\n\n' +
          'Solutions:\n' +
          '1. Log in to your account (Supabase Storage requires authentication)\n' +
          '2. Ensure Supabase is properly configured\n' +
          '3. Or use a smaller video file (< 4MB)'
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
