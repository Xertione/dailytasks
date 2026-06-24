# 每日任务

轻量级桌面任务管理工具 — AI 自动分析优先级，动态陪伴不打扰。

## 特性

- **AI 10 星评估**：DeepSeek 自动分析任务价值/紧急度/潜力
- **AI 教练**：内置聊天，聊任务进展和心情，上下文感知你的任务列表
- **进度追踪**：25%/50%/75%/100% 自由调节，可回退
- **完成笔记**：记录完成情况，AI 帮你总结
- **番茄钟**：25min 工作 / 5min 短休 / 15min 长休
- **成就积累**：累计星星统计，量化产出
- **常驻话术**：温和鼓励不消失，实时评估进度
- **首次引导**：朋友收到也能自己配 Key
- **草稿保存**：输入框自动保存，关闭不丢失
- **删除撤销**：误删可恢复
- **键盘操作**：↑↓ Enter Delete Esc 全支持
- **跨平台**：Windows / Linux

## 下载安装

从 [Releases](https://github.com/Xertione/dailytasks/releases) 下载最新 `每日任务_x64-setup.exe`，双击安装。

首次打开输入 DeepSeek API Key（[免费获取](https://platform.deepseek.com/api_keys)），之后自动记住。

## 技术栈

| 层 | 技术 |
|---|------|
| 桌面框架 | Tauri 2.0 (Rust + 系统 WebView) |
| 前端 | React 19 + TypeScript + Tailwind CSS v4 |
| 数据 | SQLite (嵌入式) |
| AI | DeepSeek API |
| 平台 | Windows 10+ / Linux |

## 开发

### 前置条件

- [Rust](https://rustup.rs/) >= 1.77
- [Node.js](https://nodejs.org/) >= 22

### Windows

```bash
git clone https://github.com/Xertione/dailytasks.git
cd dailytasks
npm install
cp .env.example .env
npm run tauri dev
```

### Linux

```bash
sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf libssl-dev
git clone https://github.com/Xertione/dailytasks.git
cd dailytasks
npm install
cp .env.example .env
npm run tauri dev
```

### 打包

```bash
# Windows: 安装 NSIS https://nsis.sourceforge.io/Download
npm run tauri build
# 输出: src-tauri/target/release/bundle/nsis/每日任务_x64-setup.exe
```

## 使用说明

| 操作 | 方式 |
|------|------|
| 添加任务 | 输入框 + Enter |
| 标记完成 | 点击左侧圆圈 |
| 调节进度 | 点击 25/50/75/100% |
| 写完成笔记 | 点击📝图标 |
| 调节星级 | 点击数字徽章 |
| AI 聊天 | 底部「聊天」Tab |
| 番茄钟 | 底部「番茄钟」Tab |
| 查看历史 | 底部「历史」Tab |
| 呼出窗口 | Ctrl+Shift+T |

## 配置

- `config.toml` — 快捷键、AI 端点、话术风格
- `prompts/star_eval.md` — AI 评估提示词（可调优）
- `prompts/nudges.toml` — 鼓励话术模板

## 许可证

MIT
