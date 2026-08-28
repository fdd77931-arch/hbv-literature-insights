# 面向2030行动的慢乙肝—HBV相关HCC全国肝病联盟战略洞察平台

基于飞书多维表格文献库，构建面向2030病毒性肝炎消除目标的国家级战略洞察平台。

## 平台定位

这不是普通的文献检索网站，而是服务于以下目标的战略洞察平台：

- 国家2030病毒性肝炎防控目标
- 中国慢乙肝筛查、诊断和治疗差距
- 全国肝病专病联盟建设
- 慢乙肝患者全程管理
- HBV到HCC全病程管理
- 区域模式复制和全国质量评价

## 项目结构

```
/
├── index.html                  # 主页面（SPA单页应用）
├── assets/
│   ├── styles.css              # 样式（专业医学报告风格）
│   ├── app.js                  # 主逻辑（路由、交互、渲染）
│   ├── charts.js               # ECharts图表配置
│   ├── data.js                 # 打包的真实数据（自动生成）
│   └── data-adapter.js         # 数据格式适配器
├── data/
│   ├── public/                 # 公开数据（GitHub Pages可访问）
│   │   ├── literature_index.json   # 文献索引
│   │   ├── statistics.json         # 统计数据
│   │   ├── insights.json           # 战略洞察
│   │   ├── report.json             # 完整报告
│   │   ├── action_matrix.json      # 行动矩阵
│   │   ├── roadmap.json            # 2030路线图
│   │   └── update_meta.json        # 更新元数据
│   └── private/                # 私有数据（不提交Git）
├── scripts/
│   ├── fetch_feishu.py         # 飞书数据同步（分页+增量）
│   ├── normalize_records.py    # 字段映射、清洗、去重
│   ├── build_evidence_cards.py # 证据卡片构建+标签系统
│   ├── synthesize_insights.py  # AI洞察生成（支持启发式回退）
│   ├── build_data_js.py        # 打包data.js供前端使用
│   ├── build_site.py           # 构建验证工具
│   └── validate_output.py      # 17项质量检查
├── prompts/                    # AI提示词模板
│   ├── evidence_card_prompt.md
│   ├── topic_synthesis_prompt.md
│   └── strategy_report_prompt.md
├── .github/workflows/
│   ├── deploy-pages.yml        # Pages自动部署
│   └── update-insights.yml     # 每周自动更新
├── .env.example                # 环境变量示例
├── requirements.txt
├── README.md
└── .gitignore
```

## 功能特性

### 页面（10个）

| 页面 | 核心内容 |
|------|----------|
| 战略总览（首页） | Hero、6个核心数字、执行摘要、十大洞察、患者漏斗、专题导航、联盟架构、路线图 |
| 2030目标 | WHO三大目标、中国差距对比、四大关键挑战 |
| 筛查专题 | 专题概述、关键洞察、证据分布、中国证据亮点、行动建议 |
| 诊断专题 | 生物标志物、预测模型、精准分层 |
| 治疗专题 | 初治/经治策略、干扰素、新药管线、联合治疗 |
| 管理/康复 | 脱落漏斗、依从性管理、数字化支持 |
| HBV→HCC | 一级预防、风险预测、全病程管理 |
| 全国联盟 | 六层架构、统一标准体系、KPI矩阵、区域模式 |
| 行动路线图 | 2025-2030五阶段时间线、KPI追踪 |
| 证据库 | 全文搜索、多维度筛选、文献详情、证据追溯 |

### 图表（7种）

- 患者管理漏斗图
- 2030目标差距对比图
- 证据等级分布图
- 文献年度趋势图
- 联盟KPI热力图
- 专题分布饼图
- 中外证据对比图

### 筛选维度

- 专题筛选
- 证据等级筛选
- 中国/国际筛选
- 年份筛选
- 2030相关度筛选
- 全文搜索

## 快速开始

### 环境要求

- Python 3.9+
- pip

### 本地运行

```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 配置环境变量（可选，不配则使用本地已有数据）
cp .env.example .env
# 编辑 .env 填入飞书凭证和DeepSeek密钥

# 3. 完整数据处理流程
python scripts/fetch_feishu.py         # 同步飞书数据（无凭证回退到本地NDJSON）
python scripts/normalize_records.py     # 数据清洗与标准化
python scripts/build_evidence_cards.py  # 构建证据卡片
python scripts/synthesize_insights.py   # 生成战略洞察（无API Key用启发式）
python scripts/build_data_js.py         # 打包前端数据
python scripts/validate_output.py       # 质量验证

# 4. 本地预览
python -m http.server 8080
# 浏览器访问 http://localhost:8080
```

### 一键运行

```bash
# 或使用一条命令完成所有构建步骤
python scripts/fetch_feishu.py && \
python scripts/normalize_records.py && \
python scripts/build_evidence_cards.py && \
python scripts/synthesize_insights.py && \
python scripts/build_data_js.py && \
python scripts/validate_output.py
```

## 数据处理流程

```
飞书原始文献 (Feishu Base)
    ↓
[fetch_feishu.py] 分页读取 + 增量同步
    ↓
原始NDJSON (data/private/)
    ↓
[normalize_records.py] 字段映射 · 去重 · 证据等级推断
    ↓
标准化NDJSON (data/private/)
    ↓
[build_evidence_cards.py] 证据卡 · 标签系统 · T1-T7分类
    ↓
证据卡 NDJSON + 公开索引 JSON
    ↓
[synthesize_insights.py] 专题Map-Reduce · 跨专题综合
    ├─ AI模式 (DeepSeek API)
    └─ 启发式模式 (规则+统计)
    ↓
insights.json · report.json · action_matrix.json · roadmap.json
    ↓
[build_data_js.py] 打包为前端数据
    ↓
assets/data.js → 网站加载
```

## 七大专题框架

| 编号 | 专题 | 核心问题 |
|------|------|----------|
| T1 | 2030行动与政策环境 | 政策目标、差距分析、医保可及性 |
| T2 | 筛查与患者发现 | 筛查策略、阳性告知、转诊闭环 |
| T3 | 诊断、分层和疗效预测 | 生物标志物、风险分层、疗效预测 |
| T4 | 治疗和功能性治愈 | 初治/经治策略、干扰素、新药、联合治疗 |
| T5 | 患者管理、依从性与脱落控制 | 脱落漏斗、依从性管理、数字化支持 |
| T6 | HBV到HCC全病程管理 | 一级预防、监测、治疗、协作 |
| T7 | 全国肝病联盟建设 | 分级诊疗、统一标准、质量评价 |

## GitHub Secrets 配置

在仓库 Settings → Secrets and variables → Actions 中添加：

| Secret名称 | 必需 | 说明 |
|-----------|------|------|
| `FEISHU_APP_ID` | 是 | 飞书应用ID |
| `FEISHU_APP_SECRET` | 是 | 飞书应用密钥 |
| `FEISHU_APP_TOKEN` | 是 | 多维表格App Token |
| `FEISHU_TABLE_ID` | 是 | 主表Table ID |
| `DEEPSEEK_API_KEY` | 否 | AI洞察生成（无则用启发式模式） |
| `DEEPSEEK_MODEL` | 否 | 模型名称，默认 deepseek-chat |

## GitHub Actions

### deploy-pages.yml
- **触发**: push到main分支 / 手动运行
- **流程**: 同步飞书 → 生成洞察 → 验证 → 部署GitHub Pages

### update-insights.yml
- **触发**: 每周一凌晨2点（UTC） / 手动运行
- **模式**: sync-only / generate-insights / build-all
- **特性**: 增量更新，无变化则跳过提交和部署

## 飞书字段映射

| 飞书字段 | 内部字段 | 说明 |
|---------|---------|------|
| record_id | id | 记录唯一标识 |
| 中文标题 | title_cn | 中文标题 |
| 文献标题 | title_en | 英文标题 |
| Abstract | abstract | 摘要 |
| 核心发现 | key_findings | 核心发现 |
| Why it matters | why_it_matters | 重要性 |
| 对我们的启示 | our_implication | 综合启示 |
| 一级领域 | topic_primary | 一级主题分类 |
| 二级主题 | topic_secondary | 二级主题标签 |
| 来源类型 | source_type | 国际/中国/指南 |
| 中国市场相关性 | china_relevance | 高/中/低 |
| 中国相关依据 | china_rationale | 相关性说明 |
| 期刊 | journal | 期刊名称 |
| 发表日期 | publish_date | 发表时间 |
| 第一作者 | first_author | 第一作者 |

## 质量保证

`validate_output.py` 执行17项自动检查：

- ✅ JSON格式正确性
- ✅ ID唯一性
- ✅ PMID/DOI去重
- ✅ 公开数据脱敏检查
- ✅ 统计数据一致性
- ✅ 洞察引用有效性
- ✅ 更新元数据完整性
- ✅ 字段完整性

## 当前数据状态

- **文献总量**: 51篇（49篇研究 + 2篇行业洞察）
- **中国证据**: 35篇 (68.6%)
- **A/B级证据**: 49篇 (96.1%)
- **核心洞察**: 10条
- **专题覆盖**: 5个专题有数据（T2/T7待补充）

> 注：当前数据基于飞书HBV文献主表。连接飞书并配置凭证后可同步全量约1000篇文献。

## 技术栈

- **前端**: 原生HTML/CSS/JavaScript + ECharts 5.x
- **数据处理**: Python 3（requests, python-dotenv, jsonschema）
- **AI生成**: DeepSeek API（可选，启发式回退）
- **部署**: GitHub Pages + GitHub Actions
- **数据源**: 飞书多维表格（Feishu Base）

## 安全原则

- 所有密钥仅通过GitHub Secrets读取
- 飞书access_token不写入日志
- DeepSeek API Key不进入前端
- 前端仅读取脱敏后的静态JSON
- 所有AI处理在构建阶段完成
- 公开数据不含敏感信息和版权内容

## 后续扩展

- [ ] 增加T2（筛查）和T7（联盟建设）专题文献
- [ ] 接入PMID和DOI去重
- [ ] AI模式下的增量更新优化
- [ ] 文献引用可视化图谱
- [ ] 多语言支持
- [ ] RSS订阅更新
