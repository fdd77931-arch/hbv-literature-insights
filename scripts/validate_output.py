#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
输出验证脚本
- 验证所有JSON格式正确
- 检查ID唯一性
- 检查PMID/DOI重复
- 检查公开目录不含敏感信息
- 检查统计数字与数据一致
- 输出验证报告
"""

import os
import sys
import json
from pathlib import Path
from collections import Counter

# 项目根目录
ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_PRIVATE = ROOT_DIR / "data" / "private"
DATA_PUBLIC = ROOT_DIR / "data" / "public"

# 要验证的文件
FILES_TO_VALIDATE = {
    "public_literature_index": DATA_PUBLIC / "literature_index.json",
    "public_statistics": DATA_PUBLIC / "statistics.json",
    "public_update_meta": DATA_PUBLIC / "update_meta.json",
    "private_raw": DATA_PRIVATE / "literature_raw.ndjson",
    "private_normalized": DATA_PRIVATE / "literature_normalized.ndjson",
    "private_evidence_cards": DATA_PRIVATE / "evidence_cards.ndjson",
}

# 敏感字段列表（公开版本不应包含）
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
    "password",
    "secret",
    "token",
]


class ValidationReport:
    """验证报告"""

    def __init__(self):
        self.passed = []
        self.warnings = []
        self.errors = []

    def add_pass(self, check_name, detail=""):
        self.passed.append((check_name, detail))

    def add_warning(self, check_name, detail=""):
        self.warnings.append((check_name, detail))

    def add_error(self, check_name, detail=""):
        self.errors.append((check_name, detail))

    @property
    def has_errors(self):
        return len(self.errors) > 0

    def print_report(self):
        print("=" * 60)
        print("验证报告")
        print("=" * 60)

        print(f"\n通过项: {len(self.passed)}")
        for name, detail in self.passed:
            print(f"  [PASS] {name}")
            if detail:
                print(f"         {detail}")

        if self.warnings:
            print(f"\n警告项: {len(self.warnings)}")
            for name, detail in self.warnings:
                print(f"  [WARN] {name}")
                if detail:
                    print(f"         {detail}")

        if self.errors:
            print(f"\n错误项: {len(self.errors)}")
            for name, detail in self.errors:
                print(f"  [FAIL] {name}")
                if detail:
                    print(f"         {detail}")

        print("-" * 60)
        if self.has_errors:
            print(f"结果: 验证失败 ({len(self.errors)} 个错误)")
        elif self.warnings:
            print(f"结果: 验证通过 ({len(self.warnings)} 个警告)")
        else:
            print(f"结果: 验证全部通过")
        print("=" * 60)


def load_json_file(filepath):
    """加载JSON文件"""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data, None
    except json.JSONDecodeError as e:
        return None, f"JSON解析错误: {e}"
    except FileNotFoundError:
        return None, "文件不存在"
    except Exception as e:
        return None, f"读取错误: {e}"


def load_ndjson_file(filepath):
    """加载NDJSON文件"""
    records = []
    errors = []
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                try:
                    record = json.loads(line)
                    records.append(record)
                except json.JSONDecodeError as e:
                    errors.append(f"第{line_num}行: {e}")
        return records, errors
    except FileNotFoundError:
        return None, ["文件不存在"]
    except Exception as e:
        return None, [f"读取错误: {e}"]


def validate_json_format(report):
    """验证所有JSON文件格式正确"""
    print("[验证] JSON格式检查...")

    for name, filepath in FILES_TO_VALIDATE.items():
        if not filepath.exists():
            report.add_warning(f"文件存在: {name}", f"文件不存在: {filepath}")
            continue

        if filepath.suffix == ".json":
            data, error = load_json_file(filepath)
            if error:
                report.add_error(f"JSON格式: {name}", error)
            else:
                report.add_pass(f"JSON格式: {name}", f"文件大小: {filepath.stat().st_size} 字节")

        elif filepath.suffix == ".ndjson":
            records, errors = load_ndjson_file(filepath)
            if errors and "文件不存在" in str(errors):
                report.add_warning(f"文件存在: {name}", f"文件不存在: {filepath}")
            elif errors:
                report.add_error(f"NDJSON格式: {name}", f"{len(errors)} 行解析错误")
            else:
                report.add_pass(f"NDJSON格式: {name}", f"{len(records)} 条记录")


def validate_id_uniqueness(report):
    """检查ID唯一性"""
    print("[验证] ID唯一性检查...")

    # 检查公开索引
    index_file = FILES_TO_VALIDATE["public_literature_index"]
    if index_file.exists():
        data, error = load_json_file(index_file)
        if data and "records" in data:
            ids = [r.get("id", "") for r in data["records"] if r.get("id")]
            id_counts = Counter(ids)
            duplicates = {k: v for k, v in id_counts.items() if v > 1}

            if duplicates:
                report.add_error("ID唯一性: 公开索引",
                                 f"发现 {len(duplicates)} 个重复ID")
            else:
                report.add_pass("ID唯一性: 公开索引",
                                f"{len(ids)} 个唯一ID")

    # 检查私有证据卡
    cards_file = FILES_TO_VALIDATE["private_evidence_cards"]
    if cards_file.exists():
        records, errors = load_ndjson_file(cards_file)
        if records:
            ids = [r.get("id", "") for r in records if r.get("id")]
            id_counts = Counter(ids)
            duplicates = {k: v for k, v in id_counts.items() if v > 1}

            if duplicates:
                report.add_error("ID唯一性: 证据卡",
                                 f"发现 {len(duplicates)} 个重复ID")
            else:
                report.add_pass("ID唯一性: 证据卡",
                                f"{len(ids)} 个唯一ID")


def validate_pmid_doi(report):
    """检查PMID/DOI重复"""
    print("[验证] PMID/DOI重复检查...")

    index_file = FILES_TO_VALIDATE["public_literature_index"]
    if index_file.exists():
        data, error = load_json_file(index_file)
        if data and "records" in data:
            # 检查PMID重复
            pmids = [r.get("pmid", "") for r in data["records"] if r.get("pmid")]
            pmid_counts = Counter(pmids)
            pmid_dups = {k: v for k, v in pmid_counts.items() if v > 1}

            if pmid_dups:
                report.add_warning("PMID重复",
                                   f"发现 {len(pmid_dups)} 个重复PMID")
            else:
                report.add_pass("PMID重复",
                                f"无重复 (有效PMID: {len(pmids)})")

            # 检查DOI重复
            dois = [r.get("doi", "") for r in data["records"] if r.get("doi")]
            doi_counts = Counter(dois)
            doi_dups = {k: v for k, v in doi_counts.items() if v > 1}

            if doi_dups:
                report.add_warning("DOI重复",
                                   f"发现 {len(doi_dups)} 个重复DOI")
            else:
                report.add_pass("DOI重复",
                                f"无重复 (有效DOI: {len(dois)})")


def validate_public_sensitive_data(report):
    """检查公开目录不含敏感信息"""
    print("[验证] 公开数据敏感信息检查...")

    index_file = FILES_TO_VALIDATE["public_literature_index"]
    if not index_file.exists():
        report.add_warning("公开数据脱敏", "公开索引文件不存在")
        return

    data, error = load_json_file(index_file)
    if error:
        report.add_error("公开数据脱敏", f"无法读取文件: {error}")
        return

    records = data.get("records", [])
    found_sensitive = []

    for i, record in enumerate(records):
        for field in SENSITIVE_FIELDS:
            if field in record and record[field]:
                # 对于key_result和clinical_implication是允许的
                if field in ["key_findings"] and "key_result" in record:
                    continue
                found_sensitive.append(f"记录{i}({record.get('id', '?')}): {field}")

    if found_sensitive:
        report.add_error("公开数据脱敏",
                         f"发现 {len(found_sensitive)} 处敏感字段")
        # 只显示前5个
        for item in found_sensitive[:5]:
            report.add_error("  -", item)
    else:
        report.add_pass("公开数据脱敏",
                        f"{len(records)} 条记录均不含敏感字段")


def validate_statistics_consistency(report):
    """检查统计数字与数据一致"""
    print("[验证] 统计数据一致性检查...")

    index_file = FILES_TO_VALIDATE["public_literature_index"]
    stats_file = FILES_TO_VALIDATE["public_statistics"]

    if not index_file.exists():
        report.add_warning("统计一致性", "公开索引文件不存在")
        return
    if not stats_file.exists():
        report.add_warning("统计一致性", "统计文件不存在")
        return

    index_data, idx_err = load_json_file(index_file)
    stats_data, stats_err = load_json_file(stats_file)

    if idx_err or stats_err:
        report.add_error("统计一致性", "无法读取文件")
        return

    records = index_data.get("records", [])
    total_from_index = len(records)
    total_from_stats = stats_data.get("total_literature", 0)

    if total_from_index == total_from_stats:
        report.add_pass("统计一致性: 总数",
                        f"索引{total_from_index} = 统计{total_from_stats}")
    else:
        report.add_error("统计一致性: 总数",
                         f"索引{total_from_index} ≠ 统计{total_from_stats}")

    # 检查中国证据数量
    china_from_index = sum(1 for r in records if r.get("china_evidence", False))
    china_from_stats = stats_data.get("china_evidence_count", 0)

    if china_from_index == china_from_stats:
        report.add_pass("统计一致性: 中国证据",
                        f"索引{china_from_index} = 统计{china_from_stats}")
    else:
        report.add_error("统计一致性: 中国证据",
                         f"索引{china_from_index} ≠ 统计{china_from_stats}")

    # 检查证据等级分布
    level_counts = Counter()
    for r in records:
        level = r.get("evidence_level", "")
        if level:
            level_counts[level] += 1

    stats_levels = stats_data.get("by_evidence_level", {})
    level_match = True
    for level, count in stats_levels.items():
        if level_counts.get(level, 0) != count:
            level_match = False
            break

    if level_match:
        report.add_pass("统计一致性: 证据等级分布", "一致")
    else:
        report.add_error("统计一致性: 证据等级分布",
                         f"索引{dict(level_counts)} ≠ 统计{stats_levels}")

    # 检查年份分布
    year_counts = Counter()
    for r in records:
        year = r.get("year")
        if year:
            year_counts[str(year)] += 1

    stats_years = stats_data.get("by_year", {})
    year_match = True
    for year, count in stats_years.items():
        if year_counts.get(year, 0) != count:
            year_match = False
            break

    if year_match:
        report.add_pass("统计一致性: 年份分布", "一致")
    else:
        report.add_warning("统计一致性: 年份分布",
                           f"索引{dict(year_counts)} ≠ 统计{stats_years}")


def validate_update_meta(report):
    """验证update_meta.json"""
    print("[验证] 更新元数据检查...")

    meta_file = FILES_TO_VALIDATE["public_update_meta"]
    if not meta_file.exists():
        report.add_warning("更新元数据", "文件不存在")
        return

    data, error = load_json_file(meta_file)
    if error:
        report.add_error("更新元数据", error)
        return

    required_fields = ["last_sync", "records_count", "data_source"]
    missing = [f for f in required_fields if f not in data]

    if missing:
        report.add_error("更新元数据: 必填字段", f"缺失: {missing}")
    else:
        report.add_pass("更新元数据: 必填字段", "完整")

    # 检查记录数是否与索引一致
    index_file = FILES_TO_VALIDATE["public_literature_index"]
    if index_file.exists():
        index_data, _ = load_json_file(index_file)
        if index_data:
            idx_total = index_data.get("total", 0)
            meta_count = data.get("records_count", 0)
            if idx_total == meta_count:
                report.add_pass("更新元数据: 记录数一致",
                                f"索引{idx_total} = 元数据{meta_count}")
            else:
                report.add_warning("更新元数据: 记录数一致",
                                   f"索引{idx_total} ≠ 元数据{meta_count}")


def validate_record_fields(report):
    """验证记录字段完整性"""
    print("[验证] 记录字段完整性检查...")

    index_file = FILES_TO_VALIDATE["public_literature_index"]
    if not index_file.exists():
        report.add_warning("字段完整性", "公开索引文件不存在")
        return

    data, error = load_json_file(index_file)
    if error:
        report.add_error("字段完整性", error)
        return

    records = data.get("records", [])
    if not records:
        report.add_warning("字段完整性", "无记录")
        return

    # 检查必填字段
    required_fields = ["id", "title_cn", "year", "evidence_level", "topic_primary"]
    missing_counts = {f: 0 for f in required_fields}

    for record in records:
        for field in required_fields:
            if field not in record or not record[field]:
                missing_counts[field] += 1

    all_present = True
    for field, count in missing_counts.items():
        if count > 0:
            all_present = False
            pct = count / len(records) * 100
            if pct > 50:
                report.add_error(f"字段完整性: {field}",
                                 f"{count}/{len(records)} ({pct:.1f}%) 缺失")
            else:
                report.add_warning(f"字段完整性: {field}",
                                   f"{count}/{len(records)} ({pct:.1f}%) 缺失")

    if all_present:
        report.add_pass("字段完整性: 必填字段",
                        f"{len(records)} 条记录字段完整")


def main():
    print("=" * 60)
    print("输出验证脚本")
    print("=" * 60)

    report = ValidationReport()

    # 各项验证
    validate_json_format(report)
    validate_id_uniqueness(report)
    validate_pmid_doi(report)
    validate_public_sensitive_data(report)
    validate_statistics_consistency(report)
    validate_update_meta(report)
    validate_record_fields(report)

    # 输出报告
    print()
    report.print_report()

    return 1 if report.has_errors else 0


if __name__ == "__main__":
    sys.exit(main())
