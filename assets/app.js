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

    document.getElementById('evSearchInput').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') evidenceSearch();
    });
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
      document.getElementById('ovInsightVersion').textContent = 'v' + (D.meta.version || '4.0');
      document.getElementById('ovBuildTime').textContent = D.meta.generatedAt || D.meta.lastSync || '--';
    }
    var lu = D.latestUpdates || {};
    document.getElementById('ovNewCount').textContent = (lu.recentCount7d || 0) + '篇(7天)';

    // 1. 总体核心洞察
    renderCoreInsight();

    // 2. 六条一级洞察
    renderHomepageInsights();

    // 3. 市场策略总览
    renderMarketStrategy();

    // 4. 最新证据动态
    renderLatestUpdates();

    // 图表（仅年度趋势和专题分布，后移至证据图谱章节）
    setTimeout(function() {
      if (window.ChartFns) {
        ChartFns.initYearTrendChart(document.getElementById('chartYearTrend'));
        ChartFns.initTopicDistChart(document.getElementById('chartTopicDist'));
      }
    }, 100);

    // 证据等级表
    renderLevelTable();

    // 中国证据分类
    renderChinaEvidence();

    // 文献簇
    var assocTotal = D.statistics.clusterAssociatedTotal || 0;
    var uniqueTotal = D.statistics.clusterUniqueTotal || D.statistics.totalLiterature || 0;
    var clDesc = document.getElementById('ovClusterDesc');
    if (clDesc) clDesc.textContent = '12个证据簇共关联 ' + assocTotal + ' 次（独立文献 ' + uniqueTotal + ' 篇，同一文献可归入多个簇）';
    renderClusterGrid();

    // 数据质量审计
    renderAudit();

    // 证据缺口
    renderOverviewGaps();

    // 章节导航
    renderChapterNav();
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

    // 市场策略卡片
    var ms = D.marketStrategy || {};
    var table = ms.strategyTable || [];
    if (table.length > 0) {
      html += '<div class="topic-section">';
      html += '<h3 class="topic-section-title">市场部策略卡片</h3>';
      html += '<div class="callout green"><div class="callout-label">策略原则</div><p>所有策略基于' + D.statistics.totalLiterature + '篇飞书同步文献逐层推导，医学合规，不超说明书，不夸大疗效。</p></div>';

      table.forEach(function(s, idx) {
        var priority = 'med';
        if (s.stage === '筛' || s.stage === '治' || s.stage === '管/康') priority = 'high';
        else if (s.stage === '联盟') priority = 'low';
        var priorityLabel = priority === 'high' ? '高优先级' : (priority === 'med' ? '中优先级' : '探索性');

        html += '<div class="strategy-card">' +
          '<span class="priority-tag ' + priority + '">' + priorityLabel + '</span>' +
          '<h4>' + esc(s.stage) + ' · ' + esc(s.coreInsight || '') + '</h4>' +
          '<div class="sc-row"><span class="sc-label">对应文献洞察：</span><span class="sc-value">' + esc(s.coreInsight || '') + '</span></div>' +
          '<div class="sc-row"><span class="sc-label">证据基础：</span><span class="sc-value">' + (s.sourceCount || 0) + ' 篇文献</span></div>' +
          '<div class="sc-row"><span class="sc-label">目标医生/患者：</span><span class="sc-value">' + esc(s.targetAudience || '') + '</span></div>' +
          '<div class="sc-row"><span class="sc-label">核心障碍：</span><span class="sc-value">' + esc(s.barrier || '') + '</span></div>' +
          '<div class="sc-row"><span class="sc-label">建议行动：</span><span class="sc-value">' + esc(s.project || '') + '</span></div>' +
          '<div class="sc-row"><span class="sc-label">实施场景：</span><span class="sc-value">' + esc(s.evidenceCommunication || '') + '</span></div>' +
          '<div class="sc-row"><span class="sc-label">KPI：</span><span class="sc-value sc-kpi">' + esc(s.kpi || '') + '</span></div>' +
        '</div>';
      });
      html += '</div>';
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
    searchLitByTitle: searchLitByTitle
  };

})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', App.init);
} else {
  App.init();
}
