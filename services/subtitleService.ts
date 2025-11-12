import { subtitleDB } from './dbService';
import { Subtitles } from '../types';
import { queueVideoForSync } from './autoSyncService';

export async function saveSubtitles(videoId: string, subtitles: Subtitles) {
  await subtitleDB.put(subtitles);
  console.log('字幕已保存到本地');
  queueVideoForSync(videoId);
}
