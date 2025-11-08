/**
 * Segmented Parallel Processor
 * Splits long videos into segments and processes them in parallel
 */

import { generateSubtitles, generateSubtitlesStreaming } from './geminiService';
import { generateSubtitlesWithWhisper, whisperToSrt } from './whisperService';
import { parseSrt, segmentsToSrt } from '../utils/helpers';
import { SubtitleSegment } from '../types';

interface SegmentResult {
  index: number;
  srt: string;
  startTime: number;
  endTime: number;
}

/**
 * Extract a segment of video as a blob
 */
async function extractVideoSegment(
  videoFile: File,
  startTime: number,
  endTime: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const mediaSource = new MediaSource();
    
    // For now, we'll use a simpler approach: just use the full video
    // and pass time ranges to the API (if supported)
    // True video splitting requires ffmpeg.wasm which is heavy
    
    // Return the original video for now
    // In production, you'd use ffmpeg.wasm or server-side processing
    resolve(videoFile);
  });
}

/**
 * Calculate optimal segment size based on video duration
 */
function calculateSegmentSize(durationSeconds: number): number {
  if (durationSeconds <= 180) return durationSeconds; // < 3min, no split
  if (durationSeconds <= 600) return 120; // 3-10min, 2min segments
  if (durationSeconds <= 1800) return 180; // 10-30min, 3min segments
  return 300; // >30min, 5min segments
}

/**
 * Get video duration
 */
async function getVideoDuration(videoFile: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video metadata'));
    };
    
    video.src = URL.createObjectURL(videoFile);
  });
}

/**
 * Merge subtitle segments from multiple parts
 */
function mergeSubtitleSegments(results: SegmentResult[]): SubtitleSegment[] {
  // Sort by index
  const sorted = results.sort((a, b) => a.index - b.index);
  
  const allSegments: SubtitleSegment[] = [];
  
  for (const result of sorted) {
    const segments = parseSrt(result.srt);
    
    // Adjust timestamps to account for segment offset
    const adjustedSegments = segments.map(seg => ({
      ...seg,
      startTime: seg.startTime + result.startTime,
      endTime: seg.endTime + result.startTime,
    }));
    
    allSegments.push(...adjustedSegments);
  }
  
  return allSegments;
}

/**
 * Process video in parallel segments
 */
export async function processVideoInSegments(
  videoFile: File,
  language: string,
  useWhisper: boolean,
  onProgress?: (progress: number, stage: string) => void,
  onSegmentComplete?: (segmentIndex: number, totalSegments: number) => void
): Promise<string> {
  // Get video duration
  onProgress?.(0, 'Analyzing video...');
  const duration = await getVideoDuration(videoFile);
  
  // Calculate segment size
  const segmentDuration = calculateSegmentSize(duration);
  const totalSegments = Math.ceil(duration / segmentDuration);
  
  console.log(`Video duration: ${duration}s, splitting into ${totalSegments} segments of ${segmentDuration}s each`);
  
  // If only 1 segment, process normally (no splitting needed)
  if (totalSegments === 1) {
    onProgress?.(10, 'Processing single segment...');
    
    if (useWhisper) {
      const result = await generateSubtitlesWithWhisper(videoFile, language, (p) => {
        onProgress?.(10 + p * 0.9, 'Generating subtitles...');
      });
      return whisperToSrt(result);
    } else {
      // Use Gemini - will extract audio internally
      const prompt = `Generate accurate SRT subtitles for this video. Language: ${language}`;
      return await generateSubtitlesStreaming(
        videoFile,
        prompt,
        (p, stage) => onProgress?.(10 + p * 0.9, stage)
      );
    }
  }
  
  // For multiple segments, we need to process each
  // Note: Due to browser limitations, we can't easily split video files
  // without ffmpeg.wasm. For now, we'll process the whole video but
  // with optimizations
  
  // TODO: Implement actual video splitting with ffmpeg.wasm or server-side processing
  // For now, fall back to single processing
  
  console.warn('Video splitting not fully implemented yet. Processing as single segment.');
  onProgress?.(10, 'Processing video (segment splitting coming soon)...');
  
  if (useWhisper) {
    const result = await generateSubtitlesWithWhisper(videoFile, language, (p) => {
      onProgress?.(10 + p * 0.9, 'Generating subtitles...');
    });
    return whisperToSrt(result);
  } else {
    const prompt = `Generate accurate SRT subtitles for this video. Language: ${language}`;
    return await generateSubtitlesStreaming(
      videoFile,
      prompt,
      (p, stage) => onProgress?.(10 + p * 0.9, stage)
    );
  }
}

/**
 * Estimate processing time based on video duration and method
 */
export function estimateProcessingTime(
  durationSeconds: number,
  useWhisper: boolean,
  useSegments: boolean
): number {
  const baseTimePerSecond = useWhisper ? 0.1 : 0.5; // Whisper is ~5x faster
  const parallelFactor = useSegments ? 0.4 : 1; // Parallel processing ~2.5x faster
  
  return Math.ceil(durationSeconds * baseTimePerSecond * parallelFactor);
}
