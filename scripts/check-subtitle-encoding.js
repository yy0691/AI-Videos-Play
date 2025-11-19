/**
 * 字幕编码检查工具
 * 用于检查 IndexedDB 中字幕数据的编码和内容
 * 
 * 使用方法：
 * 1. 打开浏览器开发者工具 (F12)
 * 2. 在 Console 中复制粘贴此脚本并执行
 */

async function checkSubtitleEncoding() {
  console.log('===== 字幕编码检查工具 =====\n');
  
  try {
    // 打开 IndexedDB
    const request = indexedDB.open('LocalVideoAnalyzerDB', 4);
    
    request.onerror = () => {
      console.error('❌ 无法打开数据库:', request.error);
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      
      // 读取字幕数据
      const tx = db.transaction('subtitles', 'readonly');
      const store = tx.objectStore('subtitles');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => {
        const subtitles = getAllRequest.result;
        
        if (subtitles.length === 0) {
          console.log('⚠️ 没有找到任何字幕数据');
          return;
        }
        
        console.log(`📊 找到 ${subtitles.length} 条字幕记录\n`);
        
        subtitles.forEach((subtitle, index) => {
          console.log(`\n===== 字幕 #${index + 1} =====`);
          console.log('Video ID:', subtitle.videoId);
          console.log('字幕片段数量:', subtitle.segments?.length || 0);
          
          if (subtitle.segments && subtitle.segments.length > 0) {
            console.log('\n前5条字幕内容:');
            subtitle.segments.slice(0, 5).forEach((seg, i) => {
              // 检查编码
              const text = seg.text || '';
              const hasChineseChars = /[\u4e00-\u9fa5]/.test(text);
              const hasEnglishWords = /[a-zA-Z]{2,}/.test(text);
              const hasGarbledChars = /�/.test(text) || /\ufffd/.test(text);
              const charCodes = Array.from(text).map(char => char.charCodeAt(0));
              
              console.log(`\n  [${i + 1}] ${seg.startTime.toFixed(2)}s - ${seg.endTime.toFixed(2)}s`);
              console.log(`      内容: "${text}"`);
              console.log(`      长度: ${text.length} 字符`);
              console.log(`      包含中文: ${hasChineseChars ? '✅' : '❌'}`);
              console.log(`      包含英文: ${hasEnglishWords ? '✅' : '❌'}`);
              console.log(`      包含乱码: ${hasGarbledChars ? '⚠️ 是' : '✅ 否'}`);
              
              // 显示字符编码（仅前20个字符）
              if (text.length > 0) {
                const sample = text.substring(0, 20);
                console.log(`      前20字符编码: ${Array.from(sample).map(c => c.charCodeAt(0)).join(', ')}`);
              }
              
              // 检查是否像是语言识别错误
              if (hasEnglishWords && !hasChineseChars && text.length < 30) {
                console.log('      ⚠️ 可能是语言识别错误：识别成英文但内容无意义');
              }
            });
            
            // 统计分析
            console.log('\n📈 整体统计:');
            const allTexts = subtitle.segments.map(s => s.text || '').join(' ');
            const chineseCount = (allTexts.match(/[\u4e00-\u9fa5]/g) || []).length;
            const englishCount = (allTexts.match(/[a-zA-Z]/g) || []).length;
            const totalChars = allTexts.length;
            
            console.log(`  总字符数: ${totalChars}`);
            console.log(`  中文字符: ${chineseCount} (${(chineseCount / totalChars * 100).toFixed(1)}%)`);
            console.log(`  英文字符: ${englishCount} (${(englishCount / totalChars * 100).toFixed(1)}%)`);
            
            if (englishCount > chineseCount * 3) {
              console.log('\n  🔴 诊断: 字幕主要是英文字符，但如果视频是中文的，');
              console.log('           可能是语言参数设置错误导致识别出了错误的内容');
              console.log('  💡 建议: 重新生成字幕并选择正确的语言');
            }
          }
        });
        
        console.log('\n\n===== 检查完成 =====');
        console.log('如果发现问题，可以：');
        console.log('1. 点击"重新生成字幕"按钮');
        console.log('2. 选择正确的视频语言（中文/英文等）');
        console.log('3. 重新生成即可获得正确的字幕');
      };
      
      getAllRequest.onerror = () => {
        console.error('❌ 读取字幕数据失败:', getAllRequest.error);
      };
    };
  } catch (error) {
    console.error('❌ 脚本执行失败:', error);
  }
}

// 执行检查
checkSubtitleEncoding();

