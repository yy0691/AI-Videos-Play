# 🎙️ Deepgram 系统默认配置指南

## 概述

现在支持在 Vercel 环境变量中配置系统默认的 Deepgram API Key，用户无需自己配置即可使用字幕生成功能。

## 优先级

```
用户自己的 Key > 系统默认 Key
```

- 如果用户在设置中配置了自己的 Deepgram API Key，优先使用用户的
- 如果用户没有配置，则使用系统默认的 Key
- 如果都没有，则提示用户配置

## 配置步骤

### 1. 获取 Deepgram API Key

1. 访问 https://deepgram.com
2. 注册账户（新用户有 $200 免费额度）
3. 进入 Dashboard → API Keys
4. 创建新的 API Key
5. 复制 Key（格式类似：`xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`）

### 2. 在 Vercel 配置环境变量

#### 方法 A：通过 Vercel Dashboard

1. 登录 Vercel
2. 选择你的项目
3. 进入 **Settings** → **Environment Variables**
4. 添加新变量：
   - **Name**: `VITE_DEEPGRAM_API_KEY`
   - **Value**: 你的 Deepgram API Key
   - **Environments**: 选择 `Production`, `Preview`, `Development`
5. 点击 **Save**
6. 重新部署项目

#### 方法 B：通过 Vercel CLI

```bash
# 设置生产环境
vercel env add VITE_DEEPGRAM_API_KEY production

# 设置预览环境
vercel env add VITE_DEEPGRAM_API_KEY preview

# 设置开发环境
vercel env add VITE_DEEPGRAM_API_KEY development
```

### 3. 本地开发配置

在项目根目录创建 `.env` 文件：

```env
VITE_DEEPGRAM_API_KEY=your_deepgram_api_key_here
```

**⚠️ 重要：不要提交 `.env` 文件到 Git！**

`.gitignore` 中已经包含了 `.env`，确保不会意外提交。

## 验证配置

### 在浏览器控制台查看

打开应用后，按 F12 打开控制台，查找：

```
[Deepgram] Availability check: {
  available: true,
  hasUserKey: false,
  hasSystemKey: true,
  usingKey: 'system',
  keyLength: 40
}
```

- `available: true` - Deepgram 可用
- `hasSystemKey: true` - 系统默认 Key 已配置
- `usingKey: 'system'` - 正在使用系统 Key

### 测试字幕生成

1. 导入一个视频
2. 点击 "生成字幕"
3. 选择 "Deepgram" 作为提供商
4. 如果配置正确，应该能成功生成字幕

## 用户体验

### 对于普通用户

- ✅ 无需配置任何 API Key
- ✅ 直接使用字幕生成功能
- ✅ 享受 Deepgram 的高质量转录

### 对于高级用户

- ✅ 可以在设置中配置自己的 Deepgram API Key
- ✅ 使用自己的免费额度（$200）
- ✅ 更好的隐私控制

## 成本估算

### Deepgram 定价（Nova-2 模型）

- **预录制音频**: $0.0043/分钟
- **免费额度**: $200（约 46,500 分钟）

### 示例

- 10 分钟视频：$0.043
- 1 小时视频：$0.258
- 100 个 10 分钟视频：$4.30

**$200 免费额度可以处理约 780 小时的视频！**

## 安全建议

### ✅ 推荐做法

1. **使用环境变量**
   - 在 Vercel 中配置，不要硬编码
   - 不要提交到 Git

2. **定期轮换 Key**
   - 每 3-6 个月更换一次
   - 如果怀疑泄露，立即更换

3. **监控使用量**
   - 在 Deepgram Dashboard 查看使用情况
   - 设置使用量警报

### ❌ 避免做法

1. ❌ 不要在代码中硬编码 API Key
2. ❌ 不要提交 `.env` 文件到 Git
3. ❌ 不要在客户端代码中直接暴露 Key
4. ❌ 不要分享 Key 给他人

## 故障排除

### 问题 1：Deepgram 不可用

**症状**：控制台显示 `available: false`

**解决方案**：
1. 检查环境变量名称是否正确：`VITE_DEEPGRAM_API_KEY`
2. 检查 Key 是否有效
3. 重新部署项目
4. 清除浏览器缓存

### 问题 2：API 调用失败

**症状**：生成字幕时报错

**解决方案**：
1. 检查 Deepgram 账户余额
2. 检查 API Key 权限
3. 查看浏览器控制台的详细错误信息
4. 检查网络连接

### 问题 3：使用了错误的 Key

**症状**：想用系统 Key 但用了用户 Key

**解决方案**：
1. 在设置中删除用户的 Deepgram API Key
2. 刷新页面
3. 系统会自动使用默认 Key

## 代码实现

### 优先级逻辑

```typescript
// services/deepgramService.ts

const SYSTEM_DEEPGRAM_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY;

function getDeepgramApiKey(userKey?: string): string | undefined {
  return userKey || SYSTEM_DEEPGRAM_KEY;
}
```

### 可用性检查

```typescript
export async function isDeepgramAvailable(): Promise<boolean> {
  const settings = await getEffectiveSettings();
  const apiKey = getDeepgramApiKey(settings.deepgramApiKey);
  return !!apiKey;
}
```

## 相关文档

- [Deepgram 官方文档](https://developers.deepgram.com/)
- [Deepgram 定价](https://deepgram.com/pricing)
- [Vercel 环境变量文档](https://vercel.com/docs/concepts/projects/environment-variables)

## 更新日志

- **2024-11-12**: 添加系统默认 Deepgram Key 支持
- 用户可以选择使用系统 Key 或自己的 Key
- 优先级：用户 Key > 系统 Key

---

**配置完成后，所有用户都可以直接使用字幕生成功能！** 🎉
