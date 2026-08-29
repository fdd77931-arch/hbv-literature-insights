#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
证据卡片构建 + 文献簇聚类脚本
================================
数据源: data/private/literature_cleaned.ndjson (1001条审计后文献)

功能1: 深度证据卡片提取
    从 Abstract 和核心发现中用正则规则提取研究设计、样本量、人群、干预等字段。
功能2: 文献簇聚类
    按 12 个临床问题形成文献簇 (C01-C12)，一篇文献可属于多个簇。
功能3: 统计与输出
    输出 literature_index.json / evidence_clusters.json / evidence_cards.ndjson / statistics.json

纯 Python 标准库，无第三方依赖。
"""

import os
import sys
import json
import re
from datetime import datetime, timezone, timedelta
from collections import Counter, defaultdict
from pathlib import Path

# ---------------------------------------------------------------------------
# 路径定义
# ---------------------------------------------------------------------------
ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_PRIVATE = ROOT_DIR / "data" / "private"
DATA_PUBLIC = ROOT_DIR / "data" / "public"

INPUT_FILE = DATA_PRIVATE / "literature_cleaned.ndjson"
OUTPUT_INDEX_FILE = DATA_PUBLIC / "literature_index.json"
OUTPUT_CLUSTERS_FILE = DATA_PUBLIC / "evidence_clusters.json"
OUTPUT_CARDS_FILE = DATA_PRIVATE / "evidence_cards.ndjson"
OUTPUT_STATS_FILE = DATA_PUBLIC / "statistics.json"

# ---------------------------------------------------------------------------
# T1-T7 专题映射
#   T1 指南与共识 / T2 筛查与诊断 / T3 HBV功能性治愈 / T4 HBV现有治疗
#   T5 患者管理 / T6 HCC全病程 / T7 HBV→HCC
# ---------------------------------------------------------------------------
TOPIC_NAMES = {
    "T1": "指南与共识",
    "T2": "筛查与诊断",
    "T3": "HBV功能性治愈",
    "T4": "HBV现有治疗",
    "T5": "患者管理",
    "T6": "HCC全病程",
    "T7": "HBV→HCC",
}

# 一级领域 -> 专题代码
DOMAIN_TO_TOPIC = {
    "Guideline & Consensus": "T1",
    "HBV功能性治愈": "T3",
    "HBV现有治疗": "T4",
    "HBV→HCC": "T7",
    "HCC全病程": "T6",
}

# ---------------------------------------------------------------------------
# 文献簇定义 (C01-C12)
# ---------------------------------------------------------------------------
CLUSTERS = {
    "C01_hbsag_decline_functional_cure": {
        "name": "HBsAg早期下降与功能性治愈",
        "keywords": ["HBsAg下降", "HBsAg清除", "功能性治愈", "functional cure",
                      "HBsAg decline", "优势人群", "临床治愈", "HBsAg loss",
                      "HBsAg血清清除"],
        "topics": ["T3", "T4"],
    },
    "C02_pegifn_switch": {
        "name": "经治患者转换或联合PegIFN",
        "keywords": ["干扰素", "PegIFN", "聚乙二醇干扰素", "转换", "联合",
                      "switch", "add-on", "经治", "PEG-IFN", "PegIFNα"],
        "topics": ["T4"],
    },
    "C03_hcc_residual_risk": {
        "name": "HBV抑制或HBsAg清除后HCC残余风险",
        "keywords": ["HCC", "肝细胞癌", "残余风险", "residual risk",
                      "HCC发生", "HCC监测", "HCC风险"],
        "topics": ["T6"],
    },
    "C04_nuc_treatment": {
        "name": "核苷类似物长期治疗",
        "keywords": ["替诺福韦", "TDF", "TAF", "恩替卡韦", "ETV", "核苷",
                      "长期", "病毒抑制", "核苷（酸）类似物", "NUC", "NA停药",
                      "停药策略"],
        "topics": ["T4"],
    },
    "C05_hbsag_quantification": {
        "name": "HBsAg定量与疗效预测",
        "keywords": ["HBsAg定量", "qHBsAg", "HBsAg level", "预测", "predict",
                      "HBsAg亚型", "SHBs", "定量HBsAg"],
        "topics": ["T3"],
    },
    "C06_hbv_dna_suppression": {
        "name": "HBV DNA抑制与病毒学应答",
        "keywords": ["HBV DNA", "病毒学应答", "virological response",
                      "DNA抑制", "undetectable", "病毒载量", "DNA转阴",
                      "病毒抑制"],
        "topics": ["T4"],
    },
    "C07_hcc_screening": {
        "name": "HCC筛查与监测",
        "keywords": ["HCC筛查", "HCC监测", "超声", "AFP", "surveillance",
                      "screening", "肝癌筛查与监测", "筛查"],
        "topics": ["T6"],
    },
    "C08_hcc_treatment": {
        "name": "HCC治疗（手术/介入/免疫）",
        "keywords": ["手术", "切除", "TACE", "免疫治疗", "靶向", "移植",
                      "消融", "肝切除", "靶向治疗", "免疫检查点", "PD-1"],
        "topics": ["T6"],
    },
    "C09_new_drugs": {
        "name": "新药管线（siRNA/ASO/衣壳等）",
        "keywords": ["siRNA", "ASO", "反义寡核苷酸", "衣壳", "Bepirovirsen",
                      "新药", "II期", "III期", "治疗性疫苗", "Elebsiran",
                      "siRNA/ASO", "衣壳抑制剂"],
        "topics": ["T4"],
    },
    "C10_patient_management": {
        "name": "患者管理与依从性",
        "keywords": ["依从性", "adherence", "脱落", "失访", "患者教育",
                      "数字化", "患者管理", "管理与教育"],
        "topics": ["T5"],
    },
    "C11_guidelines": {
        "name": "指南与共识",
        "keywords": ["指南", "共识", "guideline", "recommendation",
                      "EASL", "AASLD", "APASL", "指南解读", "中国指南",
                      "中国专家共识", "国际指南"],
        "topics": ["T1"],
    },
    "C12_screening_cascade": {
        "name": "筛查到确诊的闭环",
        "keywords": ["筛查", "screening", "机会性", "阳性告知", "转诊",
                      "早诊", "确诊", "筛查策略"],
        "topics": ["T2"],
    },
}

# ---------------------------------------------------------------------------
# 研究设计识别规则 (中英文关键词 -> 设计类型)
# 顺序很重要: 越具体的放越前面
# ---------------------------------------------------------------------------
STUDY_DESIGN_RULES = [
    ("Meta分析", [r"meta\s*分析", r"meta-analysis", r"荟萃分析", r"系统评价", r"systematic\s*review"]),
    ("指南/共识", [r"指南", r"共识", r"guideline", r"recommendation", r"EASL", r"AASLD", r"APASL", r"expert\s*consensus"]),
    ("RCT", [r"随机对照", r"\bRCT\b", r"randomiz", r"randomis", r"随机.*试验", r"randomized\s*controlled"]),
    ("III期临床", [r"III期", r"三期", r"phase\s*iii", r"phase\s*3\s*trial", r"III期临床"]),
    ("II期临床", [r"II期", r"二期", r"phase\s*ii", r"phase\s*2\s*trial", r"II期临床"]),
    ("前瞻性队列", [r"前瞻性队列", r"prospective\s*cohort", r"前瞻.*队列"]),
    ("回顾性队列", [r"回顾性队列", r"retrospective\s*cohort", r"回顾.*队列"]),
    ("队列研究", [r"队列研究", r"\bcohort\b", r"队列"]),
    ("病例对照", [r"病例对照", r"case-control", r"case\s*control"]),
    ("横断面研究", [r"横断面", r"cross-sectional", r"cross\s*sectional"]),
    ("真实世界研究", [r"真实世界", r"real-world", r"real\s*world", r"\bRWS\b"]),
    ("综述", [r"综述", r"\breview\b", r"this\s*review", r"本综述", r"概述"]),
    ("探索性研究", [r"pilot", r"探索性", r"pilot\s*study"]),
    ("基础研究", [r"体外", r"in\s*vitro", r"动物实验", r"小鼠", r"细胞系", r"mechanism"]),
]

# ---------------------------------------------------------------------------
# 研究人群识别规则
# ---------------------------------------------------------------------------
POPULATION_RULES = [
    ("初治", [r"初治", r"naive", r"未接受治疗", r"初诊"]),
    ("经治", [r"经治", r"experienced", r"已接受", r"治疗后", r"既往治疗"]),
    ("HBeAg阳性", [r"HBeAg阳性", r"HBeAg\s*positive", r"HBeAg\+"]),
    ("HBeAg阴性", [r"HBeAg阴性", r"HBeAg\s*negative", r"HBeAg-"]),
    ("肝硬化", [r"肝硬化", r"cirrhosis", r"代偿期", r"compensated", r"失代偿", r"decompensat"]),
    ("慢性乙肝", [r"慢性乙型肝炎", r"慢性乙肝", r"chronic\s*hepatitis\s*B", r"\bCHB\b"]),
    ("儿童", [r"儿童", r"pediatric", r"小儿", r"婴儿", r"母婴"]),
    ("孕妇", [r"妊娠", r"孕妇", r"产妇", r"pregnancy", r"孕妇"]),
    ("老年", [r"老年", r"elderly", r"老龄"]),
    ("HIV合并", [r"\bHIV\b", r"艾滋", r"HIV感染"]),
    ("HDV合并", [r"\bHDV\b", r"丁肝", r"丁型"]),
    ("肝癌患者", [r"肝细胞癌", r"\bHCC\b", r"肝癌患者", r"肝切除"]),
    ("特殊人群", [r"特殊人群", r"合并症", r"脂肪肝", r"NAFLD", r"肾功能"]),
]

# ---------------------------------------------------------------------------
# 干预方案识别规则
# ---------------------------------------------------------------------------
INTERVENTION_RULES = [
    ("聚乙二醇干扰素", [r"聚乙二醇干扰素", r"PegIFN", r"PEG-IFN", r"PegIFNα", r"pegylated\s*interferon", r"干扰素"]),
    ("核苷（酸）类似物", [r"核苷（酸）类似物", r"核苷酸类似物", r"核苷类似物", r"\bNUC\b", r"\bNA\b", r"核苷"]),
    ("替诺福韦(TDF)", [r"替诺福韦", r"\bTDF\b", r"tenofovir\s*disoproxil"]),
    ("丙酚替诺福韦(TAF)", [r"\bTAF\b", r"tenofovir\s*alafenamide", r"丙酚替诺福韦"]),
    ("恩替卡韦(ETV)", [r"恩替卡韦", r"\bETV\b", r"entecavir"]),
    ("siRNA/ASO", [r"siRNA", r"\bASO\b", r"反义寡核苷酸", r"Bepirovirsen", r"Elebsiran", r"RNA干扰"]),
    ("衣壳抑制剂", [r"衣壳", r"capsid", r"衣壳抑制剂"]),
    ("免疫治疗", [r"免疫治疗", r"免疫检查点", r"PD-1", r"PD-L1", r"immunotherapy", r"纳武利尤", r"帕博利珠"]),
    ("靶向治疗", [r"靶向治疗", r"靶向", r"\bTKI\b", r"索拉非尼", r"仑伐替尼", r"lenvatinib", r"sorafenib"]),
    ("TACE/介入", [r"TACE", r"肝动脉化疗栓塞", r"介入", r"HAIC", r"SIRT"]),
    ("消融", [r"消融", r"ablation", r"射频消融", r"\bRFA\b"]),
    ("手术/切除", [r"手术", r"切除", r"肝切除", r"resection", r"hepatectomy"]),
    ("肝移植", [r"移植", r"transplant", r"肝移植"]),
    ("联合治疗", [r"联合治疗", r"联合用药", r"combination", r"联用", r"联合"]),
    ("治疗性疫苗", [r"治疗性疫苗", r"therapeutic\s*vaccine", r"\bvaccine\b", r"疫苗"]),
]

# ---------------------------------------------------------------------------
# 多维度标签规则
# ---------------------------------------------------------------------------
TAG_RULES = {
    "功能性治愈": ["功能性治愈", "functional cure", "HBsAg清除", "HBsAg loss", "临床治愈"],
    "HBsAg": ["HBsAg", "表面抗原", "乙肝表面抗原"],
    "HBV DNA": ["HBV DNA", "病毒载量", "DNA转阴", "病毒学应答"],
    "干扰素": ["干扰素", "IFN", "interferon", "PegIFN", "聚乙二醇"],
    "核苷类似物": ["核苷", "核苷酸", "NUC", "ETV", "TDF", "TAF", "恩替卡韦", "替诺福韦"],
    "HCC风险": ["HCC", "肝癌", "肝细胞癌", "癌变", "肿瘤发生"],
    "免疫治疗": ["免疫治疗", "immunotherapy", "PD-1", "PD-L1", "免疫检查点"],
    "靶向治疗": ["靶向治疗", "TKI", "索拉非尼", "仑伐替尼"],
    "新药管线": ["siRNA", "ASO", "反义寡核苷酸", "衣壳", "Bepirovirsen", "治疗性疫苗"],
    "真实世界": ["真实世界", "real-world", "RWS"],
    "生物标志物": ["生物标志物", "biomarker", "标志物", "预测因子", "qHBsAg"],
    "联合治疗": ["联合治疗", "联合用药", "combination"],
    "肝硬化": ["肝硬化", "cirrhosis", "纤维化", "fibrosis"],
    "耐药": ["耐药", "resistant", "resistance", "突变"],
    "特殊人群": ["特殊人群", "儿童", "孕妇", "老年", "HIV", "脂肪肝"],
    "卫生经济": ["卫生经济", "成本效果", "成本效益", "cost-effectiveness", "经济学"],
    "2030消除": ["2030", "消除", "elimination", "WHO", "世界卫生组织"],
    "指南共识": ["指南", "共识", "guideline", "EASL", "AASLD", "APASL"],
}

# 证据等级对应的公开版需要移除的敏感字段
SENSITIVE_FIELDS = {
    "abstract", "why_it_matters", "our_implication", "clinical_implication_detail",
    "china_implication", "china_rationale", "key_results", "key_numbers",
    "population", "intervention", "study_design", "sample_size", "tags",
    "recommendation_level", "controversy_points",
}


# ===========================================================================
# 工具函数
# ===========================================================================
def read_ndjson(filepath):
    """读取 NDJSON 文件，容忍空行和解析错误。"""
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
                records.append(json.loads(line))
            except json.JSONDecodeError as e:
                print(f"[警告] 第 {line_num} 行 JSON 解析失败: {e}")
    print(f"[信息] 读取 {len(records)} 条文献记录")
    return records


def safe_str(value):
    """安全转为字符串，处理 None / list / dict。"""
    if value is None:
        return ""
    if isinstance(value, list):
        return " ".join(str(v) for v in value if v)
    if isinstance(value, dict):
        return json.dumps(value, ensure_ascii=False)
    return str(value)


def safe_list(value):
    """安全转为字符串列表。"""
    if value is None:
        return []
    if isinstance(value, list):
        return [str(v).strip() for v in value if v is not None and str(v).strip()]
    if isinstance(value, str):
        return [v.strip() for v in value.split(",") if v.strip()]
    return [str(value)]


def extract_year(date_str):
    """从发表日期中提取年份。"""
    if not date_str:
        return None
    m = re.search(r"(20\d{2})", str(date_str))
    return int(m.group(1)) if m else None


def regex_match_any(text_lower, patterns):
    """对一组正则在文本中匹配，返回是否命中。"""
    for pat in patterns:
        try:
            if re.search(pat, text_lower, re.IGNORECASE):
                return True
        except re.error:
            if pat.lower() in text_lower:
                return True
    return False


# ===========================================================================
# 功能1: 深度证据卡片提取
# ===========================================================================
def infer_evidence_level(study_design, title_cn, title_en, source_types, abstract):
    """基于来源类型和标题关键词推断证据等级 A/B/C/D。"""
    combined = f"{title_cn} {title_en} {abstract}".lower()

    # A 级: RCT / Meta / 指南共识 / III期临床
    if study_design in ("Meta分析", "指南/共识", "RCT", "III期临床"):
        return "A"
    if any(kw in combined for kw in ["meta-analysis", "meta分析", "荟萃分析",
                                      "随机对照", "guideline", "指南", "共识",
                                      "phase iii", "iii期"]):
        return "A"

    # B 级: 队列 / 病例对照 / 前瞻 / II期 / 真实世界
    if study_design in ("前瞻性队列", "回顾性队列", "队列研究", "病例对照",
                        "II期临床", "真实世界研究"):
        return "B"
    if any(kw in combined for kw in ["cohort", "队列", "case-control", "病例对照",
                                      "phase ii", "ii期", "real-world", "真实世界",
                                      "前瞻"]):
        return "B"

    # C 级: 回顾 / 横断面 / 综述 / 探索
    if study_design in ("横断面研究", "综述", "探索性研究", "回顾性队列"):
        return "C"
    if any(kw in combined for kw in ["review", "综述", "cross-sectional", "横断面",
                                      "retrospect", "回顾", "pilot"]):
        return "C"

    # D 级: 病例报告 / 述评 / 信件 / 其他
    if any(kw in combined for kw in ["case report", "病例报告", "editorial", "述评",
                                      "letter", "信件", "comment"]):
        return "D"

    return "C"


def extract_study_design(abstract, findings, title_cn, title_en):
    """从摘要和核心发现中提取研究设计类型。"""
    text = f"{findings} {abstract} {title_cn} {title_en}"
    text_lower = text.lower()
    for design_name, patterns in STUDY_DESIGN_RULES:
        if regex_match_any(text_lower, patterns):
            return design_name
    return ""


def extract_sample_size(abstract, findings):
    """从摘要/核心发现中提取样本量数字。"""
    text = f"{findings} {abstract}"
    # 中文模式: 纳入XXX例 / XXX例患者 / 共XXX例 / XXX名患者 / XXX例HBeAg
    cn_patterns = [
        r"纳入\s*(\d+)\s*例",
        r"纳入\s*(\d+)\s*名",
        r"共\s*(\d+)\s*例",
        r"(\d+)\s*例患者",
        r"(\d+)\s*例\s*HBeAg",
        r"(\d+)\s*例\s*慢性",
        r"(\d+)\s*名患者",
        r"(\d+)\s*例受试",
        r"(\d+)\s*例\s*肝",
    ]
    for pat in cn_patterns:
        m = re.search(pat, text)
        if m:
            try:
                return int(m.group(1))
            except (ValueError, IndexError):
                pass
    # 英文模式
    en_patterns = [
        r"(\d+)\s*patients?\s*(?:were|with|who)",
        r"(\d+)\s*participants?",
        r"recruited\s*(\d+)",
        r"included\s*(\d+)",
        r"enrolled\s*(\d+)",
        r"of\s*(\d+)\s*patients",
        r"n\s*=\s*(\d+)",
        r"N\s*=\s*(\d+)",
    ]
    for pat in en_patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            try:
                return int(m.group(1))
            except (ValueError, IndexError):
                pass
    return None


def extract_population(abstract, findings, title_cn):
    """提取研究人群标签。"""
    text = f"{findings} {abstract} {title_cn}"
    text_lower = text.lower()
    populations = []
    for pop_name, patterns in POPULATION_RULES:
        if regex_match_any(text_lower, patterns):
            populations.append(pop_name)
    return populations


def extract_intervention(abstract, findings, title_cn, title_en):
    """提取干预方案标签。"""
    text = f"{findings} {abstract} {title_cn} {title_en}"
    text_lower = text.lower()
    interventions = []
    for int_name, patterns in INTERVENTION_RULES:
        if regex_match_any(text_lower, patterns):
            interventions.append(int_name)
    return interventions


def extract_key_numbers(findings, abstract):
    """从核心发现中提取关键数字 (百分比、HR、OR 等)。"""
    text = f"{findings} {abstract}"
    numbers = []

    # 百分比
    for m in re.finditer(r"(\d+\.?\d*)\s*%", text):
        val = m.group(1)
        numbers.append(f"{val}%")

    # HR / 风险比
    for m in re.finditer(r"(?:HR|风险比)[=\s:]*([\d.]+)", text, re.IGNORECASE):
        numbers.append(f"HR={m.group(1)}")

    # OR / 比值比
    for m in re.finditer(r"(?:OR|比值比)[=\s:]*([\d.]+)", text, re.IGNORECASE):
        numbers.append(f"OR={m.group(1)}")

    # 95% CI
    for m in re.finditer(r"95%\s*CI\s*[\d.\s\-–]+", text, re.IGNORECASE):
        numbers.append(m.group().strip())

    # P 值
    for m in re.finditer(r"[Pp]\s*[=<]\s*0?\.?\d+", text):
        numbers.append(m.group().strip())

    # 去重并限制数量
    seen = set()
    unique = []
    for n in numbers:
        if n not in seen:
            seen.add(n)
            unique.append(n)
    return unique[:8]


def extract_tags(record, combined_text):
    """提取多维度标签。"""
    text_lower = combined_text.lower()
    tags = []
    for tag, keywords in TAG_RULES.items():
        for kw in keywords:
            if kw.lower() in text_lower:
                tags.append(tag)
                break
    # 中国证据标签由 china_evidence 标志控制
    if record.get("china_evidence", False):
        tags.append("中国证据")
    return list(dict.fromkeys(tags))  # 去重保序


def assign_topics(record, combined_text):
    """分配 T1-T7 专题代码。"""
    topic_codes = set()
    # 从一级领域映射
    for domain in safe_list(record.get("一级领域")):
        code = DOMAIN_TO_TOPIC.get(domain)
        if code:
            topic_codes.add(code)
    # 关键词补充: T2 筛查与诊断 / T5 患者管理
    text_lower = combined_text.lower()
    if regex_match_any(text_lower, [r"筛查", r"screening", r"早诊", r"诊断", r"机会性"]):
        topic_codes.add("T2")
    if regex_match_any(text_lower, [r"依从性", r"adherence", r"患者管理", r"患者教育", r"管理"]):
        topic_codes.add("T5")
    if not topic_codes:
        topic_codes.add("T4")  # 默认归到 HBV现有治疗
    # 确定主专题
    primary = record.get("_primary_topic")
    if primary is None:
        # 优先取一级领域映射，否则取第一个
        for domain in safe_list(record.get("一级领域")):
            code = DOMAIN_TO_TOPIC.get(domain)
            if code:
                primary = code
                break
        if primary is None:
            primary = sorted(topic_codes)[0] if topic_codes else "T4"
    return primary, sorted(topic_codes)


def build_evidence_card(record):
    """为单篇文献构建深度证据卡片。"""
    title_cn = safe_str(record.get("中文标题"))
    title_en = safe_str(record.get("文献标题"))
    abstract = safe_str(record.get("Abstract"))
    findings = safe_str(record.get("核心发现"))
    source_types = safe_list(record.get("来源类型"))
    china_rels = safe_list(record.get("中国市场相关性"))

    # 中国证据判定: 基于真实信息判断，不依赖市场标签
    # 只检查"中国相关依据"字段，不检查摘要（摘要中提到"中国"不代表有中国证据）
    china_rationale = safe_str(record.get("中国相关依据"))
    china_implication = safe_str(record.get("对我们的启示"))
    rationale_lower = china_rationale.lower()
    implication_lower = china_implication.lower()

    # 否定模式：明确说"未涉及中国"说明不是中国证据
    negative_patterns = [
        "未涉及中国", "不涉及中国", "无中国机构", "无中国患者",
        "未涉及中国人群", "未包含中国", "无中国数据",
        "不适用中国", "与中国无关", "无直接关联",
        "未明确中国", "未报告中国", "缺乏中国",
        "该研究来自国际", "该研究为国际", "来自国际团队",
        "来自埃及", "来自智利", "来自韩国", "来自日本",
        "来自美国", "来自欧洲", "来自印度",
    ]

    # 肯定模式：明确提及中国患者/中心/机构/指南
    positive_direct = [
        "中国患者", "中国队列", "中国人群", "中国数据",
        "中国多中心", "中国医院", "中国机构", "中国研究中心",
        "中国真实世界", "中国注册研究", "中国全国调查",
        "中国指南", "中国共识", "中国官方", "中国卫健委",
        "中国肝癌患者", "中国肝病患者", "中国乙肝患者",
        "Chinese cohort", "Chinese patients", "China cohort",
        "multicenter study in China", "Chinese population",
        "in Chinese patients", "from China",
    ]

    positive_collab = [
        "包括中国", "含中国中心", "中国参与", "中国机构参与",
        "亚太研究", "Asia-Pacific study", "国际多中心含中国",
    ]

    is_negative = any(p in rationale_lower for p in negative_patterns)
    has_direct = any(p in rationale_lower for p in positive_direct)
    has_collab = any(p in rationale_lower for p in positive_collab)
    has_china_source = any(s in ("中国研究", "中国指南", "中国共识") for s in source_types)

    if has_direct or has_china_source:
        china_evidence = True
        china_evidence_type = "中国直接证据"
        china_evidence_basis = "中国患者/中心/机构/指南"
        china_evidence_confidence = "高"
    elif has_collab:
        china_evidence = True
        china_evidence_type = "中国机构参与的国际研究"
        china_evidence_basis = "国际合作研究含中国中心"
        china_evidence_confidence = "中"
    elif is_negative:
        china_evidence = False
        china_evidence_type = "国际证据"
        china_evidence_basis = "明确未涉及中国人群/机构"
        china_evidence_confidence = "高"
    else:
        china_evidence = False
        china_evidence_type = "地区无法判断"
        china_evidence_basis = "信息不足，无法确认中国证据"
        china_evidence_confidence = "低"

    # 合并文本用于标签和专题
    combined_text = f"{title_cn} {title_en} {abstract} {findings} " + \
                    " ".join(safe_list(record.get("二级主题")))

    # 研究设计、样本量、人群、干预
    study_design = extract_study_design(abstract, findings, title_cn, title_en)
    sample_size = extract_sample_size(abstract, findings)
    population = extract_population(abstract, findings, title_cn)
    intervention = extract_intervention(abstract, findings, title_cn, title_en)
    key_numbers = extract_key_numbers(findings, abstract)

    # 证据等级
    evidence_level = infer_evidence_level(
        study_design, title_cn, title_en, source_types, abstract
    )

    # 专题分类
    record["china_evidence"] = china_evidence
    primary_topic, topic_codes = assign_topics(record, combined_text)

    # 标签
    tags = extract_tags(record, combined_text)

    # 构建卡片
    card = {
        "id": safe_str(record.get("record_id")),
        "title_cn": title_cn,
        "title_en": title_en,
        "year": extract_year(record.get("发表日期")),
        "journal": safe_str(record.get("期刊")),
        "first_author": safe_str(record.get("第一作者")),
        "pmid": safe_str(record.get("PMID")),
        "doi": safe_str(record.get("DOI")),
        "source_url": safe_str(record.get("原文链接")) or safe_str(record.get("PubMed")),
        "evidence_level": evidence_level,
        "china_evidence": china_evidence,
        "china_evidence_type": china_evidence_type,
        "china_evidence_basis": china_evidence_basis,
        "china_evidence_confidence": china_evidence_confidence,
        "topic_primary": primary_topic,
        "topic_primary_name": TOPIC_NAMES.get(primary_topic, "其他"),
        "topic_codes": topic_codes,
        "topic_secondary": safe_list(record.get("二级主题")),
        "study_design": study_design,
        "population": population,
        "sample_size": sample_size,
        "intervention": intervention,
        "key_results": findings,
        "key_numbers": key_numbers,
        "clinical_implication": safe_str(record.get("对我们的启示")),
        "china_implication": safe_str(record.get("中国相关依据")),
        "tags": tags,
        "source_type": source_types,
        "china_relevance": china_rels,
        # 完整字段 (仅私有版本保留)
        "abstract": abstract,
        "why_it_matters": safe_str(record.get("Why it matters")),
        "publish_date": safe_str(record.get("发表日期")),
    }
    return card


# ===========================================================================
# 功能2: 文献簇聚类
# ===========================================================================
def assign_clusters(card):
    """将证据卡分配到匹配的文献簇，返回 cluster_id 列表。"""
    # 合并用于关键词匹配的文本
    combined_parts = [
        card.get("title_cn", ""),
        card.get("title_en", ""),
        card.get("abstract", ""),
        card.get("key_results", ""),
        card.get("clinical_implication", ""),
        " ".join(card.get("topic_secondary", [])),
        " ".join(card.get("tags", [])),
        " ".join(card.get("intervention", [])),
    ]
    combined = " ".join(combined_parts)
    combined_lower = combined.lower()

    topic_codes = set(card.get("topic_codes", []))
    matched = []

    for cluster_id, cluster_def in CLUSTERS.items():
        # 条件1: 关键词命中
        kw_hit = False
        for kw in cluster_def["keywords"]:
            if kw.lower() in combined_lower:
                kw_hit = True
                break
        # 条件2: 专题代码命中
        topic_hit = bool(topic_codes & set(cluster_def["topics"]))
        # 满足任一条件即归入该簇
        if kw_hit or topic_hit:
            matched.append(cluster_id)

    return matched


def build_cluster_summary(cluster_id, cluster_def, cards):
    """构建单个文献簇的统计摘要。"""
    study_designs = Counter()
    evidence_levels = Counter()
    years = []
    china_count = 0
    record_ids = []
    # 代表性文献排序: 证据等级(A>B>C>D) + 内容丰富度(标签数+关键数字数+样本量)
    scored = []

    level_order = {"A": 0, "B": 1, "C": 2, "D": 3}
    for card in cards:
        rid = card.get("id", "")
        record_ids.append(rid)
        sd = card.get("study_design") or "未分类"
        study_designs[sd] += 1
        el = card.get("evidence_level", "C")
        evidence_levels[el] += 1
        yr = card.get("year")
        if yr:
            years.append(yr)
        if card.get("china_evidence", False):
            china_count += 1
        # 内容丰富度评分
        richness = (
            len(card.get("tags", []))
            + len(card.get("key_numbers", []))
            + (1 if card.get("sample_size") else 0)
            + len(card.get("intervention", []))
            + (1 if card.get("study_design") else 0)
        )
        # 证据等级 A 优先 (level_order 小在前), 内容丰富度高优先 (richness 大在前)
        score = (level_order.get(el, 3), -richness)
        scored.append((score, card))

    # 选 3-5 篇代表文献 (A 级 + 高丰富度优先)
    scored.sort(key=lambda x: x[0])
    reps = []
    for _, card in scored[:5]:
        reps.append({
            "id": card.get("id", ""),
            "title_cn": card.get("title_cn", ""),
            "year": card.get("year"),
            "journal": card.get("journal", ""),
            "evidence_level": card.get("evidence_level", ""),
            "study_design": card.get("study_design", ""),
            "key_results": (card.get("key_results", "") or "")[:150],
        })

    summary = {
        "cluster_id": cluster_id,
        "name": cluster_def["name"],
        "total_records": len(cards),
        "china_count": china_count,
        "study_designs": dict(study_designs.most_common()),
        "year_range": {
            "min": min(years) if years else None,
            "max": max(years) if years else None,
        },
        "evidence_levels": dict(sorted(evidence_levels.items())),
        "representative_records": reps,
        "record_ids": record_ids,
    }
    return summary


# ===========================================================================
# 功能3: 统计与输出
# ===========================================================================
def build_public_card(card):
    """构建公开版证据卡 (脱敏，移除敏感长文本字段)。"""
    public = {}
    for key, value in card.items():
        if key in SENSITIVE_FIELDS:
            continue
        public[key] = value
    # 确保关键字段存在且精简
    if public.get("title_cn") and len(public["title_cn"]) > 200:
        public["title_cn"] = public["title_cn"][:197] + "..."
    return public


def save_evidence_cards(cards):
    """保存完整证据卡 (私有版本 NDJSON)。"""
    with open(OUTPUT_CARDS_FILE, "w", encoding="utf-8") as f:
        for card in cards:
            f.write(json.dumps(card, ensure_ascii=False) + "\n")
    print(f"[信息] 已保存 {len(cards)} 张完整证据卡 -> {OUTPUT_CARDS_FILE}")


def save_literature_index(cards):
    """保存公开文献索引 (脱敏 JSON)。"""
    now = datetime.now(timezone(timedelta(hours=8))).isoformat()
    public_records = [build_public_card(c) for c in cards]
    index = {
        "version": "2.0",
        "updated_at": now,
        "total": len(public_records),
        "records": public_records,
    }
    with open(OUTPUT_INDEX_FILE, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    print(f"[信息] 已保存公开文献索引 ({len(public_records)} 条) -> {OUTPUT_INDEX_FILE}")


def save_clusters(cluster_summaries):
    """保存文献簇汇总 JSON。"""
    now = datetime.now(timezone(timedelta(hours=8))).isoformat()
    output = {
        "version": "2.0",
        "updated_at": now,
        "total_clusters": len(cluster_summaries),
        "clusters": cluster_summaries,
    }
    with open(OUTPUT_CLUSTERS_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"[信息] 已保存文献簇汇总 ({len(cluster_summaries)} 簇) -> {OUTPUT_CLUSTERS_FILE}")


def save_statistics(cards, cluster_summaries):
    """保存更新的统计数据 JSON。"""
    now = datetime.now(timezone(timedelta(hours=8))).isoformat()

    total = len(cards)
    china_count = sum(1 for c in cards if c.get("china_evidence"))
    by_year = Counter()
    by_evidence_level = Counter()
    by_topic_primary = Counter()
    by_study_design = Counter()
    by_source_type = Counter()
    by_china_type = Counter()
    for c in cards:
        if c.get("year"):
            by_year[str(c["year"])] += 1
        by_evidence_level[c.get("evidence_level", "C")] += 1
        by_topic_primary[c.get("topic_primary", "T4")] += 1
        by_study_design[c.get("study_design") or "未分类"] += 1
        for st in c.get("source_type", []):
            by_source_type[st] += 1
        by_china_type[c.get("china_evidence_type", "地区无法判断")] += 1

    cluster_stats = {
        s["cluster_id"]: {
            "name": s["name"],
            "total_records": s["total_records"],
            "china_count": s["china_count"],
        }
        for s in cluster_summaries
    }

    stats = {
        "total_literature": total,
        "china_evidence_count": china_count,
        "china_evidence_pct": round(china_count / total * 100, 1) if total else 0,
        "china_evidence_breakdown": {
            "china_direct": by_china_type.get("中国直接证据", 0),
            "china_collab": by_china_type.get("中国机构参与的国际研究", 0),
            "international": by_china_type.get("国际证据", 0),
            "unknown": by_china_type.get("地区无法判断", 0),
        },
        "by_year": dict(sorted(by_year.items())),
        "by_evidence_level": dict(sorted(by_evidence_level.items())),
        "by_topic_primary": dict(sorted(by_topic_primary.items())),
        "by_study_design": dict(by_study_design.most_common()),
        "by_source_type": dict(by_source_type.most_common()),
        "clusters": cluster_stats,
        "total_clusters": len(cluster_summaries),
        "cluster_associated_total": sum(s["total_records"] for s in cluster_summaries),
        "cluster_unique_total": total,
        "last_sync": now,
        "data_source": "literature_cleaned.ndjson",
    }
    with open(OUTPUT_STATS_FILE, "w", encoding="utf-8") as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)
    print(f"[信息] 已保存统计数据 -> {OUTPUT_STATS_FILE}")


# ===========================================================================
# 主流程
# ===========================================================================
def main():
    print("=" * 70)
    print("证据卡片构建 + 文献簇聚类脚本")
    print("=" * 70)

    # 确保输出目录存在
    DATA_PRIVATE.mkdir(parents=True, exist_ok=True)
    DATA_PUBLIC.mkdir(parents=True, exist_ok=True)

    # 1. 读取数据
    records = read_ndjson(INPUT_FILE)
    if not records:
        print("[错误] 没有可处理的数据，退出")
        return 1

    # 2. 构建证据卡
    print("\n[阶段1] 构建深度证据卡片...")
    cards = []
    for i, record in enumerate(records, 1):
        try:
            card = build_evidence_card(record)
            cards.append(card)
        except Exception as e:
            print(f"[警告] 第 {i} 条记录 ({record.get('record_id', '?')}) 构建失败: {e}")
        if i % 100 == 0 or i == len(records):
            print(f"  [进度] {i}/{len(records)}")

    # 3. 文献簇聚类
    print("\n[阶段2] 文献簇聚类...")
    cluster_map = defaultdict(list)
    for card in cards:
        matched = assign_clusters(card)
        card["clusters"] = matched
        for cid in matched:
            cluster_map[cid].append(card)
    print(f"  [信息] 共 {len(cluster_map)} 个簇命中文献")

    # 4. 构建簇摘要
    print("\n[阶段3] 构建簇统计摘要...")
    cluster_summaries = []
    for cluster_id, cluster_def in CLUSTERS.items():
        cluster_cards = cluster_map.get(cluster_id, [])
        summary = build_cluster_summary(cluster_id, cluster_def, cluster_cards)
        cluster_summaries.append(summary)
        print(f"  [{cluster_id}] {cluster_def['name']}: {summary['total_records']} 篇 "
              f"(中国 {summary['china_count']}, 年份 {summary['year_range']['min']}-"
              f"{summary['year_range']['max']})")

    # 5. 保存输出
    print("\n[阶段4] 保存输出文件...")
    save_evidence_cards(cards)
    save_literature_index(cards)
    save_clusters(cluster_summaries)
    save_statistics(cards, cluster_summaries)

    # 6. 摘要输出
    print("\n" + "=" * 70)
    print("[完成] 证据卡片构建与文献簇聚类完成")
    print(f"  总证据卡数: {len(cards)}")
    print(f"  文献簇数: {len(cluster_summaries)}")
    print(f"  簇文献分布:")
    for s in cluster_summaries:
        print(f"    {s['cluster_id']}: {s['name']} = {s['total_records']} 篇")
    print(f"\n  输出文件:")
    print(f"    - {OUTPUT_CARDS_FILE}")
    print(f"    - {OUTPUT_INDEX_FILE}")
    print(f"    - {OUTPUT_CLUSTERS_FILE}")
    print(f"    - {OUTPUT_STATS_FILE}")
    print("=" * 70)
    return 0


if __name__ == "__main__":
    sys.exit(main())
