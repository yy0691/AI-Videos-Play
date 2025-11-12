/**
 * 最终修复脚本 - 使用 SHA-256 生成正确的 UUID
 * 在浏览器控制台运行
 */

(async function finalFix() {
  console.log('🔧 最终修复 - 使用正确的 UUID 格式...\n');

  // 使用 SHA-256 生成确定性 UUID
  async function generateDeterministicUUID(input) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Format as UUID v4: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuid = [
      hashHex.slice(0, 8),
      hashHex.slice(8, 12),
      '4' + hashHex.slice(13, 16),
      ((parseInt(hashHex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') + hashHex.slice(18, 20),
      hashHex.slice(20, 32)
    ].join('-');
    
    return uuid;
  }

  // 验证 UUID 格式
  function isValidUUID(id) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  try {
    // 打开数据库
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('LocalVideoAnalyzerDB');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    console.log('✅ 数据库已打开\n');

    // 辅助函数
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
      const oldId = video.id;
      console.log(`   当前 ID: ${oldId}`);

      if (isValidUUID(oldId)) {
        console.log(`   ✅ UUID 格式正确\n`);
        validCount++;
        continue;
      }

      // 从视频属性重新生成 UUID
      const identifier = `${video.folderPath || ''}${video.name}-${video.importedAt || Date.now()}`;
      const newId = await generateDeterministicUUID(identifier);
      
      console.log(`   🔧 生成新 ID: ${newId}`);
      
      if (!isValidUUID(newId)) {
        console.error(`   ❌ 新 ID 格式错误，跳过\n`);
        continue;
      }
      
      console.log(`   ✅ UUID 格式验证通过`);

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
          console.log(`   ✅ 字幕已更新`);
        }

        // 更新分析
        const videoAnalyses = analyses.filter(a => a.videoId === oldId);
        if (videoAnalyses.length > 0) {
          for (const analysis of videoAnalyses) {
            const newAnalysis = { ...analysis, videoId: newId };
            await updateRecord('analyses', newAnalysis);
          }
          console.log(`   ✅ ${videoAnalyses.length} 个分析已更新`);
        }

        // 更新笔记
        const note = notes.find(n => n.videoId === oldId || n.id === oldId);
        if (note) {
          const newNote = { ...note, id: newId, videoId: newId };
          await updateRecord('notes', newNote);
          if (note.id !== newId) {
            await deleteRecord('notes', oldId);
          }
          console.log(`   ✅ 笔记已更新`);
        }

        // 更新聊天记录
        const chat = chats.find(c => c.videoId === oldId || c.id === oldId);
        if (chat) {
          const newChat = { ...chat, id: newId, videoId: newId };
          await updateRecord('chatHistory', newChat);
          if (chat.id !== newId) {
            await deleteRecord('chatHistory', oldId);
          }
          console.log(`   ✅ 聊天记录已更新`);
        }

        fixedCount++;
        console.log(`✅ "${video.name}" 修复完成\n`);

      } catch (error) {
        console.error(`❌ 修复失败:`, error, '\n');
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
      console.log('\n💡 刷新后可以尝试同步到云端');
    } else if (validCount === videos.length) {
      console.log('\n✅ 所有 UUID 格式都正确！');
      console.log('💡 现在可以尝试同步到云端');
    }

  } catch (error) {
    console.error('❌ 修复失败:', error);
  }
})();
