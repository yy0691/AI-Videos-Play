/**
 * 快速修复脚本 V2 - 改进版
 * 在浏览器控制台运行
 */

(async function quickFixV2() {
  console.log('🔧 开始快速修复 V2...\n');

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

  // 3. 打开数据库（使用正确的版本）
  const openDB = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('InsightReelDB'); // 不指定版本，使用当前版本
      request.onsuccess = () => {
        const db = request.result;
        console.log(`✅ 数据库已打开 (版本 ${db.version})`);
        console.log(`📋 可用的表:`, Array.from(db.objectStoreNames).join(', '));
        resolve(db);
      };
      request.onerror = () => reject(request.error);
    });
  };

  // 4. 检查表是否存在
  const hasStore = (db, storeName) => {
    return db.objectStoreNames.contains(storeName);
  };

  // 5. 获取所有记录（安全版本）
  const getAllRecords = (db, storeName) => {
    return new Promise((resolve, reject) => {
      if (!hasStore(db, storeName)) {
        console.warn(`⚠️ 表 "${storeName}" 不存在，跳过`);
        resolve([]);
        return;
      }
      
      try {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => {
          console.error(`❌ 读取 "${storeName}" 失败:`, request.error);
          resolve([]);
        };
      } catch (error) {
        console.error(`❌ 访问 "${storeName}" 失败:`, error);
        resolve([]);
      }
    });
  };

  // 6. 更新记录（安全版本）
  const updateRecord = (db, storeName, record) => {
    return new Promise((resolve, reject) => {
      if (!hasStore(db, storeName)) {
        resolve();
        return;
      }
      
      try {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(record);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  };

  // 7. 删除记录（安全版本）
  const deleteRecord = (db, storeName, key) => {
    return new Promise((resolve, reject) => {
      if (!hasStore(db, storeName)) {
        resolve();
        return;
      }
      
      try {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  };

  try {
    const db = await openDB();
    
    // 检查必要的表是否存在
    if (!hasStore(db, 'videos')) {
      console.error('❌ 数据库中没有 "videos" 表！');
      console.log('💡 可能需要先导入一个视频来初始化数据库');
      db.close();
      return;
    }

    // 获取所有视频
    console.log('\n📹 正在读取视频列表...');
    const videos = await getAllRecords(db, 'videos');
    console.log(`📹 找到 ${videos.length} 个视频\n`);

    if (videos.length === 0) {
      console.log('ℹ️ 没有视频需要迁移');
      db.close();
      return;
    }

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const video of videos) {
      if (isUUID(video.id)) {
        console.log(`✅ "${video.name}" 已经是 UUID 格式`);
        skippedCount++;
        continue;
      }

      console.log(`🔧 迁移 "${video.name}"...`);
      const oldId = video.id;
      const newId = generateDeterministicUUID(oldId);

      try {
        // 获取关联数据
        const [subtitles, analyses, notes, chats] = await Promise.all([
          getAllRecords(db, 'subtitles'),
          getAllRecords(db, 'analyses'),
          getAllRecords(db, 'notes'),
          getAllRecords(db, 'chatHistory')
        ]);

        // 更新视频
        const newVideo = { ...video, id: newId };
        await updateRecord(db, 'videos', newVideo);
        await deleteRecord(db, 'videos', oldId);
        console.log(`  ✅ 视频记录已更新`);

        // 更新字幕
        const subtitle = subtitles.find(s => s.videoId === oldId || s.id === oldId);
        if (subtitle) {
          const newSubtitle = { ...subtitle, id: newId, videoId: newId };
          await updateRecord(db, 'subtitles', newSubtitle);
          if (subtitle.id !== newId) {
            await deleteRecord(db, 'subtitles', oldId);
          }
          console.log(`  ✅ 字幕已更新`);
        }

        // 更新分析
        const videoAnalyses = analyses.filter(a => a.videoId === oldId);
        if (videoAnalyses.length > 0) {
          for (const analysis of videoAnalyses) {
            const newAnalysis = { ...analysis, videoId: newId };
            await updateRecord(db, 'analyses', newAnalysis);
          }
          console.log(`  ✅ ${videoAnalyses.length} 个分析已更新`);
        }

        // 更新笔记
        const note = notes.find(n => n.videoId === oldId || n.id === oldId);
        if (note) {
          const newNote = { ...note, id: newId, videoId: newId };
          await updateRecord(db, 'notes', newNote);
          if (note.id !== newId) {
            await deleteRecord(db, 'notes', oldId);
          }
          console.log(`  ✅ 笔记已更新`);
        }

        // 更新聊天记录
        const chat = chats.find(c => c.videoId === oldId || c.id === oldId);
        if (chat) {
          const newChat = { ...chat, id: newId, videoId: newId };
          await updateRecord(db, 'chatHistory', newChat);
          if (chat.id !== newId) {
            await deleteRecord(db, 'chatHistory', oldId);
          }
          console.log(`  ✅ 聊天记录已更新`);
        }

        migratedCount++;
        console.log(`✅ "${video.name}" 迁移完成`);
        console.log(`   旧 ID: ${oldId.slice(0, 40)}...`);
        console.log(`   新 ID: ${newId}\n`);

      } catch (error) {
        errorCount++;
        console.error(`❌ 迁移 "${video.name}" 失败:`, error);
        console.log('');
      }
    }

    db.close();

    console.log('\n' + '='.repeat(50));
    console.log('✨ 迁移完成！');
    console.log('='.repeat(50));
    console.log(`📊 统计:`);
    console.log(`  - ✅ 成功迁移: ${migratedCount} 个`);
    console.log(`  - ⏭️ 已跳过: ${skippedCount} 个（已是 UUID）`);
    console.log(`  - ❌ 失败: ${errorCount} 个`);
    console.log('='.repeat(50));

    if (migratedCount > 0) {
      console.log('\n🔄 请刷新页面以查看更改:');
      console.log('   location.reload()');
      console.log('\n💡 刷新后可以尝试同步到云端');
    } else if (skippedCount > 0) {
      console.log('\n✅ 所有视频已经是 UUID 格式，无需迁移');
      console.log('💡 可以直接尝试同步到云端');
    }

  } catch (error) {
    console.error('\n❌ 修复失败:', error);
    console.log('\n💡 可能的解决方案:');
    console.log('1. 确保应用已完全加载');
    console.log('2. 尝试刷新页面后重新运行');
    console.log('3. 检查是否有其他标签页打开了应用');
  }
})();
