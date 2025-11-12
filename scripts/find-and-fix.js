/**
 * 查找并修复数据库 - 自动检测正确的数据库名称
 * 在浏览器控制台运行
 */

(async function findAndFix() {
  console.log('🔍 正在查找数据库...\n');

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

  // 3. 获取所有数据库
  const databases = await indexedDB.databases();
  console.log('📋 找到以下数据库:');
  databases.forEach((db, index) => {
    console.log(`  ${index + 1}. ${db.name} (版本 ${db.version})`);
  });

  // 4. 查找包含视频数据的数据库
  let targetDB = null;
  let targetDBName = null;

  for (const dbInfo of databases) {
    try {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open(dbInfo.name);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const storeNames = Array.from(db.objectStoreNames);
      console.log(`\n🔍 检查 "${dbInfo.name}":`);
      console.log(`   表: ${storeNames.join(', ')}`);

      if (storeNames.includes('videos')) {
        console.log(`   ✅ 找到 videos 表！`);
        targetDB = db;
        targetDBName = dbInfo.name;
        break;
      } else {
        db.close();
      }
    } catch (error) {
      console.error(`   ❌ 无法打开: ${error.message}`);
    }
  }

  if (!targetDB) {
    console.error('\n❌ 没有找到包含视频数据的数据库！');
    console.log('\n💡 可能的原因:');
    console.log('1. 还没有导入过视频');
    console.log('2. 数据库已被删除');
    console.log('3. 应用还没有完全加载');
    console.log('\n🎯 建议: 先导入一个视频，然后再运行此脚本');
    return;
  }

  console.log(`\n✅ 使用数据库: ${targetDBName}`);
  console.log('='.repeat(50));

  // 5. 开始迁移
  try {
    // 获取所有视频
    const getAllRecords = (storeName) => {
      return new Promise((resolve, reject) => {
        try {
          const transaction = targetDB.transaction(storeName, 'readonly');
          const store = transaction.objectStore(storeName);
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => resolve([]);
        } catch (error) {
          resolve([]);
        }
      });
    };

    const updateRecord = (storeName, record) => {
      return new Promise((resolve, reject) => {
        try {
          const transaction = targetDB.transaction(storeName, 'readwrite');
          const store = transaction.objectStore(storeName);
          const request = store.put(record);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        } catch (error) {
          reject(error);
        }
      });
    };

    const deleteRecord = (storeName, key) => {
      return new Promise((resolve, reject) => {
        try {
          const transaction = targetDB.transaction(storeName, 'readwrite');
          const store = transaction.objectStore(storeName);
          const request = store.delete(key);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        } catch (error) {
          reject(error);
        }
      });
    };

    console.log('\n📹 正在读取视频列表...');
    const videos = await getAllRecords('videos');
    console.log(`📹 找到 ${videos.length} 个视频\n`);

    if (videos.length === 0) {
      console.log('ℹ️ 数据库中没有视频');
      targetDB.close();
      return;
    }

    let migratedCount = 0;
    let skippedCount = 0;

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
          getAllRecords('subtitles'),
          getAllRecords('analyses'),
          getAllRecords('notes'),
          getAllRecords('chatHistory')
        ]);

        // 更新视频
        const newVideo = { ...video, id: newId };
        await updateRecord('videos', newVideo);
        await deleteRecord('videos', oldId);

        // 更新字幕
        const subtitle = subtitles.find(s => s.videoId === oldId || s.id === oldId);
        if (subtitle) {
          const newSubtitle = { ...subtitle, id: newId, videoId: newId };
          await updateRecord('subtitles', newSubtitle);
          if (subtitle.id !== newId) {
            await deleteRecord('subtitles', oldId);
          }
        }

        // 更新分析
        const videoAnalyses = analyses.filter(a => a.videoId === oldId);
        for (const analysis of videoAnalyses) {
          const newAnalysis = { ...analysis, videoId: newId };
          await updateRecord('analyses', newAnalysis);
        }

        // 更新笔记
        const note = notes.find(n => n.videoId === oldId || n.id === oldId);
        if (note) {
          const newNote = { ...note, id: newId, videoId: newId };
          await updateRecord('notes', newNote);
          if (note.id !== newId) {
            await deleteRecord('notes', oldId);
          }
        }

        // 更新聊天记录
        const chat = chats.find(c => c.videoId === oldId || c.id === oldId);
        if (chat) {
          const newChat = { ...chat, id: newId, videoId: newId };
          await updateRecord('chatHistory', newChat);
          if (chat.id !== newId) {
            await deleteRecord('chatHistory', oldId);
          }
        }

        migratedCount++;
        console.log(`✅ "${video.name}" 迁移完成`);
        console.log(`   ${oldId.slice(0, 40)}... → ${newId}\n`);

      } catch (error) {
        console.error(`❌ 迁移失败:`, error);
      }
    }

    targetDB.close();

    console.log('\n' + '='.repeat(50));
    console.log('✨ 迁移完成！');
    console.log('='.repeat(50));
    console.log(`📊 统计:`);
    console.log(`  - ✅ 成功迁移: ${migratedCount} 个`);
    console.log(`  - ⏭️ 已跳过: ${skippedCount} 个（已是 UUID）`);
    console.log('='.repeat(50));

    if (migratedCount > 0) {
      console.log('\n🔄 请刷新页面:');
      console.log('   location.reload()');
      console.log('\n💡 刷新后可以尝试同步到云端');
    } else {
      console.log('\n✅ 所有视频已经是 UUID 格式');
      console.log('💡 可以直接尝试同步到云端');
    }

  } catch (error) {
    console.error('\n❌ 迁移失败:', error);
    targetDB.close();
  }
})();
