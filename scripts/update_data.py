#!/usr/bin/env python3
"""
舟山锚地供油指数数据抓取脚本
通过 API 获取四个锚地的精细化预报数据，输出到 data/ 目录。
依赖：requests
用法：python3 scripts/update_data.py
"""
from __future__ import annotations

import json
import sys
import time
from datetime import datetime
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"

API_BASE = "https://www.zs121.com.cn/gh/SubjectiveForecast/groundAnchorageNew"

ANCHORS = [
    "条帚门锚地",
    "虾峙门外锚地",
    "马峙锚地",
    "秀山东锚地",
]

MAX_RETRIES = 3
RETRY_DELAY = 2  # seconds


def ensure_dirs() -> None:
    DATA_DIR.mkdir(exist_ok=True)


def fetch_anchor(name: str) -> dict:
    """Fetch forecast data for a single anchorage with retry."""
    url = f"{API_BASE}?name={name}"
    last_error = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            print(f"  [{attempt}/{MAX_RETRIES}] 请求 {name} ...", flush=True)
            resp = requests.get(url, timeout=15)
            resp.raise_for_status()
            payload = resp.json()

            if payload.get("errCode") != "0":
                raise ValueError(f"API 返回错误: {payload.get('errMsg', '未知')}")

            return payload["data"]

        except Exception as exc:
            last_error = exc
            print(f"    ⚠ 失败: {exc}", flush=True)
            if attempt < MAX_RETRIES:
                print(f"    {RETRY_DELAY}s 后重试 ...", flush=True)
                time.sleep(RETRY_DELAY)

    raise RuntimeError(f"抓取 {name} 失败（已重试 {MAX_RETRIES} 次）: {last_error}")


def main() -> None:
    ensure_dirs()
    print("=== 舟山锚地供油指数数据更新 ===", flush=True)
    print(f"时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", flush=True)

    results = {}
    errors = []

    for name in ANCHORS:
        print(f"\n抓取 {name} ...", flush=True)
        try:
            data = fetch_anchor(name)
            results[name] = data
            n = len(data.get("PreciseForecast", []))
            print(f"  ✓ 成功，{n} 条时段数据", flush=True)
        except RuntimeError as exc:
            errors.append(str(exc))
            print(f"  ✗ {exc}", flush=True)

    if not results:
        print("\n全部锚地抓取失败，未更新文件。", file=sys.stderr)
        sys.exit(1)

    # Build output structure
    # Use the first anchor's PreciseForecastTime as publishTime
    first_data = next(iter(results.values()))
    publish_time = first_data.get("PreciseForecastTime", "")
    publish_code = first_data.get("Time", "")

    manifest = {
        "status": "更新完成" if not errors else "部分更新",
        "lastUpdated": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "publishTime": publish_time,
        "publishCode": publish_code,
        "source": "https://www.zs121.com.cn/Portarea/Portarea",
        "apiBase": API_BASE,
        "anchors": {},
    }

    for name in ANCHORS:
        if name in results:
            manifest["anchors"][name] = results[name]

    # Write latest.json
    json_path = DATA_DIR / "latest.json"
    json_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"\n✓ 已写入 {json_path}", flush=True)

    # Write data.js (for file:// protocol)
    js_path = DATA_DIR / "data.js"
    js_path.write_text(
        "window.__ANCHOR_DATA__ = "
        + json.dumps(manifest, ensure_ascii=False, indent=2)
        + ";\n",
        encoding="utf-8",
    )
    print(f"✓ 已写入 {js_path}", flush=True)

    if errors:
        print(f"\n⚠ {len(errors)} 个锚地抓取失败:")
        for e in errors:
            print(f"  - {e}")
    else:
        print("\n全部完成！")


if __name__ == "__main__":
    main()
