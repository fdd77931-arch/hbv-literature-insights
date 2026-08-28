#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
证据卡构建脚本
- 为每篇文献构建紧凑证据卡（20+字段）
- 标签系统：2030战略、中国证据、初治、经治、干扰素、NA、功能性治愈等
- T1-T7专题分类
- 患者旅程阶段标记
- 输出版（公开/完整）
"""

import os
import sys
import json
import re
from datetime import datetime, timezone, timedelta
from pathlib import Path

# 项目根目录
ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_PRIVATE = ROOT_DIR / "data" / "private"
DATA_PUBLIC = ROOT_DIR / "data" / "public"

# 输入输出文件
INPUT_NORMALIZED_FILE = DATA_PRIVATE / "literature_normalized.ndjson"
OUTPUT_INDEX_FILE = DATA_PUBLIC / "literature_index.json"
OUTPUT_CARDS_FILE = DATA_PRIVATE / "evidence_cards.ndjson"

# 标签系统定义
TAG_RULES = {
    "2030战略": ["2030", "消除", "elimination", "WHO", "世界卫生组织", "战略目标"],
    "中国证据": ["中国", "国内", "中华", "Chinese", "China"],
    "初治": ["初治", "naive", "未接受", "初诊"],
    "经治": ["经治", "experienced", "治疗后", "已接受"],
    "干扰素": ["干扰素", "IFN", "interferon", "peg", "聚乙二醇"],
    "NA": ["核苷", "核苷酸", "NA", "NUC", "nucleos", "恩替卡韦", "替诺福韦", "ETV", "TDF", "TAF"],
    "功能性治愈": ["功能性治愈", "functional cure", "HBsAg清除", "HBsAg loss", "临床治愈"],
    "HBsAg": ["HBsAg", "表面抗原", "乙肝表面抗原"],
    "HBV DNA": ["HBV DNA", "病毒载量", "DNA转阴", "病毒学应答"],
    "HCC风险": ["HCC", "肝癌", "肝细胞癌", "癌变", "肿瘤发生", "hepatocellular"],
    "患者脱落": ["脱落", "停药", "停药后", "停药复发", "discontinuation", "off-treatment"],
    "全国联盟": ["联盟", "协作组", "多中心", "全国", "network", "consortium"],
    "联合治疗": ["联合治疗", "联合用药", "combination", "联用"],
    "单药治疗": ["单药", "monotherapy", "单一治疗"],
    "免疫治疗": ["免疫", "immunotherapy", "免疫检查点", "PD-1", "PD-L1"],
    "基因治疗": ["基因", "gene", "siRNA", "ASO", "反义", "RNA干扰"],
    "疫苗": ["疫苗", "vaccine", "免疫接种"],
    "生物标志物": ["生物标志物", "biomarker", "标志物", "预测因子"],
    "耐药": ["耐药", "resistant", "resistance", "突变"],
    "肝硬化": ["肝硬化", "cirrhosis", "纤维化", "fibrosis"],
    "肝移植": ["移植", "transplant", "肝移植"],
    "儿童": ["儿童", "pediatric", "child", "婴儿", "母婴"],
    "孕产妇": ["妊娠", "孕妇", "产妇", "母婴", "pregnancy"],
    "老年": ["老年", "elderly", "老龄"],
    "合并症": ["合并", "共病", "comorbidity", "HIV", "HDV", "丁肝"],
    "真实世界": ["真实世界", "real-world", "RWS", "队列研究"],
    "卫生经济": ["卫生经济", "成本效果", "成本效益", "cost-effectiveness", "经济学"],
}

# 敏感字段（公开版本需要移除的）
SENSITIVE_FIELDS = [
    "china_rationale",
    "our_implication",
    "medical_implication",
    "market_implication",
    "why_it_matters",
    "abstract",
    "key_findings",
    "controversy_points",
    "recommendation_level",
    "research_phase",
    "_source_type",
]

# T1-T7专题名称
TOPIC_NAMES = {
    "T1": "HBV功能性治愈",
    "T2": "HBV现有治疗",
    "T3": "HBV→HCC转化",
    "T4": "HCC全病程",
    "T5": "指南与共识",
    "T6": "筛查与诊断",
    "T7": "患者管理",
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

    print(f"[信息] 读取 {len(records)} 条标准化记录")
    return records


def extract_tags(record):
    """从记录内容中提取标签"""
    # 合并所有文本字段用于标签匹配
    text_fields = [
        "title_cn", "title_en", "abstract", "key_findings",
        "why_it_matters", "our_implication", "medical_implication",
        "market_implication", "journal", "topic_primary", "topic_secondary",
        "research_phase",
    ]
    combined = ""
    for field in text_fields:
        value = record.get(field, "")
        if isinstance(value, list):
            combined += " " + " ".join(str(v) for v in value)
        elif value:
            combined += " " + str(value)

    combined_lower = combined.lower()

    tags = []
    for tag, keywords in TAG_RULES.items():
        # "中国证据"标签不通过关键词匹配，由china_evidence标志控制
        if tag == "中国证据":
            continue
        for kw in keywords:
            if kw.lower() in combined_lower:
                tags.append(tag)
                break

    # 中国证据标签由china_evidence标志单独控制
    if record.get("china_evidence", False):
        tags.append("中国证据")

    return list(set(tags))


def extract_pmid_doi(record):
    """从记录中提取PMID和DOI"""
    pmid = ""
    doi = ""

    # 检查是否有直接字段
    if "pmid" in record and record["pmid"]:
        pmid = str(record["pmid"])
    if "doi" in record and record["doi"]:
        doi = str(record["doi"])

    # 从文本中提取
    combined = ""
    for field in ["title_cn", "title_en", "abstract", "journal"]:
        val = record.get(field, "")
        if val:
            combined += " " + str(val)

    # 提取DOI
    if not doi:
        doi_match = re.search(r"10\.\d{4,}/[\w.\-/:]+", combined, re.IGNORECASE)
        if doi_match:
            doi = doi_match.group()

    # 提取PMID
    if not pmid:
        pmid_match = re.search(r"PMID[:\s]*(\d+)", combined, re.IGNORECASE)
        if pmid_match:
            pmid = pmid_match.group(1)

    return pmid, doi


def build_evidence_card(record):
    """构建完整证据卡"""
    card = {}

    # 基础信息
    card["id"] = record.get("id", "")
    card["title_cn"] = record.get("title_cn", "")
    card["title_en"] = record.get("title_en", "")
    card["year"] = record.get("year")
    card["journal"] = record.get("journal", "")
    card["first_author"] = record.get("first_author", "")
    card["publish_date"] = record.get("publish_date", "")

    # 标识符
    pmid, doi = extract_pmid_doi(record)
    card["pmid"] = pmid
    card["doi"] = doi

    # 证据等级与优先级
    card["evidence_level"] = record.get("evidence_level", "C")
    card["priority"] = record.get("priority", "中")
    card["china_evidence"] = record.get("china_evidence", False)

    # 主题分类
    card["topic_primary"] = record.get("topic_code", "T2")
    card["topic_primary_name"] = TOPIC_NAMES.get(card["topic_primary"], "其他")

    topic_secondary = record.get("topic_secondary", [])
    if isinstance(topic_secondary, str):
        topic_secondary = [t.strip() for t in topic_secondary.split(",") if t.strip()]
    elif isinstance(topic_secondary, list):
        topic_secondary = [str(t) for t in topic_secondary if t]
    card["topic_secondary"] = topic_secondary

    # 标签系统
    tags = extract_tags(record)
    card["tags"] = tags

    # 患者旅程
    patient_stages = record.get("patient_stages", [])
    if isinstance(patient_stages, str):
        patient_stages = [patient_stages]
    card["patient_stage"] = patient_stages

    journey_stages = record.get("journey_stages", [])
    if isinstance(journey_stages, str):
        journey_stages = [journey_stages]
    card["journey_stage"] = journey_stages

    # 研究阶段
    research_phase = record.get("research_phase", [])
    if isinstance(research_phase, str):
        research_phase = [research_phase]
    card["research_phase"] = research_phase

    # 核心内容
    card["key_result"] = record.get("key_findings", "")
    card["clinical_implication"] = record.get("medical_implication", record.get("our_implication", ""))
    card["china_implication"] = record.get("china_rationale", "")
    card["strategy_2030"] = generate_strategy_2030(record, tags)

    # 来源
    source_type = record.get("source_type", [])
    if isinstance(source_type, list):
        card["source_type"] = source_type
    else:
        card["source_type"] = [str(source_type)]

    card["source_url"] = record.get("source_url", "")

    # 完整字段（仅私有版本）
    card["abstract"] = record.get("abstract", "")
    card["why_it_matters"] = record.get("why_it_matters", "")
    card["our_implication"] = record.get("our_implication", "")
    card["medical_implication"] = record.get("medical_implication", "")
    card["market_implication"] = record.get("market_implication", "")
    card["china_rationale"] = record.get("china_rationale", "")
    card["recommendation_level"] = record.get("recommendation_level", [])
    card["controversy_points"] = record.get("controversy_points", [])

    return card


def generate_strategy_2030(record, tags):
    """生成2030战略相关描述"""
    if "2030战略" in tags:
        return "高"

    priority = record.get("priority", "")
    china_evidence = record.get("china_evidence", False)
    evidence_level = record.get("evidence_level", "")

    score = 0
    if priority == "高":
        score += 2
    elif priority == "中":
        score += 1

    if china_evidence:
        score += 2

    if evidence_level in ("A", "B"):
        score += 1

    if score >= 4:
        return "高"
    elif score >= 2:
        return "中"
    else:
        return "低"


def build_public_card(card):
    """构建公开版本的证据卡（移除敏感信息）"""
    public = {}
    for key, value in card.items():
        if key not in SENSITIVE_FIELDS:
            public[key] = value

    # 确保关键字段存在
    required_fields = [
        "id", "title_cn", "title_en", "year", "journal",
        "pmid", "doi", "evidence_level", "priority", "china_evidence",
        "topic_primary", "topic_secondary", "tags",
        "patient_stage", "journey_stage",
        "key_result", "clinical_implication", "china_implication",
        "strategy_2030", "source_url",
    ]

    # 精简核心结果（公开版本缩短）
    if "key_result" in public and len(public["key_result"]) > 200:
        public["key_result"] = public["key_result"][:197] + "..."

    if "clinical_implication" in public and len(public["clinical_implication"]) > 200:
        public["clinical_implication"] = public["clinical_implication"][:197] + "..."

    return public


def save_evidence_cards(cards):
    """保存完整证据卡（私有版本）"""
    with open(OUTPUT_CARDS_FILE, "w", encoding="utf-8") as f:
        for card in cards:
            f.write(json.dumps(card, ensure_ascii=False) + "\n")
    print(f"[信息] 已保存 {len(cards)} 张完整证据卡到 {OUTPUT_CARDS_FILE}")


def save_literature_index(cards):
    """保存公开版本的文献索引"""
    now = datetime.now(timezone(timedelta(hours=8))).isoformat()

    public_records = []
    for card in cards:
        public = build_public_card(card)
        public_records.append(public)

    index = {
        "version": "1.0",
        "updated_at": now,
        "total": len(public_records),
        "records": public_records,
    }

    with open(OUTPUT_INDEX_FILE, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    print(f"[信息] 已保存公开文献索引 ({len(public_records)} 条) 到 {OUTPUT_INDEX_FILE}")


def main():
    print("=" * 60)
    print("证据卡构建脚本")
    print("=" * 60)

    # 读取标准化数据
    records = read_ndjson(INPUT_NORMALIZED_FILE)
    if not records:
        print("[错误] 没有可处理的数据")
        return 1

    # 构建证据卡
    cards = []
    for i, record in enumerate(records, 1):
        try:
            card = build_evidence_card(record)
            cards.append(card)
            if i % 10 == 0 or i == len(records):
                print(f"[进度] 已构建 {i}/{len(records)} 张证据卡")
        except Exception as e:
            print(f"[警告] 第 {i} 条记录构建失败: {e}")

    # 保存完整证据卡（私有）
    save_evidence_cards(cards)

    # 保存公开索引
    save_literature_index(cards)

    # 统计标签分布
    all_tags = {}
    for card in cards:
        for tag in card.get("tags", []):
            all_tags[tag] = all_tags.get(tag, 0) + 1

    top_tags = sorted(all_tags.items(), key=lambda x: x[1], reverse=True)[:10]

    # 输出摘要
    print("-" * 60)
    print("[完成] 证据卡构建完成")
    print(f"  总证据卡数: {len(cards)}")
    print(f"  标签种类: {len(all_tags)}")
    print(f"  热门标签:")
    for tag, count in top_tags:
        print(f"    - {tag}: {count}")
    print(f"  公开输出: {OUTPUT_INDEX_FILE}")
    print(f"  完整输出: {OUTPUT_CARDS_FILE}")
    print("=" * 60)

    return 0


if __name__ == "__main__":
    sys.exit(main())
