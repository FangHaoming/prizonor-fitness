# 囚徒健身 · 进度追踪

基于《囚徒健身》六艺十式的进度追踪网页应用，纯前端、数据存本地，支持打卡、统计与分享卡片。

## 功能概览

- **六艺进度**：俯卧撑、深蹲、引体向上、举腿、桥、倒立撑，每艺 10 式（初/中/高/最终技）
- **每日打卡**：选择日期、按艺按式记录组数/次数、勾选是否达标，自动更新进度
- **首页**：六艺卡片、当前式/已完成式、最终技完成数、快捷打卡
- **六艺详情**：1～10 式列表与完成状态、达标日期、跳转打卡
- **统计**：连续打卡天数、各艺阶段耗时、最终技完成情况
- **分享卡片**：生成进度摘要卡片，支持保存截图与 Web 分享

## 本地运行

```bash
npm install
npm run dev
```

浏览器打开 `http://localhost:5173`。

## 构建与预览

```bash
npm run build
npm run preview
```

## 文档

- [DESIGN.md](./DESIGN.md)：完整设计方案（五节点、边、叶）
- [ROADMAP.md](./ROADMAP.md)：技术路线图、测试与反馈、迭代计划、风险评估

## 技术栈

- React 18 + TypeScript + Vite
- React Router 6
- 本地存储：localStorage（键：`cc_progress`、`cc_checkins`、`cc_achievements`、`cc_settings`）

数据仅存于本机，无后端、无账号，可随时导出备份（后续可做「导出为 JSON」）。
