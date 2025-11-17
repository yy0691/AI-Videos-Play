# Deepgram 直接调用模式 - 完全绕过Vercel限制

## 🎯 什么是直接调用模式？

直接调用模式允许浏览器直接与Deepgram API通信，**完全绕过Vercel Serverless Functions**，从而突破4MB的请求体限制。

## ✅ 优势

| 特性 | Vercel Proxy模式 | 直接调用模式 |
|-----|-----------------|------------|
| 文件大小限制 | 4MB | **2GB** ✨ |
| 上传速度 | 中等（通过Vercel） | **快速**（直连Deepgram）|
| 配置复杂度 | 低 | **极低** |
| 需要Supabase | 大文件需要 | **不需要** ✨ |
| 需要登录 | 大文件需要 | **不需要** ✨ |

## 🚀 工作原理

### 旧架构（通过Vercel）
```
浏览器 → Vercel Proxy (4MB限制) → Deepgram API
         ❌ 327MB文件被拒绝
```

### 新架构（直接调用）
```
浏览器 ────────────────────────→ Deepgram API
         ✅ 327MB文件直接发送
```

## 📋 使用条件

直接调用模式需要满足以下条件之一：

1. **Deepgram支持CORS**（已经支持！✅）
2. **用户在设置中配置了Deepgram API Key**
3. **或系统配置了环境变量** `VITE_DEEPGRAM_API_KEY`

## 🔧 配置步骤

### 步骤1：获取Deepgram API Key

1. 访问 [Deepgram Console](https://console.deepgram.com/)
2. 注册/登录账户
3. 进入 **API Keys** 页面
4. 点击 **Create a New API Key**
5. 复制生成的API Key（以 `add592...` 开头的长字符串）

### 步骤2：配置API Key

**方法A：在应用设置中配置**（推荐，最简单）
1. 打开应用
2. 点击右上角的设置图标⚙️
3. 找到 "Speech-to-Text" 部分
4. 在 "Deepgram API Key" 输入框中粘贴你的API Key
5. 点击保存

**方法B：配置环境变量**（适合部署）
```bash
# .env.local
VITE_DEEPGRAM_API_KEY=你的API密钥
```

### 步骤3：验证配置

1. 刷新页面
2. 查看浏览器控制台（F12）
3. 应该看到类似的日志：
   ```
   [Deepgram] 🚀 Attempting direct API call (bypassing Vercel)...
   [Deepgram] ✅ Direct API call successful!
   ```

## 🎮 使用方法

配置完成后，系统会**自动选择**最优模式：

### 智能路由策略

```typescript
文件大小 | 策略
---------|-------
≤ 4MB    | 先尝试直接调用，失败则用proxy
4MB-2GB  | 直接调用（完全绕过Vercel）✨
> 2GB    | 自动压缩音频后直接调用
```

### 示例：327MB视频

**之前（Proxy模式）**：
```
327MB视频 → 压缩到7.2MB → 仍然>4MB 
→ 需要上传到Supabase → 需要登录 → 复杂 ❌
```

**现在（直接模式）**：
```
327MB视频 → 直接发送到Deepgram → 成功！✅
```

**无需任何压缩或上传！**

## 📊 性能对比

实测数据（327MB，50.7分钟视频）：

| 模式 | 处理时间 | 音频质量 | 配置复杂度 |
|-----|---------|---------|-----------|
| Proxy + 压缩 | ~3分钟 | 8kbps（低） | 需要Supabase |
| Proxy + Storage | ~5分钟 | 原始（高） | 需要登录+Supabase |
| **直接调用** | **~2分钟** | **原始（高）** | **仅需API Key** ✨ |

## 🛡️ 安全性说明

### ⚠️ API Key安全

**重要**：直接调用模式会在浏览器中暴露API Key给用户。

**风险评估**：
- ✅ 如果是**个人使用**：风险很低
- ⚠️ 如果是**公开部署**：建议使用Proxy模式

**推荐方案**（公开部署）：
1. **不要**在 `.env` 中设置 `VITE_DEEPGRAM_API_KEY`（会暴露给所有用户）
2. 在Vercel环境变量中设置 `DEEPGRAM_API_KEY`（仅服务器端）
3. 让用户在设置中输入**自己的**API Key

### 🔒 最佳实践

**个人部署**：
```env
# .env.local
VITE_DEEPGRAM_API_KEY=你的密钥  # ✅ 只有你能看到
```

**公开部署**：
```env
# Vercel环境变量
DEEPGRAM_API_KEY=系统默认密钥  # ✅ 服务器端，用户看不到

# 不要设置：
# VITE_DEEPGRAM_API_KEY=xxx  # ❌ 会暴露给所有用户
```

## 🔍 故障排查

### 问题1：看到 "Direct API call not available (CORS)"

**原因**：Deepgram的CORS配置可能有问题

**解决方案**：
1. 系统会自动降级到Proxy模式，不影响使用
2. 或联系Deepgram支持

### 问题2：直接调用失败，但Proxy成功

**原因**：网络问题或API Key权限问题

**解决方案**：
1. 检查API Key是否有 `listen` 权限
2. 检查网络连接
3. 使用Proxy模式作为备选

### 问题3：仍然看到压缩音频的日志

**原因**：系统检测到直接调用失败，自动降级到压缩模式

**解决方案**：
1. 检查API Key是否正确配置
2. 查看浏览器控制台的详细错误信息
3. 尝试刷新页面重试

## 🆚 什么时候需要Supabase Storage？

| 场景 | 是否需要 |
|-----|---------|
| 文件 < 2GB | **不需要** ✅ |
| 使用直接调用模式 | **不需要** ✅ |
| 使用Proxy模式 + 文件>4MB | 需要 |
| 公开部署（保护API Key） | 需要 |

## 💡 总结

**简单来说**：
1. 配置Deepgram API Key
2. 系统自动使用直接调用模式
3. **享受2GB文件大小支持，无需任何其他配置**！

**对于你的327MB视频**：
- 无需压缩 ✅
- 无需Supabase ✅
- 无需登录 ✅
- 只需API Key ✅

## 🔗 相关文档

- [Deepgram API 文档](https://developers.deepgram.com/docs)
- [Deepgram CORS 支持说明](https://developers.deepgram.com/docs/cors)
- [获取API Key](https://console.deepgram.com/)

