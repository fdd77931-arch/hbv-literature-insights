#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据质量审计脚本 v2
精准检查字段错配、重复、测试数据和无关内容
"""

import json
import re
import sys
import os
from pathlib import Path
from collections import Counter, defaultdict
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_PRIVATE = ROOT_DIR / "data" / "private"
DATA_PUBLIC = ROOT_DIR / "data" / "public"

HBV_FILE = DATA_PRIVATE / "feishu_hbv_full.ndjson"
INDUSTRY_FILE = DATA_PRIVATE / "feishu_industry_full.ndjson"
AUDIT_REPORT = DATA_PUBLIC / "data_quality_audit.json"
CLEAN_FILE = DATA_PRIVATE / "literature_cleaned.ndjson"
STATS_FILE = DATA_PUBLIC / "statistics.json"

# 完全无关的关键词（在HBV文献的任何字段中出现都说明数据错配）
TRULY_IRRELEVANT = [
    "儿童听力", "水污染监测", "空气质量监测", "噪声污染",
    "土壤污染", "儿童近视筛查", "听力筛查", "视力筛查",
    "饮用水水质", "重金属污染", "大气污染监测",
]

# HBV/HCC核心关键词
HBV_KEYWORDS = [
    "HBV", "乙肝", "乙型肝炎", "肝炎",
    "HBsAg", "HBeAg", "HBV DNA", "HBcrAg", "HBV RNA",
    "肝细胞癌", "HCC", "肝癌",
    "肝硬化", "肝纤维化", "肝病",
    "干扰素", "PegIFN", "聚乙二醇干扰素", "PEG-IFN",
    "核苷", "核苷酸", "NUC", "NAs",
    "替诺福韦", "TDF", "TAF", "恩替卡韦", "ETV",
    "拉米夫定", "LAM", "阿德福韦", "ADV",
    "功能性治愈", "免疫控制", "HBsAg清除",
    "抗病毒", "抗HBV",
    "肝移植", "TACE", "HAIC",
    "慢性乙型", "CHB",
    "母婴传播", "母婴阻断",
    "乙肝疫苗", "乙型肝炎疫苗",
]


def load_ndjson(filepath):
    records = []
    if not filepath.exists():
        return records
    with open(filepath, "r", encoding="utf-8") as f:
        for i, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError as e:
                print(f"[警告] 第{i}行JSON解析失败: {e}")
    return records


def check_hbv_relevance(record):
    """检查记录是否与HBV/HCC相关"""
    text = " ".join(str(v) for v in [
        record.get("中文标题", ""),
        record.get("文献标题", ""),
        record.get("Abstract", ""),
        record.get("核心发现", ""),
        record.get("二级主题", ""),
    ] if v)
    has_hbv = any(kw.lower() in text.lower() for kw in HBV_KEYWORDS)
    return has_hbv


def check_irrelevant_content(record):
    """检查中国相关依据是否包含完全无关内容"""
    rationale = str(record.get("中国相关依据", "") or "")
    title = str(record.get("中文标题", "") or "")
    abstract = str(record.get("Abstract", "") or "")

    found = []
    for kw in TRULY_IRRELEVANT:
        if kw in rationale:
            # 检查这个关键词是否在标题或摘要中也出现（如果出现可能是相关研究）
            if kw not in title and kw not in abstract:
                found.append(kw)
    return found


def check_pmid_doi(record):
    """检查PMID和DOI格式"""
    issues = []
    pmid = str(record.get("PMID", "") or "").strip()
    doi = str(record.get("DOI", "") or "").strip()

    if pmid and not re.match(r"^\d{6,}$", pmid):
        issues.append(f"PMID格式异常: {pmid}")
    if doi and not re.match(r"^10\.\d{4,}/", doi):
        issues.append(f"DOI格式异常: {doi}")
    return issues


def check_test_data(record):
    """检查是否为测试/示例数据（仅在备注字段检查）"""
    note = str(record.get("备注", "") or "").lower()
    test_markers = ["测试数据", "test data", "示例数据", "假数据", "dummy", "placeholder"]
    for marker in test_markers:
        if marker in note:
            return True, marker
    return False, ""


def check_duplicates(records):
    """检查重复记录（PMID、DOI、标题、唯一标识）"""
    seen = {}
    duplicates = []

    for rec in records:
        rid = rec.get("record_id", "")
        for field_name in ["PMID", "DOI", "唯一标识"]:
            val = str(rec.get(field_name, "") or "").strip()
            if val:
                key = f"{field_name}:{val}"
                if key in seen:
                    duplicates.append({
                        "record_id": rid,
                        "type": field_name,
                        "value": val,
                        "duplicates_with": seen[key]
                    })
                else:
                    seen[key] = rid

        # 标题去重（归一化后比较）
        title = str(rec.get("中文标题", "") or "").strip()
        if title and len(title) > 10:
            normalized = re.sub(r"[\s\u3000]+", "", title).lower()
            key = f"title:{normalized}"
            if key in seen:
                duplicates.append({
                    "record_id": rid,
                    "type": "标题",
                    "value": title[:40],
                    "duplicates_with": seen[key]
                })
            else:
                seen[key] = rid

    return duplicates


def extract_year(record):
    """从发表日期提取年份"""
    date_str = str(record.get("发表日期", "") or "")
    if date_str:
        m = re.search(r"(\d{4})", date_str)
        if m:
            return int(m.group(1))
    return None


def extract_evidence_level(record):
    """推断证据等级"""
    source_type = record.get("来源类型", [])
    if isinstance(source_type, list):
        source_type = source_type[0] if source_type else ""
    else:
        source_type = str(source_type)

    title = str(record.get("中文标题", "") or "")
    abstract = str(record.get("Abstract", "") or "").lower()

    if "指南" in title or "共识" in title or "指南" in source_type or "共识" in source_type:
        return "A"
    if "meta" in abstract or "荟萃" in str(record.get("核心发现", "")):
        return "A"
    if "随机" in abstract or "random" in abstract or "RCT" in abstract:
        return "A"
    if "队列" in abstract or "cohort" in abstract or "前瞻" in abstract:
        return "B"
    if "回顾" in abstract or "retrospective" in abstract or "病例对照" in abstract:
        return "C"
    if "病例报告" in abstract or "case report" in abstract:
        return "D"
    if source_type == "国际研究":
        return "B"
    return "C"


def is_china_evidence(record):
    """判断是否为中国证据"""
    source_type = record.get("来源类型", [])
    if isinstance(source_type, list):
        source_type = source_type[0] if source_type else ""
    else:
        source_type = str(source_type)

    china_relevance = record.get("中国市场相关性", [])
    if isinstance(china_relevance, list):
        china_relevance = china_relevance[0] if china_relevance else ""
    else:
        china_relevance = str(china_relevance)

    rationale = str(record.get("中国相关依据", "") or "")

    if source_type == "中国研究":
        return True
    if china_relevance == "高":
        return True
    if "中国" in rationale and ("中国机构" in rationale or "中国患者" in rationale or "中国数据" in rationale):
        return True
    return False


def classify_topic(record):
    """分类到T1-T7专题"""
    primary_field = record.get("一级领域", [])
    if isinstance(primary_field, list):
        primary_field = primary_field[0] if primary_field else ""
    else:
        primary_field = str(primary_field)

    secondary = record.get("二级主题", [])
    if isinstance(secondary, list):
        secondary_text = " ".join(secondary)
    else:
        secondary_text = str(secondary)

    title = str(record.get("中文标题", "") or "")
    abstract = str(record.get("Abstract", "") or "")
    core = str(record.get("核心发现", "") or "")
    combined = f"{title} {abstract} {core} {secondary_text}".lower()

    if "功能" in combined and "治愈" in combined or "functional cure" in combined:
        return "T4"
    if "现有治疗" in primary_field or "治疗" in combined:
        return "T4"
    if "HCC" in primary_field or "肝细胞癌" in combined or "hcc" in combined:
        return "T6"
    if "筛查" in combined or "screening" in combined:
        return "T2"
    if "诊断" in combined or "diagnosis" in combined or "hbsag定量" in combined:
        return "T3"
    if "管理" in combined or "依从" in combined or "脱落" in combined:
        return "T5"
    if "指南" in combined or "共识" in combined or "2030" in combined:
        return "T1"
    if "联盟" in combined:
        return "T7"

    # 默认按一级领域
    if "功能性治愈" in primary_field:
        return "T4"
    if "现有治疗" in primary_field:
        return "T4"
    if "HBV→HCC" in primary_field:
        return "T6"
    if "HCC全病程" in primary_field:
        return "T6"
    if "指南" in primary_field or "共识" in primary_field:
        return "T1"

    return "T4"  # 默认到治疗


def audit():
    print("=" * 70)
    print("数据质量审计 v2")
    print("=" * 70)

    hbv_records = load_ndjson(HBV_FILE)
    industry_records = load_ndjson(INDUSTRY_FILE)
    all_records = hbv_records + industry_records

    print(f"\n输入: HBV文献 {len(hbv_records)} 条 + 行业洞察 {len(industry_records)} 条 = {len(all_records)} 条")

    # 逐条审计
    clean_records = []
    excluded = []
    status_counter = Counter()

    for rec in all_records:
        rid = rec.get("record_id", "")
        title = str(rec.get("中文标题", "") or "")[:50]
        status = "正常"
        issues = []

        # 1. HBV相关性
        if not check_hbv_relevance(rec):
            status = "主题不相关"
            issues.append("未检测到HBV/HCC关键词")

        # 2. 无关内容
        irrelevant = check_irrelevant_content(rec)
        if irrelevant:
            status = "疑似字段错配"
            issues.append(f"中国相关依据含无关内容: {', '.join(irrelevant)}")

        # 3. PMID/DOI格式
        id_issues = check_pmid_doi(rec)
        if id_issues and status == "正常":
            status = "PMID/DOI异常"
            issues.extend(id_issues)

        # 4. 测试数据
        is_test, marker = check_test_data(rec)
        if is_test:
            status = "疑似样例"
            issues.append(f"备注含测试标记: {marker}")

        # 5. 信息不足
        title_text = str(rec.get("中文标题", "") or "")
        abstract = str(rec.get("Abstract", "") or "")
        core = str(rec.get("核心发现", "") or "")
        if not title_text and not abstract:
            status = "信息不足"
            issues.append("标题和摘要均为空")

        status_counter[status] += 1

        if status in ("正常", "信息不足"):
            # 添加审计标注
            rec["_audit_status"] = status
            rec["_audit_issues"] = issues
            clean_records.append(rec)
        else:
            excluded.append({
                "record_id": rid,
                "title": title,
                "status": status,
                "issues": issues
            })

    # 去重
    duplicates = check_duplicates(clean_records)
    dup_ids = set(d["record_id"] for d in duplicates)

    deduped = []
    seen_rids = set()
    for rec in clean_records:
        rid = rec.get("record_id", "")
        if rid in dup_ids and rid in seen_rids:
            continue
        seen_rids.add(rid)
        deduped.append(rec)

    print(f"\n审计结果:")
    for status, count in status_counter.most_common():
        print(f"  {status}: {count}")
    print(f"  重复记录: {len(duplicates)} 条")
    print(f"  审计后有效: {len(deduped)} 条（排除 {len(all_records) - len(deduped)} 条）")

    # 保存审计报告
    audit_report = {
        "audit_time": datetime.now(timezone(timedelta(hours=8))).isoformat(),
        "total_input": len(all_records),
        "status_distribution": dict(status_counter),
        "duplicate_count": len(duplicates),
        "clean_records_count": len(deduped),
        "excluded_count": len(all_records) - len(deduped),
        "excluded_detail": excluded[:50],
        "duplicates": duplicates[:20],
    }

    DATA_PUBLIC.mkdir(parents=True, exist_ok=True)
    with open(AUDIT_REPORT, "w", encoding="utf-8") as f:
        json.dump(audit_report, f, ensure_ascii=False, indent=2)

    # 保存清洁数据
    with open(CLEAN_FILE, "w", encoding="utf-8") as f:
        for rec in deduped:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    print(f"\n输出:")
    print(f"  审计报告: {AUDIT_REPORT}")
    print(f"  清洁数据: {CLEAN_FILE} ({len(deduped)} 条)")

    # 生成统计数据
    year_dist = Counter()
    topic_dist = Counter()
    evidence_dist = Counter()
    china_count = 0
    source_dist = Counter()

    for rec in deduped:
        year = extract_year(rec)
        if year:
            year_dist[year] += 1

        topic = classify_topic(rec)
        topic_dist[topic] += 1

        level = extract_evidence_level(rec)
        evidence_dist[level] += 1

        if is_china_evidence(rec):
            china_count += 1

        st = rec.get("来源类型", [])
        if isinstance(st, list):
            st = st[0] if st else "未知"
        source_dist[st] += 1

    statistics = {
        "total_literature": len(deduped),
        "china_evidence_count": china_count,
        "china_evidence_pct": round(china_count / len(deduped) * 100, 1) if deduped else 0,
        "ab_evidence_count": evidence_dist.get("A", 0) + evidence_dist.get("B", 0),
        "ab_evidence_pct": round((evidence_dist.get("A", 0) + evidence_dist.get("B", 0)) / len(deduped) * 100, 1) if deduped else 0,
        "high_2030_relevance": len(deduped),
        "topics": dict(topic_dist),
        "by_year": dict(year_dist),
        "by_evidence_level": dict(evidence_dist),
        "by_source_type": dict(source_dist),
        "last_sync": datetime.now(timezone(timedelta(hours=8))).isoformat(),
        "data_source": "feishu_base",
        "feishu_rev": 1136,
        "excluded_count": len(all_records) - len(deduped),
    }

    with open(STATS_FILE, "w", encoding="utf-8") as f:
        json.dump(statistics, f, ensure_ascii=False, indent=2)

    print(f"  统计数据: {STATS_FILE}")
    print(f"\n统计摘要:")
    print(f"  总文献: {statistics['total_literature']}")
    print(f"  中国证据: {china_count} ({statistics['china_evidence_pct']}%)")
    print(f"  AB级证据: {statistics['ab_evidence_count']} ({statistics['ab_evidence_pct']}%)")
    print(f"  专题分布: {dict(topic_dist)}")
    print(f"  年份分布: {dict(year_dist)}")
    print(f"  证据等级: {dict(evidence_dist)}")

    return deduped


if __name__ == "__main__":
    audit()
