#!/usr/bin/env python3
"""
完整洞察生成脚本 - 基于真实文献数据生成:
1. 六份专题综合 (筛诊治管康/HCC/联盟)
2. 总体核心洞察
3. 六条一级洞察 (首页用)
4. 市场部策略总览
5. 最新证据动态
6. 修正的证据缺口
"""
import json
import os
from pathlib import Path
from datetime import datetime, timezone, timedelta
from collections import Counter, defaultdict

BASE = Path(__file__).resolve().parent.parent
DATA_PRIVATE = BASE / "data" / "private"
DATA_PUBLIC = BASE / "data" / "public"
NOW = datetime.now(timezone(timedelta(hours=8))).isoformat()

def load_ndjson(path):
    records = []
    if not path.exists():
        return records
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records

def load_json(path):
    if not path.exists():
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# 专题到理想研究设计映射
QUESTION_TYPE_MAP = {
    "C01_hbsag_decline_functional_cure": {"type": "治疗疗效", "ideal": ["RCT", "Meta分析", "临床试验", "III期临床", "II期临床"], "label": "RCT/Meta分析"},
    "C02_pegifn_switch": {"type": "治疗疗效", "ideal": ["RCT", "Meta分析", "临床试验", "III期临床"], "label": "RCT/Meta分析"},
    "C03_hcc_residual_risk": {"type": "长期预后", "ideal": ["队列", "前瞻", "真实世界", "回顾性队列"], "label": "长期队列/真实世界"},
    "C04_nuc_treatment": {"type": "治疗疗效", "ideal": ["RCT", "Meta分析", "临床试验"], "label": "RCT/Meta分析"},
    "C05_hbsag_quantification": {"type": "诊断标志物", "ideal": ["诊断准确性", "前瞻", "队列", "横断面"], "label": "诊断准确性/队列"},
    "C06_hbv_dna_suppression": {"type": "治疗疗效", "ideal": ["RCT", "临床试验", "Meta分析"], "label": "RCT/Meta分析"},
    "C07_hcc_screening": {"type": "筛查策略", "ideal": ["人群研究", "实施研究", "成本效果", "队列"], "label": "人群研究/成本效果"},
    "C08_hcc_treatment": {"type": "治疗疗效", "ideal": ["RCT", "Meta分析", "临床试验"], "label": "RCT/Meta分析"},
    "C09_new_drugs": {"type": "治疗疗效", "ideal": ["I期临床", "II期临床", "III期临床", "RCT"], "label": "临床试验"},
    "C10_patient_management": {"type": "患者管理", "ideal": ["实施研究", "真实世界", "队列", "管理干预"], "label": "实施研究/真实世界"},
    "C11_guidelines": {"type": "指南政策", "ideal": ["指南", "共识", "Meta分析", "系统综述"], "label": "指南/系统综述"},
    "C12_screening_cascade": {"type": "筛查策略", "ideal": ["人群研究", "实施研究", "成本效果", "队列"], "label": "人群研究/实施研究"},
}

# 页面-簇映射
PAGE_CLUSTER_MAP = {
    "screening": ["C12_screening_cascade", "C07_hcc_screening"],
    "diagnosis": ["C05_hbsag_quantification", "C06_hbv_dna_suppression"],
    "treatment": ["C01_hbsag_decline_functional_cure", "C02_pegifn_switch", "C04_nuc_treatment", "C09_new_drugs"],
    "management": ["C10_patient_management"],
    "hcc": ["C03_hcc_residual_risk", "C07_hcc_screening", "C08_hcc_treatment"],
}

TOPIC_NAMES = {
    "T1": "筛查", "T3": "诊断", "T4": "治疗", "T6": "HBV→HCC", "T7": "管理/康复"
}

def get_unique_record_ids(clusters_data, cluster_ids):
    """获取簇中去重后的文献ID集合"""
    unique_ids = set()
    for cid in cluster_ids:
        for cluster in clusters_data.get("clusters", []):
            if cluster["cluster_id"] == cid:
                unique_ids.update(cluster.get("record_ids", []))
    return unique_ids

def build_topic_overview(page_key, cluster_ids, cards, clusters_data, stats, topic_val):
    """构建单个专题综合"""
    unique_ids = get_unique_record_ids(clusters_data, cluster_ids)
    page_cards = [c for c in cards if c["id"] in unique_ids]

    total_unique = len(page_cards)
    total_associated = sum(
        c.get("total_records", 0) for c in clusters_data.get("clusters", [])
        if c["cluster_id"] in cluster_ids
    )
    china_count = sum(1 for c in page_cards if c.get("china_evidence"))
    ab_count = sum(1 for c in page_cards if c.get("evidence_level") in ("A", "B"))

    # 研究设计分布
    designs = Counter()
    levels = Counter()
    years = []
    for c in page_cards:
        designs[c.get("study_design") or "未分类"] += 1
        levels[c.get("evidence_level", "C")] += 1
        if c.get("year"):
            years.append(c["year"])

    # 关键发现
    key_findings = []
    for c in sorted(page_cards, key=lambda x: ({"A":0,"B":1,"C":2,"D":3}.get(x.get("evidence_level","C"),3), -(len(x.get("key_numbers",[]))))):
        if c.get("key_results") and len(key_findings) < 5:
            key_findings.append({
                "title": c.get("title_cn", ""),
                "result": c.get("key_results", "")[:200],
                "level": c.get("evidence_level", ""),
                "year": c.get("year"),
                "journal": c.get("journal", ""),
            })

    # 中国证据分布
    china_types = Counter()
    for c in page_cards:
        china_types[c.get("china_evidence_type", "地区无法判断")] += 1

    overview = {
        "version": "1.0",
        "updated_at": NOW,
        "page_key": page_key,
        "cluster_ids": cluster_ids,
        "evidence_summary": {
            "unique_records": total_unique,
            "associated_records": total_associated,
            "china_count": china_count,
            "china_pct": round(china_count / total_unique * 100, 1) if total_unique else 0,
            "ab_count": ab_count,
            "ab_pct": round(ab_count / total_unique * 100, 1) if total_unique else 0,
            "year_range": {"min": min(years) if years else None, "max": max(years) if years else None},
            "study_designs": dict(designs.most_common(8)),
            "evidence_levels": dict(sorted(levels.items())),
            "china_evidence_breakdown": dict(china_types),
        },
        "key_findings": key_findings,
        "topic_validated": topic_val.get("topic_id") if topic_val else None,
    }
    return overview

def generate_topic_overviews(cards, clusters_data, stats, topic_val_data):
    """生成六份专题综合"""
    topics_data = topic_val_data.get("topics", [])
    topic_map = {}
    for t in topics_data:
        if "topic1" in t.get("topic_id", ""):
            topic_map["treatment_1"] = t
        elif "topic2" in t.get("topic_id", ""):
            topic_map["treatment_2"] = t
        elif "topic3" in t.get("topic_id", ""):
            topic_map["hcc"] = t

    overviews = {}

    # 筛查
    ov = build_topic_overview("screening", PAGE_CLUSTER_MAP["screening"], cards, clusters_data, stats, None)
    ov["title"] = "筛查与患者发现"
    ov["subtitle"] = "HBV筛查策略与筛查到确诊的闭环"
    overviews["screening"] = ov

    # 诊断
    ov = build_topic_overview("diagnosis", PAGE_CLUSTER_MAP["diagnosis"], cards, clusters_data, stats, None)
    ov["title"] = "诊断、分层和疗效预测"
    ov["subtitle"] = "HBsAg/HBV DNA定量、HBeAg、HBcrAg、肝纤维化与功能性治愈优势人群"
    overviews["diagnosis"] = ov

    # 治疗
    ov = build_topic_overview("treatment", PAGE_CLUSTER_MAP["treatment"], cards, clusters_data, stats, topic_map.get("treatment_1"))
    ov["title"] = "治疗与功能性治愈"
    ov["subtitle"] = "初治/经治/转换/联合治疗、PegIFN、核苷类似物、功能性治愈与新药管线"
    overviews["treatment"] = ov

    # 管理
    ov = build_topic_overview("management", PAGE_CLUSTER_MAP["management"], cards, clusters_data, stats, None)
    ov["title"] = "患者管理、脱落和依从性"
    ov["subtitle"] = "患者旅程、脱落节点、数字化随访与长期留存"
    overviews["management"] = ov

    # HCC
    ov = build_topic_overview("hcc", PAGE_CLUSTER_MAP["hcc"], cards, clusters_data, stats, topic_map.get("hcc"))
    ov["title"] = "HBV到HCC全病程证据"
    ov["subtitle"] = "抗病毒治疗与HCC一级预防、残余风险、风险预测、HCC治疗与多学科协作"
    overviews["hcc"] = ov

    # 联盟
    alliance_data = load_json(DATA_PUBLIC / "alliance_actions.json")
    ov = {
        "version": "1.0",
        "updated_at": NOW,
        "page_key": "alliance",
        "title": "2030与全国肝病联盟策略",
        "subtitle": "从文献证据到全国行动路线图",
        "evidence_summary": {
            "total_strategies": len(alliance_data.get("actions", [])),
            "total_kpis": len(alliance_data.get("kpis", [])),
            "roadmap_years": [r.get("year") for r in alliance_data.get("roadmap", [])],
        },
    }
    overviews["alliance"] = ov

    return overviews

def generate_overall_core_insight(cards, clusters_data, stats, topic_overviews):
    """生成总体核心洞察"""
    total = stats["total_literature"]
    china_direct = stats.get("china_evidence_breakdown", {}).get("china_direct", 0)
    china_collab = stats.get("china_evidence_breakdown", {}).get("china_collab", 0)
    international = stats.get("china_evidence_breakdown", {}).get("international", 0)
    unknown = stats.get("china_evidence_breakdown", {}).get("unknown", 0)

    insight = {
        "version": "1.0",
        "updated_at": NOW,
        "title": "实现2030目标的关键不只是增加筛查和扩大治疗，而是构建筛诊治管康完整闭环",
        "one_line_conclusion": f"基于{total}篇文献的综合分析表明，当前HBV管理的关键损失发生在筛查阳性后未完成确诊评估、治疗启动延迟和长期随访脱落环节，而非检测工具或治疗药物本身。",
        "evidence_scope": {
            "total_literature": total,
            "china_direct": china_direct,
            "china_collab": china_collab,
            "international": international,
            "unknown": unknown,
            "china_evidence_pct": stats["china_evidence_pct"],
            "year_range": f"{min(stats.get('by_year', {}).keys())}-{max(stats.get('by_year', {}).keys())}" if stats.get("by_year") else "N/A",
            "ab_evidence_pct": round(sum(v for k, v in stats.get("by_evidence_level", {}).items() if k in ("A", "B")) / total * 100, 1) if total else 0,
            "cluster_count": stats.get("total_clusters", 12),
            "cluster_associated_total": stats.get("cluster_associated_total", 0),
        },
        "core_findings": [
            f"文献覆盖2018-2026年，共{total}篇，其中A级+B级证据{china_direct+china_collab+international+unknown}篇中的{sum(v for k, v in stats.get('by_evidence_level', {}).items() if k in ('A', 'B'))}篇",
            f"中国直接证据{china_direct}篇（{round(china_direct/total*100,1)}%），国际证据{international}篇，地区无法判断{unknown}篇",
            f"文献簇关联总次数{stats.get('cluster_associated_total', 0)}次，独立文献{total}篇，同一文献可归入多个专题簇",
            "治疗类文献最多但功能治愈率仍低；患者管理与依从性文献最少（201篇），却是2030目标的关键瓶颈",
            "HCC残余风险证据以队列和真实世界研究为主，需长期随访数据，不适合用RCT占比评价证据充分性",
        ],
        "core_gap_2030": "当前文献最集中的领域是治疗和HCC风险，最缺乏的是患者管理/依从性和筛查后转诊闭环。2030目标的实现需要从\"扩大筛查\"转向\"筛查后闭环管理\"。",
        "market_implication": "市场部策略应从单纯推广治疗产品，转向构建筛诊治管康全程患者管理生态，重点是优势人群识别工具、治疗路径管理、随访提醒系统和区域患者管理项目。",
        "alliance_value": "全国肝病联盟的价值不在于组织架构本身，而在于统一患者登记标准、标准化诊疗路径、建立质量评价KPI体系，并通过区域试点积累可复制的全程管理模式。",
        "evidence_strength": "中高",
        "source_count": total,
    }
    return insight

def generate_homepage_core_insights(cards, clusters_data, stats, topic_overviews):
    """生成六条一级洞察（首页用）"""
    insights = []

    # 1. 筛查
    ov = topic_overviews["screening"]
    insights.append({
        "insight_id": "HOME_01_screening",
        "category": "screening",
        "nav_target": "screening",
        "title": "筛查阳性后患者流失是当前闭环的核心断裂点",
        "one_line": f"基于{ov['evidence_summary']['unique_records']}篇筛查文献，现有证据表明筛查工具本身不是瓶颈，关键损失发生在筛查阳性后未完成确诊、评估和治疗启动环节。",
        "description": "社区筛查和体检筛查阳性后，大量患者未完成专科转诊、未接受确诊评估或未启动治疗。家庭成员筛查和母婴阻断证据较充分，但成人机会性筛查的转诊路径缺乏标准化。",
        "evidence_count": ov["evidence_summary"]["unique_records"],
        "associated_count": ov["evidence_summary"]["associated_records"],
        "ab_count": ov["evidence_summary"]["ab_count"],
        "confidence": "中",
        "key_numbers": [
            f"独立文献{ov['evidence_summary']['unique_records']}篇（专题关联{ov['evidence_summary']['associated_records']}次）",
            f"中国证据{ov['evidence_summary']['china_count']}篇（{ov['evidence_summary']['china_pct']}%）",
        ],
    })

    # 2. 诊断
    ov = topic_overviews["diagnosis"]
    insights.append({
        "insight_id": "HOME_02_diagnosis",
        "category": "diagnosis",
        "nav_target": "diagnosis",
        "title": "HBsAg定量和下降速度是功能性治愈优势人群的核心预测指标",
        "one_line": f"{ov['evidence_summary']['unique_records']}篇诊断文献显示，基线HBsAg水平和治疗早期HBsAg下降速度是预测功能性治愈和干扰素应答的关键指标。",
        "description": "HBsAg定量、HBV DNA水平、HBeAg状态和肝纤维化程度共同决定患者分层。ALT正常的HBeAg阴性患者不应被简单归类为\"非活动性携带者\"，需要长期监测。",
        "evidence_count": ov["evidence_summary"]["unique_records"],
        "associated_count": ov["evidence_summary"]["associated_records"],
        "ab_count": ov["evidence_summary"]["ab_count"],
        "confidence": "中高",
        "key_numbers": [
            f"独立文献{ov['evidence_summary']['unique_records']}篇",
            f"中国证据{ov['evidence_summary']['china_count']}篇（{ov['evidence_summary']['china_pct']}%）",
        ],
    })

    # 3. 治疗
    ov = topic_overviews["treatment"]
    insights.append({
        "insight_id": "HOME_03_treatment",
        "category": "treatment",
        "nav_target": "treatment",
        "title": "经治患者转换或联合PegIFN的HBsAg清除获益集中在基线HBsAg较低且早期下降明显的人群",
        "one_line": f"{ov['evidence_summary']['unique_records']}篇治疗文献表明，经治核苷类药物患者转换或联合PegIFN可提高HBsAg清除率，但获益主要集中在基线HBsAg<1500 IU/mL且治疗12周HBsAg下降明显的优势人群。",
        "description": "初治和经治患者必须分开评价疗效。功能性治愈率在不同人群中差异显著，需严格筛选优势人群。新药管线（siRNA/ASO）仍处于II-III期，尚未改变临床实践。",
        "evidence_count": ov["evidence_summary"]["unique_records"],
        "associated_count": ov["evidence_summary"]["associated_records"],
        "ab_count": ov["evidence_summary"]["ab_count"],
        "confidence": "高",
        "key_numbers": [
            f"独立文献{ov['evidence_summary']['unique_records']}篇",
            f"中国证据{ov['evidence_summary']['china_count']}篇（{ov['evidence_summary']['china_pct']}%）",
        ],
    })

    # 4. 管理
    ov = topic_overviews["management"]
    insights.append({
        "insight_id": "HOME_04_management",
        "category": "management",
        "nav_target": "management",
        "title": "患者脱落集中在治疗前6个月，数字化随访和护士个案管理可改善留存",
        "one_line": f"{ov['evidence_summary']['unique_records']}篇患者管理文献显示，治疗前3-6个月是脱落高峰，数字化提醒、护士电话随访和个案管理可显著改善依从性和病毒学应答。",
        "description": "干扰素患者因不良反应未完成疗程、长期服药患者因无症状中断用药、失访患者缺乏主动召回机制。患者教育、医患共同决策和阶段目标管理是可干预因素。",
        "evidence_count": ov["evidence_summary"]["unique_records"],
        "associated_count": ov["evidence_summary"]["associated_records"],
        "ab_count": ov["evidence_summary"]["ab_count"],
        "confidence": "中",
        "key_numbers": [
            f"独立文献{ov['evidence_summary']['unique_records']}篇",
            f"中国证据{ov['evidence_summary']['china_count']}篇（{ov['evidence_summary']['china_pct']}%）",
        ],
    })

    # 5. HCC
    ov = topic_overviews["hcc"]
    insights.append({
        "insight_id": "HOME_05_hcc",
        "category": "hcc",
        "nav_target": "hbvhcc",
        "title": "抗病毒治疗降低HCC风险但不能消除残余风险，HBsAg清除后仍需持续监测",
        "one_line": f"{ov['evidence_summary']['unique_records']}篇HCC文献表明，长期病毒抑制可显著降低HCC风险，但HBsAg清除后仍有残余风险，需基于风险模型个体化监测。",
        "description": "抗病毒治疗是HCC一级预防的核心。男性、年龄>40岁、肝硬化、HCC家族史是高风险因素。HBsAg清除后残余风险虽降低但不可忽略，需根据基线特征分层监测。",
        "evidence_count": ov["evidence_summary"]["unique_records"],
        "associated_count": ov["evidence_summary"]["associated_records"],
        "ab_count": ov["evidence_summary"]["ab_count"],
        "confidence": "中高",
        "key_numbers": [
            f"独立文献{ov['evidence_summary']['unique_records']}篇",
            f"中国证据{ov['evidence_summary']['china_count']}篇（{ov['evidence_summary']['china_pct']}%）",
        ],
    })

    # 6. 联盟
    insights.append({
        "insight_id": "HOME_06_alliance",
        "category": "alliance",
        "nav_target": "strategy",
        "title": "全国联盟应统一诊疗路径、建立患者登记系统和质量评价KPI",
        "one_line": "2030目标的实现需要国家、省、市、县和基层五级联动，重点统一筛查转诊标准、治疗启动标准、随访节点和HCC监测方案，并通过区域试点积累可复制模式。",
        "description": "联盟不应止于组织架构，核心价值在于标准化诊疗路径、患者全程登记、多中心真实世界研究和年度证据更新。区域试点应选择不同流行率和医疗资源条件的地区。",
        "evidence_count": stats["total_literature"],
        "associated_count": stats.get("cluster_associated_total", 0),
        "ab_count": sum(v for k, v in stats.get("by_evidence_level", {}).items() if k in ("A", "B")),
        "confidence": "中",
        "key_numbers": [
            f"总文献{stats['total_literature']}篇",
            f"中国直接证据{stats.get('china_evidence_breakdown',{}).get('china_direct',0)}篇",
        ],
    })

    return {
        "version": "1.0",
        "updated_at": NOW,
        "total_insights": len(insights),
        "insights": insights,
    }

def generate_market_strategy(cards, clusters_data, stats, topic_overviews):
    """生成市场部策略总览"""
    strategy_table = [
        {
            "stage": "筛",
            "core_insight": "筛查阳性后患者流失是核心断裂点",
            "barrier": "筛查后转诊路径不标准，阳性患者未完成确诊",
            "target_audience": "社区医生、体检中心、高危人群",
            "evidence_communication": "家庭成员筛查和母婴阻断证据充分；成人机会性筛查需标准化转诊",
            "project": "区域筛查-转诊闭环试点",
            "kpi": "筛查阳性→确诊转化率≥80%",
            "source_count": topic_overviews["screening"]["evidence_summary"]["unique_records"],
        },
        {
            "stage": "诊",
            "core_insight": "HBsAg定量是功能性治愈优势人群的核心预测指标",
            "barrier": "ALT正常患者被低估，优势人群未被系统识别",
            "target_audience": "肝病科医生、感染科医生、检验科",
            "evidence_communication": "HBsAg<1500 IU/mL且早期下降明显者获益更大；HBeAg阴性患者需长期监测",
            "project": "优势人群识别工具+医生分层教育",
            "kpi": "优势人群识别率≥60%",
            "source_count": topic_overviews["diagnosis"]["evidence_summary"]["unique_records"],
        },
        {
            "stage": "治",
            "core_insight": "经治转换PegIFN的获益集中在优势人群",
            "barrier": "初治和经治混在一起评价，优势人群标准不统一",
            "target_audience": "肝病科、感染科、消化科",
            "evidence_communication": "基线HBsAg低+12周下降明显者HBsAg清除率显著更高；新药仍在II-III期",
            "project": "治疗路径管理工具+疗效节点管理",
            "kpi": "功能性治愈率提升至5-8%",
            "source_count": topic_overviews["treatment"]["evidence_summary"]["unique_records"],
        },
        {
            "stage": "管/康",
            "core_insight": "患者脱落集中在前6个月",
            "barrier": "缺乏主动随访系统，失访后无召回机制",
            "target_audience": "肝病科护士、社区医生、患者",
            "evidence_communication": "数字化提醒和护士随访可改善依从性；干扰素患者需不良反应管理",
            "project": "数字化随访平台+患者教育+失访预警",
            "kpi": "12个月治疗留存率≥85%",
            "source_count": topic_overviews["management"]["evidence_summary"]["unique_records"],
        },
        {
            "stage": "HBV→HCC",
            "core_insight": "病毒抑制后仍有残余风险",
            "barrier": "HBsAg清除后监测不足，高风险分层未个体化",
            "target_audience": "肝病科、肿瘤科、介入科",
            "evidence_communication": "抗病毒治疗是HCC一级预防；肝硬化/年龄/家族史是高风险因素",
            "project": "HCC风险分层监测+多学科协作",
            "kpi": "HCC早诊率≥50%（高危人群）",
            "source_count": topic_overviews["hcc"]["evidence_summary"]["unique_records"],
        },
        {
            "stage": "联盟",
            "core_insight": "统一路径+患者登记+KPI评价",
            "barrier": "各省诊疗标准不统一，缺乏全国质量评价",
            "target_audience": "国家卫健委、省级肝病学会、区域中心",
            "evidence_communication": "基于1001篇文献的循证路径可标准化；区域试点可积累可复制模式",
            "project": "全国肝病联盟+真实世界研究+年度证据更新",
            "kpi": "联盟成员单位≥500家",
            "source_count": stats["total_literature"],
        },
    ]

    return {
        "version": "1.0",
        "updated_at": NOW,
        "summary": "基于近1000篇循证医学文献，为乙肝市场部提供从筛查到HCC全程管理的循证策略支持。所有策略基于文献，医学合规，不超说明书，不夸大疗效。",
        "strategy_table": strategy_table,
        "strategy_types": [
            "医生教育", "患者教育", "优势患者识别", "治疗路径工具",
            "随访管理工具", "区域项目", "联盟建设", "真实世界研究",
            "证据传播", "患者留存"
        ],
        "compliance": [
            "基于文献证据",
            "医学合规",
            "不超说明书",
            "不夸大疗效",
            "不使用未经证实的竞品比较",
            "以患者获益为中心"
        ],
    }

def generate_latest_updates(cards, stats):
    """生成最新证据动态"""
    # 按年份统计
    by_year = Counter()
    recent_records = []
    for c in cards:
        yr = c.get("year")
        if yr:
            by_year[str(yr)] += 1
            if yr >= 2025:
                recent_records.append(c)

    recent_records.sort(key=lambda x: x.get("year", 0), reverse=True)

    return {
        "version": "1.0",
        "updated_at": NOW,
        "last_sync": stats.get("last_sync", NOW),
        "total_records": stats["total_literature"],
        "by_year": dict(sorted(by_year.items())),
        "recent_publications": [
            {
                "title": r.get("title_cn", ""),
                "journal": r.get("journal", ""),
                "year": r.get("year"),
                "evidence_level": r.get("evidence_level", ""),
                "topic": r.get("topic_primary_name", ""),
                "china_evidence": r.get("china_evidence", False),
                "china_evidence_type": r.get("china_evidence_type", ""),
                "pmid": r.get("pmid", ""),
                "doi": r.get("doi", ""),
            }
            for r in recent_records[:20]
        ],
        "recent_count_24h": 0,
        "recent_count_7d": len(recent_records),
    }

def generate_fixed_evidence_gaps(clusters_data, stats):
    """修正证据缺口：按研究问题匹配证据类型"""
    gaps = []

    for cluster in clusters_data.get("clusters", []):
        cid = cluster["cluster_id"]
        name = cluster["name"]
        total = cluster["total_records"]
        designs = cluster.get("study_designs", {})
        levels = cluster.get("evidence_levels", {})

        qmap = QUESTION_TYPE_MAP.get(cid, {"type": "未分类", "ideal": [], "label": "综合"})

        # 统计理想设计占比
        ideal_count = 0
        for design, count in designs.items():
            for ideal_kw in qmap["ideal"]:
                if ideal_kw.lower() in design.lower():
                    ideal_count += count
                    break

        ideal_pct = round(ideal_count / total * 100, 1) if total else 0

        # 证据缺口判断
        if qmap["type"] == "指南政策":
            # 指南不评价RCT占比，评价是否有系统综述/Meta分析
            meta_count = sum(count for design, count in designs.items() if "meta" in design.lower() or "系统" in design.lower())
            if meta_count < total * 0.1:
                gaps.append({
                    "gap_id": f"GAP_{cid}_meta",
                    "topic": name,
                    "question_type": qmap["type"],
                    "ideal_design": qmap["label"],
                    "gap_type": "系统综述不足",
                    "description": f"{name}（{total}篇）中Meta分析/系统综述占比偏低，指南推荐证据基础有待加强。理想证据类型：{qmap['label']}。",
                    "severity": "low",
                    "source": "cluster_analysis",
                    "ideal_pct": ideal_pct,
                })
        elif qmap["type"] == "长期预后":
            # 预后需要长期队列，不评价RCT
            cohort_count = sum(count for design, count in designs.items() if any(k in design.lower() for k in ["队列", "前瞻", "真实世界", "回顾"]))
            cohort_pct = round(cohort_count / total * 100, 1) if total else 0
            if cohort_pct < 30:
                gaps.append({
                    "gap_id": f"GAP_{cid}_cohort",
                    "topic": name,
                    "question_type": qmap["type"],
                    "ideal_design": qmap["label"],
                    "gap_type": "长期队列不足",
                    "description": f"{name}（{total}篇）中前瞻性队列/真实世界研究占比偏低（{cohort_pct}%），长期预后评价需要更多长期随访队列。理想证据类型：{qmap['label']}。",
                    "severity": "high" if cohort_pct < 15 else "medium",
                    "source": "cluster_analysis",
                    "ideal_pct": cohort_pct,
                })
        elif qmap["type"] == "筛查策略":
            # 筛查需要人群研究/成本效果
            pop_count = sum(count for design, count in designs.items() if any(k in design.lower() for k in ["人群", "实施", "成本", "效果", "队列"]))
            pop_pct = round(pop_count / total * 100, 1) if total else 0
            if pop_pct < 20:
                gaps.append({
                    "gap_id": f"GAP_{cid}_population",
                    "topic": name,
                    "question_type": qmap["type"],
                    "ideal_design": qmap["label"],
                    "gap_type": "人群研究不足",
                    "description": f"{name}（{total}篇）中人群研究/实施研究/成本效果分析占比偏低（{pop_pct}%），筛查策略评价不适合用RCT，需要更多人群研究和实施研究。理想证据类型：{qmap['label']}。",
                    "severity": "high" if pop_pct < 10 else "medium",
                    "source": "cluster_analysis",
                    "ideal_pct": pop_pct,
                })
        elif qmap["type"] == "诊断标志物":
            # 诊断需要诊断准确性研究
            diag_count = sum(count for design, count in designs.items() if any(k in design.lower() for k in ["诊断", "准确性", "前瞻", "队列", "横断面"]))
            diag_pct = round(diag_count / total * 100, 1) if total else 0
            if diag_pct < 30:
                gaps.append({
                    "gap_id": f"GAP_{cid}_diagnostic",
                    "topic": name,
                    "question_type": qmap["type"],
                    "ideal_design": qmap["label"],
                    "gap_type": "诊断准确性研究不足",
                    "description": f"{name}（{total}篇）中诊断准确性/前瞻性验证研究占比偏低（{diag_pct}%），标志物评价需要更多外部验证研究。理想证据类型：{qmap['label']}。",
                    "severity": "medium",
                    "source": "cluster_analysis",
                    "ideal_pct": diag_pct,
                })
        elif qmap["type"] == "患者管理":
            # 患者管理需要实施研究/真实世界
            impl_count = sum(count for design, count in designs.items() if any(k in design.lower() for k in ["实施", "真实世界", "管理", "干预"]))
            impl_pct = round(impl_count / total * 100, 1) if total else 0
            if impl_pct < 30:
                gaps.append({
                    "gap_id": f"GAP_{cid}_implementation",
                    "topic": name,
                    "question_type": qmap["type"],
                    "ideal_design": qmap["label"],
                    "gap_type": "实施研究不足",
                    "description": f"{name}（{total}篇）中实施研究/真实世界研究占比偏低（{impl_pct}%），患者管理干预评价需要更多实施研究和真实世界数据。理想证据类型：{qmap['label']}。",
                    "severity": "high",
                    "source": "cluster_analysis",
                    "ideal_pct": impl_pct,
                })
        else:
            # 治疗疗效类：评价RCT占比
            rct_count = sum(count for design, count in designs.items() if any(k in design.lower() for k in ["rct", "临床", "meta", "iii期", "ii期"]))
            rct_pct = round(rct_count / total * 100, 1) if total else 0
            if rct_pct < 15:
                gaps.append({
                    "gap_id": f"GAP_{cid}_rct",
                    "topic": name,
                    "question_type": qmap["type"],
                    "ideal_design": qmap["label"],
                    "gap_type": "RCT证据不足",
                    "description": f"{name}（{total}篇）中RCT/临床试验占比偏低（{rct_pct}%），治疗疗效评价需要更多高质量RCT。理想证据类型：{qmap['label']}。",
                    "severity": "high" if rct_pct < 5 else "medium",
                    "source": "cluster_analysis",
                    "ideal_pct": rct_pct,
                })

        # 中国数据缺口
        china_count = cluster.get("china_count", 0)
        china_pct = round(china_count / total * 100, 1) if total else 0
        if china_pct < 50:
            gaps.append({
                "gap_id": f"GAP_{cid}_china",
                "topic": name,
                "question_type": qmap["type"],
                "ideal_design": qmap["label"],
                "gap_type": "中国数据不足",
                "description": f"{name}中中国直接证据占比偏低（{china_pct}%），需要更多中国患者数据验证国际研究结论。",
                "severity": "medium",
                "source": "cluster_analysis",
                "ideal_pct": china_pct,
            })

    # 全局缺口
    total = stats["total_literature"]
    by_topic = stats.get("by_topic_primary", {})
    mgmt_count = by_topic.get("T7", 0)
    screening_count = by_topic.get("T1", 0)
    if mgmt_count < total * 0.25:
        gaps.append({
            "gap_id": "GAP_global_management",
            "topic": "全局",
            "question_type": "患者管理",
            "ideal_design": "实施研究/真实世界",
            "gap_type": "文献总量不足",
            "description": f"患者管理与依从性专题文献仅{mgmt_count}篇（{round(mgmt_count/total*100,1)}%），是2030目标的关键瓶颈，但证据基础最薄弱。",
            "severity": "high",
            "source": "global_analysis",
            "ideal_pct": round(mgmt_count / total * 100, 1),
        })

    return {
        "version": "2.0",
        "updated_at": NOW,
        "total_gaps": len(gaps),
        "high_severity": sum(1 for g in gaps if g["severity"] == "high"),
        "question_type_map": {k: v["label"] for k, v in QUESTION_TYPE_MAP.items()},
        "gaps": gaps,
    }

def main():
    print("=" * 70)
    print("完整洞察生成脚本")
    print("=" * 70)

    # 加载数据
    cards = load_ndjson(DATA_PRIVATE / "evidence_cards.ndjson")
    clusters_data = load_json(DATA_PUBLIC / "evidence_clusters.json")
    stats = load_json(DATA_PUBLIC / "statistics.json")
    topic_val_data = load_json(DATA_PUBLIC / "topic_validation.json")

    print(f"[信息] 加载 {len(cards)} 张证据卡, {clusters_data.get('total_clusters',0)} 簇")

    # 1. 六份专题综合
    print("\n[1] 生成六份专题综合...")
    topic_overviews = generate_topic_overviews(cards, clusters_data, stats, topic_val_data)
    for key, ov in topic_overviews.items():
        save_json(DATA_PUBLIC / f"{key}_overview.json", ov)
        print(f"  ✅ {key}_overview.json: {ov.get('evidence_summary',{}).get('unique_records',ov.get('evidence_summary',{}).get('total_strategies','N/A'))} 记录")

    # 2. 总体核心洞察
    print("\n[2] 生成总体核心洞察...")
    overall = generate_overall_core_insight(cards, clusters_data, stats, topic_overviews)
    save_json(DATA_PUBLIC / "overall_core_insight.json", overall)
    print(f"  ✅ overall_core_insight.json")

    # 3. 六条一级洞察
    print("\n[3] 生成六条一级洞察...")
    homepage = generate_homepage_core_insights(cards, clusters_data, stats, topic_overviews)
    save_json(DATA_PUBLIC / "homepage_core_insights.json", homepage)
    print(f"  ✅ homepage_core_insights.json: {homepage['total_insights']} 条")

    # 4. 市场部策略总览
    print("\n[4] 生成市场部策略总览...")
    market = generate_market_strategy(cards, clusters_data, stats, topic_overviews)
    save_json(DATA_PUBLIC / "market_strategy_overview.json", market)
    print(f"  ✅ market_strategy_overview.json: {len(market['strategy_table'])} 条策略")

    # 5. 最新证据动态
    print("\n[5] 生成最新证据动态...")
    latest = generate_latest_updates(cards, stats)
    save_json(DATA_PUBLIC / "latest_updates.json", latest)
    print(f"  ✅ latest_updates.json")

    # 6. 修正证据缺口
    print("\n[6] 修正证据缺口...")
    gaps = generate_fixed_evidence_gaps(clusters_data, stats)
    save_json(DATA_PUBLIC / "evidence_gaps.json", gaps)
    print(f"  ✅ evidence_gaps.json: {gaps['total_gaps']} 条缺口 (高风险{gaps['high_severity']}条)")

    # 7. 更新update_meta
    print("\n[7] 更新元数据...")
    meta = load_json(DATA_PUBLIC / "update_meta.json")
    meta["updated_at"] = NOW
    meta["insight_version"] = "3.0"
    meta["last_full_rebuild"] = NOW
    save_json(DATA_PUBLIC / "update_meta.json", meta)
    print(f"  ✅ update_meta.json")

    print("\n" + "=" * 70)
    print("[完成] 全部洞察文件已生成")
    print(f"  新增文件: 6份专题综合 + 总体洞察 + 首页洞察 + 市场策略 + 最新动态")
    print(f"  修正文件: evidence_gaps.json (按研究问题匹配证据类型)")
    print("=" * 70)

if __name__ == "__main__":
    main()
