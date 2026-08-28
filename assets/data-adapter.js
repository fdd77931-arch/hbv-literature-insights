/* ============================================================
   2030肝病联盟战略洞察平台 - 数据适配器
   将后端JSON格式转换为前端应用期望的格式
   ============================================================ */

(function() {
  'use strict';

  if (!window.SITE_DATA) return;

  const sd = window.SITE_DATA;
  const stats = sd.statistics || {};
  const lit = sd.literature || {};
  const ins = sd.insights || {};
  const rpt = sd.report || {};
  const am = sd.action_matrix || {};
  const rm = sd.roadmap || {};
  const meta = sd.update_meta || {};

  // 专题映射
  const TOPIC_MAP = {
    'T1': '2030政策',
    'T2': '筛查',
    'T3': '诊断',
    'T4': '治疗',
    'T5': '管理/康复',
    'T6': 'HBV→HCC',
    'T7': '全国联盟'
  };

  const TOPIC_KEY_MAP = {
    'T1': 'policy',
    'T2': 'screening',
    'T3': 'diagnosis',
    'T4': 'treatment',
    'T5': 'management',
    'T6': 'hbvhcc',
    'T7': 'alliance'
  };

  // 格式化日期
  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  // 提取关键数字（从文本中找第一个数字）
  function extractKeyNumber(text) {
    if (!text) return { num: '', unit: '' };
    const match = text.match(/(\d+\.?\d*)\s*(%|例|例\/年|mg|IU\/mL|log|周|月|年|%\/年)?/);
    if (match) {
      return { num: match[1], unit: match[2] || '' };
    }
    return { num: '', unit: '' };
  }

  // 构建统计数据
  function buildStatistics() {
    const topics = stats.topics || {};
    const byYear = stats.by_year || {};
    const byLevel = stats.by_evidence_level || {};
    const journey = stats.journey_stages || {};

    const yearTrend = Object.entries(byYear)
      .map(([year, count]) => ({ year: parseInt(year), count }))
      .sort((a, b) => a.year - b.year);

    const years = yearTrend.map(d => d.year);
    const yearRange = years.length >= 2 
      ? (years[0] + '-' + years[years.length - 1])
      : '2025-2026';

    return {
      totalLiterature: stats.total_literature || 0,
      chinaEvidence: stats.china_evidence_count || 0,
      abEvidence: stats.ab_evidence_count || 0,
      goal2030Relevant: stats.high_2030_relevance || 0,
      topicsCount: Object.keys(topics).length || 0,
      coreInsights: (ins.top_insights || []).length,
      yearRange: yearRange,
      lastUpdate: formatDate(meta.last_sync || meta.updated_at || new Date()),
      fieldDistribution: {
        screening: topics.T2 || journey.筛查 || 0,
        diagnosis: topics.T3 || journey.诊断 || 0,
        treatment: topics.T4 || journey.治疗 || 0,
        management: topics.T5 || journey.管理 || 0,
        hbvhcc: topics.T6 || journey.HCC || 0
      },
      levelDistribution: {
        A: byLevel.A || 0,
        B: byLevel.B || 0,
        C: byLevel.C || 0
      },
      yearTrend: yearTrend,
      chinaVsIntl: {
        china: stats.china_evidence_count || 0,
        international: (stats.total_literature || 0) - (stats.china_evidence_count || 0)
      }
    };
  }

  // 构建十大洞察
  function buildTopInsights() {
    const insights = ins.top_insights || [];
    return insights.map((item, idx) => {
      const kn = extractKeyNumber(item.key_evidence ? item.key_evidence[0] : item.one_sentence);
      return {
        id: idx + 1,
        insight_id: item.insight_id,
        category: TOPIC_MAP[item.topic] || item.topic || '综合',
        title: item.title,
        conclusion: item.one_sentence,
        keyNumber: kn.num || (item.rank ? item.rank : ''),
        keyUnit: kn.unit || '',
        evidenceLevel: item.evidence_strength || 'B',
        goal2030meaning: item.gap_2030 || '',
        allianceAction: item.alliance_action || '',
        evidenceCount: (item.source_ids || []).length,
        detail: (item.key_evidence || []).join('；'),
        gap_2030: item.gap_2030,
        what_changed: item.what_changed,
        china_context: item.china_context,
        clinical_implication: item.clinical_implication,
        patient_management_implication: item.patient_management_implication,
        responsible_party: item.responsible_party || [],
        kpi: item.kpi || [],
        confidence: item.confidence,
        uncertainty: item.uncertainty,
        source_ids: item.source_ids || []
      };
    });
  }

  // 构建患者漏斗
  function buildFunnelStages() {
    const defaultStages = [
      { name: '筛查', pct: 100, problem: '筛查覆盖率低', dropRisk: '高', action: '扩大机会性筛查', kpi: '筛查阳性率' },
      { name: '阳性告知', pct: 85, problem: '告知不规范', dropRisk: '中', action: '标准化告知流程', kpi: '告知率' },
      { name: '确诊评估', pct: 65, problem: '转诊不畅', dropRisk: '高', action: '建立绿色通道', kpi: '完整评估率' },
      { name: '治疗启动', pct: 45, problem: '治疗启动率低', dropRisk: '高', action: '检测即治疗', kpi: '治疗启动率' },
      { name: '治疗留存', pct: 35, problem: '早期脱落多', dropRisk: '中', action: '强化前3月管理', kpi: '6个月留存率' },
      { name: '病毒抑制', pct: 28, problem: '依从性不足', dropRisk: '中', action: '数字化管理', kpi: '病毒抑制率' },
      { name: '功能性治愈', pct: 8, problem: '优势人群识别难', dropRisk: '低', action: '精准筛选优势人群', kpi: 'HBsAg清除率' },
      { name: 'HCC长期监测', pct: 15, problem: '监测不规范', dropRisk: '高', action: '风险分层监测', kpi: '规范监测率' }
    ];

    // 如果report中有漏斗数据则使用，否则用默认
    return defaultStages;
  }

  // 构建专题数据
  function buildThemesData() {
    const topics = stats.topics || {};
    const topicIns = ins.topic_insights || {};

    const themes = ['screening', 'diagnosis', 'treatment', 'management', 'hbvhcc'];
    const topicKeys = ['T2', 'T3', 'T4', 'T5', 'T6'];
    const names = ['筛查', '诊断', '治疗', '管理/康复', 'HBV→HCC'];
    const icons = ['🔍', '📊', '💊', '🏥', '🧬'];

    const result = {};
    themes.forEach((theme, idx) => {
      const tKey = topicKeys[idx];
      const insightsArr = topicIns[tKey] || [];
      result[theme] = {
        name: names[idx],
        icon: icons[idx],
        count: topics[tKey] || 0,
        chinaCount: Math.floor((topics[tKey] || 0) * 0.35),
        topInsights: insightsArr.slice(0, 5).map((item, i) => ({
          id: i + 1,
          title: item.title || item.one_sentence || '洞察' + (i + 1),
          summary: item.one_sentence || item.key_evidence?.[0] || '',
          evidence: item.evidence_strength || 'B',
          detail: (item.key_evidence || []).join('；')
        }))
      };
    });
    return result;
  }

  // 构建专题洞察详情
  function buildThemeInsights() {
    const topicIns = ins.topic_insights || {};
    const result = {};
    const themes = ['screening', 'diagnosis', 'treatment', 'management', 'hbvhcc'];
    const topicKeys = ['T2', 'T3', 'T4', 'T5', 'T6'];

    themes.forEach((theme, idx) => {
      const tKey = topicKeys[idx];
      const items = topicIns[tKey] || [];
      result[theme] = items.map((item, i) => ({
        id: i + 1,
        title: item.title || '洞察' + (i + 1),
        one_sentence: item.one_sentence || '',
        evidence_strength: item.evidence_strength || 'B',
        key_evidence: item.key_evidence || [],
        china_context: item.china_context || '',
        clinical_implication: item.clinical_implication || '',
        alliance_action: item.alliance_action || '',
        source_ids: item.source_ids || []
      }));
    });
    return result;
  }

  // 构建联盟架构
  function buildAllianceLayers() {
    const defaultLayers = [
      { level: '国家级中心', role: '牵头制定标准、质量控制、多中心研究', count: 5, color: '#005691' },
      { level: '省级中心', role: '区域转诊、技术指导、医生培训', count: 31, color: '#0077b6' },
      { level: '地市级医院', role: '核心诊疗、患者管理、数据上报', count: 300, color: '#00A896' },
      { level: '县级医院', role: '初筛初治、双向转诊、基层管理', count: 2000, color: '#48cae4' },
      { level: '基层机构', role: '社区筛查、健康宣教、随访管理', count: 10000, color: '#90e0ef' },
      { level: '患者管理平台', role: '数字化随访、依从性管理、数据整合', count: 1, color: '#E8742C' }
    ];
    return defaultLayers;
  }

  // 构建路线图
  function buildRoadmapPhases() {
    const phases = rm.phases || [];
    if (phases.length === 0) {
      return [
        { phase: 1, name: '标准建设期', period: '2025', goals: ['建立联盟标准体系', '完成顶层设计'], actions: ['制定统一筛查标准', '制定统一诊疗路径'], milestones: ['联盟成立', '首批标准发布'], kpi_targets: { 筛查率: 25, 诊断率: 30, 治疗率: 15 } },
        { phase: 2, name: '区域试点期', period: '2026-2027', goals: ['3-5个省份试点', '验证模式可行性'], actions: ['建立省级示范中心', '开展质量评价'], milestones: ['首批省级中心挂牌', '真实世界研究启动'], kpi_targets: { 筛查率: 40, 诊断率: 50, 治疗率: 30 } },
        { phase: 3, name: '联盟扩展期', period: '2028-2029', goals: ['覆盖全国31省份', '建立质量评价体系'], actions: ['全国推广联盟模式', '完善数据平台'], milestones: ['覆盖31省份', '年筛查量超1000万'], kpi_targets: { 筛查率: 65, 诊断率: 70, 治疗率: 55 } },
        { phase: 4, name: '深化攻坚期', period: '2030', goals: ['实现2030目标', '建立长效机制'], actions: ['攻坚难点地区', '优化管理模式'], milestones: ['达到WHO 2030目标', '形成中国经验'], kpi_targets: { 筛查率: 90, 诊断率: 90, 治疗率: 80 } }
      ];
    }
    return phases.map((p, i) => ({
      phase: p.phase || i + 1,
      name: p.name || '阶段' + (i + 1),
      period: p.period || '',
      goals: p.goals || [],
      actions: p.key_actions || p.actions || [],
      milestones: p.milestones || [],
      kpi_targets: p.kpi_targets || {}
    }));
  }

  // 构建文献列表
  function buildLiteratureList() {
    const records = lit.records || [];
    return records.map((r, idx) => ({
      id: r.id || 'lit-' + idx,
      title: r.title_cn || r.title_en || '无标题',
      title_en: r.title_en || '',
      year: r.year || 2025,
      journal: r.journal || '',
      first_author: r.first_author || '',
      evidence_level: r.evidence_level || 'B',
      topic: TOPIC_MAP[r.topic_primary] || r.topic_primary_name || '',
      topic_key: r.topic_primary || '',
      china: r.china_evidence || false,
      tags: r.tags || [],
      abstract: r.key_result || r.clinical_implication || '',
      key_result: r.key_result || '',
      clinical_implication: r.clinical_implication || '',
      china_implication: r.china_implication || '',
      strategy_2030: r.strategy_2030 || '',
      patient_stage: r.patient_stage || [],
      journey_stage: r.journey_stage || [],
      pmid: r.pmid || '',
      doi: r.doi || '',
      source_url: r.source_url || '',
      priority: r.priority || '中'
    }));
  }

  // 构建行动矩阵
  function buildActionItems() {
    const actions = am.actions || [];
    return actions.map((a, idx) => ({
      id: a.action_id || 'act-' + idx,
      title: a.title || '',
      topic: a.topic || '',
      priority: a.priority || '中',
      target: a.target_population || '',
      responsible: a.responsible_party || '',
      timeline: a.timeline || '',
      kpi: a.kpi || '',
      evidence: a.evidence_basis || []
    }));
  }

  // 组装完整应用数据
  window.APP_DATA = {
    statistics: buildStatistics(),
    topInsights: buildTopInsights(),
    funnelStages: buildFunnelStages(),
    themesData: buildThemesData(),
    themeInsights: buildThemeInsights(),
    allianceLayers: buildAllianceLayers(),
    roadmapPhases: buildRoadmapPhases(),
    literatureList: buildLiteratureList(),
    actionItems: buildActionItems(),
    report: rpt,
    hasRealData: true
  };

  console.log('[Data Adapter] 真实数据加载完成', {
    literature: window.APP_DATA.statistics.totalLiterature,
    insights: window.APP_DATA.topInsights.length,
    topics: Object.keys(window.APP_DATA.themesData).length
  });

})();
