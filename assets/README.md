# 舟山锚地供油指数静态看板

四个锚地（条帚门、虾峙门外、马峙、秀山东）的 MIO 供油指数精细化预报一览页面。

## 文件结构

```
├── index.html              # 主页面（双击打开即可使用）
├── styles.css              # 样式
├── app.js                  # 渲染逻辑
├── data/
│   ├── latest.json         # 完整 API 数据
│   └── data.js             # window.__ANCHOR_DATA__ 注入（file:// 协议用）
├── scripts/
│   └── update_data.py      # 数据抓取脚本（纯 API，无 Playwright）
└── README.md
```

## 使用方式

### 1. 更新数据

```bash
python3 scripts/update_data.py
```

脚本通过舟山海洋气象台 API 获取四个锚地的精细化预报数据，输出到 `data/` 目录。

依赖：`pip install requests`

### 2. 查看页面

直接双击 `index.html` 在浏览器中打开即可（支持 file:// 协议，无需本地服务器）。

### 3. 定时更新（可选）

用 crontab 定时执行更新脚本，例如每 3 小时更新一次：

```bash
0 */3 * * * cd /path/to/网站制作 && python3 scripts/update_data.py
```

## 数据来源

- API: `https://www.zs121.com.cn/gh/SubjectiveForecast/groundAnchorageNew?name={锚地名}`
- 源站: [舟山海洋气象台](https://www.zs121.com.cn/Portarea/Portarea)
- 无需认证，直接返回 JSON

## MIO 评分说明

每个时段有四项评分（风力、阵风因子、浪高、能见度）：

| 评分 | 颜色 | 含义 |
|------|------|------|
| 4    | 🟢 绿 | 适宜 |
| 3    | 🟡 黄 | 一般 |
| 2    | 🟠 橙 | 较差 |
| 1    | 🔴 红 | 恶劣 |
