#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
增量变化检测脚本
- 读取标准化后的文献记录
- 与上次同步状态对比
- 识别新增/修改/删除/未变化记录
- 输出变化报告
- 保存更新后的状态
"""

import os
import sys
import json
import hashlib
from datetime import datetime, timezone, timedelta
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_PRIVATE = ROOT_DIR / "data" / "private"
DATA_PUBLIC = ROOT_DIR / "data" / "public"
STATE_DIR = ROOT_DIR / "data" / "state"
STATE_FILE = STATE_DIR / "feishu_sync_state.json"
CHANGE_REPORT_FILE = DATA_PUBLIC / "change_report.json"

NORMALIZED_FILE = DATA_PRIVATE / "literature_normalized.ndjson"

HASH_FIELDS = [
    "id", "pmid", "doi", "title_cn", "title_en", "abstract",
    "key_findings", "topic_primary", "topic_secondary",
    "evidence_level", "china_rationale", "our_implication",
    "publish_date", "source_type", "china_evidence"
]

CST = timezone(timedelta(hours=8))


def safe_str(val):
    if val is None:
        return ""
    if isinstance(val, list):
        return "|".join(str(v) for v in val)
    return str(val).strip()


def compute_hash(record):
    parts = []
    for field in HASH_FIELDS:
        parts.append(safe_str(record.get(field)))
    content = "||".join(parts)
    return hashlib.sha256(content.encode("utf-8")).hexdigest()[:32]


def load_normalized_records():
    if not NORMALIZED_FILE.exists():
        print(f"[WARN] 标准化文件不存在: {NORMALIZED_FILE}")
        return []
    records = []
    with open(NORMALIZED_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    print(f"[INFO] 加载 {len(records)} 条标准化记录")
    return records


def load_previous_state():
    if STATE_FILE.exists():
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    print("[INFO] 未找到上次同步状态，视为首次同步")
    return None


def detect_topic_changes(record, old_record):
    topics = set()
    for key in ("topic_primary", "topic_secondary"):
        val = record.get(key, [])
        if isinstance(val, list):
            topics.update(val)
        elif val:
            topics.add(str(val))
    
    old_topics = set()
    if old_record:
        for key in ("topic_primary", "topic_secondary"):
            val = old_record.get(key, [])
            if isinstance(val, list):
                old_topics.update(val)
            elif val:
                old_topics.add(str(val))
    
    added = topics - old_topics
    removed = old_topics - topics
    return list(topics), list(added), list(removed)


def map_topics_to_pages(topics):
    page_map = {
        "HBV筛查与诊断": "screening",
        "HBV screening & diagnosis": "screening",
        "指南与共识": "screening",
        "Guideline & Consensus": "screening",
        "HBV功能性治愈": "diagnosis",
        "HBV现有治疗": "treatment",
        "HBV→HCC": "hbvhcc",
        "HCC全病程": "hbvhcc",
        "患者管理": "management",
        "患者管理与教育": "management",
    }
    pages = set()
    for t in topics:
        nav = page_map.get(t)
        if nav:
            pages.add(nav)
        else:
            for key, val in page_map.items():
                if key in t or t in key:
                    pages.add(val)
                    break
    return list(pages)


def detect_changes():
    print("=" * 60)
    print("增量变化检测")
    print("=" * 60)

    records = load_normalized_records()
    prev_state = load_previous_state()

    prev_records = {}
    if prev_state and "records" in prev_state:
        prev_records = {
            r["record_id"]: r for r in prev_state["records"]
        }

    current_ids = set()
    new_records = []
    modified_records = []
    unchanged_records = []
    deleted_ids = []
    affected_pages = set()

    for rec in records:
        rid = rec.get("id") or rec.get("record_id") or ""
        if not rid:
            continue
        current_ids.add(rid)
        new_hash = compute_hash(rec)

        if rid not in prev_records:
            new_records.append(rid)
            topics, _, _ = detect_topic_changes(rec, None)
            affected_pages.update(map_topics_to_pages(topics))
        else:
            old = prev_records[rid]
            old_hash = old.get("content_hash", "")
            if new_hash != old_hash:
                modified_records.append(rid)
                old_rec = old.get("raw_snapshot", {})
                topics, added, removed = detect_topic_changes(rec, old_rec)
                affected_pages.update(map_topics_to_pages(topics))
                affected_pages.update(map_topics_to_pages(added))
                affected_pages.update(map_topics_to_pages(removed))
            else:
                unchanged_records.append(rid)

    deleted_ids = [rid for rid in prev_records if rid not in current_ids]
    for did in deleted_ids:
        old = prev_records[did]
        old_topics = old.get("topics", [])
        affected_pages.update(map_topics_to_pages(old_topics))

    now = datetime.now(CST).isoformat()
    
    new_state = {
        "last_sync": now,
        "total_records": len(records),
        "records": [
            {
                "record_id": rec.get("id") or rec.get("record_id") or "",
                "content_hash": compute_hash(rec),
                "updated_at": now,
                "topics": list(detect_topic_changes(rec, None)[0]),
                "clusters": rec.get("clusters", []),
            }
            for rec in records
        ]
    }

    STATE_DIR.mkdir(parents=True, exist_ok=True)
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(new_state, f, ensure_ascii=False, indent=2)

    report = {
        "sync_time": now,
        "total_current": len(records),
        "total_previous": len(prev_records) if prev_records else 0,
        "new_count": len(new_records),
        "modified_count": len(modified_records),
        "deleted_count": len(deleted_ids),
        "unchanged_count": len(unchanged_records),
        "new_ids": new_records[:100],
        "modified_ids": modified_records[:100],
        "deleted_ids": deleted_ids[:100],
        "affected_pages": sorted(affected_pages),
        "has_changes": bool(new_records or modified_records or deleted_ids),
    }

    with open(CHANGE_REPORT_FILE, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"  新增: {report['new_count']} 篇")
    print(f"  修改: {report['modified_count']} 篇")
    print(f"  删除: {report['deleted_count']} 篇")
    print(f"  未变化: {report['unchanged_count']} 篇")
    print(f"  受影响专题页: {', '.join(sorted(affected_pages)) if affected_pages else '无'}")
    print(f"  有变化: {'是' if report['has_changes'] else '否'}")
    print(f"  状态文件: {STATE_FILE}")
    print(f"  报告文件: {CHANGE_REPORT_FILE}")

    return report


if __name__ == "__main__":
    report = detect_changes()
    has_changes = report["has_changes"]
    if not has_changes:
        print("\n[INFO] 飞书数据无变化，无需调用AI或重新部署")
    sys.exit(0)
