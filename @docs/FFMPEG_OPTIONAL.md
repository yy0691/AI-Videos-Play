# FFmpeg 是可选的

## 概述

在生产环境中看到 FFmpeg 加载失败的消息是**完全正常**的，不会影响应用功能。

## 为什么会显示 FFmpeg 错误？

FFmpeg 从 CDN (unpkg.com) 加载，在某些环境下可能失败：
- 网络限制或防火墙
- CSP (内容安全策略) 限制
- CDN 不可用或被阻止

## 这会影响功能吗？

**不会！** 系统设计了智能降级方案：

### 字幕生成流程

```
1. 尝试 Deepgram (推荐)
   ✅ 支持最大 2GB 文件
   ✅ 高质量语音识别
   ✅ 多语言支持
   ↓
2. 如果 Deepgram 不可用 → Gemini 直接处理 (< 50MB)
   ↓
3. 如果文件太大 → Gemini 分段处理
```

### FFmpeg 的原始用途

FFmpeg 最初用于：
- 视频分割（大文件分段处理）
- 音频提取和压缩

但现在：
- ✅ Deepgram 可以直接处理最大 2GB 的文件
- ✅ 不需要视频分割
- ✅ 不需要 FFmpeg

## 控制台消息

正常的消息（不是错误）：
```
[FFmpeg] Unable to load from https://unpkg.com/... (this is expected in production)
[FFmpeg] ℹ️ Not available - using Deepgram instead (supports up to 2GB files)
```

## 如何完全禁用 FFmpeg 检查

如果想跳过 FFmpeg 检查，可以设置环境变量：

```bash
VITE_DISABLE_SEGMENTED=true
```

## 总结

- ❌ FFmpeg 加载失败 = **不是问题**
- ✅ 系统会自动使用 Deepgram
- ✅ 支持最大 2GB 视频文件
- ✅ 所有功能正常工作

**无需任何操作！** 系统已经自动处理了降级方案。

