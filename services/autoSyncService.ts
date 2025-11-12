import { syncToCloud } from './syncService';
import { authService } from './authService';

type SyncState = 'idle' | 'syncing' | 'error';

interface SyncStatusSnapshot {
  status: SyncState;
  queueLength: number;
  lastSyncTime: Date | null;
  lastError: string | null;
}

// 自动同步队列
let syncQueue: string[] = [];
let isSyncing = false;
let syncStatus: SyncState = 'idle';
let lastSyncTime: Date | null = null;
let lastError: string | null = null;
let retryTimer: number | null = null;
let periodicTimer: number | null = null;
let initialized = false;

function updateStatus(status: SyncState, errorMessage?: string) {
  syncStatus = status;
  lastError = errorMessage ?? (status === 'error' ? lastError : null);
  if (status === 'idle' && !errorMessage) {
    lastError = null;
  }
}

function scheduleRetry(delay = 5000) {
  if (retryTimer) {
    window.clearTimeout(retryTimer);
  }
  retryTimer = window.setTimeout(() => {
    retryTimer = null;
    processSyncQueue();
  }, delay);
}

/**
 * 添加视频到同步队列
 */
export function queueVideoForSync(videoId: string) {
  if (!syncQueue.includes(videoId)) {
    syncQueue.push(videoId);
    console.log(`📥 视频 ${videoId} 已加入同步队列`);
    processSyncQueue();
  }
}

/**
 * 处理同步队列
 */
async function processSyncQueue() {
  if (isSyncing || syncQueue.length === 0) {
    return;
  }

  if (!navigator.onLine) {
    console.log('🌐 当前处于离线状态，将在网络恢复后同步');
    updateStatus('error', '网络已断开，等待恢复...');
    return;
  }

  if (!authService.isAvailable()) {
    updateStatus('error', '云端同步未配置');
    return;
  }

  const user = await authService.getCurrentUser();
  if (!user) {
    updateStatus('error', '登录后即可开启自动同步');
    return;
  }

  isSyncing = true;
  updateStatus('syncing');

  try {
    while (syncQueue.length > 0) {
      const videoId = syncQueue[0];
      console.log(`🔄 开始同步视频 ${videoId}...`);

      const result = await syncToCloud(user.id, videoId);

      if (!result.success) {
        const message = result.error || '同步失败，稍后重试';
        updateStatus('error', message);
        console.error(`❌ 视频 ${videoId} 同步失败:`, message);
        break;
      }

      console.log(`✅ 视频 ${videoId} 同步成功`);
      syncQueue.shift();
    }

    if (syncQueue.length === 0) {
      updateStatus('idle');
      lastSyncTime = new Date();
    } else {
      scheduleRetry();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    console.error('❌ 自动同步失败:', error);
    updateStatus('error', message);
    scheduleRetry();
  } finally {
    isSyncing = false;
  }
}

/**
 * 初始化自动同步
 */
export function initAutoSync() {
  if (initialized) {
    return;
  }

  initialized = true;
  console.log('🔁 自动同步服务已启动');

  if (!navigator.onLine) {
    console.log('🌐 当前处于离线状态，将在网络恢复后同步');
    updateStatus('error', '网络已断开，等待恢复...');
  }

  window.addEventListener('online', () => {
    console.log('🌐 网络已连接，恢复同步');
    updateStatus('idle');
    processSyncQueue();
  });

  window.addEventListener('offline', () => {
    console.log('⚠️ 网络连接已断开，暂停同步');
    updateStatus('error', '网络已断开，等待恢复...');
  });

  processSyncQueue();

  periodicTimer = window.setInterval(() => {
    console.log('⏰ 定时同步检查...');
    processSyncQueue();
  }, 5 * 60 * 1000);
}

export function getSyncStatus(): SyncStatusSnapshot {
  return {
    status: syncStatus,
    queueLength: syncQueue.length,
    lastSyncTime,
    lastError,
  };
}

export default {
  queueVideoForSync,
  initAutoSync,
  getSyncStatus,
};
