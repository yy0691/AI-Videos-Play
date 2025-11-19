import { subtitleDB } from './dbService';
import { Subtitles } from '../types';
import { queueVideoForSync } from './autoSyncService';

export async function saveSubtitles(videoId: string, subtitles: Subtitles) {
  // 🔍 调试：保存前检查字幕数据
  console.log('===== 准备保存字幕到 IndexedDB =====');
  console.log('字幕片段数:', subtitles.segments.length);
  if (subtitles.segments.length > 0) {
    const first = subtitles.segments[0];
    console.log('第1条字幕:');
    console.log('  文本:', first.text);
    console.log('  文本长度:', first.text.length);
    console.log('  字符编码:', Array.from(first.text.substring(0, 20)).map(c => c.charCodeAt(0)));
    console.log('  类型:', typeof first.text);
  }
  
  await subtitleDB.put(subtitles);
  console.log('✅ 字幕已保存到本地 IndexedDB');
  
  // 🔍 调试：保存后立即读取验证
  const saved = await subtitleDB.get(videoId);
  if (saved && saved.segments.length > 0) {
    console.log('===== 从 IndexedDB 读取验证 =====');
    console.log('第1条字幕:', saved.segments[0].text);
    console.log('是否相同:', saved.segments[0].text === subtitles.segments[0].text);
  }
  
  queueVideoForSync(videoId);
}
