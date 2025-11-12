import { chatDB } from './dbService';
import { ChatHistory } from '../types';
import { queueVideoForSync } from './autoSyncService';

export async function saveChatHistory(chat: ChatHistory) {
  await chatDB.put(chat);
  console.log('聊天记录已保存到本地');
  queueVideoForSync(chat.videoId);
}
