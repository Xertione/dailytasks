# 每日任务

轻量级桌面任务管理工具 — 像贴便利贴一样快速记录，AI 自动分析优先级，动态陪伴不打扰。

## 特性

- **极速记录**：打开即写，无需复杂表单
- **AI 星级评估**：DeepSeek 自动分析任务价值/紧急度/潜力，1~3 星分级
- **动态陪伴**：温和鼓励或适时催促，非冷冰冰的提醒
- **轻量感知**：一眼看清今日完成量、总任务量、工作量
- **常驻托盘**：Ctrl+Shift+T 随时呼出，关闭即隐藏，不影响工作流
- **离线可用**：核心记录功能不依赖网络；AI 分析可降级为本地规则

## 技术栈

| 层 | 技术 |
|---|------|
| 桌面框架 | Tauri 2.0 (Rust + 系统 WebView) |
| 前端 | React 19 + TypeScript + Tailwind CSS v4 |
| 数据 | SQLite (嵌入式) |
| AI | DeepSeek API (OpenAI 兼容) |
| 平台 | Windows 10+ / Linux |

## 快速开始

### 前置条件

- [Rust](https://rustup.rs/) >= 1.77
- [Node.js](https://nodejs.org/) >= 22

### Windows

```bash
# 1. 克隆项目
git clone https://github.com/Xertione/dailytasks.git
cd dailytasks

# 2. 安装前端依赖
npm install

# 3. 配置 API Key
cp .env.example .env
# 编辑 .env，填入你的 DeepSeek API Key

# 4. 开发模式运行
npm run tauri dev
```

### Linux (Ubuntu/Debian)

```bash
# 先安装系统依赖
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf libssl-dev

# 然后同上
git clone https://github.com/Xertione/dailytasks.git
cd dailytasks
npm install
cp .env.example .env
npm run tauri dev
```

### 配置 API Key

1. 访问 [DeepSeek 开放平台](https://platform.deepseek.com/api_keys) 获取 API Key
2. 复制 `.env.example` 为 `.env`，填入 Key：

```env
DEEPSEEK_API_KEY=sk-your-key-here
```

### 自定义 AI 提示词

编辑 `prompts/star_eval.md` 可调整 AI 星级评估的提示词模板。

编辑 `prompts/nudges.toml` 可自定义鼓励/催促话术。

### 自定义应用配置

编辑 `config.toml` 可调整：

- 呼出快捷键（默认 Ctrl+Shift+T）
- 每日总结时间（默认 18:00）
- 停滞提醒阈值（默认 24h）
- AI 模型与服务端点
- 话术默认风格

## 项目结构

```
daily-tasks/
├── src/                          # React 前端
│   ├── components/               # UI 组件
│   │   ├── TaskInput.tsx         # 快速输入框
│   │   ├── TaskCard.tsx          # 任务卡片（含星级/状态流转）
│   │   ├── TaskList.tsx          # 分组任务列表
│   │   ├── StarBadge.tsx         # 星级徽章
│   │   ├── ProgressPanel.tsx     # 底部进度面板
│   │   ├── NudgeBanner.tsx       # 鼓励话术横幅
│   │   └── SettingsDialog.tsx    # 设置弹窗
│   ├── hooks/                    # React Hooks
│   ├── stores/                   # Zustand 状态
│   ├── lib/                      # 工具 & IPC 封装
│   └── styles/                   # 全局样式
├── src-tauri/                    # Rust 后端
│   ├── src/
│   │   ├── commands/             # IPC 命令（CRUD/AI/设置）
│   │   ├── db/                   # SQLite 数据库层
│   │   ├── ai/                   # AI 分析（Provider/Queue/Prompt）
│   │   ├── nudge/                # 话术引擎 & 提醒调度
│   │   └── main.rs / lib.rs      # 入口 & 启动逻辑
│   ├── prompts/                  # AI 提示词 & 话术模板
│   └── Cargo.toml
├── config.toml                   # 应用配置
├── .env.example                  # 环境变量模板
└── README.md
```

## 使用说明

### 任务状态流转

```
待处理 (pending) → 进行中 (in_progress) → 已完成 (done)
                      ↓
                   归档 (archived)
```

点击任务左侧圆圈切换状态。

### 星级评估

- 添加任务后，AI 自动分析并给出 1~3 星
- 点击星级徽章可手动修正
- 离线时自动降级为本地关键词规则

### 系统托盘

- 左键点击托盘图标：显示/隐藏窗口
- 右键菜单：快速添加、今日进度、开机自启、退出
- 关闭窗口（点击 ×）：隐藏到托盘，不退出

### 全局快捷键

- `Ctrl+Shift+T`：呼出/隐藏窗口

## 许可证

MIT
