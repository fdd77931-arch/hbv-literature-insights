#!/usr/bin/env python3
"""
构建 assets/data.js - 将所有公开JSON数据打包为JavaScript变量
使网站无需fetch即可使用真实数据（兼容file://协议和GitHub Pages）
"""

import json
import os
import sys
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
DATA_PUBLIC = os.path.join(PROJECT_DIR, 'data', 'public')
ASSETS_DIR = os.path.join(PROJECT_DIR, 'assets')

def load_json(filename):
    path = os.path.join(DATA_PUBLIC, filename)
    if not os.path.exists(path):
        print(f"[WARN] 缺少文件: {filename}")
        return None
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def build_data_js():
    print("=" * 60)
    print("构建 data.js - 网站数据打包")
    print("=" * 60)

    # 加载核心数据
    literature = load_json('literature_index.json')
    statistics = load_json('statistics.json')
    update_meta = load_json('update_meta.json')

    # 加载证据数据
    evidence_clusters = load_json('evidence_clusters.json')
    topic_validation = load_json('topic_validation.json')
    data_quality_audit = load_json('data_quality_audit.json')

    # 加载洞察数据
    topic_reviews = load_json('topic_reviews.json')
    literature_insights = load_json('literature_insights.json')
    key_study_tables = load_json('key_study_tables.json')
    evidence_gaps = load_json('evidence_gaps.json')
    strategy_2030 = load_json('strategy_2030.json')
    alliance_actions = load_json('alliance_actions.json')

    # 加载旧数据（兼容）
    insights = load_json('insights.json')
    report = load_json('report.json')

    # 构建数据对象
    site_data = {
        'literature': literature,
        'statistics': statistics,
        'update_meta': update_meta,
        'evidence_clusters': evidence_clusters,
        'topic_validation': topic_validation,
        'data_quality_audit': data_quality_audit,
        'topic_reviews': topic_reviews,
        'literature_insights': literature_insights,
        'key_study_tables': key_study_tables,
        'evidence_gaps': evidence_gaps,
        'strategy_2030': strategy_2030,
        'alliance_actions': alliance_actions,
        'insights': insights,
        'report': report,
        'generated_at': datetime.now().isoformat(),
        'version': '2.0.0'
    }

    # 生成JavaScript
    js_content = f"""/* ============================================================
   慢乙肝-HBV相关HCC文献洞察整合报告 - 数据包
   由 scripts/build_data_js.py 自动生成
   生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
   ============================================================ */

window.SITE_DATA = {json.dumps(site_data, ensure_ascii=False)};
"""

    # 写入文件
    os.makedirs(ASSETS_DIR, exist_ok=True)
    output_path = os.path.join(ASSETS_DIR, 'data.js')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(js_content)

    # 统计信息
    record_count = literature.get('total', 0) if literature else 0
    cluster_count = evidence_clusters.get('total_clusters', 0) if evidence_clusters else 0
    topic_count = len(topic_validation.get('topics', [])) if topic_validation else 0
    insight_count = literature_insights.get('total_insights', 0) if literature_insights else 0
    strategy_count = strategy_2030.get('total_strategies', 0) if strategy_2030 else 0
    file_size_kb = os.path.getsize(output_path) / 1024

    print(f"\n[SUCCESS] data.js 生成完成")
    print(f"  输出文件: {output_path}")
    print(f"  文件大小: {file_size_kb:.1f} KB")
    print(f"  文献记录: {record_count} 条")
    print(f"  文献簇: {cluster_count} 个")
    print(f"  验证专题: {topic_count} 个")
    print(f"  跨文献洞察: {insight_count} 条")
    print(f"  2030策略: {strategy_count} 条")
    print(f"  数据质量审计: {'已加载' if data_quality_audit else '缺失'}")
    print(f"  专题综述: {'已加载' if topic_reviews else '缺失'}")
    print(f"  证据缺口: {'已加载' if evidence_gaps else '缺失'}")
    print(f"  联盟行动: {'已加载' if alliance_actions else '缺失'}")

    return True

if __name__ == '__main__':
    success = build_data_js()
    sys.exit(0 if success else 1)
