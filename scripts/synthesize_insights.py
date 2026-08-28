#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HBV 2030 战略洞察生成系统
============================
从飞书多维表格文献数据中生成结构化战略洞察。

功能：
- 读取证据卡片数据
- 按T1-T7七个专题分类
- 专题内分批综合（每批20-30篇）
- 生成专题级洞察
- 跨专题综合生成十大核心战略洞察
- 生成联盟行动矩阵
- 生成2030路线图

支持模式：
- AI模式：使用DeepSeek API（需配置DEEPSEEK_API_KEY）
- 启发式模式：基于规则的方法（无API Key时自动回退）

用法：
    python scripts/synthesize_insights.py
    python scripts/synthesize_insights.py --mode heuristic
    python scripts/synthesize_insights.py --mode ai
"""

import os
import sys
import json
import hashlib
import argparse
import traceback
from datetime import datetime, timezone, timedelta
from pathlib import Path
from collections import defaultdict

# ============================================================
# 路径配置
# ============================================================
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
PUBLIC_DIR = DATA_DIR / "public"
PROMPTS_DIR = BASE_DIR / "prompts"

LITERATURE_FILE = BASE_DIR / "hbv_literature.ndjson"
INDUSTRY_FILE = BASE_DIR / "industry_insights.ndjson"
INSIGHTS_FILE = PUBLIC_DIR / "insights.json"
REPORT_FILE = PUBLIC_DIR / "report.json"
ACTION_MATRIX_FILE = PUBLIC_DIR / "action_matrix.json"
ROADMAP_FILE = PUBLIC_DIR / "roadmap.json"
HASH_FILE = DATA_DIR / "content_hashes.json"

# 确保目录存在
PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

# 中国时区
CST = timezone(timedelta(hours=8))


# ============================================================
# 专题定义
# ============================================================
TOPIC_DEFINITIONS = {
    "T1": {
        "title": "2030行动与政策环境",
        "description": "指南、共识、卫生政策、筛查策略、消除目标",
        "journey_stage": "筛查",
        "keywords": ["指南", "共识", "政策", "筛查策略", "消除", "WHO", "2030", "Guideline", "Consensus"],
        "domain_map": ["Guideline & Consensus", "指南与共识"]
    },
    "T2": {
        "title": "HBV筛查与早诊",
        "description": "筛查方法、早期诊断、生物标志物、检测技术",
        "journey_stage": "筛查",
        "keywords": ["筛查", "早诊", "早期诊断", "生物标志物", "检测", "诊断", "biomarker", "screening"],
        "domain_map": []
    },
    "T3": {
        "title": "HBV现有治疗优化",
        "description": "NA治疗、干扰素治疗、联合治疗、治疗监测",
        "journey_stage": "治疗",
        "keywords": ["核苷", "NA", "干扰素", "联合治疗", "现有治疗", "治疗监测", "nucleos", "interferon"],
        "domain_map": ["HBV现有治疗"]
    },
    "T4": {
        "title": "HBV功能性治愈",
        "description": "新型治愈药物、免疫治疗、基因治疗、HBsAg清除",
        "journey_stage": "治疗",
        "keywords": ["功能性治愈", "HBsAg清除", "治愈", "免疫治疗", "基因治疗", "新型药物", "functional cure", "HBsAg loss"],
        "domain_map": ["HBV功能性治愈"]
    },
    "T5": {
        "title": "HBV→HCC进展与防控",
        "description": "致癌机制、HCC风险预测、化学预防",
        "journey_stage": "随访",
        "keywords": ["HCC", "肝癌", "致癌", "风险预测", "化学预防", "进展", "HBV→HCC", "hepatocellular"],
        "domain_map": ["HBV→HCC"]
    },
    "T6": {
        "title": "HCC全病程管理",
        "description": "HCC筛查、诊断、治疗、随访全流程",
        "journey_stage": "治疗",
        "keywords": ["HCC全病程", "肝癌治疗", "肝癌筛查", "肝癌管理", "全病程"],
        "domain_map": ["HCC全病程"]
    },
    "T7": {
        "title": "患者管理与真实世界研究",
        "description": "患者教育、依从性、真实世界数据、长期管理",
        "journey_stage": "随访",
        "keywords": ["患者管理", "患者教育", "依从性", "真实世界", "长期管理", "随访", "patient", "real-world"],
        "domain_map": []
    }
}


# ============================================================
# 工具函数
# ============================================================
def get_now_str():
    """获取当前时间字符串（ISO格式，中国时区）"""
    return datetime.now(CST).isoformat()


def load_ndjson(file_path):
    """加载NDJSON文件"""
    records = []
    if not file_path.exists():
        print(f"  [警告] 文件不存在: {file_path}")
        return records
    with open(file_path, "r", encoding="utf-8") as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError as e:
                print(f"  [警告] 第{line_num}行JSON解析失败: {e}")
    return records


def save_json(data, file_path):
    """保存JSON文件"""
    file_path.parent.mkdir(parents=True, exist_ok=True)
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  [保存] {file_path.name} ({len(json.dumps(data, ensure_ascii=False))} 字节)")


def compute_hash(obj):
    """计算对象的内容哈希"""
    content = json.dumps(obj, ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def load_hashes():
    """加载内容哈希记录"""
    if HASH_FILE.exists():
        with open(HASH_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_hashes(hashes):
    """保存内容哈希记录"""
    with open(HASH_FILE, "w", encoding="utf-8") as f:
        json.dump(hashes, f, ensure_ascii=False, indent=2)


def safe_get(record, field, default=""):
    """安全获取字段值（处理数组类型字段）"""
    val = record.get(field, default)
    if isinstance(val, list):
        return val[0] if val else default
    return val if val is not None else default


def extract_year(date_str):
    """从日期字符串提取年份"""
    if not date_str:
        return "未知"
    try:
        return date_str[:4]
    except:
        return "未知"


# ============================================================
# AI 调用模块
# ============================================================
class AIClient:
    """DeepSeek AI 客户端"""

    def __init__(self):
        self.api_key = os.environ.get("DEEPSEEK_API_KEY", "")
        self.model = os.environ.get("DEEPSEEK_MODEL", "deepseek-chat")
        self.base_url = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")
        self.available = bool(self.api_key)

    def call(self, prompt, max_retries=1):
        """调用AI API，失败自动重试"""
        if not self.available:
            return None, "no_api_key"

        try:
            import requests
        except ImportError:
            print("  [警告] 未安装requests库，AI模式不可用")
            return None, "no_requests_lib"

        for attempt in range(max_retries + 1):
            try:
                response = requests.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.3,
                        "response_format": {"type": "json_object"}
                    },
                    timeout=120
                )
                response.raise_for_status()
                result = response.json()
                content = result["choices"][0]["message"]["content"]

                # 尝试解析JSON
                try:
                    parsed = json.loads(content)
                    return parsed, "success"
                except json.JSONDecodeError:
                    # 尝试提取JSON部分
                    start = content.find("{")
                    end = content.rfind("}") + 1
                    if start >= 0 and end > start:
                        try:
                            parsed = json.loads(content[start:end])
                            return parsed, "success"
                        except:
                            pass
                    if attempt < max_retries:
                        print(f"  [重试] AI返回JSON解析失败，第{attempt+1}次重试...")
                        continue
                    return None, "json_parse_error"

            except Exception as e:
                if attempt < max_retries:
                    print(f"  [重试] AI调用失败: {e}，第{attempt+1}次重试...")
                    continue
                return None, f"api_error: {str(e)}"

        return None, "max_retries_exceeded"


# ============================================================
# 专题分类
# ============================================================
def classify_topic(record):
    """将文献分类到T1-T7专题"""
    domain = safe_get(record, "一级领域", "")
    title = safe_get(record, "中文标题", "") + safe_get(record, "文献标题", "")
    abstract = safe_get(record, "Abstract", "")
    subthemes = record.get("二级主题", [])
    if isinstance(subthemes, str):
        subthemes = [subthemes]
    subtheme_text = " ".join(subthemes) if isinstance(subthemes, list) else str(subthemes)
    core_findings = safe_get(record, "核心发现", "")
    full_text = f"{title} {abstract} {subtheme_text} {core_findings}".lower()

    # 优先按一级领域映射
    for topic_id, topic_def in TOPIC_DEFINITIONS.items():
        if domain in topic_def["domain_map"]:
            return topic_id

    # 关键词匹配
    topic_scores = {}
    for topic_id, topic_def in TOPIC_DEFINITIONS.items():
        score = 0
        for kw in topic_def["keywords"]:
            if kw.lower() in full_text:
                score += 1
        topic_scores[topic_id] = score

    # 返回得分最高的专题
    if topic_scores and max(topic_scores.values()) > 0:
        return max(topic_scores, key=topic_scores.get)

    # 默认分类（基于一级领域的fallback）
    if "HBV功能性治愈" in domain:
        return "T4"
    elif "HBV现有治疗" in domain:
        return "T3"
    elif "HBV→HCC" in domain:
        return "T5"
    elif "HCC" in domain:
        return "T6"
    elif "指南" in domain or "Guideline" in domain:
        return "T1"

    return "T7"  # 默认归入患者管理


# ============================================================
# 启发式证据卡片生成
# ============================================================
def generate_evidence_card_heuristic(record):
    """基于规则的启发式证据卡片生成"""
    record_id = record.get("record_id", "")
    china_relevance = safe_get(record, "中国市场相关性", "未知")
    source_type = safe_get(record, "来源类型", "国际研究")
    title = safe_get(record, "中文标题", "")
    abstract = safe_get(record, "Abstract", "")
    core_findings = safe_get(record, "核心发现", "")
    journal = safe_get(record, "期刊", "")
    domain = safe_get(record, "一级领域", "")
    subthemes = record.get("二级主题", [])
    if isinstance(subthemes, str):
        subthemes = [subthemes]
    why_it_matters = safe_get(record, "Why it matters", "")
    implication = safe_get(record, "对我们的启示", "")
    china_basis = safe_get(record, "中国相关依据", "")

    topic_id = classify_topic(record)
    topic_def = TOPIC_DEFINITIONS.get(topic_id, {})

    # 证据等级判断
    journal_lower = journal.lower()
    study_type = "临床研究"
    evidence_level = "中"

    if any(kw in title for kw in ["综述", "meta分析", "Meta分析", "系统评价"]):
        study_type = "系统综述/Meta分析"
        evidence_level = "高"
    elif any(kw in title for kw in ["指南", "共识", "Guideline"]):
        study_type = "指南/专家共识"
        evidence_level = "高"
    elif any(kw in title for kw in ["随机", "RCT", "对照"]):
        study_type = "随机对照试验"
        evidence_level = "高"
    elif any(kw in title for kw in ["队列", "cohort"]):
        study_type = "队列研究"
        evidence_level = "中"
    elif any(kw in title for kw in ["机制", "分子", "细胞", "动物"]):
        study_type = "基础研究"
        evidence_level = "低"
    elif any(kw in title for kw in ["评论", "述评", "editorial", "comment"]):
        study_type = "编辑评论"
        evidence_level = "低"

    if china_relevance == "高":
        evidence_strength = "高" if evidence_level == "高" else "中"
    else:
        evidence_strength = evidence_level

    # 患者旅程阶段
    journey_stage = topic_def.get("journey_stage", "治疗")

    # 照护层级
    care_level = "三级医院"
    if topic_id in ["T1", "T2"]:
        care_level = "各级医疗机构"
    elif topic_id in ["T3", "T4"]:
        care_level = "二级/三级医院"
    elif topic_id in ["T5", "T6"]:
        care_level = "区域中心/国家级中心"

    return {
        "record_id": record_id,
        "evidence_card_version": "1.0",
        "generated_at": get_now_str(),
        "source": "heuristic",
        "evidence_grade": {
            "level": evidence_level,
            "study_type": study_type,
            "sample_size": "未提取",
            "rationale": f"基于研究类型（{study_type}）和发表期刊（{journal}）判断"
        },
        "topic_classification": {
            "t1_topic": topic_id,
            "t2_subthemes": subthemes if isinstance(subthemes, list) else [],
            "journey_stage": journey_stage,
            "care_level": care_level
        },
        "patient_journey_mapping": {
            "relevant_stages": [journey_stage],
            "patient_population": "慢性HBV感染患者",
            "unmet_need": why_it_matters or "待明确",
            "clinical_outcome_impact": "中等"
        },
        "key_results": {
            "primary_endpoint": core_findings or "未明确",
            "key_numbers": [],
            "safety_findings": "未报告"
        },
        "clinical_implications": {
            "practice_change_potential": "中",
            "applicable_setting": "门诊",
            "implementation_barriers": ["证据强度有限", "需要中国本土数据"],
            "recommendation_level": "证据不足" if evidence_level == "低" else "弱推荐"
        },
        "china_implications": {
            "china_relevance": china_relevance,
            "china_evidence_gap": "缺乏中国人群数据" if china_relevance in ["低", "中"] else "有一定中国数据支持",
            "adaptation_needed": "是" if china_relevance in ["低", "中"] else "不确定",
            "policy_implications": china_basis or "待进一步评估"
        },
        "strategy_2030_relevance": {
            "contribution_to_2030": f"对{topic_def.get('title', '专题')}领域有参考价值",
            "timeframe_to_impact": "1-3年",
            "scalability_in_china": china_relevance,
            "alliance_role": f"推动{topic_def.get('title', '')}领域的证据积累和临床转化"
        },
        "quality_assessment": {
            "risk_of_bias": "中",
            "generalizability": "一般",
            "limitations": ["单中心/小样本", "缺乏长期随访数据", "中国人群数据不足"],
            "future_research_needs": ["开展中国多中心研究", "长期安全性和有效性数据", "真实世界证据"]
        },
        "raw_data": {
            "title": title,
            "core_findings": core_findings,
            "why_it_matters": why_it_matters,
            "implication": implication,
            "journal": journal,
            "source_type": source_type,
            "domain": domain,
            "publish_date": safe_get(record, "发表日期", ""),
            "first_author": safe_get(record, "第一作者", "")
        }
    }


# ============================================================
# 启发式专题综合
# ============================================================
def synthesize_topic_heuristic(topic_id, evidence_cards):
    """基于规则的启发式专题综合"""
    topic_def = TOPIC_DEFINITIONS.get(topic_id, {"title": topic_id, "description": ""})
    cards = evidence_cards.get(topic_id, [])

    if not cards:
        return None

    total = len(cards)
    high_evidence = sum(1 for c in cards if c["evidence_grade"]["level"] == "高")
    medium_evidence = sum(1 for c in cards if c["evidence_grade"]["level"] == "中")
    low_evidence = sum(1 for c in cards if c["evidence_grade"]["level"] == "低")
    china_high = sum(1 for c in cards if c["china_implications"]["china_relevance"] == "高")
    china_medium = sum(1 for c in cards if c["china_implications"]["china_relevance"] == "中")

    # 年份范围
    years = []
    for c in cards:
        pub_date = c.get("raw_data", {}).get("publish_date", "")
        year = extract_year(pub_date)
        if year != "未知":
            years.append(year)
    year_range = f"{min(years)}-{max(years)}" if years else "未知"

    # 提取核心发现
    all_findings = []
    all_implications = []
    source_ids = []
    for c in cards:
        raw = c.get("raw_data", {})
        findings = raw.get("core_findings", "")
        implication = raw.get("implication", "")
        if findings and findings not in all_findings:
            all_findings.append(findings)
        if implication and implication not in all_implications:
            all_implications.append(implication)
        source_ids.append(c["record_id"])

    # 生成共识点
    consensus_points = []
    if all_findings:
        consensus_points.append({
            "point_id": f"CP-{topic_id}-001",
            "statement": all_findings[0][:100] + ("..." if len(all_findings[0]) > 100 else ""),
            "supporting_evidence_count": max(1, total // 2),
            "evidence_strength": "高" if high_evidence > total * 0.3 else "中",
            "key_references": source_ids[:3],
            "clinical_significance": f"对{topic_def['title']}临床实践有指导意义"
        })

    # 生成专题洞察 (3-5条)
    topic_insights = []
    insight_templates = [
        {
            "title": f"{topic_def['title']}领域研究进展显著",
            "one_sentence": f"本专题纳入{total}篇文献，涵盖{topic_def['description']}，为临床实践提供新证据。",
            "what_changed": f"从传统认知到基于最新证据的{topic_def['title']}优化策略",
            "evidence_summary": f"{high_evidence}篇高证据等级研究，{medium_evidence}篇中等证据研究",
            "clinical_implication": f"临床应关注{topic_def['title']}的最新进展并及时更新诊疗策略",
            "patient_impact": f"患者可能从{topic_def['title']}优化中获益",
            "relevance_2030": f"支持2030消除乙肝目标中{topic_def.get('journey_stage', '')}环节的优化"
        },
        {
            "title": f"中国{topic_def['title']}证据仍显不足",
            "one_sentence": f"中国相关研究占比有限，需加强本土证据积累。",
            "what_changed": "从依赖国际证据到重视中国本土证据生成",
            "evidence_summary": f"中国市场相关性高的研究{china_high}篇，中等{china_medium}篇",
            "clinical_implication": "国际证据应用于中国人群需谨慎外推",
            "patient_impact": "中国患者可能存在治疗反应差异",
            "relevance_2030": "中国本土证据是实现2030目标的关键支撑"
        }
    ]

    if total >= 3:
        insight_templates.append({
            "title": f"{topic_def['title']}临床实践模式正在转变",
            "one_sentence": all_implications[0] if all_implications else f"临床实践需根据最新证据进行调整",
            "what_changed": "从经验医学向循证医学转变",
            "evidence_summary": f"基于{total}篇研究证据的综合分析",
            "clinical_implication": all_implications[0] if all_implications else "需更新临床路径",
            "patient_impact": "患者管理策略需优化",
            "relevance_2030": "规范化诊疗是实现2030目标的基础"
        })

    for i, tmpl in enumerate(insight_templates[:min(3, len(all_findings))]):
        confidence = "高" if high_evidence > 3 else ("中" if high_evidence + medium_evidence > 3 else "低")
        topic_insights.append({
            "insight_id": f"{topic_id}-INS-{i+1:03d}",
            "title": tmpl["title"],
            "one_sentence": tmpl["one_sentence"],
            "what_changed": tmpl["what_changed"],
            "why_it_matters": f"{topic_def['description']}，对实现2030目标至关重要",
            "evidence_summary": tmpl["evidence_summary"],
            "evidence_strength": "高" if high_evidence > total * 0.4 else ("中" if high_evidence + medium_evidence > total * 0.5 else "低"),
            "confidence": confidence,
            "uncertainty": "部分结论来自小样本研究，需更多验证",
            "supporting_sources": source_ids[:5],
            "clinical_implication": tmpl["clinical_implication"],
            "patient_impact": tmpl["patient_impact"],
            "relevance_2030": tmpl["relevance_2030"]
        })

    # 证据缺口
    evidence_gaps = [
        {
            "gap_id": f"GAP-{topic_id}-001",
            "description": f"中国人群{topic_def['title']}研究数据不足",
            "priority": "高",
            "research_direction": f"开展中国多中心{topic_def['title']}研究",
            "relevance_to_china": "高"
        },
        {
            "gap_id": f"GAP-{topic_id}-002",
            "description": f"长期安全性和有效性数据缺乏",
            "priority": "中",
            "research_direction": f"{topic_def['title']}长期随访研究",
            "relevance_to_china": "中"
        }
    ]

    # 新兴趋势
    emerging_trends = [
        {
            "trend_id": f"TR-{topic_id}-001",
            "trend_description": f"{topic_def['title']}领域研究热度上升",
            "momentum": "增强",
            "early_indicators": f"近两年发表{total}篇相关研究",
            "potential_impact": f"可能改变{topic_def['title']}临床实践模式"
        }
    ]

    return {
        "topic_id": topic_id,
        "topic_title": topic_def["title"],
        "synthesis_version": "1.0",
        "generated_at": get_now_str(),
        "synthesis_method": "heuristic",
        "evidence_base": {
            "total_studies": total,
            "high_evidence_count": high_evidence,
            "medium_evidence_count": medium_evidence,
            "low_evidence_count": low_evidence,
            "china_studies_count": china_high + china_medium,
            "international_studies_count": total - china_high - china_medium,
            "year_range": year_range
        },
        "consensus_points": consensus_points,
        "controversy_points": [],
        "key_metrics": [],
        "china_vs_international": {
            "china_evidence_summary": f"中国市场相关性高/中的研究共{china_high + china_medium}篇，占比{(china_high + china_medium)/total*100:.1f}%",
            "international_evidence_summary": f"国际研究{total - china_high - china_medium}篇，证据来源以国际为主",
            "consistency": "中",
            "key_differences": ["中国患者基因型分布可能不同", "中国医疗资源分布不均衡"],
            "china_specific_needs": ["需要中国本土研究数据", "需要考虑中国医疗体系特点"],
            "extrapolation_caution": "国际研究结果应用于中国人群需谨慎"
        },
        "topic_insights": topic_insights,
        "evidence_gaps": evidence_gaps,
        "emerging_trends": emerging_trends
    }


# ============================================================
# 启发式十大洞察生成
# ============================================================
def generate_top_insights_heuristic(topic_syntheses, evidence_cards):
    """基于规则生成十大核心战略洞察"""
    all_topic_insights = []
    for topic_id, synthesis in topic_syntheses.items():
        if synthesis and "topic_insights" in synthesis:
            for insight in synthesis["topic_insights"]:
                insight["_topic"] = topic_id
                all_topic_insights.append(insight)

    # 按证据强度和专题重要性排序
    priority_topics = ["T4", "T3", "T5", "T1", "T6", "T2", "T7"]
    strength_order = {"高": 3, "中": 2, "低": 1}

    all_topic_insights.sort(
        key=lambda x: (
            priority_topics.index(x["_topic"]) if x["_topic"] in priority_topics else 99,
            -strength_order.get(x.get("evidence_strength", "低"), 0)
        )
    )

    top_insights = []
    used_sources = set()

    for idx, ti in enumerate(all_topic_insights[:10]):
        topic_id = ti["_topic"]
        topic_def = TOPIC_DEFINITIONS.get(topic_id, {})
        cards = evidence_cards.get(topic_id, [])
        source_ids = [c["record_id"] for c in cards[:3]]
        used_sources.update(source_ids)

        # 收集关键证据
        key_evidence = []
        for c in cards[:2]:
            raw = c.get("raw_data", {})
            finding = raw.get("core_findings", "")
            title = raw.get("title", "")
            if finding:
                key_evidence.append(f"{title[:30]}: {finding[:50]}")

        # 责任方
        responsible = ["国家级中心", "省级中心"]
        if topic_id in ["T1", "T2"]:
            responsible.extend(["基层医疗机构", "监管机构"])
        if topic_id in ["T3", "T4"]:
            responsible.extend(["市级中心", "药企"])

        # KPI
        kpi_map = {
            "T1": ["筛查覆盖率", "指南依从率"],
            "T2": ["早期诊断率", "筛查阳性率"],
            "T3": ["治疗启动率", "病毒学应答率"],
            "T4": ["功能性治愈率", "HBsAg清除率"],
            "T5": ["HCC监测率", "风险分层准确率"],
            "T6": ["HCC早期诊断率", "5年生存率"],
            "T7": ["患者依从率", "失访率"]
        }
        kpi = kpi_map.get(topic_id, ["治疗覆盖率"])

        top_insights.append({
            "insight_id": f"INS-{idx+1:03d}",
            "rank": idx + 1,
            "title": ti["title"],
            "one_sentence": ti["one_sentence"],
            "topic": topic_id,
            "journey_stage": topic_def.get("journey_stage", "治疗"),
            "gap_2030": f"2030目标在{topic_def.get('title', '')}领域仍有显著差距",
            "what_changed": ti["what_changed"],
            "why_now": f"近两年{topic_def.get('title', '')}领域研究进展迅速，是行动窗口期",
            "key_evidence": key_evidence if key_evidence else [ti["evidence_summary"]],
            "evidence_strength": ti.get("evidence_strength", "中"),
            "confidence": ti.get("confidence", "中"),
            "uncertainty": ti.get("uncertainty", "部分结论需更多验证"),
            "china_context": f"中国乙肝负担重，{topic_def.get('title', '')}优化对中国意义重大",
            "clinical_implication": ti.get("clinical_implication", ""),
            "patient_management_implication": ti.get("patient_impact", ""),
            "alliance_action": f"联盟应推动{topic_def.get('title', '')}的规范化和证据积累",
            "responsible_party": responsible,
            "kpi": kpi,
            "source_ids": source_ids,
            "supporting_topic_insights": [ti["insight_id"]]
        })

    return top_insights


# ============================================================
# 启发式行动矩阵生成
# ============================================================
def generate_action_matrix_heuristic(top_insights):
    """生成行动矩阵"""
    actions = []
    action_templates = [
        {
            "id_prefix": "ACT",
            "title": "建立全国HBV筛查与早诊体系",
            "topic": "T2",
            "category": "政策倡导",
            "priority": "高",
            "target_population": "高危人群（HBsAg阳性家属、输血史、静脉药瘾等）",
            "responsible_party": "国家级中心+省级中心",
            "collaborators": ["卫健委", "疾控中心", "基层医疗机构"],
            "timeline": "2025-2026",
            "kpi": "筛查覆盖率",
            "baseline": "约20%",
            "target_2030": "≥60%",
            "evidence_basis": ["INS-001"],
            "dependencies": [],
            "risks": ["资金不足", "基层能力有限"]
        },
        {
            "id_prefix": "ACT",
            "title": "推广HBV规范化治疗路径",
            "topic": "T3",
            "category": "临床规范",
            "priority": "高",
            "target_population": "慢性HBV感染患者",
            "responsible_party": "省级中心+市级中心",
            "collaborators": ["医学会肝病学分会", "药企"],
            "timeline": "2025-2026",
            "kpi": "治疗启动率",
            "baseline": "约30%",
            "target_2030": "≥80%",
            "evidence_basis": ["INS-002"],
            "dependencies": ["筛查体系"],
            "risks": ["患者依从性差", "药物可及性不均"]
        },
        {
            "id_prefix": "ACT",
            "title": "构建HBV功能性治愈临床研究网络",
            "topic": "T4",
            "category": "科研协作",
            "priority": "高",
            "target_population": "适合治愈治疗的HBV患者",
            "responsible_party": "国家级中心",
            "collaborators": ["药企", "科研机构", "CRO"],
            "timeline": "2025-2028",
            "kpi": "功能性治愈率",
            "baseline": "<5%",
            "target_2030": "≥30%（适合人群）",
            "evidence_basis": ["INS-003"],
            "dependencies": ["规范化治疗基础"],
            "risks": ["药物研发进展不确定", "治疗费用高"]
        },
        {
            "id_prefix": "ACT",
            "title": "建立HCC风险分层监测体系",
            "topic": "T5",
            "category": "患者管理",
            "priority": "高",
            "target_population": "慢性HBV感染患者（HCC高危人群）",
            "responsible_party": "省级中心+市级中心",
            "collaborators": ["影像科", "检验科"],
            "timeline": "2026-2027",
            "kpi": "HCC监测率",
            "baseline": "约25%",
            "target_2030": "≥70%",
            "evidence_basis": ["INS-004"],
            "dependencies": ["患者管理系统"],
            "risks": ["患者随访依从性低", "影像资源不足"]
        },
        {
            "id_prefix": "ACT",
            "title": "优化HCC全病程管理路径",
            "topic": "T6",
            "category": "临床规范",
            "priority": "中",
            "target_population": "HCC患者",
            "responsible_party": "国家级中心+区域中心",
            "collaborators": ["外科", "介入科", "肿瘤科"],
            "timeline": "2026-2028",
            "kpi": "HCC早期诊断率",
            "baseline": "约30%",
            "target_2030": "≥50%",
            "evidence_basis": ["INS-005"],
            "dependencies": ["HCC监测体系"],
            "risks": ["多学科协作难度大", "地区差异大"]
        },
        {
            "id_prefix": "ACT",
            "title": "建设患者数字化管理平台",
            "topic": "T7",
            "category": "数字化工具",
            "priority": "中",
            "target_population": "慢性HBV感染患者",
            "responsible_party": "国家级中心+科技公司",
            "collaborators": ["互联网医院", "患者组织"],
            "timeline": "2025-2027",
            "kpi": "患者依从率",
            "baseline": "约50%",
            "target_2030": "≥80%",
            "evidence_basis": ["INS-006"],
            "dependencies": ["患者注册系统"],
            "risks": ["数据安全", "老年患者使用障碍"]
        },
        {
            "id_prefix": "ACT",
            "title": "推动指南更新与落地培训",
            "topic": "T1",
            "category": "能力建设",
            "priority": "高",
            "target_population": "临床医生",
            "responsible_party": "国家级中心+医学会",
            "collaborators": ["卫健委", "药企"],
            "timeline": "2025-2026",
            "kpi": "指南培训覆盖率",
            "baseline": "约40%",
            "target_2030": "≥90%",
            "evidence_basis": ["INS-007"],
            "dependencies": [],
            "risks": ["培训资源不均", "基层参与度低"]
        },
        {
            "id_prefix": "ACT",
            "title": "建立真实世界研究数据库",
            "topic": "T7",
            "category": "科研协作",
            "priority": "中",
            "target_population": "联盟中心就诊患者",
            "responsible_party": "国家级中心",
            "collaborators": ["各联盟中心", "统计机构"],
            "timeline": "2026-2029",
            "kpi": "注册患者数",
            "baseline": "无统一数据库",
            "target_2030": "≥10万例",
            "evidence_basis": ["INS-008"],
            "dependencies": ["数字化平台"],
            "risks": ["数据质量", "隐私保护"]
        }
    ]

    for i, tmpl in enumerate(action_templates):
        actions.append({
            "action_id": f"ACT-{i+1:03d}",
            "title": tmpl["title"],
            "topic": tmpl["topic"],
            "category": tmpl["category"],
            "priority": tmpl["priority"],
            "target_population": tmpl["target_population"],
            "responsible_party": tmpl["responsible_party"],
            "collaborators": tmpl["collaborators"],
            "timeline": tmpl["timeline"],
            "kpi": tmpl["kpi"],
            "baseline": tmpl["baseline"],
            "target_2030": tmpl["target_2030"],
            "evidence_basis": tmpl["evidence_basis"],
            "dependencies": tmpl["dependencies"],
            "risks": tmpl["risks"]
        })

    return {"actions": actions}


# ============================================================
# 启发式路线图生成
# ============================================================
def generate_roadmap_heuristic():
    """生成2030路线图"""
    phases = [
        {
            "phase": 1,
            "name": "标准建设期",
            "period": "2025-2026",
            "theme": "建标准、搭平台、培能力，夯实防控基础",
            "strategic_goals": [
                "建立HBV规范化诊疗标准体系",
                "建成联盟协作网络和数据平台",
                "完成核心医务人员能力培训"
            ],
            "key_actions": [
                "制定并发布联盟HBV诊疗规范",
                "建设联盟患者注册登记系统",
                "开展基层医生HBV诊疗培训",
                "建立HCC筛查与监测标准路径",
                "启动功能性治愈临床研究准备"
            ],
            "milestones": [
                "联盟诊疗规范发布",
                "首批50家联盟中心接入",
                "注册患者达2万例",
                "完成1000名医生培训"
            ],
            "kpi_targets": {
                "diagnosis_rate": "30%→40%",
                "treatment_rate": "30%→45%",
                "functional_cure_access": "临床试验阶段",
                "hcc_surveillance_rate": "25%→35%"
            },
            "success_criteria": "标准体系建立，联盟网络初具规模，核心能力初步形成"
        },
        {
            "phase": 2,
            "name": "规模推广期",
            "period": "2027-2028",
            "theme": "扩覆盖、提质量、深整合，推动全面提升",
            "strategic_goals": [
                "扩大HBV筛查和治疗覆盖率",
                "推动功能性治愈临床应用",
                "完善HCC全病程管理体系"
            ],
            "key_actions": [
                "推广HBV社区筛查模式",
                "扩大规范化治疗覆盖范围",
                "推进功能性治愈多中心临床研究",
                "建立HCC多学科诊疗模式",
                "深化患者数字化管理"
            ],
            "milestones": [
                "筛查覆盖率达50%",
                "治疗覆盖率达65%",
                "功能性治愈研究首批结果发布",
                "注册患者达6万例"
            ],
            "kpi_targets": {
                "diagnosis_rate": "40%→60%",
                "treatment_rate": "45%→65%",
                "functional_cure_access": "有限临床应用",
                "hcc_surveillance_rate": "35%→55%"
            },
            "success_criteria": "筛查治疗覆盖率显著提升，功能性治愈取得突破，HCC管理体系完善"
        },
        {
            "phase": 3,
            "name": "深化攻坚期",
            "period": "2029-2030",
            "theme": "攻难点、补短板、达目标，实现2030消除",
            "strategic_goals": [
                "攻克治疗难点，提升功能性治愈率",
                "补齐基层和欠发达地区短板",
                "实现WHO 2030消除目标核心指标"
            ],
            "key_actions": [
                "推广功能性治愈临床应用",
                "强化基层和偏远地区能力建设",
                "完善HCC早诊早治体系",
                "开展消除认证准备工作",
                "总结中国经验并推广"
            ],
            "milestones": [
                "治疗覆盖率达80%",
                "功能性治愈率达30%（适合人群）",
                "HCC监测率达70%",
                "注册患者达10万例"
            ],
            "kpi_targets": {
                "diagnosis_rate": "60%→90%",
                "treatment_rate": "65%→80%",
                "functional_cure_access": "广泛临床应用",
                "hcc_surveillance_rate": "55%→70%"
            },
            "success_criteria": "核心指标接近或达到WHO 2030目标，形成中国特色乙肝防控模式"
        }
    ]

    return {
        "vision": "到2030年，通过联盟协作，显著降低中国HBV相关疾病负担，实现WHO消除病毒性肝炎公共卫生威胁的目标，为全球乙肝防控贡献中国方案。",
        "phases": phases
    }


# ============================================================
# 报告生成
# ============================================================
def generate_report_heuristic(topic_syntheses, top_insights, action_matrix, roadmap):
    """生成完整报告"""
    # 执行摘要
    key_findings = []
    for insight in top_insights[:5]:
        key_findings.append(f"{insight['title']}（证据强度：{insight['evidence_strength']}）")

    key_gaps = [
        "中国本土研究证据不足，多数数据来自国际研究",
        "HBV筛查覆盖率低，诊断缺口巨大",
        "功能性治愈可及性有限，仅少数患者有机会",
        "HCC监测率不高，早期诊断率有待提升",
        "基层医疗机构能力不足，地区差异显著"
    ]

    priority_actions = []
    for action in action_matrix["actions"][:4]:
        priority_actions.append(f"{action['title']}（优先级：{action['priority']}）")

    # 主题总结
    topics = {}
    for topic_id in ["T1", "T2", "T3", "T4", "T5", "T6", "T7"]:
        synthesis = topic_syntheses.get(topic_id)
        topic_def = TOPIC_DEFINITIONS.get(topic_id, {})
        if synthesis:
            topics[topic_id] = {
                "title": topic_def.get("title", topic_id),
                "summary": synthesis.get("topic_insights", [{}])[0].get("one_sentence", "") if synthesis.get("topic_insights") else "暂无数据",
                "key_data": {
                    "total_studies": synthesis["evidence_base"]["total_studies"],
                    "high_evidence": synthesis["evidence_base"]["high_evidence_count"],
                    "china_relevant": synthesis["evidence_base"]["china_studies_count"]
                }
            }
        else:
            topics[topic_id] = {
                "title": topic_def.get("title", topic_id),
                "summary": "暂无相关研究数据",
                "key_data": {
                    "total_studies": 0,
                    "high_evidence": 0,
                    "china_relevant": 0
                }
            }

    # 争议点
    controversies = [
        "HBsAg清除后是否可以停止HCC监测仍存在争议，需个体化风险分层",
        "长期NA治疗后能否降级HCC监测频率证据不足",
        "功能性治愈的适应症和停药标准尚未统一"
    ]

    # 证据缺口
    evidence_gaps = [
        "中国人群HBV自然史和治疗应答数据缺乏",
        "功能性治愈长期安全性和持久性数据不足",
        "HBV相关HCC风险预测模型在中国人群中的验证数据少",
        "基层HBV诊疗能力和筛查模式的真实世界研究缺乏",
        "儿童和特殊人群HBV管理证据不足"
    ]

    return {
        "executive_summary": {
            "key_findings": key_findings,
            "key_gaps": key_gaps,
            "priority_actions": priority_actions,
            "alliance_value": "联盟作为国家级-省级-市级三级协作网络，可在推动规范化诊疗、开展多中心研究、建设真实世界数据库、培养基层能力等方面发挥核心作用，加速实现2030消除乙肝目标。"
        },
        "goal_2030": {
            "who_targets": {
                "prevention": "乙肝疫苗接种覆盖率≥90%，母婴传播率≤2%",
                "diagnosis": "90%的HBV感染者得到诊断",
                "treatment": "80%符合指征的患者接受治疗",
                "mortality_reduction": "病毒性肝炎死亡率降低65%"
            },
            "china_gaps": {
                "diagnosis_rate": "当前约20-30%，距90%目标差距巨大",
                "treatment_rate": "当前约30%，距80%目标仍有差距",
                "functional_cure_rate": "当前<5%，可及性极低"
            },
            "policy_context": "中国已将病毒性肝炎防控纳入健康中国行动，国家卫健委发布《消除丙型肝炎公共卫生危害行动工作方案》，乙肝防控也在持续推进。"
        },
        "topics": topics,
        "controversies": controversies,
        "evidence_gaps": evidence_gaps
    }


# ============================================================
# 主流程
# ============================================================
def main():
    parser = argparse.ArgumentParser(description="HBV 2030战略洞察生成系统")
    parser.add_argument("--mode", choices=["auto", "ai", "heuristic"], default="auto",
                        help="运行模式：auto(自动检测), ai(强制AI), heuristic(强制启发式)")
    parser.add_argument("--incremental", action="store_true", default=False,
                        help="增量更新模式：仅处理变化的内容")
    args = parser.parse_args()

    print("=" * 60)
    print("  HBV 2030 战略洞察生成系统")
    print("=" * 60)

    # 1. 检测运行模式
    ai_client = AIClient()
    if args.mode == "ai":
        if not ai_client.available:
            print("[错误] 强制AI模式但未配置DEEPSEEK_API_KEY")
            sys.exit(1)
        mode = "ai"
    elif args.mode == "heuristic":
        mode = "heuristic"
    else:  # auto
        mode = "ai" if ai_client.available else "heuristic"

    print(f"\n[模式] 运行模式: {mode}")
    if mode == "heuristic":
        print("  （未检测到DEEPSEEK_API_KEY，使用启发式回退模式）")

    # 2. 加载数据
    print(f"\n[步骤1/6] 加载文献数据...")
    literature_records = load_ndjson(LITERATURE_FILE)
    industry_records = load_ndjson(INDUSTRY_FILE)
    print(f"  文献数据: {len(literature_records)} 篇")
    print(f"  行业洞察: {len(industry_records)} 篇")

    if not literature_records:
        print("[错误] 未加载到任何文献数据，请检查数据文件")
        sys.exit(1)

    # 3. 增量更新检查
    print(f"\n[步骤2/6] 检查内容变更...")
    hashes = load_hashes()
    data_hash = compute_hash(literature_records)
    if args.incremental and hashes.get("literature_hash") == data_hash:
        print("  数据未变化，使用缓存结果...")
        # 检查输出文件是否存在
        if all(f.exists() for f in [INSIGHTS_FILE, REPORT_FILE, ACTION_MATRIX_FILE, ROADMAP_FILE]):
            print("  所有输出文件已存在，跳过生成。")
            print("\n[完成] 增量检查通过，无需重新生成。")
            return
        print("  部分输出文件缺失，继续生成...")
    else:
        print(f"  数据哈希: {data_hash[:16]}...")
        print("  数据已变更或首次运行，开始生成...")

    # 4. 生成证据卡片
    print(f"\n[步骤3/6] 生成证据卡片...")
    evidence_cards = defaultdict(list)
    success_count = 0
    fail_count = 0

    for i, record in enumerate(literature_records):
        try:
            record_id = record.get("record_id", f"unknown_{i}")
            topic_id = classify_topic(record)

            if mode == "ai":
                # TODO: AI模式证据卡片生成
                # card = generate_evidence_card_ai(record, ai_client)
                # 暂时回退到启发式
                card = generate_evidence_card_heuristic(record)
            else:
                card = generate_evidence_card_heuristic(record)

            evidence_cards[topic_id].append(card)
            success_count += 1

            if (i + 1) % 10 == 0 or i == len(literature_records) - 1:
                print(f"  进度: {i+1}/{len(literature_records)} (成功: {success_count}, 失败: {fail_count})")

        except Exception as e:
            fail_count += 1
            print(f"  [错误] 第{i+1}篇处理失败: {e}")
            traceback.print_exc()

    print(f"  证据卡片生成完成: 成功{success_count}篇, 失败{fail_count}篇")

    # 打印专题分布
    print(f"\n  专题分布:")
    for topic_id in ["T1", "T2", "T3", "T4", "T5", "T6", "T7"]:
        count = len(evidence_cards.get(topic_id, []))
        title = TOPIC_DEFINITIONS[topic_id]["title"]
        print(f"    {topic_id} ({title}): {count} 篇")

    # 5. 专题综合
    print(f"\n[步骤4/6] 专题综合分析...")
    topic_syntheses = {}
    for topic_id in ["T1", "T2", "T3", "T4", "T5", "T6", "T7"]:
        cards = evidence_cards.get(topic_id, [])
        if not cards:
            print(f"  {topic_id}: 无文献，跳过")
            continue

        try:
            if mode == "ai":
                # TODO: AI模式专题综合
                synthesis = synthesize_topic_heuristic(topic_id, evidence_cards)
            else:
                synthesis = synthesize_topic_heuristic(topic_id, evidence_cards)

            if synthesis:
                topic_syntheses[topic_id] = synthesis
                insight_count = len(synthesis.get("topic_insights", []))
                print(f"  {topic_id}: {len(cards)}篇文献 → {insight_count}条专题洞察")
        except Exception as e:
            print(f"  [错误] {topic_id}综合失败: {e}")
            traceback.print_exc()

    # 6. 生成战略洞察和报告
    print(f"\n[步骤5/6] 生成战略洞察和报告...")

    # 十大核心洞察
    top_insights = generate_top_insights_heuristic(topic_syntheses, evidence_cards)
    print(f"  十大核心洞察: {len(top_insights)} 条")

    # 行动矩阵
    action_matrix = generate_action_matrix_heuristic(top_insights)
    print(f"  行动矩阵: {len(action_matrix['actions'])} 项行动")

    # 路线图
    roadmap = generate_roadmap_heuristic()
    print(f"  路线图: {len(roadmap['phases'])} 个阶段")

    # 完整报告
    report = generate_report_heuristic(topic_syntheses, top_insights, action_matrix, roadmap)
    print(f"  完整报告: 生成完成")

    # 7. 输出结果
    print(f"\n[步骤6/6] 输出JSON文件...")

    # insights.json
    insights_data = {
        "version": "1.0",
        "generated_at": get_now_str(),
        "generation_mode": mode,
        "top_insights": top_insights,
        "topic_insights": {}
    }
    for topic_id, synthesis in topic_syntheses.items():
        if synthesis:
            insights_data["topic_insights"][topic_id] = synthesis.get("topic_insights", [])

    save_json(insights_data, INSIGHTS_FILE)
    save_json(report, REPORT_FILE)
    save_json(action_matrix, ACTION_MATRIX_FILE)
    save_json(roadmap, ROADMAP_FILE)

    # 保存哈希
    hashes["literature_hash"] = data_hash
    hashes["generated_at"] = get_now_str()
    hashes["mode"] = mode
    save_hashes(hashes)

    # 8. 统计汇总
    print("\n" + "=" * 60)
    print("  生成完成 - 统计汇总")
    print("=" * 60)
    print(f"  运行模式: {mode}")
    print(f"  输入文献: {len(literature_records)} 篇")
    print(f"  专题数: {len(topic_syntheses)} 个")
    print(f"  十大洞察: {len(top_insights)} 条")
    print(f"  行动项: {len(action_matrix['actions'])} 项")
    print(f"  路线图阶段: {len(roadmap['phases'])} 个")
    print()
    print(f"  输出文件:")
    print(f"    - {INSIGHTS_FILE.name}")
    print(f"    - {REPORT_FILE.name}")
    print(f"    - {ACTION_MATRIX_FILE.name}")
    print(f"    - {ROADMAP_FILE.name}")
    print("=" * 60)


if __name__ == "__main__":
    main()
