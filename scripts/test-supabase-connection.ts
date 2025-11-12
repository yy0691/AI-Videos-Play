/**
 * Supabase 连接测试脚本
 * 
 * 使用方法：
 * 1. 确保已经在 Supabase Dashboard 中执行了数据库迁移
 * 2. 确保 .env 文件配置了正确的 SUPABASE_URL 和 SUPABASE_ANON_KEY
 * 3. 在浏览器控制台运行此脚本的函数
 */

import { supabase } from '../services/authService';

export async function testSupabaseConnection() {
  console.log('🔍 开始测试 Supabase 连接...\n');

  if (!supabase) {
    console.error('❌ Supabase 未配置！请检查环境变量。');
    return;
  }

  try {
    // 测试 1: 检查数据库连接
    console.log('1️⃣ 测试数据库连接...');
    const { data: healthCheck, error: healthError } = await supabase
      .from('profiles')
      .select('count')
      .limit(0);
    
    if (healthError) {
      console.error('❌ 数据库连接失败:', healthError.message);
      return;
    }
    console.log('✅ 数据库连接成功！\n');

    // 测试 2: 检查所有表是否存在
    console.log('2️⃣ 检查数据表...');
    const tables = [
      'profiles',
      'video_metadata',
      'subtitles',
      'analyses',
      'notes',
      'chat_history'
    ];

    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('count')
          .limit(0);
        
        if (error) {
          console.error(`❌ 表 "${table}" 不存在或无法访问:`, error.message);
        } else {
          console.log(`✅ 表 "${table}" 存在`);
        }
      } catch (err) {
        console.error(`❌ 检查表 "${table}" 时出错:`, err);
      }
    }
    console.log('');

    // 测试 3: 检查当前用户
    console.log('3️⃣ 检查用户认证状态...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.warn('⚠️ 未登录或认证失败:', userError.message);
      console.log('💡 提示：请先登录再测试数据操作\n');
    } else if (user) {
      console.log('✅ 已登录用户:', user.email);
      console.log('   用户 ID:', user.id);
      console.log('');

      // 测试 4: 检查用户资料
      console.log('4️⃣ 检查用户资料...');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.error('❌ 获取用户资料失败:', profileError.message);
      } else if (profile) {
        console.log('✅ 用户资料存在:');
        console.log('   邮箱:', profile.email);
        console.log('   姓名:', profile.full_name || '(未设置)');
        console.log('   创建时间:', profile.created_at);
      } else {
        console.warn('⚠️ 用户资料不存在，可能需要重新登录');
      }
      console.log('');

      // 测试 5: 测试数据写入（可选）
      console.log('5️⃣ 测试数据写入权限...');
      const testVideoId = crypto.randomUUID();
      const { error: insertError } = await supabase
        .from('video_metadata')
        .insert({
          id: testVideoId,
          user_id: user.id,
          name: 'Test Video',
          duration: 100,
          size: 1024,
          file_hash: 'test-hash'
        });
      
      if (insertError) {
        console.error('❌ 写入测试失败:', insertError.message);
      } else {
        console.log('✅ 写入权限正常');
        
        // 清理测试数据
        await supabase
          .from('video_metadata')
          .delete()
          .eq('id', testVideoId);
        console.log('✅ 测试数据已清理');
      }
    } else {
      console.log('ℹ️ 未登录\n');
    }

    console.log('\n✨ 测试完成！');
    console.log('\n📝 总结：');
    console.log('- 如果所有表都显示 ✅，说明数据库配置正确');
    console.log('- 如果有 ❌，请检查 Supabase Dashboard 中是否正确执行了迁移');
    console.log('- 如果未登录，某些测试会跳过，这是正常的');

  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error);
  }
}

// 简化的测试函数 - 只检查表是否存在
export async function quickTest() {
  if (!supabase) {
    console.error('❌ Supabase 未配置');
    return false;
  }

  const tables = ['profiles', 'video_metadata', 'subtitles', 'analyses', 'notes', 'chat_history'];
  let allTablesExist = true;

  for (const table of tables) {
    const { error } = await supabase.from(table).select('count').limit(0);
    if (error) {
      console.error(`❌ 表 "${table}" 不存在`);
      allTablesExist = false;
    }
  }

  if (allTablesExist) {
    console.log('✅ 所有数据表都已正确创建！');
  } else {
    console.log('❌ 某些表缺失，请在 Supabase Dashboard 中执行迁移脚本');
  }

  return allTablesExist;
}

// 导出到全局，方便在控制台调用
if (typeof window !== 'undefined') {
  (window as any).testSupabase = testSupabaseConnection;
  (window as any).quickTestSupabase = quickTest;
  console.log('💡 提示：在浏览器控制台输入以下命令测试：');
  console.log('   testSupabase() - 完整测试');
  console.log('   quickTestSupabase() - 快速测试');
}
