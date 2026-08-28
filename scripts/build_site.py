#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
网站构建验证脚本
================
验证所有必需的数据文件存在，检查数据完整性，输出构建报告。

功能：
- 验证数据文件存在性和格式正确性
- 检查 data/public/ 目录完整性
- 验证JSON Schema（如可用）
- 生成构建报告

用法：
    python scripts/build_site.py
    python scripts/build_site.py --check-only
    python scripts/build_site.py --verbose
"""

import os
import sys
import json
import argparse
from datetime import datetime, timezone, timedelta
from pathlib import Path

# ============================================================
# 路径配置
# ============================================================
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
PUBLIC_DIR = DATA_DIR / "public"

# 输入数据文件
LITERATURE_FILE = BASE_DIR / "hbv_literature.ndjson"
INDUSTRY_FILE = BASE_DIR / "industry_insights.ndjson"
LITERATURE_MANIFEST = BASE_DIR / "hbv_literature.manifest.json"
INDUSTRY_MANIFEST = BASE_DIR / "industry_insights.manifest.json"

# 输出数据文件
INSIGHTS_FILE = PUBLIC_DIR / "insights.json"
REPORT_FILE = PUBLIC_DIR / "report.json"
ACTION_MATRIX_FILE = PUBLIC_DIR / "action_matrix.json"
ROADMAP_FILE = PUBLIC_DIR / "roadmap.json"

# 中国时区
CST = timezone(timedelta(hours=8))


def get_now_str():
    return datetime.now(CST).isoformat()


# ============================================================
# 必需文件定义
# ============================================================
REQUIRED_INPUT_FILES = [
    {
        "path": LITERATURE_FILE,
        "name": "HBV文献数据",
        "format": "ndjson",
        "min_records": 1,
        "required_fields": ["record_id", "中文标题", "核心发现", "一级领域"]
    },
    {
        "path": INDUSTRY_FILE,
        "name": "行业洞察数据",
        "format": "ndjson",
        "min_records": 0,  # 可选
        "required_fields": ["record_id", "洞察标题", "一句话结论"]
    }
]

REQUIRED_OUTPUT_FILES = [
    {
        "path": INSIGHTS_FILE,
        "name": "洞察数据",
        "required_keys": ["version", "generated_at", "top_insights", "topic_insights"]
    },
    {
        "path": REPORT_FILE,
        "name": "战略报告",
        "required_keys": ["executive_summary", "goal_2030", "topics", "controversies", "evidence_gaps"]
    },
    {
        "path": ACTION_MATRIX_FILE,
        "name": "行动矩阵",
        "required_keys": ["actions"]
    },
    {
        "path": ROADMAP_FILE,
        "name": "路线图",
        "required_keys": ["vision", "phases"]
    }
]


# ============================================================
# 验证函数
# ============================================================
def validate_file_exists(file_path, file_name):
    """验证文件存在"""
    if file_path.exists():
        size = file_path.stat().st_size
        return True, f"存在 ({size:,} 字节)"
    else:
        return False, "文件不存在"


def validate_ndjson(file_path, required_fields, min_records):
    """验证NDJSON文件格式和字段"""
    if not file_path.exists():
        return False, "文件不存在", 0

    records = []
    errors = []
    with open(file_path, "r", encoding="utf-8") as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                record = json.loads(line)
                records.append(record)
                # 检查必需字段
                missing = [f for f in required_fields if f not in record]
                if missing:
                    errors.append(f"第{line_num}行缺少字段: {', '.join(missing)}")
            except json.JSONDecodeError as e:
                errors.append(f"第{line_num}行JSON解析失败: {e}")

    if len(records) < min_records:
        errors.append(f"记录数不足: 期望至少{min_records}条，实际{len(records)}条")

    if errors:
        return False, "; ".join(errors[:3]), len(records)
    else:
        return True, f"格式正确 ({len(records)} 条记录)", len(records)


def validate_json(file_path, required_keys):
    """验证JSON文件格式和必需键"""
    if not file_path.exists():
        return False, "文件不存在", None

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        return False, f"JSON解析失败: {e}", None

    missing = [k for k in required_keys if k not in data]
    if missing:
        return False, f"缺少必需键: {', '.join(missing)}", data

    return True, "格式正确", data


def validate_insights_structure(data):
    """验证insights.json详细结构"""
    issues = []
    stats = {}

    top_insights = data.get("top_insights", [])
    stats["top_insights_count"] = len(top_insights)

    if len(top_insights) < 3:
        issues.append(f"十大洞察数量偏少: {len(top_insights)} 条")

    # 检查每条洞察的必需字段
    insight_required_fields = [
        "insight_id", "title", "one_sentence", "topic",
        "evidence_strength", "confidence", "source_ids"
    ]
    for i, insight in enumerate(top_insights):
        missing = [f for f in insight_required_fields if f not in insight]
        if missing:
            issues.append(f"洞察#{i+1}缺少字段: {', '.join(missing)}")

    # 专题洞察统计
    topic_insights = data.get("topic_insights", {})
    stats["topics_with_insights"] = len(topic_insights)
    stats["topic_insights_total"] = sum(len(v) for v in topic_insights.values())

    return issues, stats


def validate_report_structure(data):
    """验证report.json详细结构"""
    issues = []
    stats = {}

    # 执行摘要
    exec_summary = data.get("executive_summary", {})
    stats["key_findings_count"] = len(exec_summary.get("key_findings", []))
    stats["key_gaps_count"] = len(exec_summary.get("key_gaps", []))
    stats["priority_actions_count"] = len(exec_summary.get("priority_actions", []))

    # 主题
    topics = data.get("topics", {})
    stats["topics_count"] = len(topics)

    # 争议和证据缺口
    stats["controversies_count"] = len(data.get("controversies", []))
    stats["evidence_gaps_count"] = len(data.get("evidence_gaps", []))

    return issues, stats


def validate_action_matrix_structure(data):
    """验证action_matrix.json详细结构"""
    issues = []
    stats = {}

    actions = data.get("actions", [])
    stats["total_actions"] = len(actions)

    # 按优先级统计
    priority_count = {"高": 0, "中": 0, "低": 0}
    category_count = {}
    topic_count = {}

    action_required_fields = [
        "action_id", "title", "topic", "priority", "kpi", "timeline"
    ]

    for i, action in enumerate(actions):
        missing = [f for f in action_required_fields if f not in action]
        if missing:
            issues.append(f"行动#{i+1}缺少字段: {', '.join(missing)}")

        p = action.get("priority", "未知")
        priority_count[p] = priority_count.get(p, 0) + 1

        c = action.get("category", "未知")
        category_count[c] = category_count.get(c, 0) + 1

        t = action.get("topic", "未知")
        topic_count[t] = topic_count.get(t, 0) + 1

    stats["priority_breakdown"] = priority_count
    stats["category_breakdown"] = category_count
    stats["topic_breakdown"] = topic_count

    return issues, stats


def validate_roadmap_structure(data):
    """验证roadmap.json详细结构"""
    issues = []
    stats = {}

    phases = data.get("phases", [])
    stats["phases_count"] = len(phases)

    if len(phases) < 3:
        issues.append(f"路线图阶段数不足: {len(phases)} 个阶段")

    for i, phase in enumerate(phases):
        phase_required = ["phase", "name", "period", "strategic_goals", "key_actions", "milestones", "kpi_targets"]
        missing = [f for f in phase_required if f not in phase]
        if missing:
            issues.append(f"阶段#{i+1}缺少字段: {', '.join(missing)}")

    return issues, stats


# ============================================================
# 主流程
# ============================================================
def main():
    parser = argparse.ArgumentParser(description="网站构建验证脚本")
    parser.add_argument("--check-only", action="store_true", default=False,
                        help="仅检查，不生成构建报告")
    parser.add_argument("--verbose", action="store_true", default=False,
                        help="详细输出")
    args = parser.parse_args()

    print("=" * 60)
    print("  网站构建验证工具")
    print("=" * 60)

    all_passed = True
    build_report = {
        "build_time": get_now_str(),
        "status": "success",
        "checks": [],
        "statistics": {},
        "errors": [],
        "warnings": []
    }

    # 1. 检查输入文件
    print(f"\n[1/4] 检查输入数据文件...")
    input_stats = {}
    for file_def in REQUIRED_INPUT_FILES:
        path = file_def["path"]
        name = file_def["name"]

        exists, exists_msg = validate_file_exists(path, name)
        if not exists:
            if file_def["min_records"] > 0:
                print(f"  [FAIL] {name}: {exists_msg}")
                build_report["errors"].append(f"{name}: {exists_msg}")
                all_passed = False
            else:
                print(f"  [WARN] {name}: {exists_msg} (可选)")
                build_report["warnings"].append(f"{name}: {exists_msg}")
            build_report["checks"].append({
                "name": name,
                "type": "input",
                "status": "failed" if file_def["min_records"] > 0 else "warning",
                "message": exists_msg
            })
            continue

        valid, msg, count = validate_ndjson(
            path, file_def["required_fields"], file_def["min_records"]
        )
        if valid:
            print(f"  [PASS] {name}: {msg}")
            build_report["checks"].append({
                "name": name,
                "type": "input",
                "status": "passed",
                "message": msg,
                "record_count": count
            })
            input_stats[name] = count
        else:
            print(f"  [FAIL] {name}: {msg}")
            build_report["errors"].append(f"{name}: {msg}")
            build_report["checks"].append({
                "name": name,
                "type": "input",
                "status": "failed",
                "message": msg
            })
            all_passed = False

    build_report["statistics"]["input"] = input_stats

    # 2. 检查输出文件
    print(f"\n[2/4] 检查输出数据文件...")
    output_stats = {}
    all_data = {}

    for file_def in REQUIRED_OUTPUT_FILES:
        path = file_def["path"]
        name = file_def["name"]

        exists, exists_msg = validate_file_exists(path, name)
        if not exists:
            print(f"  [FAIL] {name}: {exists_msg}")
            build_report["errors"].append(f"{name}: {exists_msg}")
            build_report["checks"].append({
                "name": name,
                "type": "output",
                "status": "failed",
                "message": exists_msg
            })
            all_passed = False
            continue

        valid, msg, data = validate_json(path, file_def["required_keys"])
        if valid:
            print(f"  [PASS] {name}: {msg}")
            all_data[name] = data
            build_report["checks"].append({
                "name": name,
                "type": "output",
                "status": "passed",
                "message": msg
            })
        else:
            print(f"  [FAIL] {name}: {msg}")
            build_report["errors"].append(f"{name}: {msg}")
            build_report["checks"].append({
                "name": name,
                "type": "output",
                "status": "failed",
                "message": msg
            })
            all_passed = False

    # 3. 详细结构验证
    print(f"\n[3/4] 验证数据结构完整性...")
    structure_stats = {}

    if "洞察数据" in all_data:
        issues, stats = validate_insights_structure(all_data["洞察数据"])
        structure_stats["insights"] = stats
        if issues:
            for issue in issues:
                print(f"  [WARN] insights: {issue}")
                build_report["warnings"].append(f"insights: {issue}")
        else:
            print(f"  [PASS] insights 结构验证通过")
        if args.verbose:
            for k, v in stats.items():
                print(f"    {k}: {v}")

    if "战略报告" in all_data:
        issues, stats = validate_report_structure(all_data["战略报告"])
        structure_stats["report"] = stats
        if issues:
            for issue in issues:
                print(f"  [WARN] report: {issue}")
                build_report["warnings"].append(f"report: {issue}")
        else:
            print(f"  [PASS] report 结构验证通过")
        if args.verbose:
            for k, v in stats.items():
                print(f"    {k}: {v}")

    if "行动矩阵" in all_data:
        issues, stats = validate_action_matrix_structure(all_data["行动矩阵"])
        structure_stats["action_matrix"] = stats
        if issues:
            for issue in issues:
                print(f"  [WARN] action_matrix: {issue}")
                build_report["warnings"].append(f"action_matrix: {issue}")
        else:
            print(f"  [PASS] action_matrix 结构验证通过")
        if args.verbose:
            for k, v in stats.items():
                print(f"    {k}: {v}")

    if "路线图" in all_data:
        issues, stats = validate_roadmap_structure(all_data["路线图"])
        structure_stats["roadmap"] = stats
        if issues:
            for issue in issues:
                print(f"  [WARN] roadmap: {issue}")
                build_report["warnings"].append(f"roadmap: {issue}")
        else:
            print(f"  [PASS] roadmap 结构验证通过")
        if args.verbose:
            for k, v in stats.items():
                print(f"    {k}: {v}")

    build_report["statistics"]["structure"] = structure_stats

    # 4. 目录完整性检查
    print(f"\n[4/4] 检查 data/public/ 目录完整性...")
    if PUBLIC_DIR.exists():
        files = list(PUBLIC_DIR.glob("*.json"))
        print(f"  [PASS] data/public/ 目录存在，包含 {len(files)} 个JSON文件")
        build_report["checks"].append({
            "name": "data/public目录",
            "type": "directory",
            "status": "passed",
            "message": f"包含 {len(files)} 个JSON文件"
        })
        if args.verbose:
            for f in sorted(files):
                print(f"    - {f.name} ({f.stat().st_size:,} bytes)")
    else:
        print(f"  [FAIL] data/public/ 目录不存在")
        build_report["errors"].append("data/public/ 目录不存在")
        build_report["checks"].append({
            "name": "data/public目录",
            "type": "directory",
            "status": "failed",
            "message": "目录不存在"
        })
        all_passed = False

    # 输出构建报告
    build_report["status"] = "success" if all_passed else "failed"

    if not args.check_only:
        report_path = DATA_DIR / "build_report.json"
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(build_report, f, ensure_ascii=False, indent=2)
        print(f"\n  构建报告已保存: {report_path}")

    # 最终状态
    print("\n" + "=" * 60)
    if all_passed:
        print("  [SUCCESS] 所有检查通过，构建完成")
    else:
        print(f"  [FAILED] 构建存在问题 ({len(build_report['errors'])} 个错误, {len(build_report['warnings'])} 个警告)")
    print("=" * 60)

    # 返回退出码
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
