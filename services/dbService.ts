import { openDB, DBSchema } from 'idb';
import { Video, Subtitles, Analysis, APIConfig, Note } from '../types';

const DB_NAME = 'LocalVideoAnalyzerDB';
const DB_VERSION = 2;

interface AppDB extends DBSchema {
  videos: {
    key: string;
    value: Video;
  };
  subtitles: {
    key: string;
    value: Subtitles;
  };
  analyses: {
    key: string;
    value: Analysis;
    indexes: { 'by-videoId': string };
  };
  notes: {
    key: string;
    value: Note;
  };
  settings: {
    key: string;
    value: any;
  };
}

const dbPromise = openDB<AppDB>(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('videos')) {
      db.createObjectStore('videos', { keyPath: 'id' });
    }
    if (!db.objectStoreNames.contains('subtitles')) {
      db.createObjectStore('subtitles', { keyPath: 'id' });
    }
    if (!db.objectStoreNames.contains('analyses')) {
      const analysesStore = db.createObjectStore('analyses', { keyPath: 'id' });
      analysesStore.createIndex('by-videoId', 'videoId');
    }
     if (!db.objectStoreNames.contains('notes')) {
      db.createObjectStore('notes', { keyPath: 'id' });
    }
    if (!db.objectStoreNames.contains('settings')) {
      // Use out-of-line keys for the settings store, as keys are provided explicitly.
      db.createObjectStore('settings');
    }
  },
});

export const videoDB = {
  async getAll() {
    return (await dbPromise).getAll('videos');
  },
  async get(id: string) {
    return (await dbPromise).get('videos', id);
  },
  async put(video: Video) {
    return (await dbPromise).put('videos', video);
  },
  async delete(id: string) {
    return (await dbPromise).delete('videos', id);
  },
};

export const subtitleDB = {
    async get(id: string) {
        return (await dbPromise).get('subtitles', id);
    },
    async put(subtitles: Subtitles) {
        return (await dbPromise).put('subtitles', subtitles);
    },
    async delete(id: string) {
        return (await dbPromise).delete('subtitles', id);
    }
};

export const analysisDB = {
  async getByVideoId(videoId: string) {
    return (await dbPromise).getAllFromIndex('analyses', 'by-videoId', videoId);
  },
  async put(analysis: Analysis) {
    return (await dbPromise).put('analyses', analysis);
  },
  async delete(id: string) {
      return (await dbPromise).delete('analyses', id);
  }
};

export const noteDB = {
  async get(id: string) {
    return (await dbPromise).get('notes', id);
  },
  async put(note: Note) {
    return (await dbPromise).put('notes', note);
  },
};

export const settingsDB = {
  async getAPIConfig(): Promise<APIConfig | undefined> {
    return (await dbPromise).get('settings', 'apiConfig');
  },
  async setAPIConfig(config: APIConfig) {
    return (await dbPromise).put('settings', config, 'apiConfig');
  },
};

export const appDB = {
  async deleteVideo(videoId: string) {
    const db = await dbPromise;
    const analysesToDelete = await db.getAllFromIndex('analyses', 'by-videoId', videoId);
    
    const tx = db.transaction(['videos', 'subtitles', 'analyses', 'notes'], 'readwrite');
    
    await Promise.all([
      tx.objectStore('videos').delete(videoId),
      tx.objectStore('subtitles').delete(videoId),
      ...analysesToDelete.map(a => tx.objectStore('analyses').delete(a.id)),
      tx.objectStore('notes').delete(videoId),
    ]);

    return tx.done;
  }
};