# 每日任务

轻量级桌面任务管理工具 — 像贴便利贴一样快速记录，AI 自动分析优先级，动态陪伴不打扰。

## 特性

- **极速记录**：打开即写，无需复杂表单，草稿自动保存
- **AI 10 星评估**：DeepSeek 自动分析任务价值/紧急度/潜力，1~10 星分级
- **进度追踪**：进行中任务可设置 25%/50%/75%/100% 进度，满 100% 自动完成
- **进度缩放星星**：部分完成也能提交，星星按完成比例计算
- **成就积累**：累计星星统计，量化感知自己的产出
- **动态陪伴**：温和鼓励或适时催促，三种话术风格可选
- **常驻托盘**：关闭即最小化，Ctrl+Shift+T 随时恢复
- **离线可用**：核心记录不依赖网络；AI 分析可降级为本地规则
- **跨平台**：Windows 10+ / Linux

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
git clone https://github.com/Xertione/dailytasks.git
cd dailytasks
npm install
cp .env.example .env   # 编辑填入 DeepSeek API Key
npm run tauri dev
```

### Linux (Ubuntu/Debian)

```bash
sudo apt update && sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf libssl-dev
git clone https://github.com/Xertione/dailytasks.git
cd dailytasks
npm install
cp .env.example .env
npm run tauri dev
```

## 配置

### API Key

访问 [DeepSeek 开放平台](https://platform.deepseek.com/api_keys) 获取 Key，写入 `.env`：

```env
DEEPSEEK_API_KEY=sk-your-key-here
```

### 应用配置 (`config.toml`)

```toml
[app]
hotkey = "Ctrl+Shift+T"        # 全局快捷键
daily_summary_time = "18:00"   # 每日总结时间
idle_remind_hours = 24         # 停滞提醒阈值

[ai]
provider = "deepseek"          # deepseek | openai | custom
base_url = "https://api.deepseek.com"
model = "deepseek-chat"

[nudge]
default_style = "gentle"       # gentle | direct | humorous
```

### 自定义提示词

- `prompts/star_eval.md` — AI 星级评估提示词模板
- `prompts/nudges.toml` — 三种风格的鼓励/催促话术

## 使用说明

### 任务状态

```
待处理 → 进行中（出现进度条）→ 已完成
```

点击左侧圆圈切换，停在"已完成"不循环。

### 进度追踪

进行中任务下方出现进度条，点击 25%/50%/75%/100%。满 100% 自动标记完成。部分完成也能提交——星星按比例缩放（如 AI 评 8 星，完成 50% 得 4 星）。

### 10 星评估

- 添加任务 → 几秒内 AI 自动分析 → 显示数字星级徽章
- 蓝 1-3 / 琥珀 4-6 / 金 7-10
- 点击徽章 → 弹出 1-10 选择器手动修正
- 离线时自动降级为本地关键词规则

### 键盘快捷键

| 按键 | 行为 |
|------|------|
| `Ctrl+Shift+T` | 呼出/恢复窗口 |
| `↑` `↓` | 导航任务卡片 |
| `Enter` | 切换任务状态 |
| `Delete` | 删除任务 |
| `Esc` | 清空输入框 |

### 系统托盘

- **左键**：恢复窗口
- **右键**：快速添加 / 显示主窗口 / 开机自启 / 退出

## 项目结构

```
daily-tasks/
├── src/                          # React 前端
│   ├── components/               # UI 组件
│   │   ├── TaskInput.tsx         # 快速输入（草稿自动保存）
│   │   ├── TaskCard.tsx          # 任务卡片（星级/进度/状态）
│   │   ├── TaskList.tsx          # 分组折叠列表
│   │   ├── StarBadge.tsx         # 10 星数字徽章
│   │   ├── ProgressPanel.tsx     # 底部进度 + 星星统计
│   │   ├── NudgeBanner.tsx       # 鼓励话术横幅
│   │   ├── SettingsDialog.tsx    # 设置弹窗
│   │   └── Toast.tsx             # 删除撤销通知
│   ├── hooks/                    # React Query + Tauri Event
│   ├── stores/                   # Zustand 状态
│   └── lib/                      # IPC 封装 + 工具
├── src-tauri/                    # Rust 后端
│   ├── src/
│   │   ├── commands/             # 14 个 IPC 命令
│   │   ├── db/                   # SQLite + 数据模型
│   │   ├── ai/                   # Provider/Queue/Prompt/LocalRules
│   │   ├── nudge/                # 话术引擎 + 调度器
│   │   └── main.rs / lib.rs
│   ├── prompts/                  # AI 提示词 / 话术模板
│   └── Cargo.toml
├── config.toml                   # 应用配置
├── .env.example                  # 环境变量模板
├── TEST_CHECKLIST.md             # 37 项手动测试清单
└── README.md
```

## 测试

```bash
# Rust 单元测试 (23 项)
cd src-tauri && cargo test

# 手动测试清单
# 见 TEST_CHECKLIST.md — 37 项覆盖全部功能
```

## 许可证

MIT
