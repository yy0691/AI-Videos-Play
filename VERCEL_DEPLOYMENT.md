# Vercel 部署指南 | Vercel Deployment Guide

## 中文说明

### 安全的环境变量配置

本项目已实现安全的API密钥保护机制。当您在Vercel上部署时，可以提供系统默认的API配置，让用户无需配置即可试用，同时完全保护您的API密钥不被泄露。

### 工作原理

1. **后端代理**: 创建了 `/api/proxy` 端点作为安全的API代理
2. **密钥隔离**: API密钥只存储在后端环境变量中，前端无法访问
3. **智能路由**: 
   - 用户未配置自己的密钥时 → 自动使用代理模式（调用您的后端API）
   - 用户配置了自己的密钥时 → 直接调用Gemini API（不占用您的配额）

### Vercel环境变量配置步骤

在Vercel项目设置中，配置以下环境变量：

#### 后端环境变量（保护API密钥）

```bash
# 必需：Gemini API密钥（后端安全存储，前端无法访问）
GEMINI_API_KEY=your_actual_api_key_here

# 可选：自定义模型（默认：gemini-2.5-flash）
GEMINI_MODEL=gemini-2.5-flash

# 可选：自定义API基础URL（默认：https://generativelanguage.googleapis.com）
GEMINI_BASE_URL=https://generativelanguage.googleapis.com
```

#### 前端环境变量（安全信号）

```bash
# 必需：启用代理模式（告诉前端代理可用，但不暴露密钥）
VITE_USE_PROXY=true

# 可选：前端显示的默认模型（仅用于UI显示）
VITE_MODEL=gemini-2.5-flash
```

### 重要安全提示 ⚠️

❌ **绝对不要使用** `VITE_API_KEY` 或 `VITE_GEMINI_API_KEY` - 这会将密钥暴露在前端代码中！  
✅ **使用** `GEMINI_API_KEY`（后端） + `VITE_USE_PROXY=true`（前端）

**工作原理：**
- `GEMINI_API_KEY`：仅后端可见，用于实际API调用
- `VITE_USE_PROXY=true`：前端只知道代理可用，永远不会看到真实密钥

前端的 `VITE_` 环境变量会被编译到JavaScript代码中。我们只用它传递一个布尔标志，而不是敏感数据。

### 配置示例

**Vercel Dashboard → Settings → Environment Variables:**

| Key | Value | Environment |
|-----|-------|-------------|
| `GEMINI_API_KEY` | `AIza...` | Production, Preview, Development |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Production, Preview, Development |
| `VITE_USE_PROXY` | `true` | Production, Preview, Development |
| `VITE_MODEL` | `gemini-2.5-flash` | Production, Preview, Development |

### 用户体验

- **无密钥用户**: 自动使用您提供的系统配置，通过代理调用API（计入您的配额）
- **有密钥用户**: 可在设置中配置自己的API密钥，直接调用Gemini API（不占用您的配额）

### 可选：添加使用限制

您可以在 `api/proxy.ts` 中添加额外的安全措施：

- 速率限制（rate limiting）
- 使用量追踪
- IP白名单/黑名单
- 请求验证

---

## English Instructions

### Secure Environment Variable Configuration

This project implements a secure API key protection mechanism. When deploying on Vercel, you can provide system default API configuration for users to try without setup, while completely protecting your API key from exposure.

### How It Works

1. **Backend Proxy**: Created `/api/proxy` endpoint as a secure API proxy
2. **Key Isolation**: API keys are only stored in backend environment variables, inaccessible from frontend
3. **Smart Routing**: 
   - Users without their own keys → Automatically use proxy mode (calls your backend API)
   - Users with their own keys → Directly call Gemini API (doesn't use your quota)

### Vercel Environment Variable Setup

In your Vercel project settings, configure the following environment variables:

#### Backend Environment Variables (Protect API Key)

```bash
# Required: Gemini API key (backend secure storage, frontend cannot access)
GEMINI_API_KEY=your_actual_api_key_here

# Optional: Custom model (default: gemini-2.5-flash)
GEMINI_MODEL=gemini-2.5-flash

# Optional: Custom API base URL (default: https://generativelanguage.googleapis.com)
GEMINI_BASE_URL=https://generativelanguage.googleapis.com
```

#### Frontend Environment Variables (Safe Signal)

```bash
# Required: Enable proxy mode (tells frontend proxy is available without exposing key)
VITE_USE_PROXY=true

# Optional: Default model for UI display
VITE_MODEL=gemini-2.5-flash
```

### Important Security Notice ⚠️

❌ **NEVER use** `VITE_API_KEY` or `VITE_GEMINI_API_KEY` - This exposes your key in frontend code!  
✅ **USE** `GEMINI_API_KEY` (backend) + `VITE_USE_PROXY=true` (frontend)

**How it works:**
- `GEMINI_API_KEY`: Backend only, used for actual API calls
- `VITE_USE_PROXY=true`: Frontend only knows proxy is available, never sees the real key

Frontend `VITE_` environment variables are compiled into JavaScript code. We only use it to pass a boolean flag, not sensitive data.

### Configuration Example

**Vercel Dashboard → Settings → Environment Variables:**

| Key | Value | Environment |
|-----|-------|-------------|
| `GEMINI_API_KEY` | `AIza...` | Production, Preview, Development |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Production, Preview, Development |
| `VITE_USE_PROXY` | `true` | Production, Preview, Development |
| `VITE_MODEL` | `gemini-2.5-flash` | Production, Preview, Development |

### User Experience

- **Users without keys**: Automatically use your system configuration via proxy (counts toward your quota)
- **Users with keys**: Can configure their own API key in settings, directly call Gemini API (doesn't use your quota)

### Optional: Add Usage Limits

You can add additional security measures in `api/proxy.ts`:

- Rate limiting
- Usage tracking
- IP whitelist/blacklist
- Request validation
