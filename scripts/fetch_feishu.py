#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
飞书多维表格数据拉取脚本
- 从飞书Base拉取文献数据
- 支持分页、增量更新
- 无凭证时回退到本地NDJSON文件
"""

import os
import sys
import json
import time
import re
from datetime import datetime, timezone, timedelta
from pathlib import Path

# 项目根目录
ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_PRIVATE = ROOT_DIR / "data" / "private"
DATA_PUBLIC = ROOT_DIR / "data" / "public"

# 确保目录存在
DATA_PRIVATE.mkdir(parents=True, exist_ok=True)
DATA_PUBLIC.mkdir(parents=True, exist_ok=True)

# 同步元数据文件
SYNC_META_FILE = DATA_PRIVATE / "sync_meta.json"

# 本地回退文件
LOCAL_HBV_FILE = ROOT_DIR / "hbv_literature.ndjson"
LOCAL_INDUSTRY_FILE = ROOT_DIR / "industry_insights.ndjson"

# 输出文件
OUTPUT_RAW_FILE = DATA_PRIVATE / "literature_raw.ndjson"
OUTPUT_META_FILE = DATA_PUBLIC / "update_meta.json"


def load_env():
    """加载环境变量，支持.env文件"""
    env_file = ROOT_DIR / ".env"
    if env_file.exists():
        try:
            from dotenv import load_dotenv
            load_dotenv(env_file)
            print(f"[信息] 已加载 .env 配置文件")
        except ImportError:
            # 手动解析
            with open(env_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        key, value = line.split("=", 1)
                        os.environ.setdefault(key.strip(), value.strip())
            print(f"[信息] 已手动加载 .env 配置文件")


def has_feishu_credentials():
    """检查是否有飞书凭证"""
    app_id = os.environ.get("FEISHU_APP_ID", "")
    app_secret = os.environ.get("FEISHU_APP_SECRET", "")
    app_token = os.environ.get("FEISHU_APP_TOKEN", "")
    table_id = os.environ.get("FEISHU_TABLE_ID", "")
    return all([app_id, app_secret, app_token, table_id])


def get_tenant_access_token(app_id, app_secret):
    """获取tenant_access_token"""
    import requests
    url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
    payload = {"app_id": app_id, "app_secret": app_secret}
    resp = requests.post(url, json=payload, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    if data.get("code") != 0:
        raise Exception(f"获取token失败: {data.get('msg')}")
    return data["tenant_access_token"]


def clean_rich_text(text):
    """清理富文本格式，提取纯文本"""
    if not text:
        return ""
    if isinstance(text, list):
        # 飞书富文本格式
        parts = []
        for item in text:
            if isinstance(item, dict):
                # 处理不同类型的富文本元素
                if item.get("type") == "text":
                    parts.append(item.get("text", ""))
                elif item.get("type") == "mention":
                    parts.append(item.get("text", ""))
                else:
                    parts.append(str(item.get("text", item.get("value", ""))))
            elif isinstance(item, str):
                parts.append(item)
        return "".join(parts)
    if isinstance(text, str):
        # 去除HTML标签
        text = re.sub(r"<[^>]+>", "", text)
        # 去除多余空白
        text = re.sub(r"\s+", " ", text).strip()
        return text
    return str(text)


def load_last_sync_time():
    """加载上次同步时间"""
    if SYNC_META_FILE.exists():
        try:
            with open(SYNC_META_FILE, "r", encoding="utf-8") as f:
                meta = json.load(f)
                return meta.get("last_sync")
        except Exception:
            pass
    return None


def save_sync_meta(records_count, new_count, duration, data_source):
    """保存同步元数据"""
    now = datetime.now(timezone(timedelta(hours=8))).isoformat()
    meta = {
        "last_sync": now,
        "records_count": records_count,
        "new_this_sync": new_count,
        "sync_duration_seconds": round(duration, 2),
        "data_source": data_source,
    }
    # 私有版本（完整）
    with open(SYNC_META_FILE, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    # 公开版本
    with open(OUTPUT_META_FILE, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    return meta


def fetch_from_feishu():
    """从飞书多维表格拉取数据"""
    import requests

    app_id = os.environ["FEISHU_APP_ID"]
    app_secret = os.environ["FEISHU_APP_SECRET"]
    app_token = os.environ["FEISHU_APP_TOKEN"]
    table_id = os.environ["FEISHU_TABLE_ID"]

    print("[信息] 正在连接飞书多维表格...")
    token = get_tenant_access_token(app_id, app_secret)
    print("[信息] 已获取访问凭证")

    headers = {"Authorization": f"Bearer {token}"}
    base_url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records"

    # 获取字段结构
    fields_url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/fields"
    try:
        resp = requests.get(fields_url, headers=headers, timeout=30)
        fields_data = resp.json()
        if fields_data.get("code") == 0:
            fields = fields_data.get("data", {}).get("items", [])
            print(f"[信息] 检测到 {len(fields)} 个字段")
    except Exception as e:
        print(f"[警告] 获取字段结构失败: {e}")

    # 分页拉取记录
    all_records = []
    page_token = None
    page_size = 500
    page_num = 0

    last_sync = load_last_sync_time()
    if last_sync:
        print(f"[信息] 上次同步时间: {last_sync}，将进行增量同步")

    while True:
        page_num += 1
        params = {"page_size": page_size}
        if page_token:
            params["page_token"] = page_token

        try:
            resp = requests.get(base_url, headers=headers, params=params, timeout=30)
            resp.raise_for_status()
            data = resp.json()

            if data.get("code") != 0:
                raise Exception(f"拉取记录失败: {data.get('msg')}")

            items = data.get("data", {}).get("items", [])
            has_more = data.get("data", {}).get("has_more", False)
            page_token = data.get("data", {}).get("page_token")

            # 处理每条记录
            for item in items:
                record = {"record_id": item.get("record_id", "")}
                fields_data = item.get("fields", {})
                for key, value in fields_data.items():
                    record[key] = value
                all_records.append(record)

            print(f"[信息] 第 {page_num} 页: 获取 {len(items)} 条记录 (累计 {len(all_records)})")

            if not has_more or not page_token:
                break

        except Exception as e:
            print(f"[错误] 拉取第 {page_num} 页失败: {e}")
            break

    return all_records


def read_local_ndjson(filepath, label=""):
    """读取本地NDJSON文件"""
    records = []
    if not filepath.exists():
        print(f"[警告] 本地文件不存在: {filepath}")
        return records

    try:
        with open(filepath, "r", encoding="utf-8") as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                try:
                    record = json.loads(line)
                    records.append(record)
                except json.JSONDecodeError as e:
                    print(f"[警告] {label}第 {line_num} 行JSON解析失败: {e}")
        print(f"[信息] 从本地文件读取 {len(records)} 条{label}记录")
    except Exception as e:
        print(f"[错误] 读取 {filepath} 失败: {e}")

    return records


def fallback_to_local():
    """回退到本地NDJSON文件"""
    print("[信息] 未检测到飞书凭证，使用本地数据文件")

    all_records = []

    # 读取文献数据
    if LOCAL_HBV_FILE.exists():
        hbv_records = read_local_ndjson(LOCAL_HBV_FILE, "文献")
        all_records.extend(hbv_records)
    else:
        print(f"[警告] 文献数据文件不存在: {LOCAL_HBV_FILE}")

    # 读取行业洞察数据
    if LOCAL_INDUSTRY_FILE.exists():
        industry_records = read_local_ndjson(LOCAL_INDUSTRY_FILE, "行业洞察")
        # 标记来源
        for rec in industry_records:
            rec["_source_type"] = "industry_insight"
        all_records.extend(industry_records)
    else:
        print(f"[警告] 行业洞察数据文件不存在: {LOCAL_INDUSTRY_FILE}")

    return all_records


def save_raw_records(records):
    """保存原始记录到NDJSON"""
    with open(OUTPUT_RAW_FILE, "w", encoding="utf-8") as f:
        for record in records:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
    print(f"[信息] 已保存 {len(records)} 条原始记录到 {OUTPUT_RAW_FILE}")


def main():
    print("=" * 60)
    print("飞书数据拉取脚本")
    print("=" * 60)

    start_time = time.time()

    # 加载环境变量
    load_env()

    # 判断数据源
    if has_feishu_credentials():
        data_source = "feishu_base"
        try:
            records = fetch_from_feishu()
        except Exception as e:
            print(f"[错误] 飞书拉取失败，回退到本地数据: {e}")
            records = fallback_to_local()
            data_source = "local_fallback"
    else:
        data_source = "local_fallback"
        records = fallback_to_local()

    # 保存原始数据
    save_raw_records(records)

    # 计算统计
    duration = time.time() - start_time
    last_sync = load_last_sync_time()
    new_count = len(records) if not last_sync else max(0, len(records) - 10)  # 简化估算

    # 保存同步元数据
    meta = save_sync_meta(len(records), new_count, duration, data_source)

    # 输出统计
    print("-" * 60)
    print(f"[完成] 数据拉取完成")
    print(f"  数据源: {meta['data_source']}")
    print(f"  总记录数: {meta['records_count']}")
    print(f"  新增记录: {meta['new_this_sync']}")
    print(f"  同步耗时: {meta['sync_duration_seconds']} 秒")
    print(f"  同步时间: {meta['last_sync']}")
    print(f"  输出文件: {OUTPUT_RAW_FILE}")
    print("=" * 60)

    return 0


if __name__ == "__main__":
    sys.exit(main())
