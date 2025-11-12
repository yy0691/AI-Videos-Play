/**
 * 修复 UUID 格式 - 使用正确的 UUID 格式重新迁移
 * 在浏览器控制台运行
 */

(async function fixUUIDFormat() {
  console.log('🔧 修复 UUID 格式...\n');

  // 正确的 UUID 生成函数
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
    
    // 正确的格式: 8-4-4-4-12
    const hex = (n, len) => Math.abs(n).toString(16).padStart(len, '0').slice(0, len);
    
    return `${hex(hash, 8)}-${hex(hash2, 4)}-4${hex(hash3, 3)}-${hex(hash4, 4)}-${hex(hash * hash2, 12)}`;
  }

  // 验证 UUID 格式
  function isValidUUID(id) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isValid = uuidRegex.test(id);
    if (!isValid && id.includes('-')) {
      // 检查格式
      const parts = id.split('-');
      console.log(`   ❌ 格式错误: ${parts.map(p => p.length).join('-')} (应该是 8-4-4-4-12)`);
    }
    return isValid;
  }

  try {
    // 打开数据库
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('LocalVideoAnalyzerDB');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    console.log('✅ 数据库已打开\n');

    // 获取所有记录的辅助函数
    const getAllRecords = (storeName) => {
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(storeName, 'readonly');
          const store = tx.objectStore(storeName);
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
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.put(record);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    };

    const deleteRecord = (storeName, key) => {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    };

    // 获取所有视频
    const videos = await getAllRecords('videos');
    console.log(`📹 找到 ${videos.length} 个视频\n`);

    let fixedCount = 0;
    let validCount = 0;

    for (const video of videos) {
      console.log(`🔍 检查 "${video.name}"...`);
      console.log(`   当前 ID: ${video.id}`);

      if (isValidUUID(video.id)) {
        console.log(`   ✅ UUID 格式正确\n`);
        validCount++;
        continue;
      }

      // 需要修复 - 从原始文件名重新生成
      // 尝试从当前 ID 推断原始文件名
      let originalId = video.id;
      
      // 如果 ID 看起来像是我们之前生成的错误格式，需要找到原始标识符
      // 这里我们使用视频的其他属性来生成一个新的确定性 ID
      const identifier = `${video.folderPath || ''}${video.name}-${video.importedAt}`;
      const newId = generateDeterministicUUID(identifier);
      
      console.log(`   🔧 生成新 ID: ${newId}`);
      console.log(`   ✅ 格式验证:`, isValidUUID(newId) ? '通过' : '失败');

      if (!isValidUUID(newId)) {
        console.error(`   ❌ 新 ID 格式仍然错误，跳过\n`);
        continue;
      }

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
        await deleteRecord('videos', originalId);

        // 更新字幕
        const subtitle = subtitles.find(s => s.videoId === originalId || s.id === originalId);
        if (subtitle) {
          const newSubtitle = { ...subtitle, id: newId, videoId: newId };
          await updateRecord('subtitles', newSubtitle);
          if (subtitle.id !== newId) {
            await deleteRecord('subtitles', originalId);
          }
        }

        // 更新分析
        const videoAnalyses = analyses.filter(a => a.videoId === originalId);
        for (const analysis of videoAnalyses) {
          const newAnalysis = { ...analysis, videoId: newId };
          await updateRecord('analyses', newAnalysis);
        }

        // 更新笔记
        const note = notes.find(n => n.videoId === originalId || n.id === originalId);
        if (note) {
          const newNote = { ...note, id: newId, videoId: newId };
          await updateRecord('notes', newNote);
          if (note.id !== newId) {
            await deleteRecord('notes', originalId);
          }
        }

        // 更新聊天记录
        const chat = chats.find(c => c.videoId === originalId || c.id === originalId);
        if (chat) {
          const newChat = { ...chat, id: newId, videoId: newId };
          await updateRecord('chatHistory', newChat);
          if (chat.id !== newId) {
            await deleteRecord('chatHistory', originalId);
          }
        }

        fixedCount++;
        console.log(`   ✅ 修复完成\n`);

      } catch (error) {
        console.error(`   ❌ 修复失败:`, error, '\n');
      }
    }

    db.close();

    console.log('='.repeat(50));
    console.log('✨ 修复完成！');
    console.log('='.repeat(50));
    console.log(`📊 统计:`);
    console.log(`  - ✅ 已修复: ${fixedCount} 个`);
    console.log(`  - ✅ 已正确: ${validCount} 个`);
    console.log('='.repeat(50));

    if (fixedCount > 0) {
      console.log('\n🔄 请刷新页面:');
      console.log('   location.reload()');
    } else if (validCount === videos.length) {
      console.log('\n✅ 所有 UUID 格式都正确！');
      console.log('💡 现在可以尝试同步到云端');
    }

  } catch (error) {
    console.error('❌ 修复失败:', error);
  }
})();
