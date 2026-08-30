/* ============================================================
   慢乙肝—HBV相关HCC文献洞察与2030市场策略报告
   报告式渲染逻辑 — 基于hbv-insights.html视觉语言
   ============================================================ */

var App = (function() {
  'use strict';

  var D = null;
  var currentPage = 'overview';
  var evidencePage = 1;
  var evidencePerPage = 20;
  var evidenceFiltered = [];

  var CLUSTER_NAV = {
    'C01_hbsag_decline_functional_cure': 'treatment',
    'C02_pegifn_switch': 'treatment',
    'C03_hcc_residual_risk': 'hbvhcc',
    'C04_nuc_treatment': 'treatment',
    'C05_hbsag_quantification': 'diagnosis',
    'C06_hbv_dna_suppression': 'treatment',
    'C07_hcc_screening': 'hbvhcc',
    'C08_hcc_treatment': 'hbvhcc',
    'C09_new_drugs': 'treatment',
    'C10_patient_management': 'management',
    'C11_guidelines': 'screening',
    'C12_screening_cascade': 'screening'
  };

  var PAGE_CONFIG = {
    screening: {
      title: '筛查与患者发现',
      chLabel: '第一章 · 筛',
      clusters: ['C12_screening_cascade', 'C07_hcc_screening', 'C11_guidelines'],
      topicCodes: ['T1'],
      intro: '本专题聚焦HBV筛查策略、筛查到确诊的闭环管理，以及相关指南与共识。'
    },
    diagnosis: {
      title: '诊断、分层与疗效预测',
      chLabel: '第二章 · 诊',
      clusters: ['C05_hbsag_quantification'],
      topicCodes: ['T3'],
      intro: '本专题聚焦HBsAg定量检测与疗效预测、HBV DNA抑制与病毒学应答等诊断标志物。'
    },
    treatment: {
      title: '治疗与功能性治愈',
      chLabel: '第三章 · 治',
      clusters: ['C01_hbsag_decline_functional_cure', 'C02_pegifn_switch', 'C04_nuc_treatment', 'C06_hbv_dna_suppression', 'C09_new_drugs'],
      topicCodes: ['T4', 'T3'],
      topics: ['topic1_hbsag_functional_cure', 'topic2_pegifn_switch_addon'],
      intro: '本专题已完成2个专题的跨文献综合验证，涵盖HBsAg下降与功能性治愈、经治患者转换或联合PegIFN。'
    },
    management: {
      title: '患者脱落、依从性与长期管理',
      chLabel: '第四章 · 管/康',
      clusters: ['C10_patient_management'],
      topicCodes: [],
      intro: '本专题聚焦患者管理与依从性，包括治疗脱落阶段分析、依从性改善策略和强化随访节点。'
    },
    hbvhcc: {
      title: '从一级预防到HCC全病程',
      chLabel: '第五章 · HBV→HCC',
      clusters: ['C03_hcc_residual_risk', 'C07_hcc_screening', 'C08_hcc_treatment'],
      topicCodes: ['T6', 'T7'],
      topics: ['topic3_hcc_residual_risk'],
      intro: '本专题已完成1个专题的跨文献综合验证，聚焦HBV抑制或HBsAg清除后HCC残余风险。'
    }
  };

  // ==================== 初始化 ====================
  function init() {
    try {
      D = window.APP_DATA;
      if (!D || !D.hasRealData) {
        document.getElementById('loadingOverlay').innerHTML =
          '<div class="loading-text" style="color:var(--accent2);">数据加载失败，请确保data.js已正确加载</div>';
        return;
      }

      document.getElementById('loadingOverlay').style.display = 'none';
      document.getElementById('mainContent').style.display = 'block';

      renderOverview();
      initEvidenceFilters();

      var searchInput = document.getElementById('evSearchInput');
      if (searchInput) {
        searchInput.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') evidenceSearch();
        });
      }

      console.log('[App] 初始化完成');
    } catch (e) {
      console.error('[App] 初始化失败:', e);
      var overlay = document.getElementById('loadingOverlay');
      if (overlay) {
        overlay.innerHTML =
          '<div class="loading-text" style="color:var(--accent2);">' +
          '页面加载出现问题，请刷新重试<br>' +
          '<small style="font-weight:normal;opacity:0.7;">错误: ' + esc(e.message) + '</small>' +
          '</div>';
      }
      // 即使出错也尝试显示主内容
      var main = document.getElementById('mainContent');
      if (main) main.style.display = 'block';
    }
  }

  // ==================== 导航 ====================
  function navigate(page) {
    currentPage = page;
    var pages = document.querySelectorAll('.page');
    for (var i = 0; i < pages.length; i++) {
      pages[i].classList.remove('active');
    }
    var target = document.getElementById('page-' + page);
    if (target) target.classList.add('active');

    var navItems = document.querySelectorAll('.nav-item');
    for (var j = 0; j < navItems.length; j++) {
      navItems[j].classList.toggle('active', navItems[j].getAttribute('data-page') === page);
    }

    window.scrollTo(0, 0);

    switch (page) {
      case 'overview': renderOverview(); break;
      case 'screening': renderTopicPage('screening'); break;
      case 'diagnosis': renderTopicPage('diagnosis'); break;
      case 'treatment': renderTopicPage('treatment'); break;
      case 'management': renderTopicPage('management'); break;
      case 'hbvhcc': renderTopicPage('hbvhcc'); break;
      case 'strategy': renderStrategyPage(); break;
      case 'alliance': renderAlliancePage(); break;
      case 'evidence': renderEvidencePage(); break;
      case 'updates': renderUpdatesPage(); break;
      case 'tmf': renderTMFPage(); break;
    }
  }

  function toggleMobileMenu() {
    document.getElementById('mobileMenu').classList.toggle('show');
  }

  // ==================== 首页渲染 ====================
  function renderOverview() {
    var stats = D.statistics;

    // Hero元数据
    document.getElementById('ovUpdateDate').textContent = stats.lastUpdate || '2026年8月';
    document.getElementById('ovTotalLit').textContent = stats.totalLiterature;
    if (D.meta) {
      document.getElementById('ovInsightVersion').textContent = 'v' + (D.meta.version || '5.0');
    }
    var lu = D.latestUpdates || {};
    document.getElementById('ovNewCount').textContent = (lu.recentCount7d || 0) + '篇(7天)';

    // 图表数量和日期
    var charts = D.charts || {};
    var chartCount = Object.keys(charts).length;
    document.getElementById('ovChartCount').textContent = chartCount;
    var firstChart = charts[Object.keys(charts)[0]];
    if (firstChart && firstChart.generated_at) {
      document.getElementById('ovChartDate').textContent = firstChart.generated_at.slice(0, 10).replace(/-/g, '年') + '月';
    }

    // 1. Hero首屏核心洞察
    renderHeroCoreInsights();

    // 2. 2030差距仪表盘 + 洞察面板
    renderGapInsightPanel();

    // 3. 各图表洞察面板
    renderScreeningInsightPanel();
    renderBiomarkerInsightPanel();
    renderTreatmentInsightPanel();
    renderMarketInsightPanel();

    // 4. 市场行动卡片
    renderMarketActionCards();

    // 4.5 TMF产品相关核心洞察
    renderTMFOverviewSection();

    // 5. 最新证据动态
    renderLatestUpdates();

    // 6. 初始化所有策略图表
    setTimeout(function() {
      if (window.ChartFns && window.echarts) {
        try {
          var c = document.getElementById('chart2030Gap'); if (c) ChartFns.init2030GapChart(c);
          c = document.getElementById('chartScreeningFunnel'); if (c) ChartFns.initScreeningFunnelChart(c);
          c = document.getElementById('chartBiomarkerBubble'); if (c) ChartFns.initBiomarkerBubbleChart(c);
          c = document.getElementById('chartTreatmentOutcomes'); if (c) ChartFns.initTreatmentOutcomesChart(c);
          c = document.getElementById('chartPipelineBubble'); if (c) ChartFns.initPipelineBubbleChart(c);
          c = document.getElementById('chartPatientRetention'); if (c) ChartFns.initPatientRetentionChart(c);
          c = document.getElementById('chartHCCRisk'); if (c) ChartFns.initHCCRiskChart(c);
          c = document.getElementById('chartAllianceMatrix'); if (c) ChartFns.initAllianceMatrixChart(c);
          c = document.getElementById('chartMarketStrategy'); if (c) ChartFns.initMarketStrategyChart(c);
          c = document.getElementById('chartEvidenceQuality'); if (c) ChartFns.initEvidenceQualityChart(c);
          c = document.getElementById('chartYearTrend'); if (c) ChartFns.initYearTrendChart(c);
        } catch (e) {
          console.error('[Charts] 图表初始化失败:', e);
        }
      } else {
        console.warn('[Charts] 图表库未加载，跳过图表渲染');
      }
    }, 150);

    // 7. 数据质量审计
    renderAudit();

    // 8. 证据缺口
    renderOverviewGaps();

    // 9. 章节导航
    renderChapterNav();
  }

  // ==================== Hero首屏核心洞察 ====================
  function renderHeroCoreInsights() {
    var hi = D.homepageInsights || {};
    var insights = hi.insights || [];
    if (!insights.length) {
      document.getElementById('heroCoreInsights').innerHTML = '';
      return;
    }

    // 取前6条作为首屏核心洞察
    var displayInsights = insights.slice(0, 6);
    var trendMap = {
      '增强': 'strengthening',
      '减弱': 'weakening',
      '新出现': 'emerging',
      '争议': 'controversial',
      '稳定': 'stable',
      '高': 'strengthening',
      '中高': 'emerging',
      '中': 'stable',
      '较低': 'weakening'
    };
    var trendLabelMap = {
      'strengthening': '增强',
      'weakening': '减弱',
      'emerging': '新出现',
      'controversial': '争议',
      'stable': '稳定'
    };

    var meaning2030Map = {
      'screening': '提升筛查覆盖率与确诊衔接效率，是实现2030消除目标的前端关键。',
      'diagnosis': '精准分层与疗效预测有助于优化治疗路径分配，提高有限医疗资源的投入产出比。',
      'treatment': '功能性治愈方向的证据积累推动治疗目标升级，影响长期随访与再治疗策略。',
      'management': '降低脱落率与提升长期依从性是实现持续病毒学应答的必要条件。',
      'hcc': '降低HCC残余风险是慢乙肝管理的终局目标，直接关联2030死亡率下降指标。',
      'alliance': '联盟协作模式可加速筛查-治疗闭环落地，是规模化实现2030目标的组织保障。'
    };

    var marketImplicationMap = {
      'screening': '市场部可重点布局筛查转诊项目、基层医生教育和患者早诊早治观念教育。',
      'diagnosis': '可围绕生物标志物检测推动精准诊疗观念，支持检测试剂与伴随诊断相关合作。',
      'treatment': '围绕功能性治愈趋势布局产品管线沟通，强化经治患者转换/联合治疗的证据传递。',
      'management': '患者管理项目（随访、依从性干预）是差异化服务的重要方向，可提升品牌忠诚度。',
      'hcc': 'HCC风险分层与监测是高医学价值沟通点，可联动肝病科与肿瘤科跨学科平台。',
      'alliance': '全国/区域联盟项目是大客户管理的重要载体，可构建长期战略合作关系。'
    };

    var html = displayInsights.map(function(ins, idx) {
      var trendClass = trendMap[ins.confidence] || 'stable';
      var trendText = trendLabelMap[trendClass] || '稳定';
      var topLevel = ins.topLevel || (ins.abCount && ins.abCount > 0 ? 'A级' : 'B级');
      var meaning2030 = meaning2030Map[ins.category] || '对实现WHO 2030消除乙肝目标具有重要支持意义。';
      var marketImplication = marketImplicationMap[ins.category] || '市场部可据此优化证据传递策略与资源投入方向。';
      var sourceIds = ins.sourceIds || ins.source_ids || [];

      return '<div class="hero-insight-item">' +
        '<span class="hi-trend ' + trendClass + '">' + trendText + '</span>' +
        '<div class="hi-conclusion-title">' + esc(ins.title || '') + '</div>' +
        '<div class="hi-conclusion">' + esc(ins.oneLine || '') + '</div>' +
        '<div class="hi-meta">' +
          '<span>' + (ins.evidenceCount || 0) + '篇文献支持</span>' +
          '<span>最高证据等级: ' + esc(topLevel) + '</span>' +
          (ins.abCount ? '<span>AB级 ' + ins.abCount + ' 篇</span>' : '') +
        '</div>' +
        '<div class="hi-2030-meaning">' +
          '<span class="hi-sub-label">2030目标意义：</span>' + esc(meaning2030) +
        '</div>' +
        '<div class="hi-market-implication">' +
          '<span class="hi-sub-label">市场部启示：</span>' + esc(marketImplication) +
        '</div>' +
        '<button class="hi-evidence-btn" onclick="App.openEvidenceDrawer(\'' + esc(ins.title || '') + '\', ' + JSON.stringify(sourceIds).replace(/"/g, '&quot;') + ')">查看证据 →</button>' +
      '</div>';
    }).join('');

    document.getElementById('heroCoreInsights').innerHTML = html;
  }

  // ==================== 构建策略面板通用HTML ====================
  function buildStrategyPanelHtml(chart, defaults) {
    defaults = defaults || {};
    var whatItSays = chart.key_insight || defaults.whatItSays || '';
    var keyPopulation = chart.key_population || defaults.keyPopulation || '慢乙肝全人群，含初治与经治患者';
    var marketOpportunity = chart.market_opportunity || defaults.marketOpportunity || '';
    var recommendedActions = chart.recommended_actions || defaults.recommendedActions || ['持续监测证据变化，适时调整沟通策略'];
    var kpiList = chart.recommended_kpi || defaults.kpiList || [];
    var compliance = chart.compliance_note || defaults.compliance || '本洞察为文献证据综合分析，不构成临床推荐或营销建议。具体市场活动需符合相关法律法规和医学伦理要求。';
    var sourceIds = chart.source_ids || defaults.sourceIds || [];
    var panelTitle = defaults.panelTitle || '策略洞察';

    var actionsHtml = '';
    if (recommendedActions && recommendedActions.length) {
      actionsHtml = '<ol>';
      recommendedActions.forEach(function(a) {
        actionsHtml += '<li>' + esc(a) + '</li>';
      });
      actionsHtml += '</ol>';
    }

    var kpiHtml = '';
    if (kpiList && kpiList.length) {
      kpiHtml = kpiList.map(function(k) {
        return '<span class="sp-kpi-tag">' + esc(k) + '</span>';
      }).join('');
    } else {
      kpiHtml = '<span class="sp-kpi-tag">待设定</span>';
    }

    var sourceIdsJson = JSON.stringify(sourceIds).replace(/"/g, '&quot;');

    return '<div class="strategy-panel">' +
      '<div class="sp-section">' +
        '<div class="sp-label">这张图说明什么</div>' +
        '<div class="sp-value what-it-says">' + esc(whatItSays) + '</div>' +
      '</div>' +
      '<div class="sp-section">' +
        '<div class="sp-label">关键人群</div>' +
        '<div class="sp-value key-population">' + esc(keyPopulation) + '</div>' +
      '</div>' +
      '<div class="sp-section">' +
        '<div class="sp-label">市场机会</div>' +
        '<div class="sp-value market-opportunity">' + esc(marketOpportunity) + '</div>' +
      '</div>' +
      '<div class="sp-section sp-actions-section">' +
        '<div class="sp-label">建议行动</div>' +
        '<div class="sp-value recommended-actions">' + actionsHtml + '</div>' +
      '</div>' +
      '<div class="sp-section sp-kpi-section">' +
        '<div class="sp-label">衡量指标（KPI）</div>' +
        '<div class="sp-value sp-kpi-value">' + kpiHtml + '</div>' +
      '</div>' +
      '<div class="sp-section sp-compliance-section">' +
        '<div class="sp-label">合规边界</div>' +
        '<div class="sp-value compliance-text">' + esc(compliance) + '</div>' +
      '</div>' +
      '<div class="sp-evidence-footer">' +
        '<button class="evidence-drawer-btn" onclick="App.openEvidenceDrawer(\'' + esc(panelTitle) + '\', ' + sourceIdsJson + ')">查看证据 →</button>' +
      '</div>' +
    '</div>';
  }

  // ==================== 2030差距洞察面板 ====================
  function renderGapInsightPanel() {
    var chart = (D.charts && D.charts['2030_gap']) || {};
    var defaults = {
      panelTitle: '2030差距分析',
      whatItSays: '筛查后确诊、确诊后评估、治疗后长期管理是证据提示的三个主要断点。',
      keyPopulation: 'HBV感染者全周期人群，含未确诊、未治疗、治疗中及随访脱落人群',
      marketOpportunity: '重点支持筛查转诊网络、标准化评估包、患者长期管理项目。',
      recommendedActions: [
        '布局筛查-确诊-治疗-随访全链条管理项目',
        '与区域联盟合作推动连续管理模式落地',
        '强化患者脱落节点的干预与召回机制'
      ],
      kpiList: ['筛查转化率', '治疗覆盖率', '随访依从率'],
      compliance: '2030目标相关数据为文献综合推导，具体市场活动需以获批适应症与合规要求为准。',
      sourceIds: []
    };
    document.getElementById('gapInsightPanel').innerHTML = buildStrategyPanelHtml(chart, defaults);
  }

  // ==================== 筛查洞察面板 ====================
  function renderScreeningInsightPanel() {
    var chart = (D.charts && D.charts['screening_funnel']) || {};
    var defaults = {
      panelTitle: '筛查漏斗分析',
      whatItSays: '从筛查到确诊再到治疗存在显著流失，确诊率与治疗启动率是关键瓶颈。',
      keyPopulation: 'HBV高危人群（家族史、输血史、长期饮酒等）及一般筛查人群',
      marketOpportunity: '筛查转诊网络建设、基层医院检测能力提升、患者教育与早诊观念推广。',
      recommendedActions: [
        '推动医院-社区联动的筛查转诊模式',
        '支持基层医生HBV筛查与识别培训',
        '开展高危人群主动筛查与患者召回项目'
      ],
      kpiList: ['筛查阳性率', '确诊转化率', '治疗启动率'],
      compliance: '筛查策略需符合国家疾控与卫健委相关指南，不得用于超适应症推广。',
      sourceIds: []
    };
    document.getElementById('screeningInsightPanel').innerHTML = buildStrategyPanelHtml(chart, defaults);
  }

  // ==================== 生物标志物洞察面板 ====================
  function renderBiomarkerInsightPanel() {
    var chart = (D.charts && D.charts['diagnosis_biomarker_landscape']) || {};
    var defaults = {
      panelTitle: '生物标志物格局',
      whatItSays: 'HBsAg定量是疗效预测与功能性治愈评估的核心标志物，HBV DNA抑制程度与长期预后强相关。',
      keyPopulation: '接受抗病毒治疗的慢乙肝患者，尤其追求功能性治愈的优势人群',
      marketOpportunity: '伴随诊断检测推广、精准治疗分层工具、基于标志物的治疗决策支持。',
      recommendedActions: [
        '推动HBsAg定量检测在临床中的常规应用',
        '开发基于生物标志物的患者分层工具',
        '支持医生精准诊疗观念教育与检测习惯培养'
      ],
      kpiList: ['HBsAg检测率', '标志物指导治疗比例', '功能性治愈率'],
      compliance: '生物标志物检测需符合临床检验规范，不得用于超说明书的疗效承诺。',
      sourceIds: []
    };
    document.getElementById('biomarkerInsightPanel').innerHTML = buildStrategyPanelHtml(chart, defaults);
  }

  // ==================== 治疗人群洞察面板 ====================
  function renderTreatmentInsightPanel() {
    var chart = (D.charts && D.charts['treatment_population_outcomes']) || {};
    var defaults = {
      panelTitle: '治疗人群结局',
      whatItSays: '经治患者转换或联合PegIFN可提升HBsAg下降与清除率，优势人群获益更显著。',
      keyPopulation: '核苷（酸）类似物经治的慢乙肝患者，尤其是HBsAg低水平的优势人群',
      marketOpportunity: '经治患者转换/联合治疗策略推广、优势人群识别与筛选、功能性治愈项目。',
      recommendedActions: [
        '推动经治患者转换/联合治疗的临床观念更新',
        '建立优势人群筛选标准与路径',
        '支持功能性治愈相关的真实世界研究与患者管理项目'
      ],
      kpiList: ['转换治疗比例', 'HBsAg清除率', '治疗满意度'],
      compliance: '治疗方案选择应遵循指南推荐与获批适应症，不得进行超说明书用药推荐。',
      sourceIds: []
    };
    document.getElementById('treatmentInsightPanel').innerHTML = buildStrategyPanelHtml(chart, defaults);
  }

  // ==================== 市场策略洞察面板 ====================
  function renderMarketInsightPanel() {
    var chart = (D.charts && D.charts['market_strategy_map']) || {};
    var defaults = {
      panelTitle: '市场策略全景',
      whatItSays: '从筛查到HCC全病程管理各环节均存在未满足需求，需按优先级布局资源投入。',
      keyPopulation: '慢乙肝全病程患者，按疾病阶段与治疗状态分层管理',
      marketOpportunity: '全病程管理解决方案、分阶段学术推广项目、联盟合作平台建设。',
      recommendedActions: [
        '按筛-诊-治-管-监测全链条布局市场策略',
        '优先投入高证据强度、高市场潜力的领域',
        '建立证据动态监测与策略快速调整机制'
      ],
      kpiList: ['策略覆盖广度', '证据传递深度', '市场份额变化'],
      compliance: '所有市场策略均需严格遵守药品管理法、广告法及医学伦理规范，不得超适应症推广。',
      sourceIds: []
    };
    document.getElementById('marketInsightPanel').innerHTML = buildStrategyPanelHtml(chart, defaults);
  }

  // ==================== 市场行动卡片 ====================
  function renderMarketActionCards() {
    var chart = (D.charts && D.charts['market_strategy_map']) || {};
    var strategies = chart.strategies || [];
    if (!strategies.length) {
      document.getElementById('marketActionCards').innerHTML = '';
      return;
    }

    var priorityMap = { 'high': '高优先级', 'medium': '中优先级', 'exploratory': '探索性' };

    var html = strategies.map(function(s, i) {
      return '<div class="strategy-action-card">' +
        '<div class="sa-header">' +
          '<div class="sa-title">' + (i + 1) + '. ' + esc(s.name) + '</div>' +
          '<span class="sa-priority ' + s.priority + '">' + priorityMap[s.priority] + '</span>' +
        '</div>' +
        '<div class="sa-grid">' +
          '<div class="sa-item">' +
            '<span class="sa-item-label">对应洞察</span>' +
            '<span class="sa-item-value">' + esc(s.category + '领域策略') + '</span>' +
          '</div>' +
          '<div class="sa-item">' +
            '<span class="sa-item-label">证据基础</span>' +
            '<span class="sa-item-value">' + esc(s.evidence_basis || s.evidence_count + '篇支持文献') + '</span>' +
          '</div>' +
          '<div class="sa-item">' +
            '<span class="sa-item-label">目标人群</span>' +
            '<span class="sa-item-value">' + esc(s.target_population || '') + '</span>' +
          '</div>' +
          '<div class="sa-item">' +
            '<span class="sa-item-label">核心行动</span>' +
            '<span class="sa-item-value">' + esc(s.core_action || '') + '</span>' +
          '</div>' +
          '<div class="sa-item">' +
            '<span class="sa-item-label">关键KPI</span>' +
            '<span class="sa-item-value">' + ((s.kpis || []).join('、')) + '</span>' +
          '</div>' +
          '<div class="sa-item">' +
            '<span class="sa-item-label">支持文献</span>' +
            '<span class="sa-item-value">' +
              '<span class="evidence-link" onclick="App.showEvidenceSources(\'' + esc(s.name) + '\')">' + (s.evidence_count || 0) + '篇 →</span>' +
            '</span>' +
          '</div>' +
        '</div>' +
        '<div class="sa-compliance">' + esc(s.compliance_note || '本策略为文献证据综合分析，不构成临床推荐或营销建议。具体实施需符合相关法律法规和医学伦理。') + '</div>' +
      '</div>';
    }).join('');

    document.getElementById('marketActionCards').innerHTML = html;
  }

  // ==================== 首页TMF产品核心洞察 ====================
  function renderTMFOverviewSection() {
    var container = document.getElementById('tmfOverviewSection');
    if (!container) return;

    var tmfInsights = (D.products || {}).tmf_core_insights || {};
    var html = '';

    if (tmfInsights.insights && tmfInsights.insights.length > 0) {
      html += '<div class="insight-grid">';
      tmfInsights.insights.slice(0, 6).forEach(function(ins) {
        html += '<div class="insight-card tmf-card">';
        html += '<div class="ic-conclusion">' + esc(ins.conclusion) + '</div>';
        html += '<div class="ic-meta">';
        html += '<span>人群: ' + esc(ins.applicable_population || ins.population || '') + '</span>';
        html += '<span>文献: ' + (ins.support_literature_count || ins.evidence_count || 0) + '篇</span>';
        html += '<span>等级: ' + esc(ins.highest_evidence_level || '') + '</span>';
        html += '</div>';
        if (ins.market_implication) {
          html += '<div class="ic-detail"><strong>市场启示:</strong> ' + esc(ins.market_implication) + '</div>';
        }
        if (ins.main_limitations || ins.uncertainty) {
          html += '<div class="ic-detail ic-uncertainty"><strong>局限性:</strong> ' + esc(ins.main_limitations || ins.uncertainty || '') + '</div>';
        }
        if (ins.compliance_note) {
          html += '<div class="ic-compliance">' + esc(ins.compliance_note) + '</div>';
        }
        var popLabel = ins.applicable_population || ins.population || '恒沐洞察';
        if (ins.source_ids && ins.source_ids.length) {
          html += '<button class="hi-evidence-btn" onclick="App.openEvidenceDrawer(\'' + esc(popLabel).replace(/'/g, '&#39;') + '\', ' + JSON.stringify(ins.source_ids).replace(/"/g, '&quot;') + ')">查看证据 (' + (ins.support_literature_count || ins.evidence_count || 0) + '篇)</button>';
        }
        html += '</div>';
      });
      html += '</div>';
      html += '<div style="text-align:center;margin-top:1.5rem;">';
      html += '<button class="nav-btn" onclick="App.navigate(\'tmf\')">查看恒沐®证据全景 →</button>';
      html += '</div>';
    } else if (tmfInsights.note) {
      html += '<div class="callout callout-info">' + esc(tmfInsights.note) + '</div>';
      html += '<div style="text-align:center;margin-top:1rem;">';
      html += '<button class="nav-btn" onclick="App.navigate(\'tmf\')">查看恒沐®证据全景 →</button>';
      html += '</div>';
    }

    container.innerHTML = html;
  }

  // ==================== 总体核心洞察 ====================
  function renderCoreInsight() {
    var ci = D.overallCoreInsight || {};
    if (!ci.title) { document.getElementById('ovCoreInsight').innerHTML = ''; return; }

    var html = '<div class="core-insight">' +
      '<div class="core-insight-badge">Overall Insight · 总体核心洞察</div>' +
      '<div class="core-insight-title">' + esc(ci.title) + '</div>' +
      '<div class="core-insight-conclusion">' + esc(ci.oneLineConclusion || '') + '</div>';

    // 关键数字
    if (ci.evidenceScope) {
      var es = ci.evidenceScope;
      html += '<div class="stat-grid">' +
        '<div class="stat-card"><div class="num">' + (es.totalLiterature || 0) + '</div><div class="label">有效文献</div></div>' +
        '<div class="stat-card"><div class="num">' + (es.chinaDirect || 0) + '<span class="num-unit"> (' + (es.chinaEvidencePct || 0) + '%)</span></div><div class="label">中国直接证据</div></div>' +
        '<div class="stat-card"><div class="num">' + (es.abEvidencePct || 0) + '<span class="num-unit">%</span></div><div class="label">AB级高质量证据</div></div>' +
        '<div class="stat-card"><div class="num">' + (es.clusterCount || 0) + '</div><div class="label">文献簇</div></div>' +
      '</div>';
    }

    // 核心发现
    if (ci.coreFindings && ci.coreFindings.length) {
      html += '<div class="core-insight-findings"><ul>';
      ci.coreFindings.forEach(function(f) {
        html += '<li>' + esc(f) + '</li>';
      });
      html += '</ul></div>';
    }

    // Meta信息
    html += '<div class="core-insight-meta">' +
      '<div class="core-insight-meta-row"><span class="core-insight-meta-tag meta-tag teal">2030核心差距</span><span>' + esc(ci.coreGap2030 || '') + '</span></div>' +
      '<div class="core-insight-meta-row"><span class="core-insight-meta-tag meta-tag green">市场部启示</span><span>' + esc(ci.marketImplication || '') + '</span></div>' +
      '<div class="core-insight-meta-row"><span class="core-insight-meta-tag meta-tag blue">全国联盟价值</span><span>' + esc(ci.allianceValue || '') + '</span></div>' +
      '<div class="core-insight-meta-row"><span class="core-insight-meta-tag meta-tag orange">证据强度</span><span>' + esc(ci.evidenceStrength || '') + ' · 来源:' + (ci.sourceCount || 0) + '篇</span></div>' +
    '</div></div>';

    document.getElementById('ovCoreInsight').innerHTML = html;
  }

  // ==================== 六条一级洞察 ====================
  function renderHomepageInsights() {
    var hi = D.homepageInsights || {};
    var insights = hi.insights || [];
    if (!insights.length) { document.getElementById('ovHomepageInsights').innerHTML = ''; return; }

    var stageLabels = {
      'screening': '01 · 筛',
      'diagnosis': '02 · 诊',
      'treatment': '03 · 治',
      'management': '04 · 管/康',
      'hcc': '05 · HBV→HCC',
      'alliance': '06 · 2030与联盟'
    };

    var html = insights.map(function(ins) {
      // 根据置信度决定颜色语义
      var colorClass = '';
      if (ins.confidence === '高') colorClass = 'accent3';
      else if (ins.confidence === '中' || ins.confidence === '中高') colorClass = '';
      else colorClass = 'accent2';

      var nums = (ins.keyNumbers || []).map(function(n) {
        return '<span class="ic-number-tag">' + esc(n) + '</span>';
      }).join('');

      return '<div class="insight-card ' + colorClass + '" onclick="App.navigate(\'' + ins.navTarget + '\')">' +
        '<div class="num-badge">' + (insights.indexOf(ins) + 1) + '</div>' +
        '<div class="ic-stage">' + esc(stageLabels[ins.category] || ins.category) + '</div>' +
        '<h4>' + esc(ins.title) + '</h4>' +
        '<p class="ic-one-line">' + esc(ins.oneLine || '') + '</p>' +
        '<p class="ic-desc">' + esc(ins.description || '') + '</p>' +
        '<div class="ic-numbers">' + nums + '</div>' +
        '<div class="ic-footer">' +
          '<span>独立文献 ' + ins.evidenceCount + ' 篇</span>' +
          '<span>AB级 ' + ins.abCount + ' 篇</span>' +
          '<span>置信度: ' + esc(ins.confidence || '') + '</span>' +
          '<span class="ic-link">查看完整专题 →</span>' +
        '</div>' +
      '</div>';
    }).join('');

    document.getElementById('ovHomepageInsights').innerHTML = html;
  }

  // ==================== 市场策略总览 ====================
  function renderMarketStrategy() {
    var ms = D.marketStrategy || {};
    var table = ms.strategyTable || [];
    if (!table.length) { document.getElementById('ovMarketStrategy').innerHTML = ''; return; }

    var html = '<div class="callout green">' +
      '<div class="callout-label">市场策略 · 循证推导</div>' +
      '<p>以下策略基于' + D.statistics.totalLiterature + '篇飞书同步文献逐层推导，从文献证据到行动建议。所有策略医学合规，不超说明书，不夸大疗效。</p>' +
    '</div>';

    // 策略卡片（按环节）
    table.forEach(function(s, idx) {
      var priority = 'med';
      if (s.stage === '筛' || s.stage === '治' || s.stage === '管/康') priority = 'high';
      else if (s.stage === '联盟') priority = 'low';

      var priorityLabel = priority === 'high' ? '高优先级' : (priority === 'med' ? '中优先级' : '探索性');

      html += '<div class="strategy-card">' +
        '<span class="priority-tag ' + priority + '">' + priorityLabel + '</span>' +
        '<h4>' + esc(s.stage) + ' · ' + esc(s.coreInsight || '') + '</h4>' +
        '<div class="sc-row"><span class="sc-label">目标受众：</span><span class="sc-value">' + esc(s.targetAudience || '') + '</span></div>' +
        '<div class="sc-row"><span class="sc-label">当前障碍：</span><span class="sc-value">' + esc(s.barrier || '') + '</span></div>' +
        '<div class="sc-row"><span class="sc-label">证据沟通：</span><span class="sc-value">' + esc(s.evidenceCommunication || '') + '</span></div>' +
        '<div class="sc-row"><span class="sc-label">建议项目：</span><span class="sc-value">' + esc(s.project || '') + '</span></div>' +
        '<div class="sc-row"><span class="sc-label">KPI：</span><span class="sc-value sc-kpi">' + esc(s.kpi || '') + '</span></div>' +
        '<div class="sc-row"><span class="sc-label">文献基础：</span><span class="sc-value">' + (s.sourceCount || 0) + ' 篇</span></div>' +
      '</div>';
    });

    if (ms.compliance && ms.compliance.length) {
      html += '<div class="compliance-tags">';
      ms.compliance.forEach(function(c) {
        html += '<span class="compliance-tag">' + esc(c) + '</span>';
      });
      html += '</div>';
    }

    document.getElementById('ovMarketStrategy').innerHTML = html;
  }

  // ==================== 最新证据动态 ====================
  function renderLatestUpdates() {
    var lu = D.latestUpdates || {};
    var pubs = lu.recentPublications || [];
    if (!pubs.length) {
      document.getElementById('ovLatestUpdates').innerHTML = '<p class="chapter-intro">暂无最新文献</p>';
      return;
    }

    var html = '<div class="callout">' +
      '<div class="callout-label">同步状态</div>' +
      '<p>飞书有效文献 <strong>' + (lu.totalRecords || 0) + '</strong> 篇 · 最近同步：' + (lu.lastSync || '--') +
      ' · 过去7天新增 <strong>' + (lu.recentCount7d || 0) + '</strong> 篇 · 过去24小时新增 <strong>' + (lu.recentCount24h || 0) + '</strong> 篇</p>' +
    '</div>';

    html += '<div class="latest-updates-list">';
    pubs.slice(0, 15).forEach(function(p) {
      var level = p.evidenceLevel || 'C';
      html += '<div class="update-item" onclick="App.searchAndShowLit(\'' + esc(p.pmid || '') + '\',\'' + esc(p.doi || '') + '\')">' +
        '<span class="update-level level-' + level + '">' + level + '级</span>' +
        '<span class="update-year">' + (p.year || '') + '</span>' +
        '<span class="update-title">' + esc(p.title || '') + '</span>' +
        '<span class="update-journal">' + esc(p.journal || '') + '</span>' +
        (p.chinaEvidence ? '<span class="update-china">中国</span>' : '') +
      '</div>';
    });
    html += '</div>';

    document.getElementById('ovLatestUpdates').innerHTML = html;
  }

  // ==================== 最新变化页面 ====================
  function renderUpdatesPage() {
    var cr = D.changeReport || {};
    var lu = D.latestUpdates || {};
    var stats = D.statistics || {};

    var html = '';

    // 更新概述
    var newLitCount = cr.new_literature_count || (lu.recentCount7d || 0);
    var changedInsightsCount = cr.changed_insights_count || (cr.changed_insights && cr.changed_insights.length) || 0;
    var updateDate = cr.update_date || stats.lastUpdate || '2026年8月';
    var version = (D.meta && D.meta.version) ? 'v' + D.meta.version : '';

    html += '<div class="updates-overview">' +
      '<div class="callout teal">' +
        '<div class="callout-label">本次更新概述</div>' +
        '<p>更新时间：<strong>' + esc(updateDate) + '</strong> ' + esc(version) +
        ' · 新增文献 <strong>' + newLitCount + '</strong> 篇' +
        ' · 洞察变化 <strong>' + changedInsightsCount + '</strong> 条</p>' +
      '</div>' +
    '</div>';

    // 变化的洞察列表
    var changedInsights = cr.changed_insights || [];
    if (changedInsights.length) {
      html += '<div class="updates-section">' +
        '<h3 class="updates-section-title">洞察变化</h3>' +
        '<div class="change-report-list">';

      var changeTypeMap = {
        'strengthened': { label: '证据增强', cls: 'change-strengthened' },
        'weakened': { label: '证据减弱', cls: 'change-weakened' },
        'new': { label: '新增洞察', cls: 'change-new' },
        'updated': { label: '内容更新', cls: 'change-updated' },
        'controversial': { label: '出现争议', cls: 'change-controversial' }
      };

      changedInsights.forEach(function(ci) {
        var ct = ci.change_type || ci.changeType || 'updated';
        var typeInfo = changeTypeMap[ct] || { label: '更新', cls: 'change-updated' };
        var sourceIds = ci.source_ids || ci.sourceIds || [];
        var sourceIdsJson = JSON.stringify(sourceIds).replace(/"/g, '&quot;');

        html += '<div class="change-report-card">' +
          '<div class="crc-header">' +
            '<span class="crc-type ' + typeInfo.cls + '">' + typeInfo.label + '</span>' +
            '<span class="crc-category">' + esc(ci.category || ci.category_label || '') + '</span>' +
          '</div>' +
          '<div class="crc-title">' + esc(ci.title || '') + '</div>' +
          '<div class="crc-summary">' + esc(ci.summary || ci.one_line || ci.description || '') + '</div>';

        if (ci.previous_conclusion || ci.before) {
          html += '<div class="crc-change-detail">' +
            '<div class="crc-before"><span class="crc-change-label">之前：</span>' + esc(ci.previous_conclusion || ci.before || '') + '</div>' +
            '<div class="crc-after"><span class="crc-change-label">现在：</span>' + esc(ci.new_conclusion || ci.after || ci.summary || '') + '</div>' +
          '</div>';
        }

        html += '<div class="crc-footer">' +
          '<span>新增支持文献 ' + (ci.new_evidence_count || ci.evidenceCount || 0) + ' 篇</span>' +
          '<button class="crc-evidence-btn" onclick="App.openEvidenceDrawer(\'' + esc(ci.title || '') + '\', ' + sourceIdsJson + ')">查看证据 →</button>' +
        '</div>' +
        '</div>';
      });

      html += '</div></div>';
    } else {
      html += '<div class="updates-section">' +
        '<h3 class="updates-section-title">洞察变化</h3>' +
        '<div class="empty-state"><div class="empty-state-text">本次更新暂无洞察变化</div></div>' +
      '</div>';
    }

    // 新增文献列表
    var newPubs = (cr.new_literature || (lu.recentPublications || [])).slice(0, 30);
    if (newPubs.length) {
      html += '<div class="updates-section">' +
        '<h3 class="updates-section-title">新增文献 (' + newPubs.length + '篇)</h3>' +
        '<div class="latest-updates-list">';

      newPubs.forEach(function(p) {
        var level = p.evidenceLevel || 'C';
        html += '<div class="update-item" onclick="App.searchAndShowLit(\'' + esc(p.pmid || '') + '\',\'' + esc(p.doi || '') + '\')">' +
          '<span class="update-level level-' + level + '">' + level + '级</span>' +
          '<span class="update-year">' + (p.year || '') + '</span>' +
          '<span class="update-title">' + esc(p.title || '') + '</span>' +
          '<span class="update-journal">' + esc(p.journal || '') + '</span>' +
          (p.chinaEvidence ? '<span class="update-china">中国</span>' : '') +
        '</div>';
      });

      html += '</div></div>';
    }

    document.getElementById('updatesContent').innerHTML = html;
  }

  // ==================== 证据等级表 ====================
  function renderLevelTable() {
    var dist = D.statistics.levelDistribution || {};
    var total = D.statistics.totalLiterature || 1;
    var levels = [
      { label: 'A级', key: 'A', desc: '指南/Meta分析/RCT' },
      { label: 'B级', key: 'B', desc: '队列/病例对照/真实世界' },
      { label: 'C级', key: 'C', desc: '横断面/综述/回顾' },
      { label: 'D级', key: 'D', desc: '病例报告/述评' }
    ];

    var html = '<table class="level-table"><thead><tr><th>等级</th><th>说明</th><th class="num">文献数量</th><th class="num">占比</th></tr></thead><tbody>';
    levels.forEach(function(l) {
      var count = dist[l.key] || 0;
      var pct = (count / total * 100).toFixed(1);
      var barWidth = Math.min(pct, 100);
      html += '<tr>' +
        '<td><span class="level-label level-' + l.key + '">' + l.label + '</span></td>' +
        '<td>' + l.desc + '</td>' +
        '<td class="num">' + count + '</td>' +
        '<td class="num"><div class="bar-cell"><div class="bar-fill level-' + l.key + '" style="width:' + barWidth + '%"></div><span>' + pct + '%</span></div></td>' +
      '</tr>';
    });
    html += '<tr class="total-row"><td colspan="2">合计</td><td class="num">' + total + '</td><td class="num">100%</td></tr>';
    html += '</tbody></table>';
    html += '<p style="font-size:0.78rem;color:var(--muted);margin-top:0.5rem;">数据口径：飞书多维表格同步后统计数据 · 不依赖hover · 横向条形图替代环形图</p>';

    document.getElementById('ovLevelTable').innerHTML = html;
  }

  // ==================== 中国证据分类 ====================
  function renderChinaEvidence() {
    var bd = D.statistics.chinaEvidenceBreakdown || {};
    var total = D.statistics.totalLiterature || 1;
    var cats = [
      { label: '中国直接证据', key: 'chinaDirect', count: bd.chinaDirect || 0, desc: '中国患者/中心/机构/指南', color: 'var(--accent3)' },
      { label: '中国机构参与的国际研究', key: 'chinaCollab', count: bd.chinaCollab || 0, desc: '国际合作研究含中国中心', color: 'var(--accent)' },
      { label: '国际证据', key: 'international', count: bd.international || 0, desc: '明确未涉及中国人群/机构', color: 'var(--accent2)' },
      { label: '地区无法判断', key: 'unknown', count: bd.unknown || 0, desc: '信息不足，无法确认', color: 'var(--muted)' }
    ];

    var html = '<div class="china-evidence-grid">';
    cats.forEach(function(c) {
      var pct = (c.count / total * 100).toFixed(1);
      html += '<div class="china-evidence-card" style="border-left-color:' + c.color + '">' +
        '<div class="ce-label">' + c.label + '</div>' +
        '<div class="ce-count">' + c.count + ' <span class="ce-pct">(' + pct + '%)</span></div>' +
        '<div class="ce-desc">' + c.desc + '</div>' +
      '</div>';
    });
    html += '</div>';
    html += '<p style="font-size:0.78rem;color:var(--muted);margin-top:0.5rem;">分类标准：基于真实中国患者、研究中心、作者机构、多中心研究、指南/政策，不使用语言或AI推断</p>';

    document.getElementById('ovChinaEvidence').innerHTML = html;
  }

  // ==================== 文献簇网格 ====================
  function renderClusterGrid() {
    var html = D.clusters.map(function(c) {
      var designTags = c.topDesigns.map(function(d) {
        return '<span class="cluster-design-tag">' + esc(d.design) + ' ' + d.count + '</span>';
      }).join('');

      return '<div class="cluster-card" onclick="App.navigate(\'' + c.navTarget + '\')">' +
        '<div class="cluster-card-header">' +
          '<span class="cluster-id">' + c.clusterId.split('_')[0] + '</span>' +
          '<span class="cluster-year">' + c.yearRange + '</span>' +
        '</div>' +
        '<div class="cluster-name">' + esc(c.name) + '</div>' +
        '<div class="cluster-stats">' +
          '<div class="cluster-stat"><span class="cluster-stat-value">' + c.totalRecords + '</span><span class="cluster-stat-label">关联次数</span></div>' +
          '<div class="cluster-stat"><span class="cluster-stat-value teal">' + c.chinaCount + '</span><span class="cluster-stat-label">中国证据</span></div>' +
          '<div class="cluster-stat"><span class="cluster-stat-value">' + c.chinaPct + '%</span><span class="cluster-stat-label">中国占比</span></div>' +
        '</div>' +
        '<div class="cluster-note">专题关联次数，同一文献可重复归类</div>' +
        '<div class="cluster-designs">' + designTags + '</div>' +
      '</div>';
    }).join('');
    document.getElementById('ovClusterGrid').innerHTML = html;
  }

  // ==================== 数据审计 ====================
  function renderAudit() {
    var a = D.audit;
    var cards = [
      { val: a.totalInput, label: '输入总数', cls: '' },
      { val: a.cleanRecordsCount, label: '有效记录', cls: 'success' },
      { val: a.excludedCount, label: '排除记录', cls: 'danger' },
      { val: a.duplicateCount, label: '重复记录', cls: '' }
    ];
    var cardsHtml = '<div class="audit-grid">';
    cards.forEach(function(c) {
      cardsHtml += '<div class="audit-card"><div class="audit-value ' + c.cls + '">' + c.val + '</div><div class="audit-label">' + c.label + '</div></div>';
    });
    cardsHtml += '</div>';

    var statusColors = { '正常': '#2d8659', '疑似字段错配': '#c75d2c', '信息不足': '#e8a030', '主题不相关': '#dc3545' };
    var statusHtml = '<div class="audit-status-bar">';
    Object.entries(a.statusDistribution).forEach(function(s) {
      statusHtml += '<div class="audit-status-item"><span class="audit-status-dot" style="background:' + (statusColors[s[0]] || '#999') + '"></span>' + s[0] + '：' + s[1] + ' 条</div>';
    });
    statusHtml += '</div>';

    var excludedHtml = '';
    if (a.excludedDetail && a.excludedDetail.length > 0) {
      excludedHtml = '<div style="margin-top:12px;"><div class="audit-detail-title">排除记录详情</div><div class="audit-excluded-list">';
      a.excludedDetail.forEach(function(e) {
        excludedHtml += '<div class="audit-excluded-item">' +
          '<span class="audit-excluded-status">' + esc(e.status) + '</span>' +
          '<span><strong>' + esc(e.title) + '</strong><br><span style="color:var(--muted);font-size:0.75rem;">' + e.issues.join('; ') + '</span></span>' +
        '</div>';
      });
      excludedHtml += '</div></div>';
    }

    document.getElementById('ovAuditSection').innerHTML = cardsHtml +
      '<div class="audit-detail">' +
        '<div class="audit-detail-title">审计详情（审计时间：' + esc(a.auditTime || '') + '）</div>' +
        statusHtml +
        excludedHtml +
      '</div>';
  }

  // ==================== 证据缺口 ====================
  function renderOverviewGaps() {
    var gaps = D.evidenceGaps;
    if (!gaps || gaps.total === 0) {
      document.getElementById('ovEvidenceGaps').innerHTML = '<div class="empty-state"><div class="empty-state-text">暂无证据缺口数据</div></div>';
      return;
    }

    var sorted = gaps.gaps.slice().sort(function(a, b) {
      var order = { high: 0, medium: 1, low: 2 };
      return (order[a.severity] || 2) - (order[b.severity] || 2);
    });
    var top = sorted.slice(0, 6);

    var html = top.map(function(g) {
      var sevClass = g.severity === 'high' ? 'gap-high' : (g.severity === 'medium' ? 'gap-medium' : 'gap-low');
      var sevLabel = g.severity === 'high' ? '高风险' : (g.severity === 'medium' ? '中风险' : '低风险');
      return '<div class="evidence-gap-card ' + sevClass + '">' +
        '<div class="evidence-gap-type">' + esc(g.gapType) + ' <span style="font-size:0.68rem;color:var(--muted-light);">(' + sevLabel + ')</span></div>' +
        '<div class="evidence-gap-topic">主题：' + esc(g.topic) + '</div>' +
        '<div class="evidence-gap-desc">' + esc(g.description) + '</div>' +
      '</div>';
    }).join('');

    if (gaps.total > 6) {
      html += '<div class="evidence-gap-card" style="display:flex;align-items:center;justify-content:center;">' +
        '<div style="text-align:center;"><div style="font-size:1.5rem;font-weight:700;color:var(--accent);">+' + (gaps.total - 6) + '</div>' +
        '<div style="font-size:0.75rem;color:var(--muted);">更多缺口</div>' +
        '<div class="compliance-tag" style="margin-top:0.5rem;cursor:pointer;" onclick="App.navigate(\'strategy\')">查看全部</div></div></div>';
    }

    document.getElementById('ovEvidenceGaps').innerHTML = html;
  }

  // ==================== 章节导航 ====================
  function renderChapterNav() {
    var tr = D.topicReviews;
    if (!tr || tr.totalChapters === 0) {
      document.getElementById('ovChapterNav').innerHTML = '';
      return;
    }

    var navTargets = { 1: 'overview', 2: 'screening', 3: 'diagnosis', 4: 'treatment', 5: 'management', 6: 'hbvhcc', 7: 'strategy' };
    var html = tr.chapters.map(function(ch) {
      var navTarget = navTargets[ch.chapter] || 'overview';
      return '<div class="cluster-card" onclick="App.navigate(\'' + navTarget + '\')">' +
        '<div class="cluster-card-header">' +
          '<span class="cluster-id">第' + ch.chapter + '章</span>' +
          '<span class="cluster-year">' + esc(ch.yearRange || '') + '</span>' +
        '</div>' +
        '<div class="cluster-name">' + esc(ch.title) + '</div>' +
        '<div class="cluster-stats">' +
          '<div class="cluster-stat"><span class="cluster-stat-value">' + (ch.totalRecords || 0) + '</span><span class="cluster-stat-label">文献</span></div>' +
          '<div class="cluster-stat"><span class="cluster-stat-value teal">' + (ch.chinaCount || 0) + '</span><span class="cluster-stat-label">中国研究</span></div>' +
          '<div class="cluster-stat"><span class="cluster-stat-value">' + (ch.clusterCount || 0) + '</span><span class="cluster-stat-label">文献簇</span></div>' +
        '</div>' +
        '<div style="font-size:0.72rem;color:var(--muted-light);margin-top:0.4rem;line-height:1.5;">' + esc((ch.evidenceScope || '').substring(0, 80)) + (ch.evidenceScope && ch.evidenceScope.length > 80 ? '...' : '') + '</div>' +
      '</div>';
    }).join('');
    document.getElementById('ovChapterNav').innerHTML = html;
  }

  // ==================== 专题页渲染 ====================
  function renderTopicPage(pageKey) {
    var config = PAGE_CONFIG[pageKey];
    if (!config) return;

    // 章节标题
    var headerHtml = '<h1 class="page-title">' + config.title + '</h1>' +
      '<p class="page-subtitle">' + (config.intro || '') + '</p>';
    document.getElementById(pageKey + 'Header').innerHTML = headerHtml;

    var content = '';

    // 章节标签和元数据
    content += '<div style="margin-bottom:1rem;"><span class="ch-label" style="display:block;font-size:0.68rem;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:var(--accent);margin-bottom:0.3rem;">' + config.chLabel + '</span></div>';

    // 证据概览
    var pageClusters = config.clusters.map(function(cid) {
      return D.clusters.find(function(c) { return c.clusterId === cid; });
    }).filter(function(c) { return c; });

    var totalLit = pageClusters.reduce(function(s, c) { return s + c.totalRecords; }, 0);
    var totalChina = pageClusters.reduce(function(s, c) { return s + c.chinaCount; }, 0);

    content += '<div class="chapter-meta-bar">' +
      '<div class="chapter-meta-item"><span class="chapter-meta-label">文献簇</span><span class="chapter-meta-value accent">' + pageClusters.length + '</span></div>' +
      '<div class="chapter-meta-item"><span class="chapter-meta-label">簇内文献</span><span class="chapter-meta-value">' + totalLit + '</span></div>' +
      '<div class="chapter-meta-item"><span class="chapter-meta-label">中国研究</span><span class="chapter-meta-value green">' + totalChina + '</span></div>' +
      '<div class="chapter-meta-item"><span class="chapter-meta-label">中国占比</span><span class="chapter-meta-value">' + (totalLit > 0 ? (totalChina / totalLit * 100).toFixed(1) : 0) + '%</span></div>' +
    '</div>';

    // 章节导语
    content += '<div class="callout teal"><div class="callout-label">章节导语</div><p>' + config.intro + '</p></div>';

    // 验证专题内容
    if (config.topics && config.topics.length > 0) {
      for (var i = 0; i < config.topics.length; i++) {
        var topic = D.topics.find(function(t) { return t.topicId === config.topics[i]; });
        if (topic) {
          content += renderTopicValidation(topic, i > 0);
        }
      }
    } else {
      content += '<div class="no-validation-note">该专题尚未完成跨文献综合验证。以下展示相关文献簇的代表性研究证据。</div>';
      for (var ci = 0; ci < pageClusters.length; ci++) {
        content += renderClusterDetail(pageClusters[ci]);
      }
    }

    // 簇和代表性文献
    content += '<div class="topic-section">';
    content += '<h3 class="topic-section-title">相关文献簇与代表性研究</h3>';
    for (var cj = 0; cj < pageClusters.length; cj++) {
      content += renderClusterDetail(pageClusters[cj]);
    }
    content += '</div>';

    // 患者管理章节特殊内容
    if (pageKey === 'management') {
      content += renderPatientJourney();

      // ---- 患者留存漏斗图 ----
      var prf = (D.charts && D.charts['patient_retention_funnel']) || {};
      content += '<div class="topic-section">';
      content += '<h3 class="topic-section-title">患者留存漏斗分析</h3>';
      content += '<div class="callout"><div class="callout-label">核心洞察</div><p>' + esc(prf.key_insight || '治疗前3个月和长期随访是两个主要脱落高峰。前6个月的依从性干预对长期留存有关键影响。') + '</p></div>';
      content += '<div class="chart-card" style="margin-top:1rem;">';
      content += '<h3 class="chart-card-title">全周期留存漏斗</h3>';
      content += '<div id="chartMgmtRetention" class="chart-dom" style="height:420px;"></div>';
      content += '</div>';
      content += '<p style="font-size:0.78rem;color:var(--muted);margin-top:0.5rem;">脱落风险基于相关研究中提到的问题频次评估，非实际脱落率 · 数据来源：' + (prf.stages ? prf.stages.reduce(function(s, st) { return s + (st.related_studies || 0); }, 0) : 0) + '篇文献</p>';
      content += '</div>';

      // ---- 脱落原因分析卡片（3列网格） ----
      content += '<div class="topic-section">';
      content += '<h3 class="topic-section-title">脱落原因分析</h3>';
      content += '<div class="patient-mgmt-grid">';
      content += '<div class="patient-mgmt-card">' +
        '<div class="patient-mgmt-label">治疗早期脱落（0-3月）</div>' +
        '<div class="patient-mgmt-text">不良反应担忧、注射不便、初始疗效不明显导致患者信心不足。干扰素治疗患者因不良反应脱落风险更高。</div>' +
      '</div>';
      content += '<div class="patient-mgmt-card">' +
        '<div class="patient-mgmt-label">中期脱落（3-12月）</div>' +
        '<div class="patient-mgmt-text">无症状后自行停药、忘记服药、定期复查不便。核苷类似物患者依从性逐渐下降是主要问题。</div>' +
      '</div>';
      content += '<div class="patient-mgmt-card">' +
        '<div class="patient-mgmt-label">长期失访（12月+）</div>' +
        '<div class="patient-mgmt-text">缺乏主动召回机制、患者迁居、医患联系中断。HCC监测依从性在长期随访中显著下降。</div>' +
      '</div>';
      content += '</div>';
      content += '</div>';

      // ---- 干预效果对比 ----
      var interventions = prf.interventions || [];
      content += '<div class="topic-section">';
      content += '<h3 class="topic-section-title">干预效果对比</h3>';
      content += '<div class="callout teal"><div class="callout-label">市场机会</div><p>' + esc(prf.market_opportunity || '数字化随访系统、患者教育项目、基层-中心转诊网络建设是三大核心方向。') + '</p></div>';

      // 数字化随访
      content += '<div class="strategy-panel" style="margin-top:1rem;">';
      content += '<div class="sp-section"><div class="sp-label">干预类型</div><div class="sp-value">数字化随访提醒</div></div>';
      content += '<div class="sp-section"><div class="sp-label">作用阶段</div><div class="sp-value">治疗前3个月 · 依从性建立关键期</div></div>';
      content += '<div class="sp-section"><div class="sp-label">证据效果</div><div class="sp-value">可提升6个月留存率约15-25%，短信/App提醒显著降低漏服率</div></div>';
      content += '<div class="sp-section"><div class="sp-label">适用人群</div><div class="sp-value">初治患者、年轻患者、干扰素治疗患者</div></div>';
      content += '<div class="sp-section"><div class="sp-label">KPI</div><div class="sp-value"><span class="sp-kpi-tag">3个月留存率</span><span class="sp-kpi-tag">漏服率降低</span></div></div>';
      content += '</div>';

      // 患者教育
      content += '<div class="strategy-panel" style="margin-top:1rem;">';
      content += '<div class="sp-section"><div class="sp-label">干预类型</div><div class="sp-value">患者教育项目</div></div>';
      content += '<div class="sp-section"><div class="sp-label">作用阶段</div><div class="sp-value">治疗6个月 · 认知巩固与习惯养成</div></div>';
      content += '<div class="sp-section"><div class="sp-label">证据效果</div><div class="sp-value">系统化疾病教育可提升长期依从性，患者对疾病认知程度与治疗结局正相关</div></div>';
      content += '<div class="sp-section"><div class="sp-label">适用人群</div><div class="sp-value">文化程度较低患者、老年患者、首次接受抗病毒治疗患者</div></div>';
      content += '<div class="sp-section"><div class="sp-label">KPI</div><div class="sp-value"><span class="sp-kpi-tag">12个月留存率</span><span class="sp-kpi-tag">疾病认知评分</span></div></div>';
      content += '</div>';

      // 个案管理
      content += '<div class="strategy-panel" style="margin-top:1rem;">';
      content += '<div class="sp-section"><div class="sp-label">干预类型</div><div class="sp-value">个案管理（护士/个案师）</div></div>';
      content += '<div class="sp-section"><div class="sp-label">作用阶段</div><div class="sp-value">全周期 · 重点关注高风险脱落人群</div></div>';
      content += '<div class="sp-section"><div class="sp-label">证据效果</div><div class="sp-value">护士主导的个案管理可显著改善病毒学应答率和治疗依从性，尤其在基层医疗场景</div></div>';
      content += '<div class="sp-section"><div class="sp-label">适用人群</div><div class="sp-value">肝硬化患者、依从性差患者、老年患者、合并症患者</div></div>';
      content += '<div class="sp-section"><div class="sp-label">KPI</div><div class="sp-value"><span class="sp-kpi-tag">病毒学应答率</span><span class="sp-kpi-tag">失访召回率</span></div></div>';
      content += '</div>';

      content += '</div>';

      // ---- HCC长期监测部分 ----
      var hcc = (D.charts && D.charts['hcc_residual_risk']) || {};
      content += '<div class="topic-section">';
      content += '<h3 class="topic-section-title">HCC长期监测</h3>';
      content += '<div class="callout orange"><div class="callout-label">关键风险</div><p>' + esc(hcc.key_insight || '即使获得病毒学抑制，肝硬化和高龄患者仍存在HCC残余风险，需要长期规范监测。') + '</p></div>';
      content += '<div class="patient-mgmt-grid">';
      content += '<div class="patient-mgmt-card">' +
        '<div class="patient-mgmt-label">高危人群</div>' +
        '<div class="patient-mgmt-text">肝硬化患者、年龄>50岁、有HCC家族史、HBsAg持续阳性、合并糖尿病或肥胖。</div>' +
      '</div>';
      content += '<div class="patient-mgmt-card">' +
        '<div class="patient-mgmt-label">监测方案</div>' +
        '<div class="patient-mgmt-text">每6个月腹部超声+AFP检测，高危人群缩短至3-4个月。HBsAg清除后仍需定期监测。</div>' +
      '</div>';
      content += '<div class="patient-mgmt-card">' +
        '<div class="patient-mgmt-label">市场机会</div>' +
        '<div class="patient-mgmt-text">' + esc(hcc.market_opportunity || 'HCC分层监测服务和高危人群管理项目是重要的市场机会。') + '</div>' +
      '</div>';
      content += '</div>';
      var hccFactors = hcc.risk_factors || [];
      if (hccFactors.length > 0) {
        content += '<div style="margin-top:1rem;"><span style="font-size:0.82rem;color:var(--muted);font-weight:600;">主要风险因素（' + hccFactors.length + '项）：</span>';
        content += '<div style="margin-top:0.5rem;display:flex;flex-wrap:wrap;gap:0.4rem;">';
        hccFactors.forEach(function(f) {
          var strengthClass = f.evidence_strength === 'strong' ? 'high' : (f.evidence_strength === 'moderate' ? 'mid' : 'low');
          content += '<span class="rep-record-badge ' + strengthClass + '" style="font-size:0.72rem;">' + esc(f.factor) + '</span>';
        });
        content += '</div></div>';
      }
      content += '</div>';
    }

    document.getElementById(pageKey + 'Content').innerHTML = content;

    // 图表
    setTimeout(function() {
      if (window.ChartFns && config.topics && config.topics.length > 0) {
        config.topics.forEach(function(tid) {
          var topic = D.topics.find(function(t) { return t.topicId === tid; });
          if (topic) {
            var chartPrefix = topic.topicId.replace(/[^a-zA-Z0-9_]/g, '_');
            var yearDom = document.getElementById(chartPrefix + '_yearChart');
            var levelDom = document.getElementById(chartPrefix + '_levelChart');
            var designDom = document.getElementById(chartPrefix + '_designChart');
            if (yearDom) ChartFns.initTopicYearChart(yearDom, topic.overview.yearTrend);
            if (levelDom) ChartFns.initTopicLevelChart(levelDom, topic.overview.evidenceDist);
            if (designDom) ChartFns.initTopicDesignChart(designDom, topic.overview.designDist);
          }
        });
      }
      // 患者管理页面专属图表
      if (pageKey === 'management' && window.ChartFns) {
        var mgmtRetentionDom = document.getElementById('chartMgmtRetention');
        if (mgmtRetentionDom) ChartFns.initPatientRetentionChart(mgmtRetentionDom);
      }
    }, 100);
  }

  // ==================== 专题验证内容 ====================
  function renderTopicValidation(topic, isSecondary) {
    var html = '';

    if (isSecondary) {
      html += '<hr style="margin:2rem 0;border:none;border-top:1px solid var(--rule);">';
    }

    html += '<div class="topic-section">';
    html += '<h3 class="topic-section-title">' + esc(topic.title) + '</h3>';

    // 证据概览
    var ov = topic.overview;
    html += '<div class="topic-evidence-overview">' +
      '<div class="topic-evidence-card"><div class="topic-evidence-val">' + ov.totalRecords + '</div><div class="topic-evidence-lbl">文献总数</div></div>' +
      '<div class="topic-evidence-card"><div class="topic-evidence-val">' + ov.chinaCount + '</div><div class="topic-evidence-lbl">中国研究</div></div>' +
      '<div class="topic-evidence-card"><div class="topic-evidence-val">' + ov.intlCount + '</div><div class="topic-evidence-lbl">国际研究</div></div>' +
      '<div class="topic-evidence-card"><div class="topic-evidence-val">' + esc(ov.yearRange) + '</div><div class="topic-evidence-lbl">年份范围</div></div>' +
    '</div>';

    // 图表
    var chartPrefix = topic.topicId.replace(/[^a-zA-Z0-9_]/g, '_');
    html += '<div class="charts-grid-2" style="margin-top:1rem;">' +
      '<div class="chart-card"><h3 class="chart-card-title">年度文献分布</h3><div id="' + chartPrefix + '_yearChart" class="chart-dom"></div></div>' +
      '<div class="chart-card"><h3 class="chart-card-title">证据等级分布</h3><div id="' + chartPrefix + '_levelChart" class="chart-dom"></div></div>' +
    '</div>';

    html += '</div>';

    // 文献综合（卡片）
    html += '<div class="card">';
    html += '<div class="card-title">文献综合</div>';
    html += '<div class="card-body">' + formatSynthesisText(topic.synthesisText) + '</div>';
    html += '</div>';

    // 关键研究比较表
    if (topic.comparisonTable && topic.comparisonTable.length > 0) {
      html += '<div class="topic-section">';
      html += '<h3 class="topic-section-title">关键研究比较表</h3>';
      html += '<div class="table-wrap"><table><thead><tr>' +
        '<th>研究</th><th>年份</th><th>设计</th><th>人群</th><th class="num">样本量</th><th>干预/暴露</th><th>对照</th><th>随访</th><th>关键结果</th><th>局限</th>' +
      '</tr></thead><tbody>';
      topic.comparisonTable.forEach(function(row) {
        html += '<tr>' +
          '<td class="col-study" onclick="App.searchLitByTitle(\'' + esc(row.study || '') + '\')">' + esc(row.study) + '</td>' +
          '<td>' + esc(String(row.year || '')) + '</td>' +
          '<td>' + esc(row.design) + '</td>' +
          '<td>' + esc(row.population) + '</td>' +
          '<td class="num">' + esc(String(row.sample_size)) + '</td>' +
          '<td>' + esc(row.intervention) + '</td>' +
          '<td>' + esc(row.control || '') + '</td>' +
          '<td>' + esc(row.followup) + '</td>' +
          '<td>' + esc(row.key_result) + '</td>' +
          '<td>' + esc(row.limitation) + '</td>' +
        '</tr>';
      });
      html += '</tbody></table></div>';
      html += '<p style="font-size:0.78rem;color:var(--muted);margin-top:0.5rem;">点击研究标题可查看文献详情 · 表格可横向滚动</p>';
      html += '</div>';
    }

    // 一致性与差异（callout形式）
    html += '<div class="topic-section">';
    html += '<h3 class="topic-section-title">一致性与差异</h3>';
    html += '<div class="callout"><div class="callout-label">一致结论</div><p>' + esc(topic.consistency.consistent) + '</p></div>';
    html += '<div class="callout orange"><div class="callout-label">存在差异</div><p>' + esc(topic.consistency.differences) + '</p></div>';
    html += '<div class="callout teal"><div class="callout-label">差异来源</div><p>' + esc(topic.consistency.source) + '</p></div>';
    html += '</div>';

    // 临床启示
    html += '<div class="topic-section">';
    html += '<h3 class="topic-section-title">临床启示</h3>';
    html += '<div class="clinical-impl-grid">' +
      '<div class="clinical-impl-card"><div class="clinical-impl-label">初治患者</div><div class="clinical-impl-text">' + esc(topic.clinicalImplications.initial) + '</div></div>' +
      '<div class="clinical-impl-card"><div class="clinical-impl-label">经治患者</div><div class="clinical-impl-text">' + esc(topic.clinicalImplications.experienced) + '</div></div>' +
      '<div class="clinical-impl-card"><div class="clinical-impl-label">优势人群筛选</div><div class="clinical-impl-text">' + esc(topic.clinicalImplications.advantage) + '</div></div>' +
      '<div class="clinical-impl-card"><div class="clinical-impl-label">疗效监测</div><div class="clinical-impl-text">' + esc(topic.clinicalImplications.monitoring) + '</div></div>' +
    '</div>';
    html += '</div>';

    // 患者管理启示
    html += renderPatientManagement(topic);

    // 2030意义
    html += '<div class="topic-section">';
    html += '<h3 class="topic-section-title">2030意义</h3>';
    html += '<div class="callout teal"><div class="callout-label">2030 Significance</div><p>' + esc(topic.significance2030) + '</p></div>';
    html += '</div>';

    // 联盟行动
    html += '<div class="topic-section">';
    html += '<h3 class="topic-section-title">联盟行动</h3>';
    html += '<div class="alliance-action-grid">' +
      '<div class="alliance-action-card"><div class="alliance-action-label">建立标准</div><div class="alliance-action-text">' + esc(topic.allianceActions.standards) + '</div></div>' +
      '<div class="alliance-action-card"><div class="alliance-action-label">转诊患者</div><div class="alliance-action-text">' + esc(topic.allianceActions.referral) + '</div></div>' +
      '<div class="alliance-action-card"><div class="alliance-action-label">监测KPI</div><div class="alliance-action-text">' + esc(topic.allianceActions.kpi) + '</div></div>' +
    '</div>';
    html += '</div>';

    // 争议和证据缺口
    html += '<div class="topic-section">';
    html += '<h3 class="topic-section-title">争议和证据缺口</h3>';
    html += '<div class="controversy-grid">' +
      '<div class="controversy-card"><div class="controversy-label">证据不足</div><div class="controversy-text">' + esc(topic.controversies.evidenceGap) + '</div></div>' +
      '<div class="controversy-card"><div class="controversy-label">研究设计局限</div><div class="controversy-text">' + esc(topic.controversies.designLimit) + '</div></div>' +
      '<div class="controversy-card"><div class="controversy-label">中国数据不足</div><div class="controversy-text">' + esc(topic.controversies.chinaDataGap) + '</div></div>' +
    '</div>';
    html += '</div>';

    // 关联文献
    if (topic.linkedLiterature && topic.linkedLiterature.length > 0) {
      var toggleId = 'linked_' + topic.topicId;
      html += '<div class="topic-section">';
      html += '<button class="linked-lit-toggle" id="' + toggleId + '_btn" onclick="App.toggleLinkedLit(\'' + toggleId + '\')">' +
        '关联文献列表（' + topic.linkedLiterature.length + ' 篇）<span class="arrow">&#9660;</span></button>';
      html += '<div class="linked-lit-list" id="' + toggleId + '">';
      topic.linkedLiterature.forEach(function(lit) {
        html += renderLinkedLitItem(lit);
      });
      html += '</div>';
      html += '</div>';
    }

    return html;
  }

  // ==================== 患者管理 ====================
  function renderPatientManagement(topic) {
    if (!topic.patientManagement) return '';
    var pm = topic.patientManagement;
    var html = '<div class="topic-section">';
    html += '<h3 class="topic-section-title">患者管理启示</h3>';
    html += '<div class="patient-mgmt-grid">' +
      '<div class="patient-mgmt-card"><div class="patient-mgmt-label">最易脱落阶段</div><div class="patient-mgmt-text">' + esc(pm.dropoutStage) + '</div></div>' +
      '<div class="patient-mgmt-card"><div class="patient-mgmt-label">依从性改善</div><div class="patient-mgmt-text">' + esc(pm.adherence) + '</div></div>' +
      '<div class="patient-mgmt-card"><div class="patient-mgmt-label">强化随访节点</div><div class="patient-mgmt-text">' + esc(pm.followupPoints) + '</div></div>' +
    '</div>';
    html += '</div>';
    return html;
  }

  // ==================== 患者旅程 ====================
  function renderPatientJourney() {
    var stages = [
      { name: '筛查阳性', risk: '转诊流失', detail: '阳性后未完成确诊评估', type: 'risk' },
      { name: '完成确诊', risk: '评估延迟', detail: '未及时完成HBV DNA/纤维化评估', type: 'risk' },
      { name: '启动治疗', risk: '启动犹豫', detail: 'ALT正常患者治疗指征争议', type: 'risk' },
      { name: '前3个月', risk: '脱落高峰', detail: '不良反应/依从性差导致中断', type: 'risk' },
      { name: '前6个月', risk: '脱落持续', detail: '无症状患者自行停药', type: 'risk' },
      { name: '12个月', risk: '依从性下降', detail: '长期服药疲劳', type: 'risk' },
      { name: '长期随访', risk: '失访', detail: '缺乏主动召回机制', type: 'action' },
      { name: 'HCC监测', risk: '监测不足', detail: 'HBsAg清除后残余风险', type: 'action' }
    ];

    var html = '<div class="topic-section">';
    html += '<h3 class="topic-section-title">患者旅程与脱落风险</h3>';
    html += '<div class="callout"><div class="callout-label">患者旅程 · 文献证据</div>' +
      '<p>基于201篇患者管理文献，患者脱落集中在治疗前6个月。数字化提醒、护士电话随访和个案管理可显著改善依从性和病毒学应答。</p></div>';
    html += '<div class="patient-journey">';
    stages.forEach(function(s, i) {
      if (i > 0) html += '<div class="journey-arrow">→</div>';
      html += '<div class="journey-stage ' + s.type + '">' +
        '<div class="stage-name">' + s.name + '</div>' +
        '<div class="stage-risk">' + s.risk + '</div>' +
        '<div class="stage-detail">' + s.detail + '</div>' +
      '</div>';
    });
    html += '</div>';
    html += '<p style="font-size:0.78rem;color:var(--muted);margin-top:0.5rem;">橙色阶段=高风险脱落 · 绿色阶段=可干预行动 · 基于飞书同步文献证据</p>';
    html += '</div>';

    return html;
  }

  // ==================== 簇详情 ====================
  function renderClusterDetail(cluster) {
    if (!cluster) return '';
    var html = '<div class="card" style="margin:1rem 0;">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">';
    html += '<div><span class="cluster-id">' + cluster.clusterId.split('_')[0] + '</span> <strong style="font-size:0.92rem;color:var(--ink);margin-left:0.4rem;">' + esc(cluster.name) + '</strong></div>';
    html += '<div style="font-size:0.78rem;color:var(--muted);">' + cluster.totalRecords + ' 篇 · ' + cluster.chinaCount + ' 篇中国</div>';
    html += '</div>';

    if (cluster.representativeRecords && cluster.representativeRecords.length > 0) {
      html += '<div class="representative-records">';
      cluster.representativeRecords.forEach(function(rec) {
        html += '<div class="rep-record-card">' +
          '<div class="rep-record-title" onclick="App.searchLitByTitle(\'' + esc(rec.title_cn || rec.title || '') + '\')">' + esc(rec.title_cn || rec.title || '') + '</div>' +
          '<div class="rep-record-meta">' +
            '<span>' + esc(rec.journal || '') + ' ' + esc(String(rec.year || '')) + '</span>' +
            '<span class="rep-record-badge">' + esc(rec.evidence_level || '') + '级</span>' +
            '<span>' + esc(rec.study_design || '') + '</span>' +
          '</div>';
        if (rec.key_results) {
          html += '<div class="rep-record-result">' + esc(rec.key_results.substring(0, 200)) + (rec.key_results.length > 200 ? '...' : '') + '</div>';
        }
        html += '</div>';
      });
      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  // ==================== 关联文献项 ====================
  function renderLinkedLitItem(lit) {
    var levelClass = 'unknown';
    var level = (lit.证据等级 || '').toLowerCase();
    if (level.includes('高')) levelClass = 'high';
    else if (level.includes('中-高') || level.includes('中高')) levelClass = 'mid-high';
    else if (level.includes('中')) levelClass = 'mid';
    else if (level.includes('低')) levelClass = 'low';

    var title = lit.中文标题 || lit.title || '';
    return '<div class="linked-lit-item" onclick="App.searchLitByTitle(\'' + esc(title) + '\')">' +
      '<div class="linked-lit-title">' + esc(title) + '</div>' +
      '<div class="linked-lit-meta">' +
        '<span>' + esc(lit.期刊 || '') + '</span>' +
        '<span>' + esc(lit.年份 || '') + '</span>' +
        '<span>PMID: ' + esc(lit.PMID || '') + '</span>' +
        '<span class="linked-lit-level ' + levelClass + '">' + esc(lit.证据等级 || '') + '</span>' +
      '</div>' +
    '</div>';
  }

  function toggleLinkedLit(id) {
    var list = document.getElementById(id);
    var btn = document.getElementById(id + '_btn');
    if (list) list.classList.toggle('show');
    if (btn) btn.classList.toggle('expanded');
  }

  // ==================== 2030策略页 ====================
  function renderStrategyPage() {
    document.getElementById('strategyHeader').innerHTML =
      '<span class="ch-label" style="display:block;font-size:0.68rem;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:var(--accent);margin-bottom:0.3rem;">第六章 · 2030</span>' +
      '<h1 class="page-title">2030与市场策略</h1>' +
      '<p class="page-subtitle">WHO 2030消除病毒性肝炎目标与中国行动路径 — 基于文献证据逐层推导</p>';

    var html = '';

    // ===== 市场行动总览 =====
    var ms = D.marketStrategy || {};
    var msmChart = (D.charts && D.charts['market_strategy_map']) || {};
    var msmStrategies = msmChart.strategies || [];
    var table = ms.strategyTable || [];

    html += '<div class="topic-section">';
    html += '<h3 class="topic-section-title">市场行动总览</h3>';
    html += '<div class="callout green"><div class="callout-label">循证策略总览</div>';
    html += '<p>' + esc(ms.summary || '基于近1000篇循证医学文献，为乙肝市场部提供从筛查到HCC全程管理的循证策略支持。') + '</p>';
    html += '<div style="margin-top:0.75rem;display:flex;flex-wrap:wrap;gap:0.4rem;">';
    html += '<span class="meta-tag green">覆盖阶段：筛 / 诊 / 治 / 管 / HCC / 联盟</span>';
    html += '<span class="meta-tag teal">策略类型：' + (ms.strategyTypes ? ms.strategyTypes.length : 0) + '类</span>';
    html += '<span class="meta-tag">支持文献：' + D.statistics.totalLiterature + '篇</span>';
    html += '</div></div>';

    // 合规提示
    if (ms.compliance && ms.compliance.length > 0) {
      html += '<div style="margin-top:0.75rem;display:flex;flex-wrap:wrap;gap:0.4rem;">';
      html += '<span style="font-size:0.75rem;color:var(--muted);font-weight:600;">合规原则：</span>';
      ms.compliance.forEach(function(c) {
        html += '<span class="rep-record-badge" style="font-size:0.7rem;background:var(--ink05);color:var(--muted);">' + esc(c) + '</span>';
      });
      html += '</div>';
    }
    html += '</div>';

    // ===== 六大策略行动卡片 =====
    if (table.length > 0) {
      html += '<div class="topic-section">';
      html += '<h3 class="topic-section-title">六大策略行动</h3>';
      html += '<p style="font-size:0.82rem;color:var(--muted);margin-bottom:1rem;">覆盖从筛查到联盟的全病程管理，每个领域均有明确的循证洞察、核心障碍与可落地行动建议。</p>';

      table.forEach(function(s, idx) {
        var priority = 'medium';
        if (s.stage === '筛' || s.stage === '治' || s.stage === '管/康') priority = 'high';
        else if (s.stage === '联盟') priority = 'exploratory';
        var priorityLabel = priority === 'high' ? '高优先级' : (priority === 'medium' ? '中优先级' : '探索性');
        var stageMap = { '筛': '筛查', '诊': '诊断', '治': '治疗', '管/康': '管理', 'HBV→HCC': 'HCC', '联盟': '联盟' };
        var category = stageMap[s.stage] || s.stage;

        html += '<div class="strategy-action-card">' +
          '<div class="sa-header">' +
            '<div class="sa-title">' + (idx + 1) + '. ' + esc(s.stage) + ' · ' + esc(s.coreInsight || '') + '</div>' +
            '<span class="sa-priority ' + priority + '">' + priorityLabel + '</span>' +
          '</div>' +
          '<div class="sa-grid">' +
            '<div class="sa-item">' +
              '<span class="sa-item-label">对应洞察</span>' +
              '<span class="sa-item-value">' + esc(category + '领域核心洞察') + '</span>' +
            '</div>' +
            '<div class="sa-item">' +
              '<span class="sa-item-label">证据基础</span>' +
              '<span class="sa-item-value">' + (s.sourceCount || 0) + '篇支持文献</span>' +
            '</div>' +
            '<div class="sa-item">' +
              '<span class="sa-item-label">目标人群</span>' +
              '<span class="sa-item-value">' + esc(s.targetAudience || '') + '</span>' +
            '</div>' +
            '<div class="sa-item">' +
              '<span class="sa-item-label">核心障碍</span>' +
              '<span class="sa-item-value">' + esc(s.barrier || '') + '</span>' +
            '</div>' +
            '<div class="sa-item">' +
              '<span class="sa-item-label">建议行动</span>' +
              '<span class="sa-item-value">' + esc(s.project || '') + '</span>' +
            '</div>' +
            '<div class="sa-item">' +
              '<span class="sa-item-label">关键KPI</span>' +
              '<span class="sa-item-value">' + esc(s.kpi || '') + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="sa-compliance">' + esc(s.evidenceCommunication || '') + '</div>' +
        '</div>';
      });
      html += '</div>';
    }

    // ===== 市场行动优先级矩阵图 =====
    if (msmStrategies.length > 0) {
      html += '<div class="topic-section">';
      html += '<h3 class="topic-section-title">市场行动优先级矩阵</h3>';
      html += '<div class="callout teal"><div class="callout-label">矩阵解读</div>';
      html += '<p>' + esc(msmChart.key_insight || '从筛查到HCC全病程管理各环节均存在未满足需求，需按优先级布局资源投入。横轴为市场价值，纵轴为实施难度，气泡大小代表证据强度。') + '</p></div>';
      html += '<div class="chart-card" style="margin-top:1rem;">';
      html += '<h3 class="chart-card-title">价值-难度矩阵分析</h3>';
      html += '<div id="chartMarketMatrix" class="chart-dom" style="height:420px;"></div>';
      html += '</div>';
      html += '<p style="font-size:0.78rem;color:var(--muted);margin-top:0.5rem;">气泡大小代表支持文献数量 · 颜色代表优先级（蓝=高，橙=中，灰=低）</p>';
      html += '</div>';

      // ===== 高优先级行动详情列表 =====
      var highPriorityActions = msmStrategies.filter(function(s) { return s.priority === 'high'; });
      if (highPriorityActions.length > 0) {
        html += '<div class="topic-section">';
        html += '<h3 class="topic-section-title">高优先级行动详情（' + highPriorityActions.length + '项）</h3>';
        html += '<p style="font-size:0.82rem;color:var(--muted);margin-bottom:1rem;">高市场价值、相对低实施难度的优先行动，建议作为下一阶段重点投入方向。</p>';

        highPriorityActions.forEach(function(s, idx) {
          html += '<div class="strategy-detail-card" style="border-left-color:var(--accent);">';
          html += '<div class="strategy-detail-header">';
          html += '<span class="strategy-detail-num" style="background:var(--accent);">' + (idx + 1) + '</span>';
          html += '<div>';
          html += '<span class="priority-tag high" style="margin-bottom:0.3rem;">高优先级</span>';
          html += '<h4 style="font-size:0.92rem;font-weight:700;color:var(--ink);line-height:1.4;margin-bottom:0.2rem;">' + esc(s.name) + '</h4>';
          html += '<div class="strategy-detail-meta">';
          html += '<span>类别：' + esc(s.category || '') + '</span>';
          html += '<span>市场价值：' + s.market_value + '/100</span>';
          html += '<span>实施难度：' + s.implementation_difficulty + '/100</span>';
          html += '</div>';
          html += '</div>';
          html += '</div>';

          html += '<div class="strategy-evidence">';
          html += '<div class="strategy-evidence-title">证据基础</div>';
          html += '<div class="strategy-evidence-text">' + esc(s.evidence_basis || '') + '</div>';
          html += '</div>';

          html += '<div class="strategy-actions-section">';
          html += '<div class="strategy-actions-title">核心信息</div>';
          html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">';
          html += '<div><span style="font-size:0.78rem;color:var(--muted);">目标人群：</span><span style="font-size:0.82rem;color:var(--ink);">' + esc(s.target_population || '') + '</span></div>';
          html += '<div><span style="font-size:0.78rem;color:var(--muted);">核心行动：</span><span style="font-size:0.82rem;color:var(--ink);">' + esc(s.core_action || '') + '</span></div>';
          html += '</div>';
          html += '</div>';

          if (s.kpis && s.kpis.length > 0) {
            html += '<div class="strategy-evidence-basis">';
            html += '<span class="strategy-evidence-label">关键KPI：</span>';
            s.kpis.forEach(function(k) {
              html += '<span class="strategy-evidence-tag">' + esc(k) + '</span>';
            });
            html += '</div>';
          }

          html += '<div class="strategy-evidence-basis">';
          html += '<span class="strategy-evidence-label">证据来源：</span>';
          html += '<span class="strategy-evidence-tag">' + (s.evidence_count || 0) + '篇支持文献</span>';
          html += '</div>';

          if (s.compliance_note) {
            html += '<div style="margin-top:0.75rem;padding:0.6rem 0.8rem;background:var(--ink05);border-radius:6px;font-size:0.75rem;color:var(--muted);">';
            html += '<strong style="color:var(--ink600);">合规提示：</strong>' + esc(s.compliance_note) + '</div>';
          }

          html += '</div>';
        });
        html += '</div>';
      }
    }

    // 2030策略列表
    var strat = D.strategy2030;
    if (strat && strat.total > 0) {
      html += '<div class="topic-section">';
      html += '<h3 class="topic-section-title">2030行动策略</h3>';
      html += '<div class="callout teal"><div class="callout-label">2030目标</div><p>' + esc(strat.summary) + '</p>' +
        '<p style="font-size:0.78rem;color:var(--muted);margin-top:0.4rem;">共' + strat.total + '项策略 · 目标年份：' + strat.targetYear + ' · 基于' + D.statistics.totalLiterature + '篇文献</p></div>';

      html += '<div class="strategy-list">';
      strat.strategies.forEach(function(s, idx) {
        var priority = 'med';
        if (idx < strat.total / 3) priority = 'high';
        else if (idx >= strat.total * 2 / 3) priority = 'low';
        var priorityLabel = priority === 'high' ? '高优先级' : (priority === 'med' ? '中优先级' : '探索性');

        html += '<div class="strategy-detail-card" style="border-left-color:' + (priority === 'high' ? 'var(--accent2)' : priority === 'med' ? 'var(--accent)' : 'var(--accent3)') + ';">';
        html += '<div class="strategy-detail-header">';
        html += '<span class="strategy-detail-num">' + (idx + 1) + '</span>';
        html += '<div>';
        html += '<span class="priority-tag ' + priority + '" style="margin-bottom:0.3rem;">' + priorityLabel + '</span>';
        html += '<h4 style="font-size:0.92rem;font-weight:700;color:var(--ink);line-height:1.4;margin-bottom:0.2rem;">' + esc(s.title) + '</h4>';
        html += '<div class="strategy-detail-meta">';
        html += '<span>目标指标：' + esc(s.targetMetric) + '</span>';
        html += '<span>目标年份：' + s.targetYear + '</span>';
        html += '<span>负责层级：' + esc(s.responsible) + '</span>';
        html += '</div>';
        html += '</div>';
        html += '</div>';

        html += '<div class="strategy-evidence">';
        html += '<div class="strategy-evidence-title">文献证据基础</div>';
        html += '<div class="strategy-evidence-text">' + formatSynthesisText(s.currentEvidence) + '</div>';
        html += '</div>';

        html += '<div class="strategy-actions-section">';
        html += '<div class="strategy-actions-title">关键行动</div>';
        html += '<ol class="strategy-actions-list">';
        s.keyActions.forEach(function(act) {
          html += '<li>' + esc(act) + '</li>';
        });
        html += '</ol>';
        html += '</div>';

        if (s.evidenceBasis && s.evidenceBasis.length > 0) {
          html += '<div class="strategy-evidence-basis">';
          html += '<span class="strategy-evidence-label">证据来源：</span>';
          s.evidenceBasis.forEach(function(eb) {
            html += '<span class="strategy-evidence-tag">' + esc(eb) + '</span>';
          });
          html += '</div>';
        }

        html += '</div>';
      });
      html += '</div>';
      html += '</div>';
    }

    // 证据缺口
    var gaps = D.evidenceGaps;
    if (gaps && gaps.total > 0) {
      html += '<div class="topic-section">';
      html += '<h3 class="topic-section-title">证据缺口（' + gaps.total + '条，高风险' + gaps.highSeverity + '条）</h3>';
      html += '<div class="evidence-gaps-grid">';
      gaps.gaps.forEach(function(g) {
        var sevClass = g.severity === 'high' ? 'gap-high' : (g.severity === 'medium' ? 'gap-medium' : 'gap-low');
        html += '<div class="evidence-gap-card ' + sevClass + '">' +
          '<div class="evidence-gap-type">' + esc(g.gapType) + '</div>' +
          '<div class="evidence-gap-topic">主题：' + esc(g.topic) + '</div>' +
          '<div class="evidence-gap-desc">' + esc(g.description) + '</div>' +
          '<div class="evidence-gap-source">来源：' + esc(g.source) + '</div>' +
        '</div>';
      });
      html += '</div>';
      html += '</div>';
    }

    document.getElementById('strategyContent').innerHTML = html;

    // 图表初始化
    setTimeout(function() {
      if (window.ChartFns) {
        var matrixDom = document.getElementById('chartMarketMatrix');
        if (matrixDom) ChartFns.initMarketStrategyChart(matrixDom);
      }
    }, 100);
  }

  // ==================== 全国联盟页 ====================
  function renderAlliancePage() {
    document.getElementById('allianceHeader').innerHTML =
      '<h1 class="page-title">全国联盟</h1>' +
      '<p class="page-subtitle">基于文献证据的联盟行动建议与标准化路径</p>';

    var html = '';
    var aa = D.allianceActions;

    if (aa && aa.summary) {
      html += '<div class="callout teal"><div class="callout-label">联盟概述</div><p>' + esc(aa.summary) + '</p>' +
        '<p style="font-size:0.78rem;color:var(--muted);margin-top:0.4rem;">共' + aa.total + '项行动 · 基于' + D.statistics.totalLiterature + '篇文献</p></div>';
    }

    if (aa && aa.actions && aa.actions.length > 0) {
      html += '<div class="topic-section">';
      html += '<h3 class="topic-section-title">联盟行动列表</h3>';
      aa.actions.forEach(function(act, idx) {
        html += '<div class="strategy-detail-card" style="border-left-color:var(--accent3);">';
        html += '<div class="strategy-detail-header">';
        html += '<span class="strategy-detail-num" style="background:var(--accent3);">' + (idx + 1) + '</span>';
        html += '<div>';
        html += '<h4 style="font-size:0.92rem;font-weight:700;color:var(--ink);line-height:1.4;">' + esc(act.title) + '</h4>';
        html += '<div class="strategy-detail-meta">';
        if (act.targetMetric) html += '<span>目标指标：' + esc(act.targetMetric) + '</span>';
        if (act.responsible) html += '<span>负责：' + esc(act.responsible) + '</span>';
        html += '<span>目标年份：' + act.targetYear + '</span>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
        if (act.actions && act.actions.length > 0) {
          html += '<ol class="strategy-actions-list">';
          act.actions.forEach(function(a) {
            html += '<li>' + esc(a) + '</li>';
          });
          html += '</ol>';
        }
        if (act.evidenceBasis && act.evidenceBasis.length > 0) {
          html += '<div class="strategy-evidence-basis">';
          html += '<span class="strategy-evidence-label">证据来源：</span>';
          act.evidenceBasis.forEach(function(eb) {
            html += '<span class="strategy-evidence-tag">' + esc(eb) + '</span>';
          });
          html += '</div>';
        }
        html += '</div>';
      });
      html += '</div>';
    }

    // 联盟架构
    html += '<div class="topic-section">';
    html += '<h3 class="topic-section-title">联盟架构建议</h3>';
    var layers = aa && aa.architecture ? aa.architecture : [];
    if (layers.length === 0) {
      layers = [
        { layer: '国家级中心', role: '牵头制定标准、质量控制、多中心研究', target_count: '5', color: '#00688f' },
        { layer: '省级中心', role: '区域转诊、技术指导、医生培训', target_count: '31', color: '#2a80a3' },
        { layer: '地市级医院', role: '核心诊疗、患者管理、数据上报', target_count: '300', color: '#2d8659' },
        { layer: '县级医院', role: '初筛初治、双向转诊、基层管理', target_count: '2000', color: '#3a9a6a' },
        { layer: '基层机构', role: '社区筛查、健康宣教、随访管理', target_count: '10000', color: '#7a9a8a' },
        { layer: '患者管理平台', role: '数字化随访、依从性管理、数据整合', target_count: '1', color: '#c75d2c' }
      ];
    }
    html += '<div class="alliance-layers">';
    layers.forEach(function(l) {
      var name = l.layer || l.name || '';
      var role = l.role || '';
      var count = l.target_count || l.count || '';
      var color = l.color || '#2d8659';
      html += '<div class="alliance-layer">' +
        '<div class="alliance-layer-icon" style="background:' + color + ';">' + name.charAt(0) + '</div>' +
        '<div class="alliance-layer-info"><div class="alliance-layer-name">' + esc(name) + '</div><div class="alliance-layer-role">' + esc(role) + '</div></div>' +
        '<div class="alliance-layer-count">' + esc(count) + '</div>' +
      '</div>';
    });
    html += '</div>';
    html += '</div>';

    // KPI
    var kpis = aa && aa.kpis ? aa.kpis : [];
    if (kpis.length > 0) {
      html += '<div class="topic-section">';
      html += '<h3 class="topic-section-title">核心KPI指标</h3>';
      html += '<div class="comparison-table-wrap"><table class="comparison-table"><thead><tr><th>KPI指标</th><th>目标值</th><th>数据来源</th></tr></thead><tbody>';
      kpis.forEach(function(k) {
        html += '<tr><td class="col-study">' + esc(k.name || '') + '</td><td>' + esc(k.target || '') + '</td><td>' + esc(k.data_source || k.source || '') + '</td></tr>';
      });
      html += '</tbody></table></div>';
      html += '</div>';
    }

    // 路线图
    var roadmap = aa && aa.roadmap ? aa.roadmap : [];
    if (roadmap.length > 0) {
      html += '<div class="topic-section">';
      html += '<h3 class="topic-section-title">2025—2030路线图</h3>';
      html += '<div class="roadmap-timeline">';
      roadmap.forEach(function(r) {
        html += '<div class="roadmap-phase">' +
          '<div class="roadmap-year">' + r.year + '</div>' +
          '<div class="roadmap-phase-name">' + esc(r.phase || '') + '</div>' +
          '<div class="roadmap-milestones"><ul>';
        (r.milestones || []).forEach(function(m) {
          html += '<li>' + esc(m) + '</li>';
        });
        html += '</ul></div></div>';
      });
      html += '</div>';
      html += '</div>';
    }

    document.getElementById('allianceContent').innerHTML = html;
  }

  // ==================== 证据库 ====================
  function initEvidenceFilters() {
    var yearSelect = document.getElementById('evFilterYear');
    D.statistics.yearTrend.forEach(function(d) {
      var opt = document.createElement('option');
      opt.value = d.year;
      opt.textContent = d.year + '年';
      yearSelect.appendChild(opt);
    });

    var topicSelect = document.getElementById('evFilterTopic');
    D.statistics.topicDistribution.forEach(function(t) {
      var opt = document.createElement('option');
      opt.value = t.code;
      opt.textContent = t.name + ' (' + t.count + ')';
      topicSelect.appendChild(opt);
    });

    var levelSelect = document.getElementById('evFilterLevel');
    Object.keys(D.statistics.levelDistribution).forEach(function(level) {
      if (D.statistics.levelDistribution[level] > 0) {
        var opt = document.createElement('option');
        opt.value = level;
        opt.textContent = level + '级 (' + D.statistics.levelDistribution[level] + ')';
        levelSelect.appendChild(opt);
      }
    });

    document.getElementById('evFilterTopic').addEventListener('change', function() { evidencePage = 1; evidenceSearch(); });
    document.getElementById('evFilterYear').addEventListener('change', function() { evidencePage = 1; evidenceSearch(); });
    document.getElementById('evFilterLevel').addEventListener('change', function() { evidencePage = 1; evidenceSearch(); });
    document.getElementById('evFilterRegion').addEventListener('change', function() { evidencePage = 1; evidenceSearch(); });
  }

  function evidenceSearch() {
    var filters = {
      search: document.getElementById('evSearchInput').value.trim(),
      topic: document.getElementById('evFilterTopic').value,
      year: document.getElementById('evFilterYear').value,
      evidenceLevel: document.getElementById('evFilterLevel').value,
      region: document.getElementById('evFilterRegion').value
    };
    evidenceFiltered = D.filterLiterature(D.literature, filters);
    evidencePage = 1;
    renderEvidenceList();
  }

  function evidenceReset() {
    document.getElementById('evSearchInput').value = '';
    document.getElementById('evFilterTopic').value = '';
    document.getElementById('evFilterYear').value = '';
    document.getElementById('evFilterLevel').value = '';
    document.getElementById('evFilterRegion').value = '';
    evidenceFiltered = D.literature;
    evidencePage = 1;
    renderEvidenceList();
  }

  function renderEvidencePage() {
    document.getElementById('evTotalCount').textContent = D.literature.length;
    if (evidenceFiltered.length === 0) {
      evidenceFiltered = D.literature;
    }
    renderEvidenceList();
  }

  function renderEvidenceList() {
    var total = evidenceFiltered.length;
    var totalPages = Math.ceil(total / evidencePerPage);
    if (evidencePage > totalPages) evidencePage = 1;
    if (totalPages === 0) totalPages = 1;

    var start = (evidencePage - 1) * evidencePerPage;
    var end = Math.min(start + evidencePerPage, total);
    var pageData = evidenceFiltered.slice(start, end);

    document.getElementById('evResultCount').textContent = total;
    document.getElementById('evPageInfo').textContent = total > 0 ? '第 ' + (start + 1) + '-' + end + ' 条 / 共 ' + totalPages + ' 页' : '';

    var listHtml = '';
    if (pageData.length === 0) {
      listHtml = '<div class="empty-state"><div class="empty-state-text">未找到匹配的文献</div></div>';
    } else {
      listHtml = pageData.map(function(rec) {
        var levelClass = rec.evidenceLevel || 'C';
        var chinaBadge = rec.chinaEvidence
          ? '<span class="china-badge yes">中国</span>'
          : '<span class="china-badge no">国际</span>';
        return '<div class="evidence-item" onclick="App.showLitDetail(\'' + rec.id + '\')">' +
          '<div class="evidence-item-title">' + esc(rec.title) + '</div>' +
          '<div class="evidence-item-meta">' +
            '<span class="evidence-level-badge ' + levelClass + '">' + levelClass + '级</span>' +
            chinaBadge +
            '<span>' + esc(rec.journal) + '</span>' +
            '<span>' + rec.year + '</span>' +
            (rec.firstAuthor ? '<span>' + esc(rec.firstAuthor) + '</span>' : '') +
            (rec.topicPrimaryName ? '<span>' + esc(rec.topicPrimaryName) + '</span>' : '') +
          '</div>' +
          (rec.clinicalImplication ? '<div class="evidence-item-impl">' + esc(rec.clinicalImplication) + '</div>' : '') +
        '</div>';
      }).join('');
    }
    document.getElementById('evList').innerHTML = listHtml;
    renderPagination(totalPages);
  }

  function renderPagination(totalPages) {
    if (totalPages <= 1) {
      document.getElementById('evPagination').innerHTML = '';
      return;
    }

    var html = '';
    html += '<button class="page-btn ' + (evidencePage === 1 ? 'disabled' : '') + '" ' +
      (evidencePage === 1 ? '' : 'onclick="App.goToPage(' + (evidencePage - 1) + ')"') + '>&lt;</button>';

    var maxVisible = 7;
    var startPage = Math.max(1, evidencePage - 3);
    var endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      html += '<button class="page-btn" onclick="App.goToPage(1)">1</button>';
      if (startPage > 2) html += '<span class="page-ellipsis">...</span>';
    }

    for (var p = startPage; p <= endPage; p++) {
      html += '<button class="page-btn ' + (p === evidencePage ? 'active' : '') + '" onclick="App.goToPage(' + p + ')">' + p + '</button>';
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) html += '<span class="page-ellipsis">...</span>';
      html += '<button class="page-btn" onclick="App.goToPage(' + totalPages + ')">' + totalPages + '</button>';
    }

    html += '<button class="page-btn ' + (evidencePage === totalPages ? 'disabled' : '') + '" ' +
      (evidencePage === totalPages ? '' : 'onclick="App.goToPage(' + (evidencePage + 1) + ')"') + '>&gt;</button>';

    document.getElementById('evPagination').innerHTML = html;
  }

  function goToPage(page) {
    evidencePage = page;
    renderEvidenceList();
    document.getElementById('page-evidence').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ==================== 文献详情弹窗 ====================
  function showLitDetail(recId) {
    var rec = D.literature.find(function(r) { return r.id === recId; });
    if (!rec) return;

    var levelClass = rec.evidenceLevel || 'C';
    var html = '<div class="modal-content">' +
      '<div class="modal-close" onclick="App.closeLitModal()">&times;</div>' +
      '<div class="modal-title">' + esc(rec.title) + '</div>' +
      '<div class="modal-meta">' +
        '<span class="modal-meta-item"><strong>期刊：</strong>' + esc(rec.journal) + '</span>' +
        '<span class="modal-meta-item"><strong>年份：</strong>' + rec.year + '</span>' +
        (rec.firstAuthor ? '<span class="modal-meta-item"><strong>第一作者：</strong>' + esc(rec.firstAuthor) + '</span>' : '') +
        '<span class="modal-meta-item"><strong>证据等级：</strong><span class="evidence-level-badge ' + levelClass + '">' + levelClass + '级</span></span>' +
        '<span class="modal-meta-item"><strong>地区：</strong>' + (rec.chinaEvidence ? '中国研究' : '国际研究') + '</span>' +
      '</div>';

    if (rec.titleEn && rec.titleEn !== rec.title) {
      html += '<div class="modal-section"><div class="modal-section-label">英文标题</div><div class="modal-section-text">' + esc(rec.titleEn) + '</div></div>';
    }
    if (rec.topicPrimaryName) {
      html += '<div class="modal-section"><div class="modal-section-label">主要专题</div><div class="modal-section-text">' + esc(rec.topicPrimaryName) + ' (' + esc(rec.topicPrimary) + ')</div></div>';
    }
    if (rec.topicSecondary && rec.topicSecondary.length > 0) {
      html += '<div class="modal-section"><div class="modal-section-label">二级主题</div><div class="modal-section-text">' + rec.topicSecondary.map(esc).join('、') + '</div></div>';
    }
    if (rec.studyDesign) {
      html += '<div class="modal-section"><div class="modal-section-label">研究设计</div><div class="modal-section-text">' + esc(rec.studyDesign) + '</div></div>';
    }
    if (rec.clinicalImplication) {
      html += '<div class="modal-section"><div class="modal-section-label">临床启示</div><div class="modal-section-text">' + esc(rec.clinicalImplication) + '</div></div>';
    }
    if (rec.clusters && rec.clusters.length > 0) {
      html += '<div class="modal-section"><div class="modal-section-label">所属文献簇</div><div class="modal-section-text">' + rec.clusters.map(function(c) {
        return esc(c.split('_').slice(1).join('_'));
      }).join('、') + '</div></div>';
    }

    var links = '';
    if (rec.sourceUrl) links += '<a href="' + rec.sourceUrl + '" target="_blank" class="modal-link">查看原文</a>';
    if (rec.doi) links += '<a href="https://doi.org/' + esc(rec.doi) + '" target="_blank" class="modal-link">DOI: ' + esc(rec.doi) + '</a>';
    if (rec.pmid) links += '<a href="https://pubmed.ncbi.nlm.nih.gov/' + esc(rec.pmid) + '" target="_blank" class="modal-link">PubMed: ' + esc(rec.pmid) + '</a>';
    if (links) html += '<div class="modal-links">' + links + '</div>';

    html += '</div>';

    document.getElementById('litModalContent').innerHTML = html;
    document.getElementById('litModal').classList.add('show');
  }

  function closeLitModal(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('litModal').classList.remove('show');
  }

  // 通过PMID/DOI查找并显示文献
  function searchAndShowLit(pmid, doi) {
    var rec = D.literature.find(function(r) {
      return (pmid && r.pmid === pmid) || (doi && r.doi === doi);
    });
    if (rec) {
      showLitDetail(rec.id);
    } else {
      // 跳转到证据库并搜索
      navigate('evidence');
      setTimeout(function() {
        var searchInput = document.getElementById('evSearchInput');
        if (searchInput) {
          searchInput.value = pmid || doi || '';
          evidenceSearch();
        }
      }, 200);
    }
  }

  // 通过标题搜索文献
  function searchLitByTitle(title) {
    if (!title) return;
    var rec = D.literature.find(function(r) {
      return r.title === title || r.titleEn === title ||
             (r.title && r.title.includes(title)) ||
             (r.titleEn && r.titleEn.includes(title));
    });
    if (rec) {
      showLitDetail(rec.id);
    } else {
      navigate('evidence');
      setTimeout(function() {
        var searchInput = document.getElementById('evSearchInput');
        if (searchInput) {
          searchInput.value = title.substring(0, 50);
          evidenceSearch();
        }
      }, 200);
    }
  }

  // ==================== 恒沐®/TMF产品证据全景页 ====================
  function renderTMFPage() {
    var container = document.getElementById('tmfContent');
    if (!container) return;

    var products = D.products || {};
    var summary = products.tmf_evidence_summary || {};
    var insights = products.tmf_core_insights || {};
    var timeline = products.tmf_evidence_timeline || {};
    var popMatrix = products.tmf_population_matrix || {};
    var efficacy = products.tmf_efficacy_outcomes || {};
    var safety = products.tmf_safety_outcomes || {};
    var switching = products.tmf_switching_evidence || {};
    var comparator = products.tmf_comparator_matrix || {};
    var marketInsights = products.tmf_market_actions || {};
    var evidenceGaps = products.tmf_evidence_gaps || {};
    var litData = products.tmf_literature || {};

    var html = '';

    // 1. 证据总览（统计卡片网格）
    html += '<div class="chapter-section">';
    html += '<h2 class="chapter-title">证据总览</h2>';
    html += '<div class="stat-grid tmf-stat-grid">';
    html += buildTMFStatCard('PDF总数', summary.total_pdfs || summary.total_literature || 0, '篇');
    html += buildTMFStatCard('独立研究', summary.independent_studies || 0, '项');
    html += buildTMFStatCard('随机对照试验', summary.rct_count || 0, '篇');
    html += buildTMFStatCard('真实世界研究', summary.real_world_count || 0, '篇');
    html += buildTMFStatCard('中国研究', (summary.china_study_count || summary.china_evidence_count || 0) + '篇 (' + (summary.china_study_pct || summary.china_evidence_pct || 0) + '%)', '');
    html += buildTMFStatCard('特殊人群研究', summary.special_population_studies || summary.special_population_count || 0, '篇');
    html += buildTMFStatCard('最高证据等级', summary.evidence_levels ? (Object.keys(summary.evidence_levels).find(function(k) { return summary.evidence_levels[k] > 0; }) || '—') : '—', '');
    html += buildTMFStatCard('累计样本量', summary.cumulative_sample_size || 0, '例');
    html += '</div>';
    if (summary.sample_size_note) {
      html += '<div class="callout callout-warning"><strong>注意：</strong>' + esc(summary.sample_size_note) + '</div>';
    }
    if (summary.note) {
      html += '<div class="callout callout-info"><strong>说明：</strong>' + esc(summary.note) + '</div>';
    }
    html += '</div>';

    // 2. 核心洞察
    if (insights.insights && insights.insights.length > 0) {
      html += '<div class="chapter-section">';
      html += '<h2 class="chapter-title">核心洞察</h2>';
      html += '<div class="insight-grid tmf-insight-grid">';
      insights.insights.forEach(function(ins) {
        html += '<div class="insight-card tmf-insight-card">';
        html += '<div class="ic-conclusion">' + esc(ins.conclusion) + '</div>';
        html += '<div class="ic-meta">';
        html += '<span>人群: ' + esc(ins.applicable_population || ins.population || '') + '</span>';
        html += '<span>文献: ' + (ins.support_literature_count || ins.evidence_count || 0) + '篇</span>';
        html += '<span>等级: ' + esc(ins.highest_evidence_level || '') + '</span>';
        html += '</div>';
        html += '<div class="ic-detail"><strong>一致性:</strong> ' + esc(ins.evidence_consistency || '') + '</div>';
        html += '<div class="ic-detail"><strong>中国实践:</strong> ' + esc(ins.china_practice_relevance || '') + '</div>';
        html += '<div class="ic-detail"><strong>2030意义:</strong> ' + esc(ins.meaning_2030 || '') + '</div>';
        html += '<div class="ic-detail"><strong>市场启示:</strong> ' + esc(ins.market_implication || '') + '</div>';
        var limitations = ins.main_limitations || ins.uncertainty || '';
        if (limitations) {
          html += '<div class="ic-detail ic-uncertainty"><strong>局限性:</strong> ' + esc(limitations) + '</div>';
        }
        if (ins.compliance_note) {
          html += '<div class="ic-compliance">' + esc(ins.compliance_note) + '</div>';
        }
        var popLabel = ins.applicable_population || ins.population || '恒沐洞察';
        if (ins.source_ids && ins.source_ids.length) {
          html += '<button class="hi-evidence-btn" onclick="App.openEvidenceDrawer(\'恒沐洞察: ' + esc(popLabel).replace(/'/g, '&#39;') + '\', ' + JSON.stringify(ins.source_ids).replace(/"/g, '&quot;') + ')">查看证据 (' + (ins.support_literature_count || ins.evidence_count || 0) + '篇)</button>';
        } else {
          html += '<div class="ic-no-evidence">无关联文献</div>';
        }
        html += '</div>';
      });
      html += '</div>';
      html += '</div>';
    } else {
      html += '<div class="chapter-section">';
      html += '<div class="callout callout-info"><strong>恒沐证据不足</strong>' + esc(insights.note || '当前文献库中尚未识别到恒沐相关文献。随着飞书文献库每日更新，恒沐相关文献将被自动识别并生成跨文献洞察。') + '</div>';
      html += '</div>';
    }

    // 3. 证据时间轴
    html += '<div class="chapter-section">';
    html += '<h2 class="chapter-title">证据发展时间轴</h2>';
    if (timeline.stages && timeline.stages.length) {
      html += '<div class="tmf-timeline">';
      timeline.stages.forEach(function(stage) {
        html += '<div class="tmf-timeline-stage' + (stage.items.length === 0 ? ' empty' : '') + '">';
        html += '<div class="tmf-timeline-dot"></div>';
        html += '<div class="tmf-timeline-content">';
        html += '<h3 class="tmf-timeline-title">' + esc(stage.name) + '</h3>';
        if (stage.items.length === 0) {
          html += '<p class="tmf-timeline-empty">暂无证据</p>';
        } else {
          stage.items.forEach(function(item) {
            html += '<div class="tmf-timeline-item">';
            html += '<span class="tmf-timeline-year">' + (item.year || '—') + '</span>';
            html += '<span class="tmf-timeline-text">' + esc((item.title || '').substring(0, 60)) + '</span>';
            if (item.evidence_level) {
              html += '<span class="ev-level-badge level-' + item.evidence_level + '">' + item.evidence_level + '</span>';
            }
            html += '</div>';
          });
        }
        html += '</div></div>';
      });
      html += '</div>';
    } else {
      html += '<p class="no-data">暂无时间轴数据</p>';
    }
    html += '</div>';

    // 4. 患者人群证据矩阵
    html += '<div class="chapter-section">';
    html += '<h2 class="chapter-title">患者人群证据地图</h2>';
    html += '<div id="chartTMFPopulation" style="width:100%;height:400px;"></div>';
    if (popMatrix.scoring_method) {
      html += '<div class="method-note"><strong>评分方法：</strong>' + esc(popMatrix.scoring_method) + '</div>';
    }
    html += '<div class="strategy-panel">';
    html += '<div class="sp-section"><div class="sp-label">关键洞察</div><div class="sp-value">患者人群证据矩阵展示了TMF在不同患者群体中的证据覆盖和成熟度。</div></div>';
    html += '<div class="sp-section"><div class="sp-label">证据强度</div><div class="sp-value">' + (popMatrix.populations && popMatrix.populations.length > 0 ? '有限-中等' : '不足') + '</div></div>';
    html += '<div class="sp-compliance-section">未满足需求评分基于可审计规则，不由AI主观打分。证据成熟度分级：5=≥3篇含RCT，4=≥2篇，3=≥1篇，1=无证据。</div>';
    html += '</div>';
    html += '</div>';

    // 5. 核心疗效图表
    html += '<div class="chapter-section">';
    html += '<h2 class="chapter-title">核心疗效证据</h2>';
    if (efficacy.metrics) {
      efficacy.metrics.forEach(function(m) {
        html += '<div class="tmf-metric-block">';
        html += '<h3 class="tmf-metric-title">' + esc(m.metric) + '</h3>';
        if (m.data_points && m.data_points.length > 0) {
          html += '<p class="tmf-metric-note">' + esc(m.note || '') + '</p>';
          html += '<div class="tmf-data-points">';
          m.data_points.forEach(function(dp) {
            html += '<div class="tmf-data-point">';
            html += '<span class="dp-pop">' + esc(dp.population) + '</span>';
            html += '<span class="dp-design">' + esc(dp.study_design) + '</span>';
            html += '<span class="dp-followup">' + esc(dp.follow_up) + '</span>';
            if (dp.sample_size) html += '<span class="dp-sample">n=' + dp.sample_size + '</span>';
            if (dp.evidence_grade) html += '<span class="ev-level-badge level-' + dp.evidence_grade + '">' + dp.evidence_grade + '</span>';
            if (dp.pmid) html += '<span class="dp-pmid">PMID: ' + esc(dp.pmid) + '</span>';
            if (dp.limitations) html += '<div class="dp-limit">' + esc(dp.limitations) + '</div>';
            html += '</div>';
          });
          html += '</div>';
        } else {
          html += '<p class="no-data">' + esc(m.note || '暂无该终点的TMF证据') + '</p>';
        }
        html += '</div>';
      });
      html += '<div class="callout callout-warning"><strong>方法说明：</strong>' + esc(efficacy.method_note || '不同随访时间、人群和终点定义的研究不直接计算简单平均。') + '</div>';
    }
    html += '</div>';

    // 6. 安全性证据
    html += '<div class="chapter-section">';
    html += '<h2 class="chapter-title">安全性证据面板</h2>';
    if (safety.metrics) {
      safety.metrics.forEach(function(m) {
        html += '<div class="tmf-metric-block">';
        html += '<h3 class="tmf-metric-title">' + esc(m.metric) + '</h3>';
        if (m.data_points && m.data_points.length > 0) {
          html += '<p class="tmf-metric-note">' + esc(m.note || '') + '</p>';
          html += '<div class="tmf-data-points">';
          m.data_points.forEach(function(dp) {
            html += '<div class="tmf-data-point">';
            html += '<span class="dp-pop">' + esc(dp.population) + '</span>';
            html += '<span class="dp-design">' + esc(dp.study_design) + '</span>';
            if (dp.sample_size) html += '<span class="dp-sample">n=' + dp.sample_size + '</span>';
            if (dp.evidence_grade) html += '<span class="ev-level-badge level-' + dp.evidence_grade + '">' + dp.evidence_grade + '</span>';
            html += '<div class="dp-limit">' + esc(dp.limitations || '') + '</div>';
            html += '</div>';
          });
          html += '</div>';
        } else {
          html += '<p class="no-data">' + esc(m.note || '暂无该安全性终点的TMF证据') + '</p>';
        }
        html += '</div>';
      });
      html += '<div class="callout callout-warning"><strong>方法说明：</strong>' + esc(safety.method_note || '不能把"无统计学显著差异"表述为"绝对没有影响"。') + '</div>';
    }
    html += '</div>';

    // 7. 经治转换证据
    html += '<div class="chapter-section">';
    html += '<h2 class="chapter-title">经治转换证据</h2>';
    if (switching.stages && switching.stages.length) {
      html += '<div class="switching-path">';
      switching.stages.forEach(function(stage) {
        html += '<div class="switching-stage">';
        html += '<h3 class="switching-stage-title">' + esc(stage.name) + '</h3>';
        if (stage.items && stage.items.length > 0) {
          html += '<div class="switching-items">';
          stage.items.slice(0, 5).forEach(function(item) {
            html += '<div class="switching-item">';
            html += '<div class="si-title">' + esc(item.title || '') + '</div>';
            if (item.has_data === false) {
              html += '<div class="si-note">' + esc(item.note || '证据不足') + '</div>';
            } else if (item.reported === false) {
              html += '<div class="si-note">' + esc(item.note || '未报告') + '</div>';
            } else {
              if (item.source_drugs) html += '<div class="si-detail"><strong>来源药物:</strong> ' + esc(item.source_drugs) + '</div>';
              if (item.sample_size) html += '<div class="si-detail"><strong>样本量:</strong> ' + item.sample_size + '</div>';
              if (item.evidence_level) html += '<div class="si-detail"><strong>证据等级:</strong> ' + item.evidence_level + '</div>';
            }
            html += '</div>';
          });
          if (stage.items.length > 5) {
            html += '<div class="switching-more">+ ' + (stage.items.length - 5) + ' 更多研究</div>';
          }
          html += '</div>';
        } else {
          html += '<p class="no-data">暂无数据</p>';
        }
        html += '</div>';
      });
      html += '</div>';
      if (switching.switch_reasons_reporting) {
        html += '<div class="callout callout-info">' + esc(switching.switch_reasons_reporting) + '</div>';
      }
      if (switching.retention_evidence_gap) {
        html += '<div class="callout callout-warning">' + esc(switching.retention_evidence_gap) + '</div>';
      }
    } else {
      html += '<p class="no-data">暂无转换治疗证据</p>';
    }
    html += '</div>';

    // 8. 药物对比矩阵
    html += '<div class="chapter-section">';
    html += '<h2 class="chapter-title">中国口服核苷（酸）类似物治疗格局</h2>';
    if (comparator.comparators) {
      html += '<div class="table-scroll"><table class="data-table tmf-comparator-table">';
      html += '<thead><tr>';
      html += '<th>药物</th><th>作用机制</th><th>抗病毒效力</th><th>耐药屏障</th><th>肾安全性</th><th>骨安全性</th><th>代谢影响</th><th>长期证据</th><th>中国RWE</th><th>可及性</th><th>证据等级</th>';
      html += '</tr></thead><tbody>';
      comparator.comparators.forEach(function(c) {
        var isTMF = c.is_tmf || (c.drug && (c.drug.indexOf('TMF') >= 0 || c.drug.indexOf('恒沐') >= 0 || c.drug.indexOf('艾米替诺福韦') >= 0));
        html += '<tr' + (isTMF ? ' class="tmf-highlight-row"' : '') + '>';
        html += '<td>' + esc(c.drug) + '</td>';
        html += '<td>' + esc(c.mechanism) + '</td>';
        html += '<td>' + esc(c.antiviral_potency) + '</td>';
        html += '<td>' + esc(c.resistance_barrier) + '</td>';
        html += '<td>' + esc(c.renal_safety) + '</td>';
        html += '<td>' + esc(c.bone_safety) + '</td>';
        html += '<td>' + esc(c.metabolic_impact) + '</td>';
        html += '<td>' + esc(c.long_term_maturity || c.long_term_evidence_maturity || '') + '</td>';
        html += '<td>' + esc(c.china_rwe || c.china_rwe_evidence || '') + '</td>';
        html += '<td>' + esc(c.accessibility) + '</td>';
        html += '<td><span class="ev-level-badge level-' + (c.evidence_level || 'B') + '">' + (c.evidence_level || 'B') + '</span></td>';
        html += '</tr>';
      });
      html += '</tbody></table></div>';

      if (comparator.comparison_rules) {
        html += '<div class="callout callout-warning"><strong>比较规则：</strong><ul>';
        comparator.comparison_rules.forEach(function(r) {
          html += '<li>' + esc(r) + '</li>';
        });
        html += '</ul></div>';
      }
    }
    html += '</div>';

    // 9. 市场部策略洞察
    html += '<div class="chapter-section">';
    html += '<h2 class="chapter-title">市场部策略洞察</h2>';
    var actions = marketInsights.actions || marketInsights.action_list || [];
    if (actions.length > 0) {
      html += '<div class="tmf-action-grid">';
      actions.forEach(function(a) {
        var priClass = a.priority === '高' ? 'priority-high' : (a.priority === '中' ? 'priority-medium' : 'priority-exploratory');
        html += '<div class="strategy-action-card tmf-action-card ' + priClass + '">';
        html += '<div class="sac-priority ' + priClass + '">' + esc(a.priority || '中') + '</div>';
        html += '<h3 class="sac-title">' + esc(a.market_opportunity || a.action || '') + '</h3>';
        html += '<div class="sac-field"><strong>证据发现:</strong> ' + esc(a.evidence_findings || a.evidence_basis || '') + '</div>';
        html += '<div class="sac-field"><strong>关键患者:</strong> ' + esc(a.key_patients || a.target_patients || '') + '</div>';
        html += '<div class="sac-field"><strong>未满足需求:</strong> ' + esc(a.unmet_need || '') + '</div>';
        if (a.recommended_actions && a.recommended_actions.length > 0) {
          html += '<div class="sac-field"><strong>推荐行动:</strong></div>';
          html += '<ul class="sac-actions">';
          a.recommended_actions.forEach(function(act) {
            html += '<li>' + esc(act) + '</li>';
          });
          html += '</ul>';
        }
        if (a.kpis && a.kpis.length > 0) {
          html += '<div class="sac-kpis">';
          a.kpis.forEach(function(k) {
            html += '<span class="kpi-badge">' + esc(k) + '</span>';
          });
          html += '</div>';
        }
        html += '<div class="sac-compliance">' + esc(a.compliance_boundary || a.compliance_note || '') + '</div>';
        html += '</div>';
      });
      html += '</div>';
    }
    html += '</div>';

    // 10. 证据缺口
    html += '<div class="chapter-section">';
    html += '<h2 class="chapter-title">证据缺口</h2>';
    if (evidenceGaps.gaps && evidenceGaps.gaps.length > 0) {
      html += '<div class="evidence-gaps">';
      evidenceGaps.gaps.forEach(function(gap) {
        html += '<div class="evidence-gap-item">';
        html += '<div class="eg-importance ' + (gap.importance || 'medium').toLowerCase() + '">' + (gap.importance || '中') + '</div>';
        html += '<div class="eg-content">';
        html += '<h3 class="eg-title">' + esc(gap.description || '') + '</h3>';
        html += '<div class="eg-current"><strong>当前证据:</strong> ' + esc(gap.current_evidence || '') + '</div>';
        html += '<div class="eg-need"><strong>研究需求:</strong> ' + esc(gap.research_need || '') + '</div>';
        html += '</div>';
        html += '</div>';
      });
      html += '</div>';
      if (evidenceGaps.key_gap_summary) {
        html += '<div class="callout callout-info"><strong>主要证据缺口:</strong> ' + esc(evidenceGaps.key_gap_summary) + '</div>';
      }
    } else {
      html += '<p class="no-data">暂无证据缺口分析</p>';
    }
    html += '</div>';

    // 11. 文献证据列表
    html += '<div class="chapter-section">';
    html += '<h2 class="chapter-title">文献证据列表</h2>';
    var records = litData.records || [];
    if (records.length > 0) {
      html += '<div class="tmf-lit-filter" style="margin-bottom:1rem;">';
      html += '<span class="tmf-lit-count">共 ' + records.length + ' 篇文献 · ' + (summary.independent_studies || 0) + ' 项独立研究</span>';
      html += '</div>';
      html += '<div class="tmf-literature-list">';
      records.forEach(function(r, idx) {
        var title = r.title_cn || r.title_en || r.filename || '未命名文献';
        html += '<div class="tmf-lit-card">';
        html += '<div class="tmf-lit-header">';
        html += '<span class="tmf-lit-num">#' + (idx + 1) + '</span>';
        if (r.evidence_level) {
          html += '<span class="ev-level-badge level-' + r.evidence_level + '">' + r.evidence_level + '</span>';
        }
        if (r.study_type) {
          html += '<span class="tmf-lit-type">' + esc(r.study_type) + '</span>';
        }
        html += '</div>';
        html += '<h4 class="tmf-lit-title">' + esc(title.substring(0, 80)) + (title.length > 80 ? '...' : '') + '</h4>';
        html += '<div class="tmf-lit-meta">';
        if (r.first_author) html += '<span>' + esc(r.first_author) + ' 等</span>';
        if (r.journal) html += '<span>' + esc(r.journal) + '</span>';
        if (r.year) html += '<span>' + r.year + '</span>';
        if (r.sample_size) html += '<span>n=' + r.sample_size + '</span>';
        html += '</div>';
        if (r.patient_population && r.patient_population.length > 0) {
          html += '<div class="tmf-lit-pops">';
          r.patient_population.slice(0, 5).forEach(function(p) {
            html += '<span class="tmf-pop-tag">' + esc(p) + '</span>';
          });
          if (r.patient_population.length > 5) {
            html += '<span class="tmf-pop-more">+' + (r.patient_population.length - 5) + '</span>';
          }
          html += '</div>';
        }
        if (r.conclusion) {
          html += '<div class="tmf-lit-conclusion">' + esc(r.conclusion.substring(0, 120)) + (r.conclusion.length > 120 ? '...' : '') + '</div>';
        }
        html += '<div class="tmf-lit-footer">';
        if (r.pmid) html += '<span class="tmf-lit-id">PMID: ' + esc(r.pmid) + '</span>';
        if (r.doi) html += '<span class="tmf-lit-id">DOI: ' + esc(r.doi) + '</span>';
        if (r.study_entity_id) html += '<span class="tmf-lit-study">研究: ' + esc(r.study_entity_id) + '</span>';
        html += '</div>';
        html += '</div>';
      });
      html += '</div>';
    } else {
      html += '<p class="no-data">暂无文献列表数据</p>';
    }
    html += '</div>';

    container.innerHTML = html;

    // 初始化图表
    setTimeout(function() {
      if (window.ChartFns && window.echarts) {
        var popChart = document.getElementById('chartTMFPopulation');
        if (popChart && ChartFns.initTMFPopulationChart) {
          ChartFns.initTMFPopulationChart(popChart);
        }
      }
    }, 200);
  }

  function buildTMFStatCard(label, value, unit) {
    return '<div class="stat-card tmf-stat-card">' +
      '<div class="stat-value">' + esc(String(value)) + (unit ? '<span class="stat-unit">' + unit + '</span>' : '') + '</div>' +
      '<div class="stat-label">' + esc(label) + '</div>' +
      '</div>';
  }

  // ==================== 证据抽屉交互 ====================
  function openEvidenceDrawer(title, sourceIds) {
    document.getElementById('drawerTitle').textContent = title || '支持证据';
    renderDrawerEvidence(sourceIds || []);

    var overlay = document.getElementById('evidenceDrawerOverlay');
    var drawer = document.getElementById('evidenceDrawer');
    overlay.classList.add('show');
    drawer.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  function closeEvidenceDrawer() {
    var overlay = document.getElementById('evidenceDrawerOverlay');
    var drawer = document.getElementById('evidenceDrawer');
    overlay.classList.remove('show');
    drawer.classList.remove('show');
    document.body.style.overflow = '';
  }

  function renderDrawerEvidence(sourceIds) {
    var listEl = document.getElementById('drawerEvidenceList');
    var countEl = document.getElementById('drawerEvidenceCount');
    var litList = D.literature || [];
    var matched = [];

    if (sourceIds && sourceIds.length) {
      // 按ID匹配
      for (var i = 0; i < sourceIds.length; i++) {
        var sid = sourceIds[i];
        var found = litList.find(function(l) {
          return l.id === sid || l.pmid === sid || l.doi === sid ||
                 (l.literatureId && l.literatureId === sid);
        });
        if (found) matched.push(found);
      }
    }

    if (!matched.length) {
      // 如果没有sourceIds或找不到匹配，取最新的10篇作为展示
      matched = litList.slice(0, 10);
    }

    var html = matched.map(function(lit) {
      var level = lit.evidenceLevel || 'C';
      var isChina = lit.chinaEvidence || lit.china_direct || lit.isChina;
      return '<div class="drawer-evidence-item" onclick="App.showLitDetail(\'' + esc(lit.id || lit.pmid || '') + '\')">' +
        '<div class="dei-header">' +
          '<span class="dei-level level-' + level + '">' + level + '级</span>' +
          '<span class="dei-year">' + (lit.year || '') + '</span>' +
          (isChina ? '<span class="dei-china">中国证据</span>' : '') +
        '</div>' +
        '<div class="dei-title">' + esc(lit.title || lit.title_cn || '') + '</div>' +
        '<div class="dei-journal">' + esc(lit.journal || '') + '</div>' +
      '</div>';
    }).join('');

    if (!matched.length) {
      html = '<div class="drawer-empty">暂无匹配的文献证据</div>';
    }

    listEl.innerHTML = html;
    countEl.textContent = matched.length + ' 篇文献';
  }

  // ==================== 工具函数 ====================
  function esc(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatSynthesisText(text) {
    if (!text) return '';
    var paragraphs = text.split(/(?<=[。；])/);
    var html = '';
    var current = '';
    for (var i = 0; i < paragraphs.length; i++) {
      current += paragraphs[i];
      if (current.length > 150 || i === paragraphs.length - 1) {
        html += '<p>' + esc(current.trim()) + '</p>';
        current = '';
      }
    }
    return html || '<p>' + esc(text) + '</p>';
  }

  // ==================== 显示证据来源 ====================
  function showEvidenceSources(strategyName) {
    // 跳转到证据库页面并搜索相关文献
    var chart = (D.charts && D.charts['market_strategy_map']) || {};
    var strategies = chart.strategies || [];
    var strategy = strategies.find(function(s) { return s.name === strategyName; });

    if (strategy && strategy.source_ids && strategy.source_ids.length) {
      // 有具体文献ID，跳转到证据库
      App.navigate('evidence');
      setTimeout(function() {
        var searchInput = document.getElementById('evSearchInput');
        if (searchInput) {
          searchInput.value = strategyName;
          App.evidenceSearch();
        }
      }, 200);
    } else {
      // 直接跳转到证据库
      App.navigate('evidence');
    }
  }

  // ==================== 暴露接口 ====================
  return {
    init: init,
    navigate: navigate,
    toggleMobileMenu: toggleMobileMenu,
    evidenceSearch: evidenceSearch,
    evidenceReset: evidenceReset,
    goToPage: goToPage,
    showLitDetail: showLitDetail,
    closeLitModal: closeLitModal,
    toggleLinkedLit: toggleLinkedLit,
    searchAndShowLit: searchAndShowLit,
    searchLitByTitle: searchLitByTitle,
    showEvidenceSources: showEvidenceSources,
    openEvidenceDrawer: openEvidenceDrawer,
    closeEvidenceDrawer: closeEvidenceDrawer,
    renderUpdatesPage: renderUpdatesPage
  };

})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', App.init);
} else {
  App.init();
}
