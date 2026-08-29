#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
受影响专题更新脚本
- 读取变化报告
- 只更新受影响的专题
- 不重建无关专题
"""

import os
import sys
import json
import subprocess
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = ROOT_DIR / "scripts"
DATA_PUBLIC = ROOT_DIR / "data" / "public"
CHANGE_REPORT = DATA_PUBLIC / "change_report.json"

PAGE_TO_OVERVIEW = {
    "screening": "screening_overview.json",
    "diagnosis": "diagnosis_overview.json",
    "treatment": "treatment_overview.json",
    "management": "management_overview.json",
    "hbvhcc": "hcc_overview.json",
}


def load_change_report():
    if not CHANGE_REPORT.exists():
        print("[INFO] 无变化报告，跳过受影响专题更新")
        return None
    with open(CHANGE_REPORT, "r", encoding="utf-8") as f:
        return json.load(f)


def run_script(script_name):
    script_path = SCRIPTS_DIR / script_name
    if not script_path.exists():
        print(f"[WARN] 脚本不存在: {script_name}")
        return False
    result = subprocess.run(
        [sys.executable, str(script_path)],
        cwd=str(ROOT_DIR),
        capture_output=True,
        text=True,
        timeout=300,
    )
    if result.returncode != 0:
        print(f"[ERROR] {script_name} 执行失败:")
        print(result.stderr[-500:] if result.stderr else "无错误输出")
        return False
    print(f"[OK] {script_name} 执行成功")
    return True


def update_affected():
    print("=" * 60)
    print("受影响专题更新")
    print("=" * 60)

    report = load_change_report()
    if not report:
        print("[INFO] 无变化报告")
        return True

    if not report.get("has_changes"):
        print("[INFO] 无数据变化，跳过专题更新")
        return True

    affected = report.get("affected_pages", [])
    if not affected:
        print("[INFO] 无受影响专题页")
        return True

    print(f"受影响专题页: {', '.join(affected)}")

    # 1. 重建证据簇（因为文献关联可能变化）
    print("\n[步骤1] 重建证据簇...")
    run_script("build_evidence_clusters.py")

    # 2. 更新受影响的专题综合
    print("\n[步骤2] 更新受影响专题综合...")
    run_script("generate_full_insights.py")

    # 3. 更新首页洞察
    print("\n[步骤3] 更新首页洞察...")
    insight_script = SCRIPTS_DIR / "generate_full_insights.py"
    if insight_script.exists():
        run_script("generate_full_insights.py")

    # 4. 更新统计
    print("\n[步骤4] 更新统计数据...")
    stats_script = SCRIPTS_DIR / "build_evidence_clusters.py"
    if stats_script.exists():
        run_script("build_evidence_clusters.py")

    # 5. 更新最新证据动态
    print("\n[步骤5] 更新最新证据动态...")
    latest_script = SCRIPTS_DIR / "generate_full_insights.py"
    if latest_script.exists():
        run_script("generate_full_insights.py")

    print("\n[完成] 受影响专题更新完成")
    return True


if __name__ == "__main__":
    update_affected()
    sys.exit(0)
