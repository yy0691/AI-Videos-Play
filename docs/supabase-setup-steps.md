# Supabase 设置步骤（图文版）

## 📋 准备工作

在开始之前，确保你已经：
- ✅ 在 Supabase.com 注册了账户
- ✅ 创建了一个新项目
- ✅ 项目已经完成初始化（等待几分钟）

---

## 🎯 步骤 1：打开 SQL Editor

### 在 Supabase Dashboard 中：

```
左侧菜单
├── Home
├── Table Editor
├── SQL Editor  ← 点击这里
├── Database
└── ...
```

**操作：**
1. 登录 https://supabase.com/dashboard
2. 选择你的项目
3. 点击左侧的 **SQL Editor** (图标: `</>`)

---

## 🎯 步骤 2：创建新查询

在 SQL Editor 页面：

```
顶部工具栏
├── [New Query]  ← 点击这个按钮
├── Templates
└── History
```

**操作：**
点击右上角的 **New Query** 按钮

---

## 🎯 步骤 3：复制 SQL 代码

### 找到迁移文件：

```
你的项目
└── supabase
    └── migrations
        └── 20251112021718_create_auth_and_sync_tables.sql  ← 这个文件
```

**操作：**
1. 在 VS Code 或其他编辑器中打开这个文件
2. 全选所有内容（Ctrl+A 或 Cmd+A）
3. 复制（Ctrl+C 或 Cmd+C）

---

## 🎯 步骤 4：粘贴并执行

在 SQL Editor 中：

```
┌─────────────────────────────────────────┐
│ [New Query]  [Save]  [Run] ← 点击这里   │
├─────────────────────────────────────────┤
│                                         │
│  /* 粘贴 SQL 代码到这里 */              │
│  CREATE EXTENSION IF NOT EXISTS ...     │
│  CREATE TABLE IF NOT EXISTS ...         │
│  ...                                    │
│                                         │
└─────────────────────────────────────────┘
```

**操作：**
1. 在编辑器中粘贴 SQL 代码（Ctrl+V 或 Cmd+V）
2. 点击右下角的 **Run** 按钮（或按 Ctrl+Enter）
3. 等待执行完成（几秒钟）

---

## 🎯 步骤 5：验证表创建

### 查看结果：

执行成功后，你会看到：

```
✅ Success. No rows returned
```

或类似的成功消息。

### 验证表是否存在：

```
左侧菜单
├── Home
├── Table Editor  ← 点击这里
├── SQL Editor
└── ...
```

**操作：**
1. 点击左侧的 **Table Editor**
2. 在表列表中查找以下表：

```
Tables
├── 📋 profiles
├── 📋 video_metadata
├── 📋 subtitles
├── 📋 analyses
├── 📋 notes
└── 📋 chat_history
```

如果看到这 6 个表，说明创建成功！🎉

---

## 🎯 步骤 6：获取 API 凭证

### 在 Supabase Dashboard 中：

```
左侧菜单
├── ...
├── Settings (齿轮图标)  ← 点击这里
    └── API  ← 再点击这里
```

**操作：**
1. 点击左侧底部的 **Settings** (齿轮图标)
2. 在设置菜单中点击 **API**

### 复制两个值：

```
Project API keys
├── Project URL
│   https://xxxxx.supabase.co  ← 复制这个
│
└── API Keys
    ├── anon public
    │   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  ← 复制这个
    └── service_role (不要用这个)
```

---

## 🎯 步骤 7：配置环境变量

### 在项目根目录创建 `.env` 文件：

```
你的项目
├── src/
├── public/
├── supabase/
├── .env  ← 创建这个文件
├── package.json
└── ...
```

### 文件内容：

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**注意：**
- 替换为你自己的 URL 和 Key
- 确保没有多余的空格
- 确保有 `VITE_` 前缀

---

## 🎯 步骤 8：重启开发服务器

### 在终端中：

```bash
# 1. 停止当前服务器
按 Ctrl+C

# 2. 重新启动
npm run dev
```

**为什么要重启？**
- Vite 只在启动时读取 `.env` 文件
- 修改环境变量后必须重启才能生效

---

## 🎯 步骤 9：测试连接

### 方法 1：在应用中测试

```
应用界面
└── 右上角
    └── [登录] 按钮  ← 点击这里
        └── 注册新账户
            └── 输入邮箱和密码
                └── 点击注册
```

**如果成功：**
- ✅ 收到确认邮件
- ✅ 可以登录
- ✅ 看到用户资料

### 方法 2：使用控制台测试

```
浏览器
└── 按 F12 打开开发者工具
    └── Console 标签
        └── 输入命令：quickTestSupabase()
            └── 按 Enter
```

**期望输出：**
```
✅ 表 "profiles" 存在
✅ 表 "video_metadata" 存在
✅ 表 "subtitles" 存在
✅ 表 "analyses" 存在
✅ 表 "notes" 存在
✅ 表 "chat_history" 存在
✅ 所有数据表都已正确创建！
```

---

## ✅ 完成！

现在你可以：

1. **使用认证功能**
   - 注册新用户
   - 登录/登出
   - 管理个人资料

2. **同步数据到云端**
   - 在账户面板中点击"同步到云端"
   - 数据会自动上传到 Supabase

3. **跨设备访问**
   - 在其他设备登录同一账户
   - 数据自动同步

---

## 🔧 故障排除

### 问题 1：SQL 执行失败

**错误信息：**
```
relation "profiles" already exists
```

**解决方法：**
- 这是正常的，说明表已经存在
- 可以忽略这个错误

---

### 问题 2：应用无法连接

**检查清单：**
```
□ .env 文件在项目根目录
□ 环境变量名称正确（VITE_ 前缀）
□ URL 和 Key 正确复制
□ 已重启开发服务器
□ 浏览器控制台没有错误
```

**调试步骤：**
1. 打开浏览器控制台（F12）
2. 查看是否有错误信息
3. 检查 Network 标签，看是否有请求失败

---

### 问题 3：登录后没有用户资料

**可能原因：**
- 触发器没有正确创建

**解决方法：**
在 SQL Editor 中执行：
```sql
-- 检查触发器
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

如果没有结果，重新执行整个迁移 SQL。

---

## 📚 更多资源

- 📖 [完整设置指南](../SUPABASE_SETUP.md)
- 🚀 [快速开始](../QUICK_START_SUPABASE.md)
- 💻 [测试脚本](../scripts/test-supabase-connection.ts)
- 🌐 [Supabase 官方文档](https://supabase.com/docs)

---

**设置完成！开始使用吧！** 🎉
