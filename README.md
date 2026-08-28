# 慢乙肝—HBV相关HCC文献洞察整合报告

基于飞书多维表格1001篇循证医学文献，构建面向2030病毒性肝炎消除目标的文献洞察整合报告。报告以文献证据为基础，紧扣国家2030行动，并进一步提炼全国肝病联盟策略。

## 报告定位

这是一份以近1000篇真实文献内容为主体的循证医学整合报告，而非预先写好的战略口号。内容生成顺序：

```
原始文献内容 → 单篇证据提取 → 同类文献归并 → 跨文献比较
→ 专题医学洞察 → 临床与患者管理启示 → 2030行动意义 → 全国肝病联盟策略
```

## 数据概览

- **文献总量**：1001篇（飞书多维表格全量同步）
- **中国证据**：983篇（98.2%）
- **AB级高质量证据**：559篇（55.8%）
- **文献簇**：12个（覆盖筛诊治管康全链条）
- **专题验证**：3个（HBsAg下降与功能性治愈、经治PegIFN转换、HCC残余风险）
- **跨文献洞察**：21条
- **2030策略**：7项
- **联盟行动**：16项
- **证据缺口**：21条（高风险5条）

## 项目结构

```
/
├── index.html                  # 主页面（SPA单页应用，9个导航页面）
├── assets/
│   ├── styles.css              # 样式（专业医学报告风格）
│   ├── app.js                  # 主逻辑（路由、交互、渲染）
│   ├── charts.js               # ECharts图表配置
│   ├── data.js                 # 打包的真实数据（自动生成，~2.2MB）
│   └── data-adapter.js         # 数据格式适配器（SITE_DATA → APP_DATA）
├── data/
│   ├── public/                 # 公开数据（GitHub Pages可访问）
│   │   ├── literature_index.json     # 文献索引（1001篇）
│   │   ├── statistics.json           # 统计数据
│   │   ├── evidence_clusters.json    # 12个文献簇
│   │   ├── topic_validation.json     # 3个专题验证报告
│   │   ├── data_quality_audit.json   # 数据质量审计报告
│   │   ├── topic_reviews.json        # 7章专题文献综述
│   │   ├── literature_insights.json  # 21条跨文献洞察
│   │   ├── key_study_tables.json     # 15个关键研究比较表
│   │   ├── evidence_gaps.json        # 21条证据缺口
│   │   ├── strategy_2030.json        # 7项2030策略
│   │   └── alliance_actions.json     # 16项联盟行动
│   └── private/                # 私有数据（不提交Git）
├── scripts/
│   ├── fetch_feishu.py         # 飞书数据同步（分页全量读取）
│   ├── normalize_records.py    # 字段映射、清洗、去重
│   ├── audit_data_quality.py   # 数据质量审计（10项检查）
│   ├── build_evidence_cards.py # 深度证据卡片构建
│   ├── build_evidence_clusters.py # 12个文献簇聚类
│   ├── validate_three_topics.py  # 三专题跨文献综合验证
│   ├── generate_insight_files.py  # 生成6个洞察数据文件
│   ├── build_data_js.py        # 打包data.js供前端使用
│   └── validate_output.py      # 质量检查
├── .github/workflows/
│   ├── deploy-pages.yml        # Pages自动部署（含完整数据管线）
│   └── update-insights.yml    # 每周自动更新
├── requirements.txt
└── .env.example
```

## 网站导航

| 页面 | 内容 |
|------|------|
| 文献洞察总览 | 报告头、核心数字、证据图谱、文献簇、专题验证摘要、数据审计、证据缺口、章节导航 |
| 筛查证据 | 筛查转诊闭环、HCC筛查、指南共识 |
| 诊断与标志物 | HBsAg定量、HBV DNA检测与疗效预测 |
| 治疗与功能性治愈 | HBsAg下降、PegIFN转换/联合、NUC治疗、新药管线（含2个专题验证） |
| 患者管理与依从性 | 治疗脱落、依从性改善、随访节点 |
| HBV→HCC | HCC残余风险、筛查与治疗（含1个专题验证） |
| 2030策略 | 7项策略（含证据基础、关键行动）、21条证据缺口 |
| 全国联盟 | 16项联盟行动、架构建议、KPI指标、2025-2030路线图 |
| 证据库 | 1001篇文献全文检索、多维筛选、详情弹窗 |

## 数据管线

```bash
# 1. 同步飞书全量数据
python scripts/fetch_feishu.py

# 2. 标准化记录
python scripts/normalize_records.py

# 3. 数据质量审计
python scripts/audit_data_quality.py

# 4. 构建证据卡片
python scripts/build_evidence_cards.py

# 5. 构建文献簇
python scripts/build_evidence_clusters.py

# 6. 三专题验证
python scripts/validate_three_topics.py

# 7. 生成洞察数据文件
python scripts/generate_insight_files.py

# 8. 打包data.js
python scripts/build_data_js.py

# 9. 验证输出
python scripts/validate_output.py
```

## 部署

### 前提条件

1. GitHub 账号
2. 仓库 Settings → Pages → Source: GitHub Actions
3. 仓库 Secrets 配置：
   - `FEISHU_APP_ID` - 飞书应用ID
   - `FEISHU_APP_SECRET` - 飞书应用密钥
   - `FEISHU_APP_TOKEN` - 飞书多维表格token
   - `FEISHU_TABLE_ID` - 飞书数据表ID

### 本地预览

```bash
# 安装依赖
pip install -r requirements.txt

# 运行完整数据管线
python scripts/fetch_feishu.py
python scripts/normalize_records.py
python scripts/audit_data_quality.py
python scripts/build_evidence_cards.py
python scripts/build_evidence_clusters.py
python scripts/validate_three_topics.py
python scripts/generate_insight_files.py
python scripts/build_data_js.py

# 本地预览
python -m http.server 8000
# 浏览器打开 http://localhost:8000
```

### GitHub Pages部署

推送到 `main` 分支后，GitHub Actions自动：
1. 同步飞书最新数据
2. 运行数据质量审计
3. 构建证据卡片和文献簇
4. 验证三个专题
5. 生成洞察数据文件
6. 打包data.js
7. 部署到GitHub Pages

## 技术栈

- 前端：原生HTML/CSS/JavaScript + ECharts 5.4.3
- 数据：飞书多维表格API + Python数据处理管线
- 部署：GitHub Actions + GitHub Pages
- 无框架依赖，无需构建工具，直接打开即可使用
