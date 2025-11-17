# Supabase Storage 快速配置指南

## 📋 问题背景

当处理大型视频文件（>200MB）时，即使经过音频压缩，文件大小仍可能超过 Vercel 的 4MB 限制。此时需要使用 Supabase Storage 作为中转存储。

## 🎯 解决方案

### 步骤 1：获取 Supabase Service Role Key

1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 选择你的项目
3. 进入 **Settings** → **API**
4. 找到 **Service Role Key** 部分
5. 点击 **Reveal** 并复制密钥（以 `eyJ` 开头的长字符串）

⚠️ **重要提醒**：Service Role Key 拥有完全权限，**永远不要**提交到 Git 或暴露在前端代码中！

### 步骤 2：在 Vercel 中配置环境变量

#### 方法 A：通过 Vercel Dashboard（推荐）

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目
3. 进入 **Settings** → **Environment Variables**
4. 添加以下变量：

   ```
   名称: SUPABASE_SERVICE_ROLE_KEY
   值: 你的Service Role Key（从步骤1获取）
   环境: Production, Preview, Development（全选）
   ```

5. 点击 **Save**
6. **重新部署项目**（Environment Variables 需要重新部署才能生效）

#### 方法 B：通过 Vercel CLI

```bash
# 安装 Vercel CLI（如果还没有）
npm i -g vercel

# 登录 Vercel
vercel login

# 添加环境变量
vercel env add SUPABASE_SERVICE_ROLE_KEY

# 重新部署
vercel --prod
```

### 步骤 3：创建 Storage Bucket

1. 在 Supabase Dashboard 中，进入 **Storage** → **Buckets**
2. 点击 **New Bucket**
3. 配置如下：
   - **Name**: `video-uploads`
   - **Public**: 启用（或根据需求配置 RLS 策略）
   - **File size limit**: `100MB`（根据需求调整）
4. 点击 **Create bucket**

### 步骤 4：配置 RLS 策略（如果 Bucket 是 Private）

如果你的 bucket 是私有的，需要配置 Row Level Security 策略：

```sql
-- 允许认证用户上传文件
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'video-uploads');

-- 允许所有人读取文件（如果需要公开访问）
CREATE POLICY "Allow public read access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'video-uploads');

-- 允许用户删除自己上传的文件
CREATE POLICY "Allow users to delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'video-uploads' AND auth.uid() = owner);
```

### 步骤 5：验证配置

1. 重新部署项目（如果还没有）
2. 尝试上传一个大视频文件
3. 查看浏览器控制台，应该看到：
   ```
   [Deepgram] 🔧 Using aggressive compression: 8kbps, max 30 minutes
   [Deepgram] Audio compressed successfully: {...}
   [Deepgram] Audio uploaded, using URL mode: https://...
   [Deepgram] Transcription complete (URL mode with compressed audio)
   ```

## 🔧 故障排查

### 问题 1：仍然提示 "SUPABASE_SERVICE_ROLE_KEY not configured"

**可能原因**：
- 环境变量没有保存
- 没有重新部署项目
- 变量名拼写错误

**解决方法**：
1. 在 Vercel Dashboard 中确认变量存在且正确
2. 确保在所有环境（Production, Preview, Development）中都添加了
3. 点击项目右上角 **Deployments** → 最新部署 → **Redeploy**

### 问题 2：上传到 Storage 失败 "Failed to access storage"

**可能原因**：
- Bucket 不存在
- RLS 策略配置错误
- 用户未登录

**解决方法**：
1. 确认 bucket `video-uploads` 已创建
2. 检查 RLS 策略是否正确
3. 确保用户已登录系统

### 问题 3：Deepgram 无法读取 Storage URL

**可能原因**：
- Bucket 不是公开的
- URL 过期
- CORS 配置问题

**解决方法**：
1. 确保 bucket 设置为 public 或配置了正确的 RLS
2. 在 Supabase Dashboard → Storage → Configuration 中检查 CORS 设置

## 💡 最佳实践

1. **安全性**：
   - 永远不要在前端代码中硬编码 Service Role Key
   - 只在服务器端 API（Vercel Functions）中使用

2. **性能优化**：
   - 为大文件启用 CDN 加速
   - 定期清理旧的临时文件

3. **成本控制**：
   - 设置 Storage 配额
   - 定期删除不再需要的文件
   - 使用 Supabase 的存储分析功能监控使用量

## 📊 压缩策略说明

系统会根据文件大小自动选择压缩策略：

| 文件大小 | 比特率 | 时长限制 | 预期压缩后大小 |
|---------|--------|---------|--------------|
| < 50MB  | 32kbps | 无      | ~10-15MB     |
| 50-100MB| 16kbps | 无      | ~5-8MB       |
| 100-200MB| 12kbps| 无      | ~4-6MB       |
| > 200MB | 8kbps  | 30分钟   | ~1-3MB       |

对于50分钟的327MB视频：
- 使用 8kbps 压缩前30分钟
- 预期压缩后约 1.8MB（可直接传输）
- 或通过 Storage 处理完整视频

## 🆘 仍然无法解决？

1. 查看 Vercel 部署日志：`vercel logs <deployment-url>`
2. 查看 Supabase 日志：Dashboard → Logs
3. 在浏览器控制台查看详细错误信息
4. 提交 Issue 并附上：
   - 完整的错误日志
   - 视频文件大小和时长
   - Vercel 环境变量截图（隐藏敏感信息）

## 🔗 相关文档

- [Supabase Storage 官方文档](https://supabase.com/docs/guides/storage)
- [Vercel 环境变量文档](https://vercel.com/docs/concepts/projects/environment-variables)
- [项目完整文档](./@docs/)

