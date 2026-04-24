---
name: zhoushan-anchorage-mio
description: >
  舟山锚地供油指数(MIO)数据抓取与看板更新。从舟山海洋气象台API抓取四个锚地
  （条帚门、虾峙门外、马峙、秀山东）的精细化预报数据，生成静态看板文件，
  并推送到GitHub触发Pages部署。
  Use when: 更新锚地数据、刷新MIO供油指数、更新看板、
  抓取舟山天气预报、锚地气象、供油指数更新、MIO update。
  Also triggers on: 定时数据更新任务中涉及锚地/供油/MIO的场景。
---

# 舟山锚地供油指数数据更新

从舟山海洋气象台 API 抓取四个锚地的 MIO 供油指数精细化预报，更新本地数据文件和 GitHub Pages 看板。

## 数据源

- API: `https://www.zs121.com.cn/gh/SubjectiveForecast/groundAnchorageNew?name={锚地名}`
- 四个锚地：条帚门锚地、虾峙门外锚地、马峙锚地、秀山东锚地
- 无需认证，直接返回 JSON
- **仅限国内IP访问**，海外服务器（如 GitHub Actions）无法连通

## 执行流程

### 1. 抓取数据

```bash
python3 scripts/update_data.py
```

脚本在 `scripts/update_data.py`，依赖 `requests`（`pip install requests`）。

运行后会在脚本所在目录的上级 `data/` 下生成：
- `latest.json` — 完整 API 数据
- `data.js` — `window.__ANCHOR_DATA__` 注入（供 file:// 协议使用）

脚本内置重试（3次，间隔2秒）。如果全部锚地抓取失败，exit code 1。

### 2. 推送到 GitHub

抓取成功后，将数据提交并推送到 GitHub，GitHub Pages 自动部署：

```bash
cd <项目目录>
git add data/
git diff --cached --quiet || (git commit -m "🔄 更新MIO数据 $(date '+%Y-%m-%d %H:%M')" && git push)
```

### 3. 项目位置

- 本地项目目录：`/Users/qianlingbo/Documents/网站制作`
- GitHub 仓库：`qianlingbo/zhoushan-anchorage-mio`
- 在线看板：`https://qianlingbo.github.io/zhoushan-anchorage-mio/`

## 定时更新

建议每天 10:00 和 16:00 各跑一次。因为 zs121.com.cn 屏蔽海外 IP，必须从国内机器执行。

## MIO 评分

每个时段四项评分（风力、阵风因子、浪高、能见度）：

| 评分 | 含义 |
|------|------|
| 4    | 适宜 |
| 3    | 一般 |
| 2    | 较差 |
| 1    | 恶劣 |

## 静态看板

`assets/` 目录包含完整的前端文件（index.html、app.js、styles.css），双击 index.html 即可本地查看。四锚地同屏展示3天预报，当前时段自动高亮，MIO四项彩色圆点评分。

## 故障排查

- **全部超时**：检查网络是否能访问 zs121.com.cn（海外IP无法访问）
- **部分失败**：脚本会保留成功的锚地数据，仅输出部分更新
- **数据无变化**：git diff 为空时不会产生空 commit
