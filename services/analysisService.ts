import { analysisDB } from './dbService';
import { Analysis } from '../types';
import { queueVideoForSync } from './autoSyncService';

export async function saveAnalysis(analysis: Analysis) {
  await analysisDB.put(analysis);
  console.log('分析已保存到本地');
  queueVideoForSync(analysis.videoId);
}
