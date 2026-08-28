#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据标准化脚本
- 字段映射（飞书字段→内部统一字段）
- 去重：按标题相似度去重
- 数据清洗：去除空值、标准化日期、提取年份
- 证据等级推断：A/B/C/D级
- 中国证据标记
- 患者旅程阶段映射
"""

import os
import sys
import json
import re
import hashlib
from datetime import datetime, timezone, timedelta
from pathlib import Path

# 项目根目录
ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_PRIVATE = ROOT_DIR / "data" / "private"
DATA_PUBLIC = ROOT_DIR / "data" / "public"

# 输入输出文件
INPUT_RAW_FILE = DATA_PRIVATE / "literature_raw.ndjson"
OUTPUT_NORMALIZED_FILE = DATA_PRIVATE / "literature_normalized.ndjson"
OUTPUT_STATS_FILE = DATA_PUBLIC / "statistics.json"

# 飞书字段到内部字段的映射
FIELD_MAPPING = {
    "record_id": "id",
    "中文标题": "title_cn",
    "文献标题": "title_en",
    "Abstract": "abstract",
    "核心发现": "key_findings",
    "Why it matters": "why_it_matters",
    "对我们的启示": "our_implication",
    "对我们的启示 副本": "medical_implication",
    "对我们的启示 副本 2": "market_implication",
    "一级领域": "topic_primary",
    "二级主题": "topic_secondary",
    "来源类型": "source_type",
    "中国市场相关性": "china_relevance",
    "中国相关依据": "china_rationale",
    "期刊": "journal",
    "发表日期": "publish_date",
    "第一作者": "first_author",
    "推荐等级": "recommendation_level",
    "研究阶段": "research_phase",
    "关联争议点": "controversy_points",
}

# 一级领域映射到T1-T7
TOPIC_PRIMARY_MAP = {
    "HBV功能性治愈": "T1",
    "HBV现有治疗": "T2",
    "HBV→HCC": "T3",
    "HCC全病程": "T4",
    "指南与共识": "T5",
    "Guideline & Consensus": "T5",
    "HBV screening & diagnosis": "T6",
    "HBV筛查与诊断": "T6",
    "患者管理": "T7",
    "患者管理与教育": "T7",
}

# 证据等级推断规则
EVIDENCE_LEVEL_RULES = [
    # (匹配条件, 等级)
    (lambda r: "指南共识" in r.get("source_type", []), "A"),
    (lambda r: "指南" in str(r.get("topic_primary", [])) and "共识" in str(r.get("title_cn", "")), "A"),
    (lambda r: "随机" in str(r.get("abstract", "")) and "对照" in str(r.get("abstract", "")), "A"),
    (lambda r: "RCT" in str(r.get("abstract", "")) or "随机对照" in str(r.get("abstract", "")), "A"),
    (lambda r: "meta分析" in str(r.get("title_cn", "")).lower() or "meta分析" in str(r.get("abstract", "")), "A"),
    (lambda r: "荟萃分析" in str(r.get("title_cn", "")) or "系统综述" in str(r.get("title_cn", "")), "A"),
    (lambda r: "III期" in str(r.get("research_phase", [])) or "3期" in str(r.get("research_phase", [])), "B"),
    (lambda r: "队列研究" in str(r.get("abstract", "")) or "前瞻性" in str(r.get("abstract", "")), "B"),
    (lambda r: "国际研究" in r.get("source_type", []) and "综述" in str(r.get("title_cn", "")), "B"),
    (lambda r: "中国研究" in r.get("source_type", []), "B"),
    (lambda r: "回顾性" in str(r.get("abstract", "")), "C"),
    (lambda r: "病例" in str(r.get("abstract", "")) and "报告" in str(r.get("abstract", "")), "C"),
    (lambda r: "体外" in str(r.get("abstract", "")) or "细胞实验" in str(r.get("abstract", "")), "D"),
    (lambda r: "动物" in str(r.get("abstract", "")) or "小鼠" in str(r.get("abstract", "")), "D"),
]

# 患者旅程阶段映射
JOURNEY_STAGE_MAP = {
    "筛查": ["筛查", "早筛", "检测", "诊断", "biomarker", "生物标志物"],
    "诊断": ["诊断", "分型", "分期", "生物标志物", "检测"],
    "治疗": ["治疗", "药物", "联合治疗", "干扰素", "NA", "核苷", "手术", "移植", "消融", "免疫"],
    "管理": ["管理", "随访", "监测", "患者管理", "依从性", "生活质量"],
    "HCC": ["HCC", "肝癌", "肝细胞癌", "肿瘤", "癌变"],
}

# 患者阶段（初治/经治等）
PATIENT_STAGE_KEYWORDS = {
    "初治患者": ["初治", "未接受过治疗", "naive", "初诊"],
    "经治患者": ["经治", "已接受治疗", "experienced", "治疗后"],
    "耐药患者": ["耐药", "resistant", "应答不佳"],
    "肝硬化患者": ["肝硬化", "cirrhosis"],
    "HCC患者": ["HCC", "肝癌", "肝细胞癌"],
}


def read_ndjson(filepath):
    """读取NDJSON文件"""
    records = []
    if not filepath.exists():
        print(f"[错误] 输入文件不存在: {filepath}")
        return records

    with open(filepath, "r", encoding="utf-8") as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                record = json.loads(line)
                records.append(record)
            except json.JSONDecodeError as e:
                print(f"[警告] 第 {line_num} 行JSON解析失败: {e}")

    print(f"[信息] 读取 {len(records)} 条原始记录")
    return records


def map_fields(record):
    """字段映射：飞书字段→内部统一字段"""
    mapped = {}
    for feishu_field, internal_field in FIELD_MAPPING.items():
        if feishu_field in record:
            value = record[feishu_field]
            # 处理数组类型字段
            if isinstance(value, list):
                # 过滤空值
                value = [v for v in value if v]
            mapped[internal_field] = value

    # 保留未映射的字段（行业洞察等）
    for key, value in record.items():
        if key not in FIELD_MAPPING and not key.startswith("_"):
            mapped[key] = value

    # 确保id存在
    if "id" not in mapped or not mapped["id"]:
        mapped["id"] = record.get("record_id", "")

    return mapped


def clean_text(text):
    """清洗文本"""
    if not text:
        return ""
    if isinstance(text, list):
        text = " ".join(str(t) for t in text if t)
    text = str(text).strip()
    # 去除多余空白
    text = re.sub(r"\s+", " ", text)
    return text


def normalize_date(date_str):
    """标准化日期格式，提取年份"""
    if not date_str:
        return "", None

    date_str = str(date_str).strip()

    # 尝试多种格式
    formats = [
        "%Y-%m-%dT%H:%M:%S.%f%z",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S.%fZ",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
        "%Y/%m/%d",
        "%Y年%m月%d日",
        "%Y",
    ]

    for fmt in formats:
        try:
            # 处理时区问题
            if "%z" in fmt and "+08:00" in date_str:
                date_str_clean = date_str.replace("+08:00", "+0800")
            else:
                date_str_clean = date_str
            dt = datetime.strptime(date_str_clean, fmt)
            normalized = dt.strftime("%Y-%m-%d")
            year = dt.year
            return normalized, year
        except ValueError:
            continue

    # 尝试从字符串中提取年份
    year_match = re.search(r"(19|20)\d{2}", date_str)
    if year_match:
        year = int(year_match.group())
        return date_str, year

    return date_str, None


def infer_evidence_level(record):
    """推断证据等级 A/B/C/D"""
    for rule, level in EVIDENCE_LEVEL_RULES:
        try:
            if rule(record):
                return level
        except Exception:
            continue
    # 默认等级
    source_type = record.get("source_type", [])
    if isinstance(source_type, list):
        source_str = " ".join(source_type)
    else:
        source_str = str(source_type)

    if "指南" in source_str:
        return "A"
    if "国际研究" in source_str:
        return "B"
    if "中国研究" in source_str:
        return "B"
    return "C"


def is_china_evidence(record):
    """判断是否为中国证据"""
    # 检查中国市场相关性
    china_relevance = record.get("china_relevance", [])
    if isinstance(china_relevance, list):
        relevance_str = " ".join(china_relevance)
    else:
        relevance_str = str(china_relevance)

    if "高" in relevance_str or "中" in relevance_str:
        return True

    # 检查来源类型
    source_type = record.get("source_type", [])
    if isinstance(source_type, list):
        if "中国研究" in source_type:
            return True

    # 检查标题和摘要中的中国相关关键词
    title_cn = clean_text(record.get("title_cn", ""))
    abstract = clean_text(record.get("abstract", ""))
    china_rationale = clean_text(record.get("china_rationale", ""))
    combined = title_cn + abstract + china_rationale

    china_keywords = ["中国", "国内", "中华", "Chinese", "China", "中国大陆"]
    for kw in china_keywords:
        if kw in combined:
            # 检查是否明确说不是中国的
            if "未涉及中国" in china_rationale or "未涉及中国大陆" in china_rationale:
                continue
            return True

    return False


def map_journey_stage(record):
    """映射患者旅程阶段"""
    title = clean_text(record.get("title_cn", "")) + " " + clean_text(record.get("title_en", ""))
    abstract = clean_text(record.get("abstract", ""))
    topic_primary = record.get("topic_primary", [])
    topic_secondary = record.get("topic_secondary", [])

    if isinstance(topic_primary, list):
        topic_text = " ".join(topic_primary)
    else:
        topic_text = str(topic_primary)

    if isinstance(topic_secondary, list):
        secondary_text = " ".join(topic_secondary)
    else:
        secondary_text = str(topic_secondary)

    combined = title + " " + abstract + " " + topic_text + " " + secondary_text

    stages = []
    for stage, keywords in JOURNEY_STAGE_MAP.items():
        for kw in keywords:
            if kw.lower() in combined.lower():
                stages.append(stage)
                break

    # 如果没匹配到，根据一级领域推断
    if not stages:
        if "HCC" in topic_text or "肝癌" in topic_text:
            stages.append("HCC")
        elif "治愈" in topic_text or "治疗" in topic_text:
            stages.append("治疗")
        elif "指南" in topic_text:
            stages.append("治疗")
        else:
            stages.append("治疗")  # 默认

    return list(set(stages))


def map_patient_stage(record):
    """映射患者阶段（初治/经治等）"""
    title = clean_text(record.get("title_cn", ""))
    abstract = clean_text(record.get("abstract", ""))
    key_findings = clean_text(record.get("key_findings", ""))
    combined = title + " " + abstract + " " + key_findings

    stages = []
    for stage, keywords in PATIENT_STAGE_KEYWORDS.items():
        for kw in keywords:
            if kw.lower() in combined.lower():
                stages.append(stage)
                break

    return stages


def normalize_topic_primary(record):
    """标准化一级领域为T1-T7编码"""
    topic_primary = record.get("topic_primary", [])
    if isinstance(topic_primary, str):
        topic_primary = [topic_primary]

    mapped = []
    for topic in topic_primary:
        if topic in TOPIC_PRIMARY_MAP:
            mapped.append(TOPIC_PRIMARY_MAP[topic])
        else:
            # 尝试模糊匹配
            for key, value in TOPIC_PRIMARY_MAP.items():
                if key in topic or topic in key:
                    mapped.append(value)
                    break

    if not mapped:
        # 默认归类
        mapped.append("T2")

    return mapped[0] if mapped else "T2"  # 返回主分类


def get_title_hash(title):
    """生成标题哈希用于去重"""
    if not title:
        return ""
    # 标准化标题：转小写、去标点、去空白
    title_clean = re.sub(r"[^\w\u4e00-\u9fff]", "", str(title).lower())
    return hashlib.md5(title_clean.encode("utf-8")).hexdigest()


def deduplicate_records(records):
    """去重：按标题相似度"""
    seen_hashes = {}
    unique_records = []
    dup_count = 0

    for record in records:
        title_cn = clean_text(record.get("title_cn", ""))
        title_en = clean_text(record.get("title_en", ""))

        # 生成标题哈希
        hash_cn = get_title_hash(title_cn)
        hash_en = get_title_hash(title_en)

        is_dup = False
        for h in [hash_cn, hash_en]:
            if h and h in seen_hashes:
                is_dup = True
                dup_count += 1
                break

        if not is_dup:
            unique_records.append(record)
            if hash_cn:
                seen_hashes[hash_cn] = record.get("id", "")
            if hash_en:
                seen_hashes[hash_en] = record.get("id", "")

    if dup_count > 0:
        print(f"[信息] 去重: 移除 {dup_count} 条重复记录")

    return unique_records


def normalize_record(record):
    """标准化单条记录"""
    # 字段映射
    rec = map_fields(record)

    # 清洗文本字段
    text_fields = ["title_cn", "title_en", "abstract", "key_findings",
                   "why_it_matters", "our_implication", "medical_implication",
                   "market_implication", "journal", "first_author", "china_rationale"]
    for field in text_fields:
        if field in rec:
            rec[field] = clean_text(rec[field])

    # 标准化日期，提取年份
    publish_date = rec.get("publish_date", "")
    normalized_date, year = normalize_date(publish_date)
    rec["publish_date"] = normalized_date
    rec["year"] = year

    # 证据等级推断
    rec["evidence_level"] = infer_evidence_level(rec)

    # 中国证据标记
    rec["china_evidence"] = is_china_evidence(rec)

    # 患者旅程阶段
    rec["journey_stages"] = map_journey_stage(rec)

    # 患者阶段
    rec["patient_stages"] = map_patient_stage(rec)

    # 一级领域标准化（T1-T7）
    rec["topic_code"] = normalize_topic_primary(rec)

    # 优先级推断
    rec["priority"] = infer_priority(rec)

    return rec


def infer_priority(record):
    """推断优先级（高/中/低）"""
    score = 0

    # 证据等级
    level = record.get("evidence_level", "C")
    if level == "A":
        score += 3
    elif level == "B":
        score += 2
    elif level == "C":
        score += 1

    # 中国证据
    if record.get("china_evidence", False):
        score += 2

    # 年份（越新越高）
    year = record.get("year")
    if year and year >= 2025:
        score += 2
    elif year and year >= 2023:
        score += 1

    # 推荐等级
    rec_level = record.get("recommendation_level", [])
    if isinstance(rec_level, list):
        if "高" in str(rec_level):
            score += 2
        elif "中" in str(rec_level):
            score += 1

    if score >= 5:
        return "高"
    elif score >= 3:
        return "中"
    else:
        return "低"


def generate_statistics(records):
    """生成统计报告"""
    total = len(records)

    # 中国证据统计
    china_count = sum(1 for r in records if r.get("china_evidence", False))
    china_pct = round(china_count / total * 100, 1) if total > 0 else 0

    # AB级证据统计
    ab_count = sum(1 for r in records if r.get("evidence_level", "") in ("A", "B"))
    ab_pct = round(ab_count / total * 100, 1) if total > 0 else 0

    # 高2030相关性（优先级高或中国证据）
    high_2030 = sum(1 for r in records if r.get("priority") == "高" or r.get("china_evidence", False))

    # 按主题分类（T1-T7）
    topics = {}
    for i in range(1, 8):
        code = f"T{i}"
        count = sum(1 for r in records if r.get("topic_code") == code)
        if count > 0:
            topics[code] = count

    # 按年份
    by_year = {}
    for r in records:
        year = r.get("year")
        if year:
            year_str = str(year)
            by_year[year_str] = by_year.get(year_str, 0) + 1
    # 按年份排序
    by_year = dict(sorted(by_year.items()))

    # 按证据等级
    by_evidence = {}
    for level in ["A", "B", "C", "D"]:
        count = sum(1 for r in records if r.get("evidence_level") == level)
        if count > 0:
            by_evidence[level] = count

    # 按旅程阶段
    journey_stages = {}
    for stage in ["筛查", "诊断", "治疗", "管理", "HCC"]:
        count = sum(1 for r in records if stage in r.get("journey_stages", []))
        if count > 0:
            journey_stages[stage] = count

    stats = {
        "total_literature": total,
        "china_evidence_count": china_count,
        "china_evidence_pct": china_pct,
        "ab_evidence_count": ab_count,
        "ab_evidence_pct": ab_pct,
        "high_2030_relevance": high_2030,
        "topics": topics,
        "by_year": by_year,
        "by_evidence_level": by_evidence,
        "journey_stages": journey_stages,
    }

    return stats


def save_normalized(records):
    """保存标准化后的记录"""
    with open(OUTPUT_NORMALIZED_FILE, "w", encoding="utf-8") as f:
        for record in records:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
    print(f"[信息] 已保存 {len(records)} 条标准化记录到 {OUTPUT_NORMALIZED_FILE}")


def save_statistics(stats):
    """保存统计报告"""
    with open(OUTPUT_STATS_FILE, "w", encoding="utf-8") as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)
    print(f"[信息] 已保存统计报告到 {OUTPUT_STATS_FILE}")


def main():
    print("=" * 60)
    print("数据标准化脚本")
    print("=" * 60)

    # 读取原始数据
    records = read_ndjson(INPUT_RAW_FILE)
    if not records:
        print("[错误] 没有可处理的数据")
        return 1

    # 去重
    records = deduplicate_records(records)

    # 标准化每条记录
    normalized = []
    for i, record in enumerate(records, 1):
        try:
            norm = normalize_record(record)
            normalized.append(norm)
            if i % 10 == 0 or i == len(records):
                print(f"[进度] 已处理 {i}/{len(records)} 条记录")
        except Exception as e:
            print(f"[警告] 第 {i} 条记录处理失败: {e}")
            # 保留原始记录
            if "id" in record:
                normalized.append(record)

    # 保存标准化数据
    save_normalized(normalized)

    # 生成统计
    stats = generate_statistics(normalized)
    save_statistics(stats)

    # 输出统计摘要
    print("-" * 60)
    print("[完成] 数据标准化完成")
    print(f"  总记录数: {stats['total_literature']}")
    print(f"  中国证据: {stats['china_evidence_count']} ({stats['china_evidence_pct']}%)")
    print(f"  AB级证据: {stats['ab_evidence_count']} ({stats['ab_evidence_pct']}%)")
    print(f"  高2030相关性: {stats['high_2030_relevance']}")
    print(f"  主题分布: {stats['topics']}")
    print(f"  年份分布: {stats['by_year']}")
    print(f"  证据等级: {stats['by_evidence_level']}")
    print("=" * 60)

    return 0


if __name__ == "__main__":
    sys.exit(main())
