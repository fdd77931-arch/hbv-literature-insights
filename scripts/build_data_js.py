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
    
    # 加载所有数据
    literature = load_json('literature_index.json')
    statistics = load_json('statistics.json')
    insights = load_json('insights.json')
    report = load_json('report.json')
    action_matrix = load_json('action_matrix.json')
    roadmap = load_json('roadmap.json')
    update_meta = load_json('update_meta.json')
    
    # 构建数据对象
    site_data = {
        'literature': literature,
        'statistics': statistics,
        'insights': insights,
        'report': report,
        'action_matrix': action_matrix,
        'roadmap': roadmap,
        'update_meta': update_meta,
        'generated_at': datetime.now().isoformat(),
        'version': '1.0.0'
    }
    
    # 生成JavaScript
    js_content = f"""/* ============================================================
   2030肝病联盟战略洞察平台 - 数据包
   由 scripts/build_data_js.py 自动生成
   生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
   ============================================================ */

window.SITE_DATA = {json.dumps(site_data, ensure_ascii=False, indent=2)};
"""
    
    # 写入文件
    os.makedirs(ASSETS_DIR, exist_ok=True)
    output_path = os.path.join(ASSETS_DIR, 'data.js')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(js_content)
    
    # 统计信息
    record_count = literature.get('total', 0) if literature else 0
    insight_count = len(insights.get('top_insights', [])) if insights else 0
    file_size_kb = os.path.getsize(output_path) / 1024
    
    print(f"\n[SUCCESS] data.js 生成完成")
    print(f"  输出文件: {output_path}")
    print(f"  文件大小: {file_size_kb:.1f} KB")
    print(f"  文献记录: {record_count} 条")
    print(f"  核心洞察: {insight_count} 条")
    print(f"  统计数据: {'已加载' if statistics else '缺失'}")
    print(f"  行动矩阵: {'已加载' if action_matrix else '缺失'}")
    print(f"  路线图: {'已加载' if roadmap else '缺失'}")
    
    return True

if __name__ == '__main__':
    success = build_data_js()
    sys.exit(0 if success else 1)
