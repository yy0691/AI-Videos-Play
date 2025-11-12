/**
 * 快速修复脚本 - 在浏览器控制台运行
 * 这个脚本会迁移视频 ID 而不删除任何数据
 */

// 复制这整段代码到浏览器控制台（F12）并回车

(async function quickFix() {
  console.log('🔧 开始快速修复...\n');

  // 1. 生成 UUID 的函数
  function generateDeterministicUUID(input) {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    const hash2 = Math.abs(hash * 2654435761);
    const hash3 = Math.abs(hash * 16777619);
    const hash4 = Math.abs(hash * 2166136261);
    
    const hex = (n) => n.toString(16).padStart(8, '0');
    return `${hex(hash).slice(0, 8)}-${hex(hash2).slice(0, 4)}-4${hex(hash3).slice(0, 3)}-${hex(hash4).slice(0, 4)}-${hex(hash).slice(0, 12)}`;
  }

  // 2. 检查 ID 是否为 UUID
  function isUUID(id) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  // 3. 打开数据库
  const openDB = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('InsightReelDB', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };

  // 4. 获取所有记录
  const getAllRecords = (db, storeName) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };

  // 5. 更新记录
  const updateRecord = (db, storeName, record) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(record);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };

  // 6. 删除记录
  const deleteRecord = (db, storeName, key) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  };

  try {
    const db = await openDB();
    console.log('✅ 数据库已打开\n');

    // 获取所有视频
    const videos = await getAllRecords(db, 'videos');
    console.log(`📹 找到 ${videos.length} 个视频\n`);

    let migratedCount = 0;

    for (const video of videos) {
      if (isUUID(video.id)) {
        console.log(`✅ "${video.name}" 已经是 UUID 格式`);
        continue;
      }

      console.log(`🔧 迁移 "${video.name}"...`);
      const oldId = video.id;
      const newId = generateDeterministicUUID(oldId);

      try {
        // 获取关联数据
        const subtitles = await getAllRecords(db, 'subtitles');
        const analyses = await getAllRecords(db, 'analyses');
        const notes = await getAllRecords(db, 'notes');
        const chats = await getAllRecords(db, 'chatHistory');

        // 更新视频
        const newVideo = { ...video, id: newId };
        await updateRecord(db, 'videos', newVideo);
        await deleteRecord(db, 'videos', oldId);

        // 更新字幕
        const subtitle = subtitles.find(s => s.videoId === oldId);
        if (subtitle) {
          const newSubtitle = { ...subtitle, id: newId, videoId: newId };
          await updateRecord(db, 'subtitles', newSubtitle);
          await deleteRecord(db, 'subtitles', oldId);
        }

        // 更新分析
        const videoAnalyses = analyses.filter(a => a.videoId === oldId);
        for (const analysis of videoAnalyses) {
          const newAnalysis = { ...analysis, videoId: newId };
          await updateRecord(db, 'analyses', newAnalysis);
        }

        // 更新笔记
        const note = notes.find(n => n.videoId === oldId);
        if (note) {
          const newNote = { ...note, id: newId, videoId: newId };
          await updateRecord(db, 'notes', newNote);
          await deleteRecord(db, 'notes', oldId);
        }

        // 更新聊天记录
        const chat = chats.find(c => c.videoId === oldId);
        if (chat) {
          const newChat = { ...chat, id: newId, videoId: newId };
          await updateRecord(db, 'chatHistory', newChat);
          await deleteRecord(db, 'chatHistory', oldId);
        }

        migratedCount++;
        console.log(`  ✅ 完成 (${oldId.slice(0, 30)}... → ${newId})`);

      } catch (error) {
        console.error(`  ❌ 失败:`, error);
      }
    }

    db.close();

    console.log(`\n✨ 迁移完成！`);
    console.log(`  - 成功迁移: ${migratedCount} 个视频`);
    console.log(`  - 跳过: ${videos.length - migratedCount} 个（已是 UUID 格式）`);
    console.log(`\n🔄 请刷新页面以查看更改`);
    console.log(`\n💡 刷新后可以尝试同步到云端`);

  } catch (error) {
    console.error('❌ 修复失败:', error);
  }
})();
