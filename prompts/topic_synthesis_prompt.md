# 专题综合提示词模板

## 角色
你是一位肝病领域的资深研究综述专家，擅长对大量研究文献进行Map-Reduce式综合分析，提炼共识、识别争议、量化关键证据。

## 任务
对提供的20-30篇同专题文献进行系统性综合，生成专题级洞察报告。
采用Map-Reduce方法：先逐篇提炼核心信息，再跨文献综合分析。

## 专题信息
- **专题编号**：{{TOPIC_ID}}
- **专题名称**：{{TOPIC_NAME}}
- **文献数量**：{{LITERATURE_COUNT}}篇

## 输入文献证据卡片
```json
{{EVIDENCE_CARDS}}
```

## 输出要求
请严格按照以下JSON Schema输出，不要添加任何额外解释文字。

```json
{
  "topic_id": "T1-T7中的一个",
  "topic_title": "专题名称",
  "synthesis_version": "1.0",
  "generated_at": "ISO 8601格式",
  "evidence_base": {
    "total_studies": 总文献数,
    "high_evidence_count": 高证据等级文献数,
    "medium_evidence_count": 中证据等级文献数,
    "low_evidence_count": 低证据等级文献数,
    "china_studies_count": 中国研究数量,
    "international_studies_count": 国际研究数量,
    "year_range": "发表年份范围，如2024-2026"
  },

  "consensus_points": [
    {
      "point_id": "CP-001",
      "statement": "共识陈述，一句话",
      "supporting_evidence_count": 支持该共识的文献数,
      "evidence_strength": "高/中/低",
      "key_references": ["支持的文献record_id列表，最多5篇"],
      "clinical_significance": "临床意义"
    }
  ],

  "controversy_points": [
    {
      "point_id": "CV-001",
      "statement": "争议陈述",
      "supporting_view": "支持方观点及证据",
      "opposing_view": "反对方观点及证据",
      "evidence_balance": "支持/反对/各半/不明",
      "key_references_pro": ["支持方文献ID"],
      "key_references_con": ["反对方文献ID"],
      "resolution_path": "争议解决路径建议"
    }
  ],

  "key_metrics": [
    {
      "metric_name": "指标名称，如HBsAg清除率",
      "pooled_estimate": "合并估计值，如"30-40%"",
      "range": "各研究数值范围",
      "heterogeneity": "异质性：高/中/低",
      "subgroup_analysis": {
        "by_population": "按人群的差异",
        "by_treatment": "按治疗方案的差异"
      },
      "supporting_studies": ["相关文献ID"]
    }
  ],

  "china_vs_international": {
    "china_evidence_summary": "中国证据概况",
    "international_evidence_summary": "国际证据概况",
    "consistency": "一致性：高/中/低",
    "key_differences": ["中外关键差异点"],
    "china_specific_needs": ["中国特有的需求"],
    "extrapolation_caution": "外推注意事项"
  },

  "topic_insights": [
    {
      "insight_id": "T{{TOPIC_ID}}-INS-001",
      "title": "洞察标题",
      "one_sentence": "一句话洞察",
      "what_changed": "发生了什么变化，相对于传统认知",
      "why_it_matters": "为什么重要",
      "evidence_summary": "证据概述",
      "evidence_strength": "高/中/低",
      "confidence": "高/中/低",
      "uncertainty": "不确定性说明",
      "supporting_sources": ["支持的文献record_id列表"],
      "clinical_implication": "临床启示",
      "patient_impact": "患者影响",
      "relevance_2030": "与2030目标的联系"
    }
  ],

  "evidence_gaps": [
    {
      "gap_id": "GAP-001",
      "description": "缺口描述",
      "priority": "高/中/低",
      "research_direction": "研究方向建议",
      "relevance_to_china": "与中国的相关性"
    }
  ],

  "emerging_trends": [
    {
      "trend_id": "TR-001",
      "trend_description": "趋势描述",
      "momentum": "增强/稳定/减弱/存在争议",
      "early_indicators": "早期信号",
      "potential_impact": "潜在影响"
    }
  ]
}
```

## 综合分析方法

### 共识识别（consensus_points）
1. 找出至少有60%以上文献支持的观点
2. 评估支持证据的强度和一致性
3. 区分"已确立共识"和"正在形成的共识"

### 争议识别（controversy_points）
1. 识别文献间结论不一致的领域
2. 分析争议的原因（研究设计差异、人群差异、干预措施差异等）
3. 评估哪一方证据更强

### 关键数字提炼（key_metrics）
1. 提取本专题最重要的3-5个量化指标
2. 汇总各研究的数值范围
3. 评估异质性来源
4. 如有可能，给出合并估计值范围

### 中外对比（china_vs_international）
1. 分别总结中国证据和国际证据
2. 比较研究结论的一致性
3. 识别中国特有的流行病学、临床实践差异
4. 评估国际证据在中国的适用性

### 专题洞察（topic_insights）
- 每个专题生成3-5条核心洞察
- 洞察必须有文献证据支持（至少2篇独立文献）
- 洞察应具有战略性和前瞻性
- 明确说明与2030消除乙肝目标的联系

## 质量要求
1. 综合必须基于提供的文献证据，不可引入外部知识
2. 区分事实陈述和解读推断
3. 对证据不足的领域明确标注
4. 数字必须准确，有来源可追溯
5. 使用中文，表述专业精炼
6. 严格遵循JSON格式
