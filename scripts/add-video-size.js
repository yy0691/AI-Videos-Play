/**
 * 为现有视频添加 size 字段
 * 在浏览器控制台运行
 */

(async function addVideoSize() {
  console.log('🔧 为现有视频添加 size 字段...\n');

  try {
    // 打开数据库
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('LocalVideoAnalyzerDB');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    console.log('✅ 数据库已打开\n');

    // 获取所有视频
    const getAllVideos = () => {
      return new Promise((resolve, reject) => {
        const tx = db.transaction('videos', 'readonly');
        const store = tx.objectStore('videos');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    };

    // 更新视频
    const updateVideo = (video) => {
      return new Promise((resolve, reject) => {
        const tx = db.transaction('videos', 'readwrite');
        const store = tx.objectStore('videos');
        const request = store.put(video);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    };

    const videos = await getAllVideos();
    console.log(`📹 找到 ${videos.length} 个视频\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const video of videos) {
      console.log(`🔍 检查 "${video.name}"...`);

      // 检查是否已有 size 字段
      if (video.size !== undefined && video.size !== null) {
        console.log(`   ✅ 已有 size: ${video.size} bytes\n`);
        skippedCount++;
        continue;
      }

      // 从 File 对象获取 size
      if (video.file && video.file.size) {
        video.size = video.file.size;
        await updateVideo(video);
        console.log(`   ✅ 已添加 size: ${video.size} bytes (${(video.size / 1024 / 1024).toFixed(2)} MB)\n`);
        updatedCount++;
      } else {
        console.warn(`   ⚠️ 无法获取文件大小，设置为 0\n`);
        video.size = 0;
        await updateVideo(video);
        updatedCount++;
      }
    }

    db.close();

    console.log('='.repeat(50));
    console.log('✨ 更新完成！');
    console.log('='.repeat(50));
    console.log(`📊 统计:`);
    console.log(`  - ✅ 已更新: ${updatedCount} 个`);
    console.log(`  - ⏭️ 已跳过: ${skippedCount} 个（已有 size）`);
    console.log('='.repeat(50));

    if (updatedCount > 0) {
      console.log('\n🔄 请刷新页面:');
      console.log('   location.reload()');
      console.log('\n💡 刷新后可以尝试同步到云端');
    } else {
      console.log('\n✅ 所有视频都已有 size 字段');
      console.log('💡 现在可以尝试同步到云端');
    }

  } catch (error) {
    console.error('❌ 更新失败:', error);
  }
})();
