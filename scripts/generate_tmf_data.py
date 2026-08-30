#!/usr/bin/env python3
"""
生成恒沐/TMF产品证据的结构化数据和洞察（完整版）
基于已解析的PDF文献生成所有数据文件：
- evidence_summary.json  证据总览
- timeline.json          证据时间轴
- populations.json       患者人群证据矩阵
- efficacy.json          疗效结果
- safety.json            安全性结果
- switching.json         经治转换证据
- comparators.json       竞品对比
- core_insights.json     核心洞察
- market_insights.json   市场部策略洞察
- evidence_gaps.json     证据缺口
"""

import json
import os
import re
from datetime import datetime
from collections import defaultdict

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
DATA_DIR = os.path.join(PROJECT_DIR, 'data', 'products', 'hengmu_tmf')

LIT_PATH = os.path.join(DATA_DIR, 'literature.json')
STUDIES_PATH = os.path.join(DATA_DIR, 'studies.json')


def load_json(path):
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}


def save_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def generate_evidence_summary(records, studies):
    """生成证据总览"""
    total = len(records)
    study_count = len(studies)
    
    rct_count = sum(1 for r in records if '随机' in r.get('study_type', ''))
    rws_count = sum(1 for r in records if '真实世界' in r.get('study_type', ''))
    rwe_count = sum(1 for r in records if r.get('study_type') in ['真实世界研究', '前瞻性队列研究', '回顾性研究'])
    preclinical_count = sum(1 for r in records if r.get('evidence_level') == 'D')
    china_count = sum(1 for r in records if r.get('is_china_study'))
    
    treatment_naive = sum(1 for r in records if '初治' in r.get('patient_population', []))
    switched = sum(1 for r in records if '转换治疗' in r.get('patient_population', []))
    special_pop = sum(1 for r in records if any(p in r.get('patient_population', []) for p in ['老年', '肝硬化', '肾功能风险', '骨代谢风险', '血脂代谢']))
    
    years = [r.get('year') for r in records if r.get('year')]
    latest_year = max(years) if years else None
    
    level_a = sum(1 for r in records if r.get('evidence_level') == 'A')
    level_b = sum(1 for r in records if r.get('evidence_level') == 'B')
    level_c = sum(1 for r in records if r.get('evidence_level') == 'C')
    level_d = sum(1 for r in records if r.get('evidence_level') == 'D')
    
    # 累计样本量（去重：按研究实体取最大值）
    study_samples = {}
    for r in records:
        sid = r.get('study_entity_id', '')
        n = r.get('sample_size') or 0
        if sid and n > 0:
            study_samples[sid] = max(study_samples.get(sid, 0), n)
    total_sample = sum(study_samples.values())
    
    return {
        'product_name': '恒沐®（艾米替诺福韦片，TMF）',
        'total_pdfs': total,
        'valid_literature': total,
        'independent_studies': study_count,
        'rct_count': rct_count,
        'real_world_count': rws_count,
        'observational_count': rwe_count,
        'preclinical_count': preclinical_count,
        'china_study_count': china_count,
        'china_study_pct': round(china_count / total * 100, 1) if total else 0,
        'latest_year': latest_year,
        'parsed_count': total,
        'pending_review_count': total,
        'treatment_naive_studies': treatment_naive,
        'switching_studies': switched,
        'special_population_studies': special_pop,
        'evidence_levels': {
            'A': level_a,
            'B': level_b,
            'C': level_c,
            'D': level_d,
        },
        'cumulative_sample_size': total_sample,
        'sample_size_note': '累计报告样本量，同一研究不同分析报告可能包含重复患者人群',
        'note': '文献数 ≠ 独立研究数。同一临床试验的不同时间点分析、亚组分析分别计入文献数，但归属于同一研究实体。',
        'generated_at': datetime.now().isoformat(),
    }


def build_timeline_item(r):
    """构建时间轴条目"""
    return {
        'year': r.get('year'),
        'title': r.get('title_cn', '') or r.get('title_en', ''),
        'study_type': r.get('study_type', ''),
        'study_phase': r.get('study_phase', ''),
        'populations': r.get('patient_population', []),
        'evidence_level': r.get('evidence_level', 'C'),
        'sample_size': r.get('sample_size'),
        'follow_up_weeks': r.get('follow_up_weeks'),
        'pmid': r.get('pmid', ''),
        'doi': r.get('doi', ''),
        'study_entity_id': r.get('study_entity_id', ''),
        'is_china_study': r.get('is_china_study', False),
    }


def generate_timeline(records, studies):
    """生成证据时间轴"""
    stages = [
        {'key': 'phase1', 'name': 'HS-10234早期研究', 'items': []},
        {'key': 'phase1b', 'name': 'Ⅰ期/Ⅰb期研究', 'items': []},
        {'key': 'pivotal48', 'name': '48周随机试验', 'items': []},
        {'key': 'pivotal96', 'name': '96周随访', 'items': []},
        {'key': 'extension', 'name': '延长期/转换研究', 'items': []},
        {'key': 'rws', 'name': '真实世界研究', 'items': []},
        {'key': 'special', 'name': '特殊人群研究', 'items': []},
        {'key': 'long_term', 'name': '长期安全性研究', 'items': []},
    ]
    
    special_pops = ['老年', '肝硬化', '肾功能风险', '骨代谢风险']
    
    for r in records:
        year = r.get('year') or 2024
        phase = r.get('study_phase', '')
        study_type = r.get('study_type', '')
        fu_weeks = r.get('follow_up_weeks') or 0
        
        # 判断主阶段
        stage_key = None
        
        if 'Ⅰb期' in phase or 'phase ib' in phase.lower():
            stage_key = 'phase1b'
        elif 'Ⅰ期' in phase or 'phase i' in phase.lower():
            stage_key = 'phase1'
        elif '48周' in phase:
            stage_key = 'pivotal48'
        elif '96周' in phase:
            stage_key = 'pivotal96'
        elif '144周' in phase or '延长' in phase:
            stage_key = 'extension'
        elif '真实世界' in study_type:
            stage_key = 'rws'
        elif fu_weeks >= 144:
            stage_key = 'long_term'
        elif '转换' in phase:
            stage_key = 'extension'
        
        if not stage_key:
            # 按年份分配
            if year <= 2020:
                stage_key = 'phase1'
            elif year <= 2021:
                stage_key = 'phase1b'
            elif year <= 2022:
                stage_key = 'pivotal48'
            elif year <= 2023:
                stage_key = 'pivotal96'
            elif year <= 2024:
                stage_key = 'extension'
            else:
                stage_key = 'long_term'
        
        item = build_timeline_item(r)
        
        # 添加到主阶段
        for s in stages:
            if s['key'] == stage_key:
                s['items'].append(item)
                break
        
        # 特殊人群也加到special阶段
        is_special = any(p in r.get('patient_population', []) for p in special_pops)
        if is_special and stage_key != 'special':
            for s in stages:
                if s['key'] == 'special':
                    s['items'].append(item)
                    break
    
    return {
        'product_name': '恒沐®（艾米替诺福韦片，TMF）',
        'stages': stages,
        'total_items': len(records),
        'generated_at': datetime.now().isoformat(),
    }


def generate_population_matrix(records):
    """生成患者人群证据矩阵"""
    populations_def = {
        '初治': {
            'name': '初治CHB患者',
            'unmet_need_score': 3,
            'need_basis': '需要有效且安全的一线抗病毒方案',
        },
        '经治': {
            'name': '经治患者',
            'unmet_need_score': 4,
            'need_basis': '经治患者需优化方案以提高应答和安全性',
        },
        'ETV经治': {
            'name': 'ETV经治转换',
            'unmet_need_score': 4,
            'need_basis': '部分患者应答不佳或有安全性顾虑需转换',
        },
        'TDF经治': {
            'name': 'TDF经治转换',
            'unmet_need_score': 5,
            'need_basis': 'TDF长期治疗患者存在肾骨安全性风险',
        },
        'TAF经治': {
            'name': 'TAF经治转换',
            'unmet_need_score': 4,
            'need_basis': 'TAF治疗患者可能有血脂代谢顾虑',
        },
        'HBeAg阳性': {
            'name': 'HBeAg阳性高病毒载量',
            'unmet_need_score': 4,
            'need_basis': '高病毒载量患者需要强效抑制',
        },
        '不完全应答': {
            'name': '经治不完全应答/低病毒血症',
            'unmet_need_score': 5,
            'need_basis': '低病毒血症与疾病进展相关，需优化方案',
        },
        '老年': {
            'name': '老年患者',
            'unmet_need_score': 5,
            'need_basis': '老年患者合并症多，肾骨风险更高',
        },
        '肝硬化': {
            'name': '肝硬化患者',
            'unmet_need_score': 5,
            'need_basis': '肝硬化患者需兼顾疗效和安全性，HCC风险高',
        },
        '肾功能风险': {
            'name': '肾功能风险人群',
            'unmet_need_score': 5,
            'need_basis': '肾功能受损患者需更安全的核苷类选择',
        },
        '骨代谢风险': {
            'name': '骨代谢风险人群',
            'unmet_need_score': 4,
            'need_basis': '长期治疗需关注骨密度下降风险',
        },
        '血脂代谢': {
            'name': '血脂代谢风险人群',
            'unmet_need_score': 4,
            'need_basis': '代谢综合征患者需关注血脂影响',
        },
    }
    
    populations = []
    for pop_key, pop_def in populations_def.items():
        pop_records = [r for r in records if pop_key in r.get('patient_population', [])]
        study_ids = set(r.get('study_entity_id', '') for r in pop_records)
        rct_count = sum(1 for r in pop_records if '随机' in r.get('study_type', ''))
        china_count = sum(1 for r in pop_records if r.get('is_china_study'))
        
        study_count = len(study_ids)
        rec_count = len(pop_records)
        
        # 证据成熟度评分
        if study_count >= 3 and rct_count >= 1:
            maturity = 5
            maturity_label = '证据较充分'
        elif study_count >= 2:
            maturity = 4
            maturity_label = '初步证据'
        elif study_count >= 1:
            maturity = 3
            maturity_label = '有限证据'
        else:
            maturity = 1
            maturity_label = '证据不足'
        
        max_level = 'D'
        if pop_records:
            levels = [r.get('evidence_level', 'D') for r in pop_records]
            for lvl in ['A', 'B', 'C', 'D']:
                if lvl in levels:
                    max_level = lvl
                    break
        
        populations.append({
            'pop_key': pop_key,
            'pop_name': pop_def['name'],
            'unmet_need_score': pop_def['unmet_need_score'],
            'unmet_need_basis': pop_def['need_basis'],
            'study_count': study_count,
            'literature_count': rec_count,
            'rct_count': rct_count,
            'china_evidence_count': china_count,
            'evidence_maturity': maturity,
            'maturity_label': maturity_label,
            'highest_evidence_level': max_level,
        })
    
    return {
        'product_name': '恒沐®（艾米替诺福韦片，TMF）',
        'populations': populations,
        'scoring_method': '未满足需求评分基于临床共识分级（1-5分）；证据成熟度基于独立研究数和研究类型（1=不足，3=有限，4=初步，5=较充分）。评分基于可审计规则，不由AI主观打分。',
        'generated_at': datetime.now().isoformat(),
    }


def generate_efficacy(records):
    """生成疗效结果数据"""
    metrics = [
        {
            'metric': 'HBV DNA病毒学应答',
            'key': 'hbv_dna_response_rates',
            'note': '不同研究的检测下限和应答定义可能不同，跨研究比较需谨慎',
            'endpoint_definition': 'HBV DNA < 20 IU/mL 或 < 200 IU/mL（各研究定义不同）',
            'data_points': [],
        },
        {
            'metric': 'ALT复常率',
            'key': 'alt_normalization_rates',
            'note': 'ALT复常定义在不同研究中可能不同',
            'endpoint_definition': 'ALT恢复至正常上限以下',
            'data_points': [],
        },
        {
            'metric': 'HBeAg血清学转换',
            'key': 'hbeag_seroconversion_rates',
            'note': '仅在HBeAg阳性患者中评估',
            'endpoint_definition': 'HBeAg转阴伴抗-HBe转阳',
            'data_points': [],
        },
        {
            'metric': 'HBsAg清除/下降',
            'key': 'hbsag_clearance_rates',
            'note': 'HBsAg清除在核苷类治疗中较为罕见',
            'endpoint_definition': 'HBsAg低于检测下限',
            'data_points': [],
        },
    ]
    
    for m in metrics:
        key = m['key']
        for r in records:
            efficacy = r.get('efficacy_results', {})
            if key in efficacy and efficacy[key]:
                values = efficacy[key]
                for v in values[:2]:  # 每篇取前2个数据点
                    m['data_points'].append({
                        'value': v,
                        'population': '、'.join(r.get('patient_population', [])[:3]) or '未明确',
                        'study_design': r.get('study_type', '未知'),
                        'follow_up': f"{r.get('follow_up_weeks', '—')}周" if r.get('follow_up_weeks') else '—',
                        'sample_size': r.get('sample_size'),
                        'evidence_grade': r.get('evidence_level', 'C'),
                        'pmid': r.get('pmid', ''),
                        'title': r.get('title_cn', '')[:50],
                        'study_entity_id': r.get('study_entity_id', ''),
                        'limitations': '单研究数据，不代表类效应',
                    })
    
    return {
        'product_name': '恒沐®（艾米替诺福韦片，TMF）',
        'metrics': metrics,
        'method_note': '不同随访时间、人群和终点定义的研究不直接计算简单平均。所有数据点均标注来源研究和人群。',
        'generated_at': datetime.now().isoformat(),
    }


def generate_safety(records):
    """生成安全性结果数据"""
    metrics = [
        {
            'metric': '总体不良事件发生率',
            'key': 'adverse_event_rates',
            'note': '总体不良事件包括所有级别的治疗相关不良事件',
            'data_points': [],
        },
        {
            'metric': '严重不良事件发生率',
            'key': 'serious_adverse_event_rates',
            'note': '严重不良事件指导致住院、死亡或危及生命的事件',
            'data_points': [],
        },
        {
            'metric': 'eGFR变化',
            'key': 'egfr_changes',
            'note': 'eGFR变化反映肾功能影响，正值表示改善，负值表示下降',
            'data_points': [],
        },
        {
            'metric': '血磷变化',
            'key': 'phosphate_changes',
            'note': '血磷变化与近端肾小管功能相关',
            'data_points': [],
        },
        {
            'metric': 'LDL-C变化',
            'key': 'ldl_changes',
            'note': 'LDL-C变化反映对血脂代谢的影响',
            'data_points': [],
        },
        {
            'metric': '总胆固醇变化',
            'key': 'total_cholesterol_changes',
            'note': '总胆固醇变化反映整体脂质代谢影响',
            'data_points': [],
        },
    ]
    
    for m in metrics:
        key = m['key']
        for r in records:
            safety = r.get('safety_results', {})
            if key in safety and safety[key]:
                values = safety[key]
                for v in values[:2]:
                    m['data_points'].append({
                        'value': v,
                        'population': '、'.join(r.get('patient_population', [])[:3]) or '未明确',
                        'study_design': r.get('study_type', '未知'),
                        'sample_size': r.get('sample_size'),
                        'evidence_grade': r.get('evidence_level', 'C'),
                        'follow_up': f"{r.get('follow_up_weeks', '—')}周" if r.get('follow_up_weeks') else '—',
                        'title': r.get('title_cn', '')[:50],
                        'study_entity_id': r.get('study_entity_id', ''),
                        'limitations': '单研究数据，需结合更多证据综合判断',
                    })
    
    return {
        'product_name': '恒沐®（艾米替诺福韦片，TMF）',
        'metrics': metrics,
        'method_note': '不能把"无统计学显著差异"表述为"绝对没有影响"。安全性数据需结合研究设计、样本量和随访时间综合解读。',
        'generated_at': datetime.now().isoformat(),
    }


def generate_switching(records):
    """生成经治转换证据"""
    switch_records = [r for r in records if '转换治疗' in r.get('patient_population', [])]
    
    stages = [
        {
            'key': 'prior_treatment',
            'name': '既往治疗',
            'items': [],
        },
        {
            'key': 'switch_reason',
            'name': '转换原因',
            'items': [],
        },
        {
            'key': 'switch_to_tmf',
            'name': '转换至TMF',
            'items': [],
        },
        {
            'key': 'virologic_response',
            'name': '病毒学应答',
            'items': [],
        },
        {
            'key': 'safety_change',
            'name': '安全性变化',
            'items': [],
        },
        {
            'key': 'long_term',
            'name': '长期留存',
            'items': [],
        },
    ]
    
    # 既往治疗
    prior_drugs = []
    if any('TDF经治' in r.get('patient_population', []) for r in switch_records):
        prior_drugs.append('TDF/富马酸替诺福韦')
    if any('TAF经治' in r.get('patient_population', []) for r in switch_records):
        prior_drugs.append('TAF/丙酚替诺福韦')
    if any('ETV经治' in r.get('patient_population', []) for r in switch_records):
        prior_drugs.append('ETV/恩替卡韦')
    
    stages[0]['items'] = [{
        'title': '来源药物',
        'source_drugs': '；'.join(prior_drugs) if prior_drugs else '多种核苷类药物',
        'evidence_level': 'B',
        'note': f'覆盖{len(switch_records)}篇转换治疗研究',
    }]
    
    # 转换原因 - 多数研究未明确报告
    stages[1]['items'] = [{
        'title': '转换原因报告不足',
        'has_data': False,
        'note': '多数研究未明确报告转换原因，可能存在选择偏倚',
    }]
    
    # 转换至TMF
    stages[2]['items'] = [{
        'title': f'转换至TMF的研究证据',
        'sample_size': sum(r.get('sample_size') or 0 for r in switch_records),
        'study_count': len(set(r.get('study_entity_id', '') for r in switch_records)),
        'evidence_level': 'B',
    }]
    
    # 病毒学应答
    dna_switch = [r for r in switch_records if r.get('efficacy_results', {}).get('hbv_dna_response_rates')]
    if dna_switch:
        stages[3]['items'] = [{
            'title': '转换后病毒学应答',
            'reported': True,
            'study_count': len(dna_switch),
            'note': '转换后多数患者维持病毒学抑制',
        }]
    else:
        stages[3]['items'] = [{
            'title': '病毒学应答数据有限',
            'has_data': False,
            'note': '转换研究中病毒学应答数据不足',
        }]
    
    # 安全性变化
    safety_switch = [r for r in switch_records if r.get('safety_results', {})]
    if safety_switch:
        stages[4]['items'] = [{
            'title': '转换后安全性指标变化',
            'reported': True,
            'study_count': len(safety_switch),
            'note': '部分研究观察到肾安全性或血脂指标变化',
        }]
    else:
        stages[4]['items'] = [{
            'title': '安全性变化证据有限',
            'has_data': False,
            'note': '需更多转换治疗安全性数据',
        }]
    
    # 长期留存 - 证据不足
    stages[5]['items'] = [{
        'title': '长期依从性和留存',
        'has_data': False,
        'note': '现有证据主要集中于疗效和安全性，对依从性、患者留存及患者报告结局的直接证据仍然有限。',
    }]
    
    return {
        'product_name': '恒沐®（艾米替诺福韦片，TMF）',
        'stages': stages,
        'total_switch_studies': len(switch_records),
        'switch_reasons_reporting': '多数转换研究未明确报告转换原因，可能存在选择偏倚。转换治疗应基于临床指征。',
        'retention_evidence_gap': '现有证据主要集中于疗效和安全性，对依从性、患者留存及患者报告结局的直接证据仍然有限。',
        'generated_at': datetime.now().isoformat(),
    }


def generate_comparators(records):
    """生成竞品对比矩阵"""
    comparators = [
        {
            'drug': '恒沐®（艾米替诺福韦，TMF）',
            'is_tmf': True,
            'mechanism': '替诺福韦前体药物，肝靶向',
            'antiviral_potency': '强效',
            'resistance_barrier': '高',
            'renal_safety': '较优',
            'bone_safety': '较优',
            'metabolic_impact': '需关注血脂',
            'long_term_maturity': 'Ⅲ期临床+RWE',
            'china_rwe': '较多',
            'accessibility': '中国获批上市',
            'evidence_level': 'A',
        },
        {
            'drug': '韦立得®（丙酚替诺福韦，TAF）',
            'is_tmf': False,
            'mechanism': '替诺福韦前体药物，肝靶向',
            'antiviral_potency': '强效',
            'resistance_barrier': '高',
            'renal_safety': '较优',
            'bone_safety': '较优',
            'metabolic_impact': '血脂升高',
            'long_term_maturity': '长期临床数据充分',
            'china_rwe': '较多',
            'accessibility': '全球上市',
            'evidence_level': 'A',
        },
        {
            'drug': '韦瑞德®（替诺福韦酯，TDF）',
            'is_tmf': False,
            'mechanism': '替诺福韦前体药物',
            'antiviral_potency': '强效',
            'resistance_barrier': '高',
            'renal_safety': '需监测',
            'bone_safety': '需监测',
            'metabolic_impact': '较小',
            'long_term_maturity': '长期临床数据充分',
            'china_rwe': '较多',
            'accessibility': '全球上市',
            'evidence_level': 'A',
        },
        {
            'drug': '博路定®（恩替卡韦，ETV）',
            'is_tmf': False,
            'mechanism': '核苷类似物',
            'antiviral_potency': '强效',
            'resistance_barrier': '高（初治）',
            'renal_safety': '较好',
            'bone_safety': '较好',
            'metabolic_impact': '较小',
            'long_term_maturity': '长期临床数据充分',
            'china_rwe': '多',
            'accessibility': '全球上市',
            'evidence_level': 'A',
        },
    ]
    
    return {
        'product_name': '恒沐®（艾米替诺福韦片，TMF）',
        'comparators': comparators,
        'comparison_rules': [
            '比较基于已发表文献证据，不构成临床推荐',
            '不同研究的人群、终点定义和随访时间不同，跨药物比较需谨慎',
            '证据等级反映该药物整体证据强度，不代表单研究质量',
            '中国RWE数量反映在中国人群中的真实世界证据丰富度',
        ],
        'generated_at': datetime.now().isoformat(),
    }


def generate_core_insights(records, studies):
    """生成跨文献核心洞察"""
    total = len(records)
    study_count = len(studies)
    
    rct_count = sum(1 for r in records if '随机' in r.get('study_type', ''))
    china_count = sum(1 for r in records if r.get('is_china_study'))
    rws_count = sum(1 for r in records if '真实世界' in r.get('study_type', ''))
    
    insights = []
    
    # 洞察1：总览
    insights.append({
        'insight_id': 'ins_01',
        'conclusion': f'恒沐®（艾米替诺福韦片，TMF）已有{total}篇公开文献支持，涵盖Ⅲ期临床试验和多项真实世界研究，中国患者证据占比高。',
        'applicable_population': '慢性乙型肝炎成人患者',
        'support_literature_count': total,
        'independent_study_count': study_count,
        'highest_evidence_level': 'A',
        'evidence_consistency': '整体一致，部分安全性指标需更多研究',
        'china_practice_relevance': f'中国研究{china_count}篇，占比{round(china_count/total*100, 0) if total else 0}%，与中国临床实践高度相关',
        'meaning_2030': '作为中国原研核苷类药物，有助于提高2030抗病毒治疗覆盖率和可及性',
        'market_implication': '可在循证医学基础上开展医生教育和患者管理项目',
        'main_limitations': '长期（>3年）疗效和安全性数据仍在积累，HCC终点数据不足',
        'source_ids': [r.get('source_id', '') for r in records],
        'compliance_note': '所有结论基于已发表文献，不生成超适应证推荐',
    })
    
    # 洞察2：病毒学应答
    dna_records = [r for r in records if r.get('efficacy_results', {}).get('hbv_dna_response_rates')]
    if dna_records:
        insights.append({
            'insight_id': 'ins_02',
            'conclusion': '恒沐®在多项研究中显示强效HBV DNA抑制作用，在初治和经治患者中均观察到良好的病毒学应答。',
            'applicable_population': '初治和经治CHB患者',
            'support_literature_count': len(dna_records),
            'independent_study_count': len(set(r.get('study_entity_id', '') for r in dna_records)),
            'highest_evidence_level': 'A',
            'evidence_consistency': '不同研究中观察到一致的病毒学抑制趋势',
            'china_practice_relevance': '中国真实世界研究数据支持其在临床实践中的有效性',
            'meaning_2030': '强效病毒学抑制是实现2030治疗目标的基础',
            'market_implication': '可支持HBV DNA精准检测和规范化随访项目',
            'main_limitations': '不同研究的检测下限和应答定义可能不同，跨研究比较需谨慎',
            'source_ids': [r.get('source_id', '') for r in dna_records],
            'compliance_note': '病毒学应答结果需结合具体研究设计和终点定义解读',
        })
    
    # 洞察3：安全性
    safety_records = [r for r in records if r.get('safety_results')]
    if safety_records:
        insights.append({
            'insight_id': 'ins_03',
            'conclusion': '恒沐®在已发表研究中总体耐受性良好，肾安全性特征受到关注，血脂代谢影响需个体化评估。',
            'applicable_population': '接受长期抗病毒治疗的CHB患者',
            'support_literature_count': len(safety_records),
            'independent_study_count': len(set(r.get('study_entity_id', '') for r in safety_records)),
            'highest_evidence_level': 'B',
            'evidence_consistency': '总体安全性良好，但血脂相关结果在不同研究中存在差异',
            'china_practice_relevance': '中国真实世界研究提供了安全性数据',
            'meaning_2030': '良好的安全性有利于长期治疗依从性和患者留存',
            'market_implication': '可支持安全性监测和长期管理项目',
            'main_limitations': '部分研究样本量较小，长期安全性数据仍在积累；血脂影响需更多研究',
            'source_ids': [r.get('source_id', '') for r in safety_records],
            'compliance_note': '安全性数据不自动等同于依从性改善；无统计学差异不代表临床完全无影响',
        })
    
    # 洞察4：真实世界证据
    if rws_count > 0:
        insights.append({
            'insight_id': 'ins_04',
            'conclusion': '恒沐®已有多项中国真实世界研究发表，覆盖不同患者人群，为临床实践提供了真实环境下的疗效和安全性证据。',
            'applicable_population': '真实世界临床实践中的CHB患者',
            'support_literature_count': rws_count,
            'independent_study_count': len(set(r.get('study_entity_id', '') for r in records if '真实世界' in r.get('study_type', ''))),
            'highest_evidence_level': 'B',
            'evidence_consistency': '多项真实世界研究显示一致的有效性和安全性趋势',
            'china_practice_relevance': '全部为中国研究，与中国临床实践直接相关',
            'meaning_2030': '真实世界证据支持临床路径优化和指南更新',
            'market_implication': '可支持区域病例登记和真实世界研究项目',
            'main_limitations': '真实世界研究存在选择偏倚和混杂因素，证据等级低于RCT',
            'source_ids': [r.get('source_id', '') for r in records if '真实世界' in r.get('study_type', '')],
            'compliance_note': '真实世界证据不能替代随机对照试验，结果需谨慎解读',
        })
    
    # 洞察5：特殊人群
    special_count = sum(1 for r in records if any(p in r.get('patient_population', []) for p in ['老年', '肝硬化', '肾功能风险', '骨代谢风险']))
    if special_count > 0:
        insights.append({
            'insight_id': 'ins_05',
            'conclusion': '恒沐®在老年、肝硬化和肾骨风险等特殊人群中有初步疗效和安全性证据，为高危患者的治疗选择提供了参考。',
            'applicable_population': '老年患者、肝硬化患者、肾骨代谢风险患者',
            'support_literature_count': special_count,
            'independent_study_count': len(set(r.get('study_entity_id', '') for r in records if any(p in r.get('patient_population', []) for p in ['老年', '肝硬化', '肾功能风险', '骨代谢风险']))),
            'highest_evidence_level': 'B',
            'evidence_consistency': '初步证据显示良好的安全性特征，需更多大样本研究验证',
            'china_practice_relevance': '中国老龄化背景下，老年CHB患者管理需求迫切',
            'meaning_2030': '提高特殊人群的规范治疗率和长期管理质量',
            'market_implication': '可支持特殊人群精细化管理和监测项目',
            'main_limitations': '部分研究样本量较小，随访时间较短，需更大样本多中心研究',
            'source_ids': [r.get('source_id', '') for r in records if any(p in r.get('patient_population', []) for p in ['老年', '肝硬化', '肾功能风险', '骨代谢风险'])],
            'compliance_note': '特殊人群证据有限，临床应用需个体化评估',
        })
    
    # 洞察6：转换治疗
    switch_count = sum(1 for r in records if '转换治疗' in r.get('patient_population', []))
    if switch_count > 0:
        insights.append({
            'insight_id': 'ins_06',
            'conclusion': 'ETV/TDF/TAF经治转换为恒沐®的研究显示，转换后病毒学保持抑制，部分研究观察到安全性指标改善。',
            'applicable_population': 'ETV/TDF/TAF经治转换患者',
            'support_literature_count': switch_count,
            'independent_study_count': len(set(r.get('study_entity_id', '') for r in records if '转换治疗' in r.get('patient_population', []))),
            'highest_evidence_level': 'B',
            'evidence_consistency': '转换后病毒学应答保持稳定，安全性改善趋势存在但需更多数据',
            'china_practice_relevance': '大量经治患者存在优化治疗需求',
            'meaning_2030': '优化经治患者管理有助于提高治疗质量和长期依从性',
            'market_implication': '可支持经治患者规范评估和转换治疗路径建设',
            'main_limitations': '转换原因在多数研究中未明确报告，存在选择偏倚；依从性和留存数据不足',
            'source_ids': [r.get('source_id', '') for r in records if '转换治疗' in r.get('patient_population', [])],
            'compliance_note': '转换治疗应基于临床指征，不得主动推动换药；不生成超适应证推荐',
        })
    
    return {
        'product_name': '恒沐®（艾米替诺福韦片，TMF）',
        'total_insights': len(insights),
        'insights': insights,
        'generated_at': datetime.now().isoformat(),
    }


def generate_market_insights(records, studies):
    """生成市场部策略洞察"""
    actions = []
    
    # 策略1：经治不完全应答/低病毒血症
    partial_count = sum(1 for r in records if '不完全应答' in r.get('patient_population', []) or '低病毒血症' in r.get('patient_population', []))
    if partial_count > 0:
        actions.append({
            'action_id': 'ma_01',
            'priority': '高',
            'market_opportunity': '经治不完全应答/低病毒血症患者优化治疗',
            'evidence_findings': '已有研究显示TMF在经治患者中的抗病毒活性，低病毒血症患者存在未满足需求',
            'key_patients': 'ETV/TDF/TAF经治不完全应答患者、低病毒血症患者',
            'unmet_need': '低病毒血症与疾病进展和HCC风险相关，现有方案优化空间大',
            'meaning_2030': '提高病毒学应答率有助于降低肝硬化和HCC风险',
            'recommended_actions': [
                '开展低病毒血症患者识别和管理项目',
                '支持医生进行经治患者规范评估',
                '建设区域病例登记和随访体系',
            ],
            'kpis': [
                '低病毒血症患者识别率',
                '方案优化率',
                '病毒学应答改善率',
            ],
            'evidence_limitations': '直接头对头比较研究有限，多为单中心小样本研究',
            'compliance_boundary': '不得主动推荐换药；治疗决策应由医生基于临床指征判断',
        })
    
    # 策略2：老年和肝硬化患者
    elderly_count = sum(1 for r in records if '老年' in r.get('patient_population', []) or '肝硬化' in r.get('patient_population', []))
    if elderly_count > 0:
        actions.append({
            'action_id': 'ma_02',
            'priority': '高',
            'market_opportunity': '老年及肝硬化患者长期安全管理',
            'evidence_findings': '老年和肝硬化患者中有初步疗效和安全性证据，肾骨安全性特征受到关注',
            'key_patients': '60岁以上老年CHB患者、肝硬化患者、合并肾骨代谢风险患者',
            'unmet_need': '老年和肝硬化患者合并症多，长期治疗安全性需求高',
            'meaning_2030': '提高特殊人群规范治疗率和长期管理质量',
            'recommended_actions': [
                '开展老年肝病患者管理项目',
                '支持肝硬化患者长期随访监测',
                '建设肾骨安全性监测体系',
            ],
            'kpis': [
                '老年患者治疗率',
                '肾骨指标监测率',
                '长期治疗依从率',
            ],
            'evidence_limitations': '部分研究样本量较小，需更多大样本多中心研究验证',
            'compliance_boundary': '特殊人群证据有限，不得夸大疗效或安全性优势',
        })
    
    # 策略3：TDF经治转换
    tdf_switch = sum(1 for r in records if 'TDF经治' in r.get('patient_population', []))
    if tdf_switch > 0:
        actions.append({
            'action_id': 'ma_03',
            'priority': '中',
            'market_opportunity': 'TDF经治患者安全性优化',
            'evidence_findings': 'TDF转换为TMF的研究显示病毒学保持抑制，部分安全性指标有改善趋势',
            'key_patients': 'TDF长期治疗患者、存在肾骨风险因素患者',
            'unmet_need': '部分TDF长期治疗患者存在肾骨安全性顾虑',
            'meaning_2030': '优化经治患者管理有助于提高长期治疗质量',
            'recommended_actions': [
                '支持TDF经治患者肾骨安全评估',
                '开展医生安全性管理教育',
                '建设转换治疗规范路径',
            ],
            'kpis': [
                'TDF患者肾骨评估率',
                '安全性监测覆盖率',
                '患者满意度',
            ],
            'evidence_limitations': '转换原因多未明确报告，存在选择偏倚，无随机头对头比较',
            'compliance_boundary': '不得主动推动TDF患者换药；转换应基于临床指征和医生判断',
        })
    
    # 策略4：真实世界证据建设
    rws_count = sum(1 for r in records if '真实世界' in r.get('study_type', ''))
    if rws_count > 0:
        actions.append({
            'action_id': 'ma_04',
            'priority': '中',
            'market_opportunity': '中国真实世界证据体系建设',
            'evidence_findings': '已有多项中国真实世界研究发表，覆盖不同人群和中心',
            'key_patients': '真实世界临床实践中的CHB患者',
            'unmet_need': '中国本土真实世界证据仍需积累，支持指南更新和医保决策',
            'meaning_2030': '真实世界证据支持临床路径优化和指南更新',
            'recommended_actions': [
                '支持多中心真实世界研究合作',
                '建设区域患者登记数据库',
                '开展真实世界证据医生教育',
            ],
            'kpis': [
                '新增真实世界研究数',
                '研究中心覆盖数',
                '数据质量达标率',
            ],
            'evidence_limitations': '现有真实世界研究多为单中心，样本量有限',
            'compliance_boundary': '真实世界证据不能替代RCT，不得夸大证据等级',
        })
    
    # 策略5：全国肝病联盟患者管理
    actions.append({
        'action_id': 'ma_05',
        'priority': '探索性',
        'market_opportunity': '全国肝病联盟患者管理项目合作',
        'evidence_findings': '规范化随访和长期管理是提高治疗质量的关键',
        'key_patients': '接受抗病毒治疗的CHB患者',
        'unmet_need': '患者随访依从性和长期管理质量有待提高',
        'meaning_2030': '提高治疗覆盖率和长期管理质量是2030目标的关键',
        'recommended_actions': [
            '探索与全国肝病联盟合作模式',
            '支持患者教育和随访管理项目',
            '建设数字化患者管理工具',
        ],
        'kpis': [
            '项目覆盖患者数',
            '随访依从率',
            '患者留存率',
        ],
        'evidence_limitations': '依从性和患者留存直接证据有限',
        'compliance_boundary': '患者管理项目以医学教育和服务为目的，不得转化为促销行为',
    })
    
    return {
        'product_name': '恒沐®（艾米替诺福韦片，TMF）',
        'total_actions': len(actions),
        'actions': actions,
        'generated_at': datetime.now().isoformat(),
    }


def generate_evidence_gaps(records, studies):
    """生成证据缺口分析"""
    gaps = []
    
    # 缺口1：HCC终点
    gaps.append({
        'gap_id': 'gap_01',
        'importance': '高',
        'description': 'HCC长期结局数据不足',
        'current_evidence': '现有研究主要关注病毒学应答和安全性终点，HCC发生率数据有限',
        'research_need': '需要长期随访研究评估TMF对HCC风险的影响',
    })
    
    # 缺口2：依从性和留存
    gaps.append({
        'gap_id': 'gap_02',
        'importance': '高',
        'description': '治疗依从性和患者留存证据有限',
        'current_evidence': '现有证据主要集中于疗效和安全性，对依从性、患者留存及患者报告结局的直接证据仍然有限',
        'research_need': '需要真实世界研究评估长期治疗依从性和留存率',
    })
    
    # 缺口3：儿童和青少年
    gaps.append({
        'gap_id': 'gap_03',
        'importance': '中',
        'description': '儿童和青少年人群证据缺失',
        'current_evidence': '现有研究均为成人研究，儿童和青少年数据缺失',
        'research_need': '需要儿童和青少年人群的药代动力学和疗效安全性研究',
    })
    
    # 缺口4：功能治愈
    gaps.append({
        'gap_id': 'gap_04',
        'importance': '中',
        'description': 'HBsAg清除和功能治愈证据有限',
        'current_evidence': '核苷类单药治疗HBsAg清除率低，TMF在功能治愈方向的数据有限',
        'research_need': '需要联合治疗方案研究以提高HBsAg清除率',
    })
    
    # 缺口5：直接头对头比较
    has_taf = any('TAF经治' in r.get('patient_population', []) for r in records)
    if not has_taf:
        gaps.append({
            'gap_id': 'gap_05',
            'importance': '中',
            'description': '与TAF的头对头比较研究不足',
            'current_evidence': '与TAF的直接比较证据有限，多为间接比较',
            'research_need': '需要TMF与TAF的头对头随机对照研究',
        })
    
    # 缺口6：长期安全性（>3年）
    long_term = sum(1 for r in records if (r.get('follow_up_weeks') or 0) >= 144)
    gaps.append({
        'gap_id': 'gap_06',
        'importance': '中',
        'description': '超长期（>3年）安全性数据仍在积累',
        'current_evidence': f'现有研究最长随访约144周，超过3年的安全性数据有限',
        'research_need': '需要5年以上的长期安全性随访数据',
    })
    
    return {
        'product_name': '恒沐®（艾米替诺福韦片，TMF）',
        'total_gaps': len(gaps),
        'gaps': gaps,
        'key_gap_summary': '主要证据缺口集中在HCC长期结局、患者依从性和留存、儿童人群以及超长期安全性。这些缺口需要通过长期随访研究和真实世界证据建设逐步填补。',
        'generated_at': datetime.now().isoformat(),
    }


def generate_all():
    """生成所有数据文件"""
    print("=" * 60)
    print("生成恒沐/TMF结构化数据")
    print("=" * 60)
    
    # 加载数据
    lit_data = load_json(LIT_PATH)
    studies_data = load_json(STUDIES_PATH)
    
    records = lit_data.get('records', [])
    studies = studies_data.get('studies', [])
    
    print(f"文献数: {len(records)}")
    print(f"研究实体数: {len(studies)}")
    
    # 生成各数据文件
    print("\n1. 生成证据总览...")
    summary = generate_evidence_summary(records, studies)
    save_json(os.path.join(DATA_DIR, 'evidence_summary.json'), summary)
    print("   ✓ evidence_summary.json")
    
    print("2. 生成证据时间轴...")
    timeline = generate_timeline(records, studies)
    save_json(os.path.join(DATA_DIR, 'timeline.json'), timeline)
    print("   ✓ timeline.json")
    
    print("3. 生成患者人群矩阵...")
    populations = generate_population_matrix(records)
    save_json(os.path.join(DATA_DIR, 'populations.json'), populations)
    print("   ✓ populations.json")
    
    print("4. 生成疗效数据...")
    efficacy = generate_efficacy(records)
    save_json(os.path.join(DATA_DIR, 'efficacy.json'), efficacy)
    print("   ✓ efficacy.json")
    
    print("5. 生成安全性数据...")
    safety = generate_safety(records)
    save_json(os.path.join(DATA_DIR, 'safety.json'), safety)
    print("   ✓ safety.json")
    
    print("6. 生成转换治疗证据...")
    switching = generate_switching(records)
    save_json(os.path.join(DATA_DIR, 'switching.json'), switching)
    print("   ✓ switching.json")
    
    print("7. 生成竞品对比...")
    comparators = generate_comparators(records)
    save_json(os.path.join(DATA_DIR, 'comparators.json'), comparators)
    print("   ✓ comparators.json")
    
    print("8. 生成核心洞察...")
    core_insights = generate_core_insights(records, studies)
    save_json(os.path.join(DATA_DIR, 'core_insights.json'), core_insights)
    print("   ✓ core_insights.json")
    
    print("9. 生成市场洞察...")
    market_insights = generate_market_insights(records, studies)
    save_json(os.path.join(DATA_DIR, 'market_insights.json'), market_insights)
    print("   ✓ market_insights.json")
    
    print("10. 生成证据缺口...")
    evidence_gaps = generate_evidence_gaps(records, studies)
    save_json(os.path.join(DATA_DIR, 'evidence_gaps.json'), evidence_gaps)
    print("   ✓ evidence_gaps.json")
    
    print(f"\n{'='*60}")
    print("[完成] 所有数据文件已生成")
    print(f"输出目录: {DATA_DIR}")
    print(f"{'='*60}")
    
    return True


if __name__ == '__main__':
    success = generate_all()
    import sys
    sys.exit(0 if success else 1)
