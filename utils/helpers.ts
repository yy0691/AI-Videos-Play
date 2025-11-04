import { SubtitleSegment } from '../types';

export const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // remove prefix `data:*/*;base64,`
      resolve(result.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });

export const getVideoMetadata = (file: File): Promise<{ duration: number; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      });
    };
    video.onerror = (e) => {
        reject(new Error('Failed to load video metadata. The file might be corrupt or in an unsupported format.'));
    };
    video.src = URL.createObjectURL(file);
  });
};

const parseSrtTimestamp = (timestamp: string): number => {
    const [h, m, s] = timestamp.split(':');
    const [sec, ms] = s.split(',');
    return parseInt(h, 10) * 3600 + parseInt(m, 10) * 60 + parseInt(sec, 10) + parseInt(ms, 10) / 1000;
};

export const parseSrt = (content: string): SubtitleSegment[] => {
    const lines = content.replace(/\r/g, '').split('\n\n');
    return lines.map((line) => {
        const parts = line.split('\n');
        if (parts.length < 3) return null;
        const timeMatch = parts[1].split(' --> ');
        if (timeMatch.length < 2) return null;
        
        return {
            startTime: parseSrtTimestamp(timeMatch[0]),
            endTime: parseSrtTimestamp(timeMatch[1]),
            text: parts.slice(2).join('\n'),
        };
    }).filter((s): s is SubtitleSegment => s !== null);
};

const parseVttTimestamp = (timestamp: string): number => {
    const parts = timestamp.split(':');
    let time = 0;
    if (parts.length === 3) {
        time += parseFloat(parts[0]) * 3600;
        time += parseFloat(parts[1]) * 60;
        time += parseFloat(parts[2]);
    } else {
        time += parseFloat(parts[0]) * 60;
        time += parseFloat(parts[1]);
    }
    return time;
};

export const parseVtt = (content: string): SubtitleSegment[] => {
    const lines = content.replace(/\r/g, '').split('\n\n');
    return lines.slice(1).map((line) => {
        const parts = line.split('\n');
        if (parts.length < 2) return null;
        const timeMatch = parts[0].split(' --> ');
        if (timeMatch.length < 2) return null;

        return {
            startTime: parseVttTimestamp(timeMatch[0]),
            endTime: parseVttTimestamp(timeMatch[1].split(' ')[0]), // remove alignment tags
            text: parts.slice(1).join('\n'),
        };
    }).filter((s): s is SubtitleSegment => s !== null);
};

export const parseSubtitleFile = (fileName: string, content: string): SubtitleSegment[] => {
    if (fileName.endsWith('.srt')) {
        return parseSrt(content);
    }
    if (fileName.endsWith('.vtt')) {
        return parseVtt(content);
    }
    throw new Error('Unsupported subtitle format. Only .srt and .vtt are supported.');
};


export const formatTimestamp = (seconds: number): string => {
    if (isNaN(seconds)) return '00:00:00';
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
};

export const parseTimestampToSeconds = (timestamp: string): number => {
    const parts = timestamp.split(':').map(part => parseInt(part, 10));
    if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
     if (parts.length === 2) { // Handle MM:SS format
        return parts[0] * 60 + parts[1];
    }
    return 0;
};