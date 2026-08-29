/* ============================================================
   慢乙肝—HBV相关HCC文献洞察整合报告 - 主应用逻辑
   ============================================================ */

var App = (function() {
  'use strict';

  var D = null; // APP_DATA 引用
  var currentPage = 'overview';
  var evidencePage = 1;
  var evidencePerPage = 20;
  var evidenceFiltered = [];

  // 簇到导航页映射
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

  // 专题页配置
  var PAGE_CONFIG = {
    screening: {
      title: '筛查证据',
      subtitle: 'HBV筛查策略与筛查到确诊的闭环',
      clusters: ['C12_screening_cascade', 'C07_hcc_screening', 'C11_guidelines'],
      topicCodes: ['T1'],
      intro: '本专题聚焦HBV筛查策略、筛查到确诊的闭环管理，以及相关指南与共识。通过文献聚类分析，梳理筛查证据脉络。'
    },
    diagnosis: {
      title: '诊断与标志物',
      subtitle: 'HBsAg定量、HBV DNA检测与疗效预测标志物',
      clusters: ['C05_hbsag_quantification'],
      topicCodes: ['T3'],
      intro: '本专题聚焦HBsAg定量检测与疗效预测、HBV DNA抑制与病毒学应答等诊断标志物相关的文献证据。'
    },
    treatment: {
      title: '治疗与功能性治愈',
      subtitle: 'HBsAg下降、PegIFN转换/联合、NUC治疗与新药管线',
      clusters: ['C01_hbsag_decline_functional_cure', 'C02_pegifn_switch', 'C04_nuc_treatment', 'C06_hbv_dna_suppression', 'C09_new_drugs'],
      topicCodes: ['T4', 'T3'],
      topics: ['topic1_hbsag_functional_cure', 'topic2_pegifn_switch_addon'],
      intro: '本专题已完成2个专题的跨文献综合验证，涵盖HBsAg下降与功能性治愈、经治患者转换或联合PegIFN，共纳入641篇文献。'
    },
    management: {
      title: '患者管理与依从性',
      subtitle: '治疗依从性、脱落管理与长期随访',
      clusters: ['C10_patient_management'],
      topicCodes: [],
      intro: '本专题聚焦患者管理与依从性，包括治疗脱落阶段分析、依从性改善策略和强化随访节点。'
    },
    hbvhcc: {
      title: 'HBV→HCC',
      subtitle: 'HBV抑制后HCC残余风险、HCC筛查与治疗',
      clusters: ['C03_hcc_residual_risk', 'C07_hcc_screening', 'C08_hcc_treatment'],
      topicCodes: ['T6', 'T7'],
      topics: ['topic3_hcc_residual_risk'],
      intro: '本专题已完成1个专题的跨文献综合验证，聚焦HBV抑制或HBsAg清除后HCC残余风险，共纳入619篇文献。'
    }
  };

  // ==================== 初始化 ====================
  function init() {
    D = window.APP_DATA;
    if (!D || !D.hasRealData) {
      document.getElementById('loadingOverlay').innerHTML =
        '<div class="loading-text" style="color:var(--danger);">数据加载失败，请确保data.js已正确加载</div>';
      return;
    }

    // 隐藏加载提示，显示主内容
    document.getElementById('loadingOverlay').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';

    // 渲染首页
    renderOverview();

    // 初始化证据库筛选器
    initEvidenceFilters();

    // 绑定搜索回车
    document.getElementById('evSearchInput').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') evidenceSearch();
    });
  }

  // ==================== 导航 ====================
  function navigate(page) {
    currentPage = page;
    // 切换页面显示
    var pages = document.querySelectorAll('.page');
    for (var i = 0; i < pages.length; i++) {
      pages[i].classList.remove('active');
    }
    var target = document.getElementById('page-' + page);
    if (target) target.classList.add('active');

    // 更新导航高亮
    var navItems = document.querySelectorAll('.nav-item');
    for (var j = 0; j < navItems.length; j++) {
      navItems[j].classList.toggle('active', navItems[j].getAttribute('data-page') === page);
    }

    // 滚动到顶部
    window.scrollTo(0, 0);

    // 渲染对应页面
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

    // 报告头
    document.getElementById('ovUpdateDate').textContent = stats.lastUpdate || '2026年8月';
    document.getElementById('ovTotalLit').textContent = stats.totalLiterature;
    document.getElementById('ovBadgeText').textContent = '基于' + stats.totalLiterature + '篇循证医学文献';
    if (D.meta) {
      document.getElementById('ovInsightVersion').textContent = 'v' + (D.meta.version || '3.0');
      document.getElementById('ovBuildTime').textContent = D.meta.generatedAt || D.meta.lastSync || '--';
    }

    // 1. 总体核心洞察
    renderCoreInsight();

    // 2. 六条一级洞察
    renderHomepageInsights();

    // 3. 市场部策略总览
    renderMarketStrategy();

    // 核心数字卡片
    var chinaBreakdown = stats.chinaEvidenceBreakdown || {};
    var cards = [
      { val: stats.totalLiterature, unit: '篇', label: '有效文献总量', cls: '' },
      { val: stats.chinaEvidence, unit: '(' + stats.chinaEvidencePct + '%)', label: '中国证据(含直接+合作)', cls: 'teal' },
      { val: (chinaBreakdown.chinaDirect || 0), unit: '(' + ((chinaBreakdown.chinaDirect || 0) / stats.totalLiterature * 100).toFixed(1) + '%)', label: '中国直接证据', cls: 'teal' },
      { val: stats.abEvidence, unit: '(' + stats.abEvidencePct + '%)', label: 'AB级证据', cls: 'orange' },
      { val: stats.clustersCount, unit: '个', label: '文献簇', cls: 'purple' },
      { val: stats.validatedTopicsCount, unit: '个', label: '验证专题', cls: '' }
    ];
    document.getElementById('ovStatCards').innerHTML = cards.map(function(c) {
      return '<div class="stat-card ' + c.cls + '">' +
        '<div class="stat-card-value">' + c.val + '<span class="stat-card-value-unit"> ' + c.unit + '</span></div>' +
        '<div class="stat-card-label">' + c.label + '</div>' +
        '</div>';
    }).join('');

    // 5. 最新证据动态
    renderLatestUpdates();

    // 初始化图表 (仅年度趋势和专题分布)
    setTimeout(function() {
      if (window.ChartFns) {
        ChartFns.initYearTrendChart(document.getElementById('chartYearTrend'));
        ChartFns.initTopicDistChart(document.getElementById('chartTopicDist'));
      }
    }, 100);

    // 7. 证据等级表格
    renderLevelTable();

    // 8. 中国证据分类
    renderChinaEvidence();

    // 文献簇概览
    var assocTotal = D.statistics.clusterAssociatedTotal || 0;
    var uniqueTotal = D.statistics.clusterUniqueTotal || D.statistics.totalLiterature || 0;
    var clDesc = document.getElementById('ovClusterDesc');
    if (clDesc) clDesc.textContent = '12个证据簇共关联 ' + assocTotal + ' 次（独立文献 ' + uniqueTotal + ' 篇，同一文献可归入多个簇）';
    renderClusterGrid();

    // 数据质量审计
    renderAudit();

    // 证据缺口
    renderOverviewGaps();

    // 报告章节导航
    renderChapterNav();
  }

  function renderCoreInsight() {
    var ci = D.overallCoreInsight || {};
    if (!ci.title) { document.getElementById('ovCoreInsight').innerHTML = ''; return; }
    var html = '<div class="core-insight-card">' +
      '<div class="core-insight-badge">总体核心洞察</div>' +
      '<h2 class="core-insight-title">' + ci.title + '</h2>' +
      '<p class="core-insight-conclusion">' + ci.oneLineConclusion + '</p>';
    if (ci.coreFindings && ci.coreFindings.length) {
      html += '<div class="core-insight-findings"><ul>';
      ci.coreFindings.forEach(function(f) {
        html += '<li>' + f + '</li>';
      });
      html += '</ul></div>';
    }
    html += '<div class="core-insight-meta">' +
      '<div class="insight-meta-item"><span class="meta-tag">2030核心差距</span><span>' + (ci.coreGap2030 || '') + '</span></div>' +
      '<div class="insight-meta-item"><span class="meta-tag">市场部意义</span><span>' + (ci.marketImplication || '') + '</span></div>' +
      '<div class="insight-meta-item"><span class="meta-tag">联盟价值</span><span>' + (ci.allianceValue || '') + '</span></div>' +
      '<div class="insight-meta-item"><span class="meta-tag">证据强度</span><span>' + (ci.evidenceStrength || '') + ' (来源:' + (ci.sourceCount || 0) + '篇)</span></div>' +
      '</div></div>';
    document.getElementById('ovCoreInsight').innerHTML = html;
  }

  function renderHomepageInsights() {
    var hi = D.homepageInsights || {};
    var insights = hi.insights || [];
    if (!insights.length) { document.getElementById('ovHomepageInsights').innerHTML = ''; return; }
    var html = insights.map(function(ins) {
      var nums = (ins.keyNumbers || []).map(function(n) {
        return '<span class="insight-number-tag">' + n + '</span>';
      }).join('');
      return '<div class="homepage-insight-card" onclick="App.navigate(\'' + ins.navTarget + '\')">' +
        '<div class="insight-category">' + ins.category + '</div>' +
        '<h3 class="insight-title">' + ins.title + '</h3>' +
        '<p class="insight-one-line">' + ins.oneLine + '</p>' +
        '<p class="insight-desc">' + ins.description + '</p>' +
        '<div class="insight-numbers">' + nums + '</div>' +
        '<div class="insight-footer">' +
          '<span class="insight-count">独立文献 ' + ins.evidenceCount + ' 篇</span>' +
          '<span class="insight-ab">AB级 ' + ins.abCount + ' 篇</span>' +
          '<span class="insight-confidence">置信度: ' + ins.confidence + '</span>' +
          '<span class="insight-link">查看完整报告 →</span>' +
        '</div>' +
      '</div>';
    }).join('');
    document.getElementById('ovHomepageInsights').innerHTML = html;
  }

  function renderMarketStrategy() {
    var ms = D.marketStrategy || {};
    var table = ms.strategyTable || [];
    if (!table.length) { document.getElementById('ovMarketStrategy').innerHTML = ''; return; }
    var html = '<div class="market-strategy-table-wrapper"><table class="market-strategy-table">' +
      '<thead><tr><th>环节</th><th>核心文献洞察</th><th>当前障碍</th><th>目标受众</th><th>证据沟通</th><th>建议项目</th><th>KPI</th></tr></thead><tbody>';
    table.forEach(function(s) {
      html += '<tr>' +
        '<td class="ms-stage">' + s.stage + '</td>' +
        '<td>' + s.coreInsight + '</td>' +
        '<td>' + s.barrier + '</td>' +
        '<td>' + s.targetAudience + '</td>' +
        '<td>' + s.evidenceCommunication + '</td>' +
        '<td>' + s.project + '</td>' +
        '<td class="ms-kpi">' + s.kpi + '</td>' +
      '</tr>';
    });
    html += '</tbody></table></div>';
    if (ms.compliance && ms.compliance.length) {
      html += '<div class="compliance-tags">' + ms.compliance.map(function(c) {
        return '<span class="compliance-tag">' + c + '</span>';
      }).join('') + '</div>';
    }
    document.getElementById('ovMarketStrategy').innerHTML = html;
  }

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
        '<td class="level-label level-' + l.key + '">' + l.label + '</td>' +
        '<td>' + l.desc + '</td>' +
        '<td class="num">' + count + '</td>' +
        '<td class="num"><div class="bar-cell"><div class="bar-fill level-' + l.key + '" style="width:' + barWidth + '%"></div><span>' + pct + '%</span></div></td>' +
      '</tr>';
    });
    html += '<tr class="total-row"><td colspan="2">合计</td><td class="num">' + total + '</td><td class="num">100%</td></tr>';
    html += '</tbody></table>';
    document.getElementById('ovLevelTable').innerHTML = html;
  }

  function renderChinaEvidence() {
    var bd = D.statistics.chinaEvidenceBreakdown || {};
    var total = D.statistics.totalLiterature || 1;
    var cats = [
      { label: '中国直接证据', key: 'chinaDirect', count: bd.chinaDirect || 0, desc: '中国患者/中心/机构/指南' },
      { label: '中国机构参与的国际研究', key: 'chinaCollab', count: bd.chinaCollab || 0, desc: '国际合作研究含中国中心' },
      { label: '国际证据', key: 'international', count: bd.international || 0, desc: '明确未涉及中国人群/机构' },
      { label: '地区无法判断', key: 'unknown', count: bd.unknown || 0, desc: '信息不足，无法确认' }
    ];
    var html = '<div class="china-evidence-grid">';
    cats.forEach(function(c) {
      var pct = (c.count / total * 100).toFixed(1);
      html += '<div class="china-evidence-card">' +
        '<div class="ce-label">' + c.label + '</div>' +
        '<div class="ce-count">' + c.count + ' <span class="ce-pct">(' + pct + '%)</span></div>' +
        '<div class="ce-desc">' + c.desc + '</div>' +
      '</div>';
    });
    html += '</div>';
    document.getElementById('ovChinaEvidence').innerHTML = html;
  }

  function renderLatestUpdates() {
    var lu = D.latestUpdates || {};
    var pubs = lu.recentPublications || [];
    if (!pubs.length) { document.getElementById('ovLatestUpdates').innerHTML = '<p class="section-desc">暂无最新文献</p>'; return; }
    var html = '<div class="latest-updates-list">';
    pubs.slice(0, 10).forEach(function(p) {
      html += '<div class="update-item">' +
        '<span class="update-level level-' + (p.evidenceLevel || 'C') + '">' + (p.evidenceLevel || '?') + '</span>' +
        '<span class="update-year">' + (p.year || '') + '</span>' +
        '<span class="update-title">' + (p.title || '') + '</span>' +
        '<span class="update-journal">' + (p.journal || '') + '</span>' +
        (p.chinaEvidence ? '<span class="update-china">中国证据</span>' : '') +
      '</div>';
    });
    html += '</div>';
    html += '<p class="section-desc">共 ' + (lu.totalRecords || 0) + ' 篇文献，最近同步: ' + (lu.lastSync || '--') + '</p>';
    document.getElementById('ovLatestUpdates').innerHTML = html;
  }

  function renderClusterGrid() {
    var html = D.clusters.map(function(c) {
      var designTags = c.topDesigns.map(function(d) {
        return '<span class="cluster-design-tag">' + d.design + ' ' + d.count + '</span>';
      }).join('');

      return '<div class="cluster-card" onclick="App.navigate(\'' + c.navTarget + '\')">' +
        '<div class="cluster-card-header">' +
          '<span class="cluster-id">' + c.clusterId.split('_')[0] + '</span>' +
          '<span class="cluster-year">' + c.yearRange + '</span>' +
        '</div>' +
        '<div class="cluster-name">' + c.name + '</div>' +
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

  function renderTopicSummary() {
    var html = D.topics.map(function(t) {
      var preview = t.synthesisText.substring(0, 300);
      if (t.synthesisText.length > 300) preview += '...';

      return '<div class="topic-summary-card">' +
        '<div class="topic-summary-badge">已完成验证</div>' +
        '<div class="topic-summary-title">' + t.title + '</div>' +
        '<div class="topic-summary-stats">' +
          '<div class="topic-summary-stat"><span class="topic-summary-stat-val">' + t.overview.totalRecords + '</span><span class="topic-summary-stat-lbl">文献数</span></div>' +
          '<div class="topic-summary-stat"><span class="topic-summary-stat-val">' + t.overview.chinaCount + '</span><span class="topic-summary-stat-lbl">中国研究</span></div>' +
          '<div class="topic-summary-stat"><span class="topic-summary-stat-val">' + t.overview.yearRange + '</span><span class="topic-summary-stat-lbl">年份范围</span></div>' +
        '</div>' +
        '<div class="topic-summary-text">' + preview + '</div>' +
        '<div class="topic-summary-btn" onclick="App.navigate(\'' + t.navTarget + '\')">查看完整报告</div>' +
      '</div>';
    }).join('');
    document.getElementById('ovTopicSummary').innerHTML = html;
  }

  function renderAudit() {
    var a = D.audit;
    var cards = [
      { val: a.totalInput, label: '输入总数', cls: '' },
      { val: a.cleanRecordsCount, label: '有效记录', cls: 'success' },
      { val: a.excludedCount, label: '排除记录', cls: 'danger' },
      { val: a.duplicateCount, label: '重复记录', cls: '' }
    ];
    var cardsHtml = cards.map(function(c) {
      return '<div class="audit-card"><div class="audit-value ' + c.cls + '">' + c.val + '</div><div class="audit-label">' + c.label + '</div></div>';
    }).join('');

    // 状态分布
    var statusColors = { '正常': '#28A745', '疑似字段错配': '#E8742C', '信息不足': '#FFC107', '主题不相关': '#DC3545' };
    var statusHtml = Object.entries(a.statusDistribution).map(function(s) {
      return '<div class="audit-status-item"><span class="audit-status-dot" style="background:' + (statusColors[s[0]] || '#999') + '"></span>' + s[0] + '：' + s[1] + ' 条</div>';
    }).join('');

    // 排除详情
    var excludedHtml = a.excludedDetail.map(function(e) {
      return '<div class="audit-excluded-item">' +
        '<span class="audit-excluded-status">' + e.status + '</span>' +
        '<span><strong>' + e.title + '</strong><br><span style="color:var(--ink-400);font-size:12px;">' + e.issues.join('; ') + '</span></span>' +
      '</div>';
    }).join('');

    document.getElementById('ovAuditSection').innerHTML = cardsHtml +
      '<div class="audit-detail">' +
        '<div class="audit-detail-title">审计详情（审计时间：' + a.auditTime + '）</div>' +
        '<div class="audit-status-bar">' + statusHtml + '</div>' +
        '<div style="margin-top:16px;"><div class="audit-detail-title">排除记录详情</div><div class="audit-excluded-list">' + excludedHtml + '</div></div>' +
      '</div>';
  }

  function renderOverviewGaps() {
    var gaps = D.evidenceGaps;
    if (!gaps || gaps.total === 0) {
      document.getElementById('ovEvidenceGaps').innerHTML = '<div class="empty-state"><div class="empty-state-text">暂无证据缺口数据</div></div>';
      return;
    }
    // 只显示前6条，按严重度排序
    var sorted = gaps.gaps.slice().sort(function(a, b) {
      var order = { high: 0, medium: 1, low: 2 };
      return (order[a.severity] || 2) - (order[b.severity] || 2);
    });
    var top = sorted.slice(0, 6);
    var html = top.map(function(g) {
      var sevClass = g.severity === 'high' ? 'gap-high' : (g.severity === 'medium' ? 'gap-medium' : 'gap-low');
      var sevLabel = g.severity === 'high' ? '高风险' : (g.severity === 'medium' ? '中风险' : '低风险');
      return '<div class="evidence-gap-card ' + sevClass + '">' +
        '<div class="evidence-gap-type">' + esc(g.gapType) + ' <span style="font-size:11px;color:var(--ink-400);">(' + sevLabel + ')</span></div>' +
        '<div class="evidence-gap-topic">主题：' + esc(g.topic) + '</div>' +
        '<div class="evidence-gap-desc">' + esc(g.description) + '</div>' +
      '</div>';
    }).join('');
    if (gaps.total > 6) {
      html += '<div class="evidence-gap-card" style="display:flex;align-items:center;justify-content:center;border-left:4px solid var(--primary-blue);">' +
        '<div style="text-align:center;"><div style="font-size:20px;font-weight:700;color:var(--primary-blue);">+' + (gaps.total - 6) + '</div>' +
        '<div style="font-size:12px;color:var(--ink-500);">更多缺口</div>' +
        '<div class="topic-summary-btn" style="margin-top:8px;" onclick="App.navigate(\'strategy\')">查看全部</div></div></div>';
    }
    document.getElementById('ovEvidenceGaps').innerHTML = html;
  }

  function renderChapterNav() {
    var tr = D.topicReviews;
    if (!tr || tr.totalChapters === 0) {
      document.getElementById('ovChapterNav').innerHTML = '';
      return;
    }
    var navTargets = {
      1: 'overview',
      2: 'screening',
      3: 'diagnosis',
      4: 'treatment',
      5: 'management',
      6: 'hbvhcc',
      7: 'strategy'
    };
    var html = tr.chapters.map(function(ch) {
      var navTarget = navTargets[ch.chapter] || 'overview';
      return '<div class="cluster-card" onclick="App.navigate(\'' + navTarget + '\')">' +
        '<div class="cluster-card-header">' +
          '<span class="cluster-id">第' + ch.chapter + '章</span>' +
          '<span class="cluster-year">' + (ch.yearRange || '') + '</span>' +
        '</div>' +
        '<div class="cluster-name">' + esc(ch.title) + '</div>' +
        '<div class="cluster-stats">' +
          '<div class="cluster-stat"><span class="cluster-stat-value">' + (ch.totalRecords || 0) + '</span><span class="cluster-stat-label">文献</span></div>' +
          '<div class="cluster-stat"><span class="cluster-stat-value teal">' + (ch.chinaCount || 0) + '</span><span class="cluster-stat-label">中国研究</span></div>' +
          '<div class="cluster-stat"><span class="cluster-stat-value">' + (ch.clusterCount || 0) + '</span><span class="cluster-stat-label">文献簇</span></div>' +
        '</div>' +
        '<div style="font-size:12px;color:var(--ink-400);margin-top:8px;line-height:1.5;">' + esc((ch.evidenceScope || '').substring(0, 80)) + (ch.evidenceScope && ch.evidenceScope.length > 80 ? '...' : '') + '</div>' +
      '</div>';
    }).join('');
    document.getElementById('ovChapterNav').innerHTML = html;
  }

  // ==================== 专题页渲染 ====================
  function renderTopicPage(pageKey) {
    var config = PAGE_CONFIG[pageKey];
    if (!config) return;

    // 渲染页面标题
    var headerHtml = '<h1 class="page-title">' + config.title + '</h1>' +
      '<p class="page-subtitle">' + config.subtitle + '</p>';
    document.getElementById(pageKey + 'Header').innerHTML = headerHtml;

    var content = '';

    // 证据概览
    var pageClusters = config.clusters.map(function(cid) {
      return D.clusters.find(function(c) { return c.clusterId === cid; });
    }).filter(function(c) { return c; });

    var totalLit = pageClusters.reduce(function(s, c) { return s + c.totalRecords; }, 0);
    var totalChina = pageClusters.reduce(function(s, c) { return s + c.chinaCount; }, 0);

    content += '<div class="topic-evidence-overview">' +
      '<div class="topic-evidence-card"><div class="topic-evidence-val">' + pageClusters.length + '</div><div class="topic-evidence-lbl">文献簇</div></div>' +
      '<div class="topic-evidence-card"><div class="topic-evidence-val">' + totalLit + '</div><div class="topic-evidence-lbl">簇内文献</div></div>' +
      '<div class="topic-evidence-card"><div class="topic-evidence-val">' + totalChina + '</div><div class="topic-evidence-lbl">中国研究</div></div>' +
      '<div class="topic-evidence-card"><div class="topic-evidence-val">' + (totalLit > 0 ? (totalChina / totalLit * 100).toFixed(1) : 0) + '%</div><div class="topic-evidence-lbl">中国占比</div></div>' +
    '</div>';

    // 导语
    content += '<div class="topic-intro">' + config.intro + '</div>';

    // 如果有验证专题，渲染完整验证内容
    if (config.topics && config.topics.length > 0) {
      for (var i = 0; i < config.topics.length; i++) {
        var topic = D.topics.find(function(t) { return t.topicId === config.topics[i]; });
        if (topic) {
          content += renderTopicValidation(topic, i > 0);
        }
      }
    } else {
      // 无验证专题，显示提示并展示簇和代表性文献
      content += '<div class="no-validation-note">该专题尚未完成跨文献综合验证。以下展示相关文献簇的代表性研究证据。</div>';

      // 展示每个簇的代表性文献
      for (var ci = 0; ci < pageClusters.length; ci++) {
        var cluster = pageClusters[ci];
        content += renderClusterDetail(cluster);
      }

      // 展示患者管理启示（如果有验证专题包含）
      var hasMgmtTopic = D.topics.find(function(t) {
        return t.patientManagement && t.patientManagement.dropoutStage;
      });
      if (hasMgmtTopic && pageKey === 'management') {
        content += renderPatientManagement(hasMgmtTopic);
      }
    }

    // 渲染簇概览和代表性文献
    content += '<div class="topic-section">';
    content += '<h3 class="topic-section-title">相关文献簇与代表性研究</h3>';
    for (var cj = 0; cj < pageClusters.length; cj++) {
      content += renderClusterDetail(pageClusters[cj]);
    }
    content += '</div>';

    document.getElementById(pageKey + 'Content').innerHTML = content;

    // 渲染专题图表（遍历所有验证专题）
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

  function renderTopicValidation(topic, isSecondary) {
    var html = '';

    if (isSecondary) {
      html += '<hr style="margin:48px 0;border:none;border-top:2px solid var(--ink-100);">';
    }

    // 专题标题
    html += '<div class="topic-section">';
    html += '<h3 class="topic-section-title">' + topic.title + '</h3>';

    // 证据概览
    var ov = topic.overview;
    html += '<div class="topic-evidence-overview">' +
      '<div class="topic-evidence-card"><div class="topic-evidence-val">' + ov.totalRecords + '</div><div class="topic-evidence-lbl">文献总数</div></div>' +
      '<div class="topic-evidence-card"><div class="topic-evidence-val">' + ov.chinaCount + '</div><div class="topic-evidence-lbl">中国研究</div></div>' +
      '<div class="topic-evidence-card"><div class="topic-evidence-val">' + ov.intlCount + '</div><div class="topic-evidence-lbl">国际研究</div></div>' +
      '<div class="topic-evidence-card"><div class="topic-evidence-val">' + ov.yearRange + '</div><div class="topic-evidence-lbl">年份范围</div></div>' +
    '</div>';

    // 图表（使用topicId确保ID唯一）
    var chartPrefix = topic.topicId.replace(/[^a-zA-Z0-9_]/g, '_');
    html += '<div class="charts-grid-4" style="margin-top:20px;">' +
      '<div class="chart-card"><h3 class="chart-card-title">年度文献分布</h3><div id="' + chartPrefix + '_yearChart" class="chart-dom"></div></div>' +
      '<div class="chart-card"><h3 class="chart-card-title">证据等级分布</h3><div id="' + chartPrefix + '_levelChart" class="chart-dom"></div></div>' +
      '<div class="chart-card" style="grid-column:span 2;"><h3 class="chart-card-title">研究设计分布</h3><div id="' + chartPrefix + '_designChart" class="chart-dom"></div></div>' +
    '</div>';

    html += '</div>';

    // 文献综合正文
    html += '<div class="topic-section">';
    html += '<h3 class="topic-section-title">文献综合正文</h3>';
    html += '<div class="synthesis-text">' + formatSynthesisText(topic.synthesisText) + '</div>';
    html += '</div>';

    // 关键研究比较表
    if (topic.comparisonTable && topic.comparisonTable.length > 0) {
      html += '<div class="topic-section">';
      html += '<h3 class="topic-section-title">关键研究比较表</h3>';
      html += '<div class="comparison-table-wrap"><table class="comparison-table"><thead><tr>' +
        '<th>研究</th><th>设计</th><th>人群</th><th>样本量</th><th>干预</th><th>随访</th><th>关键结果</th><th>局限</th>' +
        '</tr></thead><tbody>';
      topic.comparisonTable.forEach(function(row) {
        html += '<tr>' +
          '<td class="col-study">' + esc(row.study) + '</td>' +
          '<td>' + esc(row.design) + '</td>' +
          '<td>' + esc(row.population) + '</td>' +
          '<td class="col-sample">' + esc(String(row.sample_size)) + '</td>' +
          '<td>' + esc(row.intervention) + '</td>' +
          '<td>' + esc(row.followup) + '</td>' +
          '<td>' + esc(row.key_result) + '</td>' +
          '<td>' + esc(row.limitation) + '</td>' +
        '</tr>';
      });
      html += '</tbody></table></div>';
      html += '</div>';
    }

    // 一致性与差异
    html += '<div class="topic-section">';
    html += '<h3 class="topic-section-title">一致性与差异</h3>';
    html += '<div class="consistency-block">' +
      '<div class="consistency-item"><div class="consistency-item-title">一致结论</div><div class="consistency-item-text">' + esc(topic.consistency.consistent) + '</div></div>' +
      '<div class="consistency-item"><div class="consistency-item-title">存在差异</div><div class="consistency-item-text">' + esc(topic.consistency.differences) + '</div></div>' +
      '<div class="consistency-item"><div class="consistency-item-title">差异来源</div><div class="consistency-item-text">' + esc(topic.consistency.source) + '</div></div>' +
    '</div>';
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
    html += '<div class="significance-box"><div class="significance-text">' + esc(topic.significance2030) + '</div></div>';
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

    // 关联文献列表
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

  function renderClusterDetail(cluster) {
    if (!cluster) return '';
    var html = '<div style="margin:20px 0;padding:20px;background:#fff;border:1px solid var(--border-light);border-radius:12px;">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">';
    html += '<div><span class="cluster-id">' + cluster.clusterId.split('_')[0] + '</span> <strong style="font-size:15px;color:var(--ink-800);margin-left:8px;">' + esc(cluster.name) + '</strong></div>';
    html += '<div style="font-size:13px;color:var(--ink-500);">' + cluster.totalRecords + ' 篇文献 · ' + cluster.chinaCount + ' 篇中国研究</div>';
    html += '</div>';

    // 代表性文献
    if (cluster.representativeRecords && cluster.representativeRecords.length > 0) {
      html += '<div class="representative-records">';
      cluster.representativeRecords.forEach(function(rec) {
        html += '<div class="rep-record-card">' +
          '<div class="rep-record-title">' + esc(rec.title_cn || rec.title || '') + '</div>' +
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

  function renderLinkedLitItem(lit) {
    var levelClass = 'unknown';
    var level = (lit.证据等级 || '').toLowerCase();
    if (level.includes('高')) levelClass = 'high';
    else if (level.includes('中-高') || level.includes('中高')) levelClass = 'mid-high';
    else if (level.includes('中')) levelClass = 'mid';
    else if (level.includes('低')) levelClass = 'low';

    return '<div class="linked-lit-item">' +
      '<div class="linked-lit-title">' + esc(lit.中文标题 || lit.title || '') + '</div>' +
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
      '<h1 class="page-title">2030策略</h1><p class="page-subtitle">WHO 2030消除病毒性肝炎目标与中国行动路径 — 基于文献证据逐层推导</p>';

    var html = '';

    // 策略概述
    var strat = D.strategy2030;
    if (strat && strat.total > 0) {
      html += '<div class="significance-box" style="margin-bottom:32px;">' +
        '<div class="significance-text">' + esc(strat.summary) + '</div>' +
        '<div style="margin-top:12px;font-size:13px;color:var(--ink-500);">共' + strat.total + '项策略 · 目标年份：' + strat.targetYear + ' · 基于' + D.statistics.totalLiterature + '篇文献证据</div>' +
      '</div>';

      // 策略列表
      html += '<div class="strategy-list">';
      strat.strategies.forEach(function(s, idx) {
        html += '<div class="strategy-detail-card">';
        html += '<div class="strategy-detail-header">';
        html += '<span class="strategy-detail-num">' + (idx + 1) + '</span>';
        html += '<div>';
        html += '<h3 class="strategy-detail-title">' + esc(s.title) + '</h3>';
        html += '<div class="strategy-detail-meta">';
        html += '<span class="strategy-target-metric">目标指标：' + esc(s.targetMetric) + '</span>';
        html += '<span>目标年份：' + s.targetYear + '</span>';
        html += '<span>负责层级：' + esc(s.responsible) + '</span>';
        html += '</div>';
        html += '</div>';
        html += '</div>';

        // 证据基础
        html += '<div class="strategy-evidence">';
        html += '<div class="strategy-evidence-title">文献证据基础</div>';
        html += '<div class="strategy-evidence-text">' + formatSynthesisText(s.currentEvidence) + '</div>';
        html += '</div>';

        // 关键行动
        html += '<div class="strategy-actions-section">';
        html += '<div class="strategy-actions-title">关键行动</div>';
        html += '<ol class="strategy-actions-list">';
        s.keyActions.forEach(function(act) {
          html += '<li>' + esc(act) + '</li>';
        });
        html += '</ol>';
        html += '</div>';

        // 证据来源
        if (s.evidenceBasis && s.evidenceBasis.length > 0) {
          html += '<div class="strategy-evidence-basis">';
          html += '<span class="strategy-evidence-label">证据来源：</span>';
          html += s.evidenceBasis.map(function(eb) {
            return '<span class="strategy-evidence-tag">' + esc(eb) + '</span>';
          }).join('');
          html += '</div>';
        }

        html += '</div>';
      });
      html += '</div>';
    }

    // 证据缺口
    var gaps = D.evidenceGaps;
    if (gaps && gaps.total > 0) {
      html += '<div class="topic-section" style="margin-top:40px;">';
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
      '<h1 class="page-title">全国联盟</h1><p class="page-subtitle">基于文献证据的联盟行动建议与标准化路径</p>';

    var html = '';
    var aa = D.allianceActions;

    // 概述
    if (aa && aa.summary) {
      html += '<div class="significance-box" style="margin-bottom:32px;">' +
        '<div class="significance-text">' + esc(aa.summary) + '</div>' +
        '<div style="margin-top:12px;font-size:13px;color:var(--ink-500);">共' + aa.total + '项行动 · 基于' + D.statistics.totalLiterature + '篇文献证据</div>' +
      '</div>';
    }

    // 联盟行动列表
    if (aa && aa.actions && aa.actions.length > 0) {
      html += '<div class="topic-section">';
      html += '<h3 class="topic-section-title">联盟行动列表</h3>';
      aa.actions.forEach(function(act, idx) {
        html += '<div class="alliance-action-detail">';
        html += '<div class="alliance-action-detail-header">';
        html += '<span class="alliance-action-num">' + (idx + 1) + '</span>';
        html += '<div>';
        html += '<h4 class="alliance-action-detail-title">' + esc(act.title) + '</h4>';
        html += '<div class="alliance-action-detail-meta">';
        if (act.targetMetric) html += '<span>目标指标：' + esc(act.targetMetric) + '</span>';
        if (act.responsible) html += '<span>负责：' + esc(act.responsible) + '</span>';
        html += '<span>目标年份：' + act.targetYear + '</span>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
        if (act.actions && act.actions.length > 0) {
          html += '<ul class="alliance-action-list">';
          act.actions.forEach(function(a) {
            html += '<li>' + esc(a) + '</li>';
          });
          html += '</ul>';
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
    html += '<div class="alliance-section">';
    html += '<h3 class="topic-section-title">联盟架构建议</h3>';
    var layers = aa && aa.architecture ? aa.architecture : [];
    if (layers.length === 0) {
      layers = [
        { layer: '国家级中心', role: '牵头制定标准、质量控制、多中心研究', target_count: '5', color: '#005691' },
        { layer: '省级中心', role: '区域转诊、技术指导、医生培训', target_count: '31', color: '#0077b6' },
        { layer: '地市级医院', role: '核心诊疗、患者管理、数据上报', target_count: '300', color: '#00A896' },
        { layer: '县级医院', role: '初筛初治、双向转诊、基层管理', target_count: '2000', color: '#48cae4' },
        { layer: '基层机构', role: '社区筛查、健康宣教、随访管理', target_count: '10000', color: '#90e0ef' },
        { layer: '患者管理平台', role: '数字化随访、依从性管理、数据整合', target_count: '1', color: '#E8742C' }
      ];
    }
    html += '<div class="alliance-layers">';
    layers.forEach(function(l) {
      var name = l.layer || l.name || '';
      var role = l.role || '';
      var count = l.target_count || l.count || '';
      var color = l.color || '#00A896';
      html += '<div class="alliance-layer">' +
        '<div class="alliance-layer-icon" style="background:' + color + ';">' + name.charAt(0) + '</div>' +
        '<div class="alliance-layer-info"><div class="alliance-layer-name">' + esc(name) + '</div><div class="alliance-layer-role">' + esc(role) + '</div></div>' +
        '<div class="alliance-layer-count">' + esc(count) + '</div>' +
      '</div>';
    });
    html += '</div>';
    html += '</div>';

    // KPI指标
    var kpis = aa && aa.kpis ? aa.kpis : [];
    if (kpis.length > 0) {
      html += '<div class="alliance-section">';
      html += '<h3 class="topic-section-title">核心KPI指标</h3>';
      html += '<div class="kpi-table-wrap"><table class="comparison-table"><thead><tr>' +
        '<th>KPI指标</th><th>目标值</th><th>数据来源</th>' +
        '</tr></thead><tbody>';
      kpis.forEach(function(k) {
        html += '<tr>' +
          '<td class="col-study">' + esc(k.name || '') + '</td>' +
          '<td>' + esc(k.target || '') + '</td>' +
          '<td>' + esc(k.data_source || k.source || '') + '</td>' +
        '</tr>';
      });
      html += '</tbody></table></div>';
      html += '</div>';
    }

    // 路线图
    var roadmap = aa && aa.roadmap ? aa.roadmap : [];
    if (roadmap.length > 0) {
      html += '<div class="alliance-section">';
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
        html += '</ul></div>' +
        '</div>';
      });
      html += '</div>';
      html += '</div>';
    }

    document.getElementById('allianceContent').innerHTML = html;
  }

  // ==================== 证据库 ====================
  function initEvidenceFilters() {
    // 年份筛选
    var years = Object.keys(D.statistics.yearTrend.map(function(d) { return d.year; }));
    var yearSelect = document.getElementById('evFilterYear');
    D.statistics.yearTrend.forEach(function(d) {
      var opt = document.createElement('option');
      opt.value = d.year;
      opt.textContent = d.year + '年';
      yearSelect.appendChild(opt);
    });

    // 专题筛选
    var topicSelect = document.getElementById('evFilterTopic');
    D.statistics.topicDistribution.forEach(function(t) {
      var opt = document.createElement('option');
      opt.value = t.code;
      opt.textContent = t.name + ' (' + t.count + ')';
      topicSelect.appendChild(opt);
    });

    // 证据等级
    var levelSelect = document.getElementById('evFilterLevel');
    Object.keys(D.statistics.levelDistribution).forEach(function(level) {
      if (D.statistics.levelDistribution[level] > 0) {
        var opt = document.createElement('option');
        opt.value = level;
        opt.textContent = level + '级 (' + D.statistics.levelDistribution[level] + ')';
        levelSelect.appendChild(opt);
      }
    });

    // 绑定筛选事件
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

    // 结果统计
    document.getElementById('evResultCount').textContent = total;
    document.getElementById('evPageInfo').textContent = total > 0 ? '第 ' + (start + 1) + '-' + end + ' 条 / 共 ' + totalPages + ' 页' : '';

    // 文献列表
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

    // 分页
    renderPagination(totalPages);
  }

  function renderPagination(totalPages) {
    if (totalPages <= 1) {
      document.getElementById('evPagination').innerHTML = '';
      return;
    }

    var html = '';
    // 上一页
    html += '<button class="page-btn ' + (evidencePage === 1 ? 'disabled' : '') + '" ' +
      (evidencePage === 1 ? '' : 'onclick="App.goToPage(' + (evidencePage - 1) + ')"') + '>&lt;</button>';

    // 页码
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

    // 下一页
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

    if (rec.clinicalImplication) {
      html += '<div class="modal-section"><div class="modal-section-label">临床启示</div><div class="modal-section-text">' + esc(rec.clinicalImplication) + '</div></div>';
    }

    if (rec.clusters && rec.clusters.length > 0) {
      html += '<div class="modal-section"><div class="modal-section-label">所属文献簇</div><div class="modal-section-text">' + rec.clusters.map(function(c) {
        return esc(c.split('_').slice(1).join('_'));
      }).join('、') + '</div></div>';
    }

    // 链接
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
    // 将长文本分段
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
    toggleLinkedLit: toggleLinkedLit
  };

})();

// DOM加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', App.init);
} else {
  App.init();
}
