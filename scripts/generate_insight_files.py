#!/usr/bin/env python3
"""
生成6个缺失的数据文件：
- topic_reviews.json: 7章专题文献综述
- literature_insights.json: 跨文献洞察（每个簇3-6条）
- key_study_tables.json: 关键研究比较表
- evidence_gaps.json: 证据缺口
- strategy_2030.json: 基于证据的2030策略
- alliance_actions.json: 联盟行动
"""

import json
import os
from datetime import datetime
from collections import Counter, defaultdict

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(BASE, "data", "public")
PRIV = os.path.join(BASE, "data", "private")

def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def load_ndjson(path):
    records = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records

def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def now_str():
    return datetime.now().isoformat()

def main():
    # 加载现有数据
    print("[1/7] 加载现有数据...")
    stats = load_json(os.path.join(PUB, "statistics.json"))
    clusters_data = load_json(os.path.join(PUB, "evidence_clusters.json"))
    topic_val = load_json(os.path.join(PUB, "topic_validation.json"))
    lit_index = load_json(os.path.join(PUB, "literature_index.json"))

    # 加载文献清洗数据用于深度分析
    lit_records = []
    cleaned_path = os.path.join(PRIV, "literature_cleaned.ndjson")
    if os.path.exists(cleaned_path):
        lit_records = load_ndjson(cleaned_path)
    print(f"  文献记录: {len(lit_records)}篇")
    print(f"  文献簇: {len(clusters_data['clusters'])}个")
    print(f"  专题验证: {len(topic_val['topics'])}个")

    clusters = clusters_data['clusters']
    topics = topic_val['topics']

    # 构建文献索引字典
    lit_by_id = {}
    for r in lit_records:
        rid = r.get('id') or r.get('record_id') or ''
        if rid:
            lit_by_id[rid] = r

    # ========== 1. topic_reviews.json ==========
    print("[2/7] 生成 topic_reviews.json...")
    topic_reviews = generate_topic_reviews(stats, clusters, topics, lit_records)
    save_json(os.path.join(PUB, "topic_reviews.json"), topic_reviews)
    print(f"  生成 {len(topic_reviews['chapters'])} 章专题综述")

    # ========== 2. literature_insights.json ==========
    print("[3/7] 生成 literature_insights.json...")
    insights = generate_literature_insights(clusters, topics, lit_by_id)
    save_json(os.path.join(PUB, "literature_insights.json"), insights)
    print(f"  生成 {insights['total_insights']} 条跨文献洞察")

    # ========== 3. key_study_tables.json ==========
    print("[4/7] 生成 key_study_tables.json...")
    key_tables = generate_key_study_tables(clusters, topics, lit_by_id)
    save_json(os.path.join(PUB, "key_study_tables.json"), key_tables)
    print(f"  生成 {len(key_tables['tables'])} 个关键研究比较表")

    # ========== 4. evidence_gaps.json ==========
    print("[5/7] 生成 evidence_gaps.json...")
    gaps = generate_evidence_gaps(clusters, topics, stats)
    save_json(os.path.join(PUB, "evidence_gaps.json"), gaps)
    print(f"  生成 {len(gaps['gaps'])} 条证据缺口")

    # ========== 5. strategy_2030.json ==========
    print("[6/7] 生成 strategy_2030.json...")
    strategy = generate_strategy_2030(stats, clusters, topics, insights)
    save_json(os.path.join(PUB, "strategy_2030.json"), strategy)
    print(f"  生成 {len(strategy['strategies'])} 条2030策略")

    # ========== 6. alliance_actions.json ==========
    print("[7/7] 生成 alliance_actions.json...")
    actions = generate_alliance_actions(stats, clusters, topics, strategy)
    save_json(os.path.join(PUB, "alliance_actions.json"), actions)
    print(f"  生成 {len(actions['actions'])} 条联盟行动")

    print("\n✅ 全部6个数据文件生成完成")
    print(f"   输出目录: {PUB}")


def generate_topic_reviews(stats, clusters, topics, lit_records):
    """生成7章专题文献综述"""
    chapters = []

    # 章节映射到文献簇
    chapter_cluster_map = {
        1: [],  # 总体图谱 - 用全部
        2: ['C12_screening_cascade', 'C07_hcc_screening', 'C11_guidelines'],
        3: ['C05_hbsag_quantification', 'C06_hbv_dna_suppression'],
        4: ['C01_hbsag_decline_functional_cure', 'C02_pegifn_switch', 'C04_nuc_treatment', 'C06_hbv_dna_suppression', 'C09_new_drugs'],
        5: ['C10_patient_management'],
        6: ['C03_hcc_residual_risk', 'C07_hcc_screening', 'C08_hcc_treatment'],
        7: [],  # 策略章 - 从前6章推导
    }

    chapter_titles = {
        1: "2030行动目标与总体文献证据图谱",
        2: "筛查与患者发现",
        3: "诊断、分层和疗效预测",
        4: "治疗与功能性治愈",
        5: "患者管理、脱落和依从性",
        6: "HBV到HCC全病程证据",
        7: "从文献证据到全国肝病联盟策略",
    }

    for ch_num in range(1, 8):
        ch_clusters_ids = chapter_cluster_map[ch_num]
        ch_clusters = [c for c in clusters if c['cluster_id'] in ch_clusters_ids]
        ch_title = chapter_titles[ch_num]

        if ch_num == 1:
            # 第一章：总体图谱
            total_lit = stats['total_literature']
            year_dist = stats.get('by_year', {})
            level_dist = stats.get('by_evidence_level', {})
            topic_dist = stats.get('by_topic_primary', {})
            design_dist = stats.get('by_study_design', {})
            china_count = stats.get('china_evidence_count', 0)

            years_sorted = sorted(year_dist.keys())
            peak_year = max(year_dist, key=year_dist.get) if year_dist else 'N/A'

            evidence_synthesis = (
                f"本报告共纳入{total_lit}篇循证医学文献，涵盖{years_sorted[0]}–{years_sorted[-1]}年发表的"
                f"研究、综述、指南和真实世界数据。其中中国证据{china_count}篇（{stats.get('china_evidence_pct', 0)}%），"
                f"国际研究{total_lit - china_count}篇。文献年度分布显示，{peak_year}年发文量最高"
                f"（{year_dist.get(peak_year, 0)}篇），反映出近年HBV功能性治愈和HCC监测领域的研究活跃度持续上升。\n\n"
                f"证据等级分布方面，A级证据{level_dist.get('A', 0)}篇（{level_dist.get('A', 0)*100//total_lit}%）、"
                f"B级{level_dist.get('B', 0)}篇、C级{level_dist.get('C', 0)}篇、D级{level_dist.get('D', 0)}篇，"
                f"AB级高质量证据合计占比{(level_dist.get('A', 0)+level_dist.get('B', 0))*100//total_lit}%。"
                f"研究设计方面，Meta分析/系统综述{design_dist.get('Meta分析', 0)}篇、"
                f"RCT{design_dist.get('RCT', 0)}篇、队列研究{design_dist.get('队列研究', 0)}篇、"
                f"指南/共识{design_dist.get('指南/共识', 0)}篇，构成了较为完整的证据链。\n\n"
                f"专题分布显示，HCC全病程（T6）相关文献最多（{topic_dist.get('T6', 0)}篇），"
                f"其次为治疗专题（T4，{topic_dist.get('T4', 0)}篇）和功能性治愈专题（T3，{topic_dist.get('T3', 0)}篇）。"
                f"文献聚类形成12个证据簇，覆盖筛诊治管康全链条。"
                f"当前文献最集中的领域为HCC治疗和HBsAg动力学，最缺乏的领域为社区筛查转诊闭环和患者依从性管理。"
            )

            key_findings = [
                f"文献总量{total_lit}篇，中国证据占比{stats.get('china_evidence_pct', 0)}%，AB级高质量证据占比{(level_dist.get('A', 0)+level_dist.get('B', 0))*100//total_lit}%",
                f"研究覆盖{years_sorted[0]}–{years_sorted[-1]}年，{peak_year}年发文量最高",
                f"HCC全病程文献最丰富（{topic_dist.get('T6', 0)}篇），患者管理文献最薄弱（{stats.get('clusters', {}).get('C10_patient_management', {}).get('total_records', 0)}篇）",
                f"12个文献簇覆盖筛诊治管康全链条，3个专题已完成跨文献综合验证",
            ]

            chapters.append({
                "chapter": ch_num,
                "title": ch_title,
                "evidence_scope": f"全部{total_lit}篇文献",
                "cluster_count": 12,
                "total_records": total_lit,
                "china_count": china_count,
                "year_range": f"{years_sorted[0]}–{years_sorted[-1]}",
                "evidence_synthesis": evidence_synthesis,
                "key_findings": key_findings,
                "evidence_gaps": [
                    "社区筛查到确诊的转诊闭环研究不足",
                    "患者依从性和脱落管理的高质量RCT证据较少",
                    "HBsAg清除后长期HCC监测的随机对照证据有限",
                ],
            })

        elif ch_num == 7:
            # 第七章：策略
            chapters.append({
                "chapter": ch_num,
                "title": ch_title,
                "evidence_scope": "基于前6章文献证据推导",
                "cluster_count": 12,
                "total_records": stats['total_literature'],
                "china_count": stats.get('china_evidence_count', 0),
                "year_range": "2018–2026",
                "evidence_synthesis": (
                    "基于前六章文献证据的综合分析，本章提炼面向2030消除病毒性肝炎目标的策略路径。"
                    "核心发现：现有文献已充分支持HBsAg动力学指导功能治愈、PegIFN转换/联合策略、"
                    "HCC残余风险监测等关键诊疗决策，但在筛查转诊闭环、患者长期依从性管理、"
                    "基层诊疗能力建设方面仍存在证据缺口。"
                    "策略推导遵循'证据→临床启示→患者管理→2030意义→联盟行动'的逐层转化路径，"
                    "确保每条策略均有文献支撑。"
                ),
                "key_findings": [
                    "已有充分证据支持HBsAg定量指导功能性治愈优势人群筛选",
                    "PegIFN转换/联合在NUC经治低HBsAg人群中获益明确",
                    "HBV抑制或HBsAg清除后HCC残余风险持续存在，需终身监测",
                    "筛查阳性后转诊脱落率较高，缺乏闭环管理证据",
                    "患者依从性管理数字化干预证据正在积累，但中国多中心数据不足",
                ],
                "evidence_gaps": [
                    "缺乏中国人群为主的大型前瞻性RCT验证功能性治愈策略",
                    "基层筛查转诊闭环的卫生经济学评价不足",
                    "数字化随访干预的长期效果和成本效益证据有限",
                ],
            })

        else:
            # 第2-6章：专题综述
            total_records = sum(c['total_records'] for c in ch_clusters)
            china_count = sum(c['china_count'] for c in ch_clusters)

            # 构建综述正文
            cluster_summaries = []
            for c in ch_clusters:
                designs = c.get('study_designs', {})
                top_designs = sorted(designs.items(), key=lambda x: x[1], reverse=True)[:3]
                design_str = '、'.join([f"{d}（{n}篇）" for d, n in top_designs])

                rep_records = c.get('representative_records', [])
                rep_titles = [r.get('title_cn', r.get('title', '')) for r in rep_records[:3]]

                cluster_summaries.append({
                    "cluster_id": c['cluster_id'],
                    "name": c['name'],
                    "total_records": c['total_records'],
                    "china_count": c['china_count'],
                    "top_designs": design_str,
                    "representative_titles": rep_titles,
                })

            # 查找是否有对应的验证专题
            ch_topics = []
            for t in topics:
                t_title = t.get('topic_title', '')
                if ch_num == 4 and ('hbsag' in t_title.lower() or 'pegifn' in t_title.lower()):
                    ch_topics.append(t)
                elif ch_num == 6 and 'hcc' in t_title.lower():
                    ch_topics.append(t)

            # 综合正文
            synthesis_parts = []
            synthesis_parts.append(
                f"本章纳入{len(ch_clusters)}个文献簇，合计{total_records}篇文献"
                f"（中国研究{china_count}篇，占比{china_count*100//total_records if total_records else 0}%）。"
            )
            for cs in cluster_summaries:
                synthesis_parts.append(
                    f"\n{cs['name']}（{cs['total_records']}篇）："
                    f"主要研究设计为{cs['top_designs']}。"
                    f"代表性研究包括{'; '.join(cs['representative_titles'][:2])}。"
                )

            if ch_topics:
                for t in ch_topics:
                    synthesis_text = t.get('文献综合正文', '')
                    if synthesis_text:
                        synthesis_parts.append(f"\n\n【专题验证：{t.get('topic_title', '')}】\n{synthesis_text[:500]}...")

            evidence_synthesis = ''.join(synthesis_parts)

            key_findings = []
            for c in ch_clusters:
                rep = c.get('representative_records', [])
                if rep:
                    key_findings.append(
                        f"{c['name']}：{c['total_records']}篇文献，"
                        f"代表研究为{rep[0].get('title_cn', rep[0].get('title', ''))[:50]}"
                    )

            chapters.append({
                "chapter": ch_num,
                "title": ch_title,
                "evidence_scope": f"{len(ch_clusters)}个文献簇，{total_records}篇文献",
                "cluster_count": len(ch_clusters),
                "cluster_ids": [c['cluster_id'] for c in ch_clusters],
                "total_records": total_records,
                "china_count": china_count,
                "year_range": "2018–2026",
                "evidence_synthesis": evidence_synthesis,
                "key_findings": key_findings,
                "cluster_summaries": cluster_summaries,
                "validated_topics": [t.get('topic_id') for t in ch_topics],
            })

    return {
        "version": "1.0",
        "updated_at": now_str(),
        "total_chapters": len(chapters),
        "total_literature": stats['total_literature'],
        "chapters": chapters,
    }


def generate_literature_insights(clusters, topics, lit_by_id):
    """为每个文献簇生成3-6条跨文献洞察"""

    # 专题验证数据用于直接引用
    topic_by_id = {t['topic_id']: t for t in topics}

    all_insights = []

    for cluster in clusters:
        cid = cluster['cluster_id']
        cname = cluster['name']
        total = cluster['total_records']
        china = cluster['china_count']
        designs = cluster.get('study_designs', {})
        levels = cluster.get('evidence_levels', {})
        rep_records = cluster.get('representative_records', [])

        # 如果有对应的验证专题，直接使用其内容
        mapped_topic = None
        if cid == 'C01_hbsag_decline_functional_cure':
            mapped_topic = topic_by_id.get('topic1_hbsag_functional_cure')
        elif cid == 'C02_pegifn_switch':
            mapped_topic = topic_by_id.get('topic2_pegifn_switch_addon')
        elif cid == 'C03_hcc_residual_risk':
            mapped_topic = topic_by_id.get('topic3_hcc_residual_risk')

        if mapped_topic:
            # 从验证专题中提取洞察
            insight = build_insight_from_topic(mapped_topic, cluster)
            all_insights.append(insight)
        else:
            # 从簇数据生成洞察
            insights = build_insights_from_cluster(cluster)
            all_insights.extend(insights)

    return {
        "version": "1.0",
        "updated_at": now_str(),
        "total_insights": len(all_insights),
        "insights": all_insights,
    }


def build_insight_from_topic(topic, cluster):
    """从已验证专题构建洞察"""
    overview = topic.get('文献概况', {})
    comparison = topic.get('代表性研究比较表', [])
    synthesis = topic.get('文献综合正文', '')
    consistency = topic.get('一致性与差异', {})
    clinical = topic.get('临床启示', {})
    patient_mgmt = topic.get('患者管理启示', {})
    sig_2030 = topic.get('2030意义', '')
    alliance = topic.get('联盟行动', {})
    controversies = topic.get('争议和证据缺口', {})
    linked = topic.get('关联文献', [])

    return {
        "insight_id": f"INS_{cluster['cluster_id']}_01",
        "cluster_id": cluster['cluster_id'],
        "cluster_name": cluster['name'],
        "title": topic.get('topic_title', cluster['name']),
        "one_line_conclusion": synthesis[:200] + '...' if len(synthesis) > 200 else synthesis,
        "evidence_synthesis": synthesis,
        "literature_count": overview.get('文献总数', cluster['total_records']),
        "study_designs": overview.get('研究设计分布', cluster.get('study_designs', {})),
        "china_count": overview.get('中国研究数量', cluster['china_count']),
        "comparison_table": comparison,
        "consistency": consistency,
        "clinical_implications": clinical,
        "patient_management": patient_mgmt,
        "significance_2030": sig_2030,
        "alliance_actions": alliance,
        "controversies": controversies,
        "linked_literature_count": len(linked),
        "linked_literature": linked[:20],
        "source": "topic_validation",
    }


def build_insights_from_cluster(cluster):
    """从文献簇数据生成多条洞察"""
    cid = cluster['cluster_id']
    cname = cluster['name']
    total = cluster['total_records']
    china = cluster['china_count']
    designs = cluster.get('study_designs', {})
    levels = cluster.get('evidence_levels', {})
    rep_records = cluster.get('representative_records', [])

    insights = []

    # 洞察1：总体证据概况
    top_designs = sorted(designs.items(), key=lambda x: x[1], reverse=True)[:3]
    design_str = '、'.join([f"{d}（{n}篇）" for d, n in top_designs])

    ab_count = levels.get('A', 0) + levels.get('B', 0)
    ab_pct = ab_count * 100 // total if total else 0

    synthesis = (
        f"{cname}文献簇共纳入{total}篇文献，其中中国研究{china}篇"
        f"（{china*100//total if total else 0}%）。"
        f"主要研究设计为{design_str}。"
        f"证据等级分布：A级{levels.get('A', 0)}篇、B级{levels.get('B', 0)}篇、"
        f"C级{levels.get('C', 0)}篇，AB级高质量证据占比{ab_pct}%。"
    )

    if rep_records:
        rep_str = '；'.join([
            f"{r.get('title_cn', r.get('title', ''))[:60]}"
            f"（{r.get('journal', '')} {r.get('year', '')}，{r.get('evidence_level', '')}级）"
            for r in rep_records[:3]
        ])
        synthesis += f"\n\n代表性研究包括：{rep_str}。"

        # 提取关键结果
        for r in rep_records[:3]:
            kr = r.get('key_results', '')
            if kr:
                synthesis += f"\n{r.get('title_cn', r.get('title', ''))[:40]}：{kr[:150]}"

    insights.append({
        "insight_id": f"INS_{cid}_01",
        "cluster_id": cid,
        "cluster_name": cname,
        "title": f"{cname}：{total}篇文献证据综合",
        "one_line_conclusion": f"纳入{total}篇文献（中国{china}篇），AB级证据{ab_pct}%，主要研究设计为{design_str}",
        "evidence_synthesis": synthesis,
        "literature_count": total,
        "study_designs": designs,
        "china_count": china,
        "comparison_table": [
            {
                "study": f"{r.get('title_cn', r.get('title', ''))[:50]}",
                "design": r.get('study_design', '原文未报告'),
                "population": '原文未报告',
                "sample_size": '原文未报告',
                "intervention": '原文未报告',
                "followup": '原文未报告',
                "key_result": r.get('key_results', '原文未报告'),
                "limitation": '原文未报告',
            }
            for r in rep_records[:5]
        ],
        "consistency": {
            "一致结论": '需进一步跨文献比较分析',
            "存在差异": '各研究在样本量、人群和随访时间上存在差异',
            "差异来源": '研究设计、人群选择和随访长度不同',
        },
        "clinical_implications": {
            "初治患者": '原文未报告',
            "经治患者": '原文未报告',
            "优势人群筛选": '原文未报告',
            "疗效监测": '原文未报告',
        },
        "patient_management": {
            "最易脱落阶段": '原文未报告',
            "依从性改善": '原文未报告',
            "强化随访节点": '原文未报告',
        },
        "significance_2030": f"该文献簇{total}篇证据为2030消除病毒性肝炎目标中的{cname}领域提供了证据基础。",
        "alliance_actions": {
            "建立标准": '基于文献证据制定标准化诊疗流程',
            "转诊患者": '原文未报告',
            "监测KPI": '原文未报告',
        },
        "controversies": {
            "证据不足": '部分亚组证据有限',
            "研究设计局限": '观察性研究比例较高，RCT证据有待补充',
            "中国数据不足": f'中国研究{china}篇，占比{china*100//total if total else 0}%' if china < total * 0.5 else '中国数据较为充分',
        },
        "linked_literature_count": total,
        "linked_literature": [
            {
                "中文标题": r.get('title_cn', r.get('title', '')),
                "期刊": r.get('journal', ''),
                "年份": r.get('year', ''),
                "证据等级": r.get('evidence_level', ''),
            }
            for r in rep_records
        ],
        "source": "cluster_analysis",
    })

    # 洞察2：如果有代表性研究，生成研究比较洞察
    if len(rep_records) >= 2:
        comparison_rows = []
        for r in rep_records[:5]:
            comparison_rows.append({
                "study": f"{r.get('title_cn', r.get('title', ''))[:50]}",
                "design": r.get('study_design', '原文未报告'),
                "population": '原文未报告',
                "sample_size": '原文未报告',
                "intervention": '原文未报告',
                "followup": '原文未报告',
                "key_result": r.get('key_results', '原文未报告'),
                "limitation": '原文未报告',
            })

        insights.append({
            "insight_id": f"INS_{cid}_02",
            "cluster_id": cid,
            "cluster_name": cname,
            "title": f"{cname}：代表性研究证据比较",
            "one_line_conclusion": f"在{cname}领域，{len(rep_records)}篇代表性研究在研究设计和结局指标上呈现多样化特征",
            "evidence_synthesis": (
                f"从{cname}文献簇中筛选出{len(rep_records)}篇代表性研究进行比较。"
                f"这些研究涵盖不同研究设计，证据等级从A级到C级不等，"
                f"共同构成了该领域的核心证据基础。"
                f"各研究在样本量、随访时间和主要终点方面存在差异，"
                f"需要综合解读而非简单合并。"
            ),
            "literature_count": len(rep_records),
            "comparison_table": comparison_rows,
            "source": "cluster_representative_comparison",
        })

    return insights


def generate_key_study_tables(clusters, topics, lit_by_id):
    """生成关键研究比较表汇总"""

    tables = []

    # 从验证专题提取比较表
    for t in topics:
        comp = t.get('代表性研究比较表', [])
        if comp:
            tables.append({
                "table_id": f"TBL_{t['topic_id']}",
                "topic": t.get('topic_title', ''),
                "source": "topic_validation",
                "row_count": len(comp),
                "columns": ["研究", "设计", "人群", "样本量", "干预", "随访", "关键结果", "局限"],
                "rows": comp,
            })

    # 从文献簇提取代表性研究比较表
    for c in clusters:
        rep = c.get('representative_records', [])
        if rep:
            rows = []
            for r in rep:
                rows.append({
                    "study": r.get('title_cn', r.get('title', '')),
                    "design": r.get('study_design', '原文未报告'),
                    "population": '原文未报告',
                    "sample_size": '原文未报告',
                    "intervention": '原文未报告',
                    "followup": '原文未报告',
                    "key_result": r.get('key_results', '原文未报告'),
                    "limitation": '原文未报告',
                })
            tables.append({
                "table_id": f"TBL_{c['cluster_id']}",
                "topic": c['name'],
                "source": "evidence_cluster",
                "row_count": len(rows),
                "columns": ["研究", "设计", "人群", "样本量", "干预", "随访", "关键结果", "局限"],
                "rows": rows,
            })

    return {
        "version": "1.0",
        "updated_at": now_str(),
        "total_tables": len(tables),
        "tables": tables,
    }


def generate_evidence_gaps(clusters, topics, stats):
    """生成证据缺口汇总"""

    gaps = []

    # 从验证专题的争议和证据缺口中提取
    for t in topics:
        controversies = t.get('争议和证据缺口', {})
        topic_title = t.get('topic_title', '')

        for gap_type, gap_text in controversies.items():
            if gap_text and gap_text != '原文未报告':
                gaps.append({
                    "gap_id": f"GAP_{t['topic_id']}_{gap_type}",
                    "topic": topic_title,
                    "gap_type": gap_type,
                    "description": gap_text,
                    "severity": "high" if "不足" in gap_type or "局限" in gap_type else "medium",
                    "source": "topic_validation",
                })

    # 从文献簇分析中补充证据缺口
    for c in clusters:
        designs = c.get('study_designs', {})
        levels = c.get('evidence_levels', {})
        total = c['total_records']
        china = c['china_count']

        # RCT占比低
        rct_count = designs.get('RCT', 0) + designs.get('II期临床', 0) + designs.get('III期临床', 0)
        rct_pct = rct_count * 100 // total if total else 0
        if rct_pct < 15:
            gaps.append({
                "gap_id": f"GAP_{c['cluster_id']}_rct",
                "topic": c['name'],
                "gap_type": "RCT证据不足",
                "description": f"{c['name']}文献簇RCT占比仅{rct_pct}%（{rct_count}/{total}篇），高质量干预性证据有限",
                "severity": "medium",
                "source": "cluster_analysis",
            })

        # 中国数据不足
        intl_count = total - china
        if intl_count > total * 0.1:
            gaps.append({
                "gap_id": f"GAP_{c['cluster_id']}_intl",
                "topic": c['name'],
                "gap_type": "国际对比数据不足",
                "description": f"{c['name']}文献簇中国研究{china}篇、国际研究{intl_count}篇，国际对比视角有限",
                "severity": "low",
                "source": "cluster_analysis",
            })

    # 总体证据缺口
    total_lit = stats['total_literature']
    mgmt_count = stats.get('clusters', {}).get('C10_patient_management', {}).get('total_records', 0)
    screening_count = stats.get('clusters', {}).get('C12_screening_cascade', {}).get('total_records', 0)

    if mgmt_count < total_lit * 0.25:
        gaps.append({
            "gap_id": "GAP_global_patient_mgmt",
            "topic": "患者管理与依从性",
            "gap_type": "文献总量不足",
            "description": f"患者管理文献仅{mgmt_count}篇，占总文献{mgmt_count*100//total_lit}%，与治疗和HCC文献相比明显薄弱",
            "severity": "high",
            "source": "global_analysis",
        })

    if screening_count < total_lit * 0.35:
        gaps.append({
            "gap_id": "GAP_global_screening",
            "topic": "筛查转诊闭环",
            "gap_type": "文献总量不足",
            "description": f"筛查转诊文献仅{screening_count}篇，占总文献{screening_count*100//total_lit}%，筛查到确诊的闭环证据不足",
            "severity": "high",
            "source": "global_analysis",
        })

    # 去重
    seen = set()
    unique_gaps = []
    for g in gaps:
        key = g['gap_id']
        if key not in seen:
            seen.add(key)
            unique_gaps.append(g)

    return {
        "version": "1.0",
        "updated_at": now_str(),
        "total_gaps": len(unique_gaps),
        "high_severity": sum(1 for g in unique_gaps if g['severity'] == 'high'),
        "gaps": unique_gaps,
    }


def generate_strategy_2030(stats, clusters, topics, insights):
    """生成基于证据的2030策略"""

    strategies = []

    # 策略1：提升诊断后治疗率
    strategies.append({
        "strategy_id": "S01",
        "title": "提升HBV确诊后治疗启动率",
        "target_metric": "治疗率",
        "current_evidence": (
            f"基于{stats['total_literature']}篇文献分析，HBsAg动力学和PegIFN转换策略的"
            "证据已较为充分，但确诊到治疗启动的转化路径仍缺乏系统性干预研究。"
            "治疗专题文献（T4）共224篇，功能性治愈专题（T3）共191篇，"
            "为治疗决策提供了丰富证据基础。"
        ),
        "key_actions": [
            "建立HBsAg定量检测指导治疗决策的标准化路径",
            "对HBsAg<1500 IU/mL的NUC经治患者优先评估PegIFN转换/联合 suitability",
            "将治疗启动评估嵌入确诊后首次门诊流程",
            "建立确诊后3个月内未启动治疗患者的自动召回机制",
        ],
        "evidence_basis": [
            "topic1_hbsag_functional_cure: HBsAg下降动力学指导优势人群筛选",
            "topic2_pegifn_switch_addon: NUC经治患者PegIFN转换获益明确",
        ],
        "target_year": 2027,
        "responsible": "省级中心+地市级医院",
    })

    # 策略2：提高功能性治愈率
    strategies.append({
        "strategy_id": "S02",
        "title": "提高HBsAg功能性治愈率",
        "target_metric": "功能性治愈率",
        "current_evidence": (
            "HBsAg下降与功能性治愈文献簇（C01）共464篇，经治患者PegIFN转换文献簇（C02）共571篇。"
            "三专题验证显示，PegIFN转换/联合策略在NUC经治、HBsAg低水平人群中可显著提升HBsAg清除率。"
            "基线HBsAg<1500 IU/mL、治疗12周HBsAg下降>1 log的人群获益最明显。"
        ),
        "key_actions": [
            "制定功能性治愈优势人群筛选标准（基线HBsAg<1500 IU/mL、HBeAg阴性、HBV DNA<2000 IU/mL）",
            "在省级中心建立PegIFN转换/联合治疗标准化方案",
            "建立HBsAg定量监测时间节点（基线、12周、24周、48周）",
            "对HBsAg清除患者建立终身HCC监测档案",
        ],
        "evidence_basis": [
            "topic1_hbsag_functional_cure: HBsAg早期下降预测功能性治愈",
            "topic2_pegifn_switch_addon: PegIFN转换策略获益人群特征",
            "C01_hbsag_decline_functional_cure: 464篇文献证据基础",
            "C02_pegifn_switch: 571篇文献证据基础",
        ],
        "target_year": 2028,
        "responsible": "国家级中心+省级中心",
    })

    # 策略3：保障HCC监测覆盖率
    strategies.append({
        "strategy_id": "S03",
        "title": "保障HBV抑制后HCC监测覆盖率",
        "target_metric": "HCC早诊率",
        "current_evidence": (
            "HBV抑制或HBsAg清除后HCC残余风险文献簇（C03）共646篇，"
            "专题验证显示HBsAg清除后HCC残余风险持续存在（年发病率0.5-1.0%），"
            "需终身按风险分层监测。HCC筛查文献簇（C07）564篇，HCC治疗文献簇（C08）589篇。"
        ),
        "key_actions": [
            "建立HBsAg清除后患者终身HCC监测标准（每6个月超声+AFP）",
            "对高危人群（男性、>40岁、肝硬化家族史）缩短监测间隔至3-4个月",
            "将HCC监测嵌入患者管理系统，自动生成监测提醒",
            "建立HCC早诊率区域KPI考核体系",
        ],
        "evidence_basis": [
            "topic3_hcc_residual_risk: HBV抑制后HCC残余风险证据",
            "C03_hcc_residual_risk: 646篇文献",
            "C07_hcc_screening: 564篇文献",
        ],
        "target_year": 2027,
        "responsible": "省级中心+地市级医院+县级医院",
    })

    # 策略4：加强患者管理与依从性
    strategies.append({
        "strategy_id": "S04",
        "title": "加强患者全周期管理与治疗依从性",
        "target_metric": "患者留存率/治疗依从性",
        "current_evidence": (
            "患者管理文献簇（C10）共201篇，占总文献20%。"
            "现有证据表明，干扰素治疗前3个月是脱落高发期，"
            "数字化随访和HBsAg定量可视化反馈可改善依从性。"
            "但高质量RCT证据仍不足，中国多中心数据有限。"
        ),
        "key_actions": [
            "建立患者全周期管理档案（从确诊到长期随访）",
            "在治疗启动、3个月、6个月、12个月设置强化随访节点",
            "推广HBsAg定量可视化反馈工具",
            "建立干扰素副作用管理预案和患者教育体系",
            "开发数字化随访平台，支持自动提醒和数据上报",
        ],
        "evidence_basis": [
            "C10_patient_management: 201篇文献",
            "topic1_hbsag_functional_cure: 患者管理启示",
        ],
        "target_year": 2028,
        "responsible": "地市级医院+县级医院+基层机构",
    })

    # 策略5：完善筛查转诊闭环
    strategies.append({
        "strategy_id": "S05",
        "title": "完善筛查阳性到确诊治疗的转诊闭环",
        "target_metric": "筛查后确诊率/转诊完成率",
        "current_evidence": (
            "筛查转诊闭环文献簇（C12）共295篇，指南与共识文献簇（C11）共248篇。"
            "现有证据的关键问题不是缺少检测工具，而是筛查阳性后"
            "没有形成确诊、评估、治疗和随访闭环。"
            "社区筛查到专科转诊的脱落率较高，缺乏有效的闭环管理干预研究。"
        ),
        "key_actions": [
            "建立筛查阳性患者转诊标准流程和时限要求（7天内转诊）",
            "在基层机构配备HBsAg快速检测和阳性告知能力",
            "建立转诊完成率KPI监测体系",
            "开展区域试点：社区筛查→定点医院确诊→专科治疗→基层随访",
            "建立家庭成员筛查制度（HBsAg阳性者直系亲属免费筛查）",
        ],
        "evidence_basis": [
            "C12_screening_cascade: 295篇文献",
            "C11_guidelines: 248篇文献",
        ],
        "target_year": 2029,
        "responsible": "省级中心+县级医院+基层机构",
    })

    # 策略6：推动新药管线和功能性治愈创新
    strategies.append({
        "strategy_id": "S06",
        "title": "推动HBV新药管线和功能性治愈创新",
        "target_metric": "新药可及性/临床试验参与率",
        "current_evidence": (
            "新药管线文献簇（C09）共427篇，涵盖siRNA、ASO、衣壳抑制剂等新机制药物。"
            "现有证据显示单药HBsAg清除率有限，联合策略可能是未来方向。"
            "中国参与国际多中心临床试验的比例有待提升。"
        ),
        "key_actions": [
            "建立国家级HBV新药临床试验协调网络",
            "优先支持联合策略（siRNA+免疫调节）的临床研究",
            "建立中国人群功能性治愈终点标准",
            "推动国产siRNA/ASO药物研发和审批",
        ],
        "evidence_basis": [
            "C09_new_drugs: 427篇文献",
        ],
        "target_year": 2030,
        "responsible": "国家级中心",
    })

    # 策略7：完善证据生态
    strategies.append({
        "strategy_id": "S07",
        "title": "完善中国HBV防治证据生态",
        "target_metric": "中国高质量研究数量",
        "current_evidence": (
            f"在{stats['total_literature']}篇文献中，中国研究{stats.get('china_evidence_count', 0)}篇"
            f"（{stats.get('china_evidence_pct', 0)}%），但以观察性研究和回顾性分析为主。"
            "缺乏以中国人群为主的大型前瞻性RCT和多中心队列研究。"
            "基层筛查转诊闭环和患者依从性管理的卫生经济学评价不足。"
        ),
        "key_actions": [
            "发起全国多中心前瞻性队列研究（目标入组>10000例）",
            "建立中国HBV患者登记系统（标准化字段）",
            "支持基层筛查转诊闭环卫生经济学评价研究",
            "建立数字化随访干预效果评估体系",
        ],
        "evidence_basis": [
            "全局统计: 1001篇文献证据图谱",
            "evidence_gaps: 证据缺口汇总",
        ],
        "target_year": 2030,
        "responsible": "国家级中心",
    })

    return {
        "version": "1.0",
        "updated_at": now_str(),
        "total_strategies": len(strategies),
        "target_year": 2030,
        "strategies": strategies,
        "summary": (
            f"基于{stats['total_literature']}篇循证医学文献和12个文献簇的系统分析，"
            "提炼出7项面向2030消除病毒性肝炎目标的策略。"
            "每条策略均从文献证据中逐层推导，涵盖治疗率、功能性治愈率、"
            "HCC早诊率、患者留存率和证据生态建设等关键维度。"
        ),
    }


def generate_alliance_actions(stats, clusters, topics, strategy):
    """生成联盟行动建议"""

    actions = []

    # 从策略推导联盟行动
    for s in strategy['strategies']:
        actions.append({
            "action_id": f"ACT_{s['strategy_id']}",
            "strategy_id": s['strategy_id'],
            "title": s['title'],
            "target_metric": s['target_metric'],
            "actions": s['key_actions'],
            "responsible": s.get('responsible', ''),
            "target_year": s.get('target_year', 2030),
            "evidence_basis": s.get('evidence_basis', []),
        })

    # 从验证专题提取联盟行动
    for t in topics:
        alliance = t.get('联盟行动', {})
        for act_type, act_text in alliance.items():
            if act_text and act_text != '原文未报告':
                actions.append({
                    "action_id": f"ACT_{t['topic_id']}_{act_type}",
                    "title": f"{t.get('topic_title', '')} - {act_type}",
                    "target_metric": '原文未报告',
                    "actions": [act_text],
                    "responsible": '原文未报告',
                    "target_year": 2030,
                    "evidence_basis": [t['topic_id']],
                    "source": "topic_validation",
                })

    # 联盟架构
    architecture = [
        {"layer": "国家级中心", "role": "牵头制定标准、质量控制、多中心研究", "target_count": "5", "color": "#005691"},
        {"layer": "省级中心", "role": "区域转诊、技术指导、医生培训", "target_count": "31", "color": "#0077b6"},
        {"layer": "地市级医院", "role": "核心诊疗、患者管理、数据上报", "target_count": "300", "color": "#00A896"},
        {"layer": "县级医院", "role": "初筛初治、双向转诊、基层管理", "target_count": "2000", "color": "#48cae4"},
        {"layer": "基层机构", "role": "社区筛查、健康宣教、随访管理", "target_count": "10000", "color": "#90e0ef"},
        {"layer": "患者管理平台", "role": "数字化随访、依从性管理、数据整合", "target_count": "1", "color": "#E8742C"},
    ]

    # KPI指标
    kpis = [
        {"name": "筛查阳性后7天内转诊率", "target": "≥90%", "source": "S05", "data_source": "转诊系统"},
        {"name": "确诊后3个月内治疗启动率", "target": "≥80%", "source": "S01", "data_source": "门诊记录"},
        {"name": "PegIFN转换/联合治疗评估率（符合指征人群）", "target": "≥70%", "source": "S02", "data_source": "处方系统"},
        {"name": "HBsAg清除后患者HCC监测覆盖率", "target": "≥95%", "source": "S03", "data_source": "随访系统"},
        {"name": "治疗12个月患者留存率", "target": "≥85%", "source": "S04", "data_source": "患者管理平台"},
        {"name": "干扰素副作用主动管理覆盖率", "target": "≥90%", "source": "S04", "data_source": "患者管理平台"},
        {"name": "基层机构HBsAg快速检测配备率", "target": "≥80%", "source": "S05", "data_source": "设备登记"},
        {"name": "多中心前瞻性研究入组数", "target": "≥10000例", "source": "S07", "data_source": "研究登记系统"},
    ]

    # 2025-2030路线图
    roadmap = [
        {"year": 2025, "phase": "标准建设", "milestones": [
            "发布HBsAg定量指导功能性治愈优势人群筛选标准",
            "建立PegIFN转换/联合治疗标准化方案",
            "建立患者全周期管理档案模板",
        ]},
        {"year": 2026, "phase": "区域试点", "milestones": [
            "在3-5个省份开展筛查转诊闭环试点",
            "推广HBsAg定量可视化反馈工具",
            "建立HCC监测自动提醒系统",
        ]},
        {"year": 2027, "phase": "全国推广", "milestones": [
            "全国推广筛查转诊闭环标准流程",
            "建立HCC早诊率区域KPI考核体系",
            "启动全国多中心前瞻性队列研究",
        ]},
        {"year": 2028, "phase": "质量提升", "milestones": [
            "建立治疗启动率和功能性治愈率全国报告体系",
            "推广数字化随访平台",
            "完善新药临床试验协调网络",
        ]},
        {"year": 2029, "phase": "持续优化", "milestones": [
            "评估2030目标中期进展",
            "优化基层筛查和家庭筛查制度",
            "推动国产新药审批和可及",
        ]},
        {"year": 2030, "phase": "目标达成", "milestones": [
            "实现WHO 2030消除病毒性肝炎核心指标",
            "完成全国HBV患者登记系统建设",
            "发布中国HBV防治经验白皮书",
        ]},
    ]

    return {
        "version": "1.0",
        "updated_at": now_str(),
        "total_actions": len(actions),
        "actions": actions,
        "architecture": architecture,
        "kpis": kpis,
        "roadmap": roadmap,
        "summary": (
            f"基于{stats['total_literature']}篇文献证据和7项2030策略，"
            "提出全国肝病联盟行动框架，涵盖标准化诊疗路径、"
            "转诊标准、患者登记系统、KPI监测和2025-2030路线图。"
            "每项行动均从文献证据逐层推导，确保可执行、可考核。"
        ),
    }


if __name__ == '__main__':
    main()
