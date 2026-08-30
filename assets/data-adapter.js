/* ============================================================
   慢乙肝—HBV相关HCC文献洞察整合报告 - 数据适配器
   将 window.SITE_DATA 原始格式转换为前端应用使用的 APP_DATA
   ============================================================ */

(function() {
  'use strict';

  if (!window.SITE_DATA) {
    console.error('[Data Adapter] SITE_DATA not found');
    return;
  }

  const sd = window.SITE_DATA;

  // ---------- 专题映射 ----------
  const TOPIC_MAP = {
    'T1': { name: '指南与共识', nav: 'screening' },
    'T3': { name: 'HBV功能性治愈', nav: 'diagnosis' },
    'T4': { name: '治疗', nav: 'treatment' },
    'T6': { name: 'HCC全病程', nav: 'hbvhcc' },
    'T7': { name: 'HBV→HCC', nav: 'hbvhcc' }
  };

  // 簇到导航页面的映射
  const CLUSTER_NAV_MAP = {
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

  // ---------- 工具函数 ----------
  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  function safeNum(v, defaultVal) {
    const n = parseInt(v);
    return isNaN(n) ? (defaultVal || 0) : n;
  }

  // ---------- 构建统计数据 ----------
  function buildStatistics() {
    const stats = sd.statistics || {};
    const byYear = stats.by_year || {};
    const byLevel = stats.by_evidence_level || {};
    const byTopic = stats.by_topic_primary || {};
    const byDesign = stats.by_study_design || {};
    const clusterSummary = stats.clusters || {};

    const yearTrend = Object.entries(byYear)
      .map(([year, count]) => ({ year: parseInt(year), count: count }))
      .sort((a, b) => a.year - b.year);

    const years = yearTrend.map(d => d.year);
    const yearRange = years.length >= 2
      ? years[0] + '–' + years[years.length - 1]
      : '2018–2026';

    const topicDist = Object.entries(byTopic).map(([code, count]) => ({
      code: code,
      name: (TOPIC_MAP[code] && TOPIC_MAP[code].name) || code,
      count: count
    })).sort((a, b) => b.count - a.count);

    const designDist = Object.entries(byDesign).map(([design, count]) => ({
      design: design,
      count: count
    })).sort((a, b) => b.count - a.count);

    return {
      totalLiterature: stats.total_literature || 0,
      chinaEvidence: stats.china_evidence_count || 0,
      chinaEvidencePct: stats.china_evidence_pct || 0,
      internationalEvidence: (stats.total_literature || 0) - (stats.china_evidence_count || 0),
      abEvidence: (byLevel.A || 0) + (byLevel.B || 0),
      abEvidencePct: stats.total_literature
        ? (((byLevel.A || 0) + (byLevel.B || 0)) / stats.total_literature * 100).toFixed(1)
        : 0,
      topicsCount: Object.keys(byTopic).length,
      clustersCount: stats.total_clusters || Object.keys(clusterSummary).length,
      validatedTopicsCount: (sd.topic_validation && sd.topic_validation.topics)
        ? sd.topic_validation.topics.length : 0,
      yearRange: yearRange,
      lastUpdate: formatDate((sd.update_meta || {}).last_sync),
      levelDistribution: {
        A: byLevel.A || 0,
        B: byLevel.B || 0,
        C: byLevel.C || 0,
        D: byLevel.D || 0
      },
      yearTrend: yearTrend,
      topicDistribution: topicDist,
      designDistribution: designDist,
      chinaVsIntl: {
        china: stats.china_evidence_count || 0,
        international: (stats.total_literature || 0) - (stats.china_evidence_count || 0)
      },
      chinaEvidenceBreakdown: {
        chinaDirect: (stats.china_evidence_breakdown || {}).china_direct || 0,
        chinaCollab: (stats.china_evidence_breakdown || {}).china_collab || 0,
        international: (stats.china_evidence_breakdown || {}).international || 0,
        unknown: (stats.china_evidence_breakdown || {}).unknown || 0
      },
      clusterAssociatedTotal: stats.cluster_associated_total || 0,
      clusterUniqueTotal: stats.cluster_unique_total || 0,
      clusterSummary: clusterSummary
    };
  }

  // ---------- 构建文献簇数据 ----------
  function buildClusters() {
    const ec = sd.evidence_clusters || {};
    const clusters = ec.clusters || [];

    return clusters.map(c => {
      const studyDesigns = c.study_designs || {};
      const evidenceLevels = c.evidence_levels || {};
      const yr = c.year_range || {};

      // 取前3个研究设计
      const topDesigns = Object.entries(studyDesigns)
        .map(([design, count]) => ({ design, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 4);

      return {
        clusterId: c.cluster_id,
        name: c.name,
        totalRecords: c.total_records,
        chinaCount: c.china_count,
        chinaPct: c.total_records ? (c.china_count / c.total_records * 100).toFixed(1) : 0,
        studyDesigns: studyDesigns,
        topDesigns: topDesigns,
        yearRange: (yr.min && yr.max) ? yr.min + '–' + yr.max : '2018–2026',
        evidenceLevels: evidenceLevels,
        representativeRecords: c.representative_records || [],
        recordIds: c.record_ids || [],
        navTarget: CLUSTER_NAV_MAP[c.cluster_id] || 'overview'
      };
  });
  }

  // ---------- 构建专题验证数据 ----------
  function buildTopics() {
    const tv = sd.topic_validation || {};
    const topics = tv.topics || [];

    return topics.map(t => {
      const overview = t['文献概况'] || {};
      const comparisonTable = t['代表性研究比较表'] || [];
      const consistency = t['一致性与差异'] || {};
      const clinicalImplications = t['临床启示'] || {};
      const patientManagement = t['患者管理启示'] || {};
      const allianceActions = t['联盟行动'] || {};
      const controversies = t['争议和证据缺口'] || {};
      const linkedLit = t['关联文献'] || [];

      // 研究设计分布
      const designDist = overview['研究设计分布'] || {};
      const yearDist = overview['年份分布'] || {};
      const evidenceDist = overview['证据等级分布'] || {};

      const yearTrend = Object.entries(yearDist)
        .map(([year, count]) => ({ year: parseInt(year), count: count }))
        .sort((a, b) => a.year - b.year);

      const years = yearTrend.map(d => d.year);
      const yearRange = years.length >= 2
        ? years[0] + '–' + years[years.length - 1]
        : '2018–2026';

      // 确定导航目标
      let navTarget = 'treatment';
      if (t.topic_id.includes('hcc')) navTarget = 'hbvhcc';
      else if (t.topic_id.includes('pegifn')) navTarget = 'treatment';
      else if (t.topic_id.includes('hbsag')) navTarget = 'treatment';

      return {
        topicId: t.topic_id,
        title: t.topic_title,
        keywords: t['筛选关键词'] || [],
        navTarget: navTarget,
        overview: {
          totalRecords: overview['文献总数'] || 0,
          chinaCount: overview['中国研究数量'] || 0,
          intlCount: overview['国际研究数量'] || 0,
          designDist: designDist,
          yearDist: yearDist,
          yearTrend: yearTrend,
          yearRange: yearRange,
          evidenceDist: evidenceDist
        },
        comparisonTable: comparisonTable,
        synthesisText: t['文献综合正文'] || '',
        consistency: {
          consistent: consistency['一致结论'] || '',
          differences: consistency['存在差异'] || '',
          source: consistency['差异来源'] || ''
        },
        clinicalImplications: {
          initial: clinicalImplications['初治患者'] || '',
          experienced: clinicalImplications['经治患者'] || '',
          advantage: clinicalImplications['优势人群筛选'] || '',
          monitoring: clinicalImplications['疗效监测'] || ''
        },
        patientManagement: {
          dropoutStage: patientManagement['最易脱落阶段'] || '',
          adherence: patientManagement['依从性改善'] || '',
          followupPoints: patientManagement['强化随访节点'] || ''
        },
        significance2030: t['2030意义'] || '',
        allianceActions: {
          standards: allianceActions['建立标准'] || '',
          referral: allianceActions['转诊患者'] || '',
          kpi: allianceActions['监测KPI'] || ''
        },
        controversies: {
          evidenceGap: controversies['证据不足'] || '',
          designLimit: controversies['研究设计局限'] || '',
          chinaDataGap: controversies['中国数据不足'] || ''
        },
        linkedLiterature: linkedLit
      };
    });
  }

  // ---------- 构建文献列表 ----------
  function buildLiterature() {
    const lit = sd.literature || {};
    const records = lit.records || [];

    return records.map((r, idx) => {
      const topicName = r.topic_primary_name || (TOPIC_MAP[r.topic_primary] && TOPIC_MAP[r.topic_primary].name) || '';
      return {
        id: r.id || 'rec-' + idx,
        title: r.title_cn || r.title_en || '无标题',
        titleEn: r.title_en || '',
        year: r.year || 2025,
        journal: r.journal || '',
        firstAuthor: r.first_author || '',
        pmid: r.pmid || '',
        doi: r.doi || '',
        sourceUrl: r.source_url || '',
        evidenceLevel: r.evidence_level || 'C',
        chinaEvidence: r.china_evidence || false,
        studyDesign: r.study_design || '',
        topicPrimary: r.topic_primary || '',
        topicPrimaryName: topicName,
        topicCodes: r.topic_codes || [],
        topicSecondary: r.topic_secondary || [],
        clinicalImplication: r.clinical_implication || '',
        sourceType: (r.source_type || []).join(', '),
        chinaRelevance: (r.china_relevance || []).join(', '),
        publishDate: r.publish_date || '',
        clusters: r.clusters || []
      };
    });
  }

  // ---------- 构建数据质量审计 ----------
  function buildAudit() {
    const audit = sd.data_quality_audit || {};
    return {
      auditTime: formatDate(audit.audit_time),
      totalInput: audit.total_input || 0,
      statusDistribution: audit.status_distribution || {},
      duplicateCount: audit.duplicate_count || 0,
      cleanRecordsCount: audit.clean_records_count || 0,
      excludedCount: audit.excluded_count || 0,
      excludedDetail: audit.excluded_detail || [],
      duplicates: audit.duplicates || []
    };
  }

  // ---------- 构建元数据 ----------
  function buildMeta() {
    const meta = sd.update_meta || {};
    return {
      lastSync: formatDate(meta.last_sync),
      recordsCount: meta.records_count || 0,
      dataSource: meta.data_source || '',
      feishuRev: meta.feishu_rev || 0,
      generatedAt: sd.generated_at || '',
      version: sd.version || ''
    };
  }

  // ---------- 文献筛选辅助函数 ----------
  function filterLiterature(allLit, filters) {
    if (!filters) return allLit;
    return allLit.filter(rec => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const haystack = (rec.title + ' ' + rec.titleEn + ' ' + rec.journal +
          ' ' + rec.firstAuthor + ' ' + rec.pmid + ' ' + rec.doi +
          ' ' + rec.clinicalImplication).toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (filters.topic && rec.topicPrimary !== filters.topic) return false;
      if (filters.year && rec.year !== parseInt(filters.year)) return false;
      if (filters.evidenceLevel && rec.evidenceLevel !== filters.evidenceLevel) return false;
      if (filters.region) {
        if (filters.region === 'china' && !rec.chinaEvidence) return false;
        if (filters.region === 'intl' && rec.chinaEvidence) return false;
      }
      if (filters.cluster && (!rec.clusters || !rec.clusters.includes(filters.cluster))) return false;
      return true;
    });
  }

  // 按簇筛选文献
  function getLiteratureByCluster(allLit, clusterId) {
    return allLit.filter(rec => rec.clusters && rec.clusters.includes(clusterId));
  }

  // 按专题筛选文献
  function getLiteratureByTopic(allLit, topicCode) {
    return allLit.filter(rec => rec.topicPrimary === topicCode);
  }

  // ---------- 构建2030策略数据 ----------
  function buildStrategy2030() {
    const s = sd.strategy_2030 || {};
    const strategies = s.strategies || [];
    return {
      total: s.total_strategies || strategies.length,
      targetYear: s.target_year || 2030,
      summary: s.summary || '',
      strategies: strategies.map(st => ({
        id: st.strategy_id,
        title: st.title,
        targetMetric: st.target_metric || '',
        currentEvidence: st.current_evidence || '',
        keyActions: st.key_actions || [],
        evidenceBasis: st.evidence_basis || [],
        targetYear: st.target_year || 2030,
        responsible: st.responsible || ''
      }))
    };
  }

  // ---------- 构建联盟行动数据 ----------
  function buildAllianceActions() {
    const a = sd.alliance_actions || {};
    return {
      total: a.total_actions || 0,
      summary: a.summary || '',
      actions: (a.actions || []).map(act => ({
        id: act.action_id,
        title: act.title || '',
        targetMetric: act.target_metric || '',
        actions: act.actions || [],
        responsible: act.responsible || '',
        targetYear: act.target_year || 2030,
        evidenceBasis: act.evidence_basis || []
      })),
      architecture: a.architecture || [],
      kpis: a.kpis || [],
      roadmap: a.roadmap || []
    };
  }

  // ---------- 构建专题综述数据 ----------
  function buildTopicReviews() {
    const tr = sd.topic_reviews || {};
    return {
      totalChapters: tr.total_chapters || 0,
      totalLiterature: tr.total_literature || 0,
      chapters: (tr.chapters || []).map(ch => ({
        chapter: ch.chapter,
        title: ch.title,
        evidenceScope: ch.evidence_scope || '',
        clusterCount: ch.cluster_count || 0,
        totalRecords: ch.total_records || 0,
        chinaCount: ch.china_count || 0,
        yearRange: ch.year_range || '',
        evidenceSynthesis: ch.evidence_synthesis || '',
        keyFindings: ch.key_findings || [],
        evidenceGaps: ch.evidence_gaps || [],
        clusterSummaries: ch.cluster_summaries || [],
        validatedTopics: ch.validated_topics || []
      }))
    };
  }

  // ---------- 构建跨文献洞察数据 ----------
  function buildLiteratureInsights() {
    const li = sd.literature_insights || {};
    return {
      total: li.total_insights || 0,
      insights: (li.insights || []).map(ins => ({
        id: ins.insight_id,
        clusterId: ins.cluster_id,
        clusterName: ins.cluster_name,
        title: ins.title,
        oneLineConclusion: ins.one_line_conclusion || '',
        evidenceSynthesis: ins.evidence_synthesis || '',
        literatureCount: ins.literature_count || 0,
        studyDesigns: ins.study_designs || {},
        chinaCount: ins.china_count || 0,
        comparisonTable: ins.comparison_table || [],
        consistency: ins.consistency || {},
        clinicalImplications: ins.clinical_implications || {},
        patientManagement: ins.patient_management || {},
        significance2030: ins.significance_2030 || '',
        allianceActions: ins.alliance_actions || {},
        controversies: ins.controversies || {},
        linkedLiteratureCount: ins.linked_literature_count || 0,
        linkedLiterature: ins.linked_literature || [],
        source: ins.source || ''
      }))
    };
  }

  // ---------- 构建证据缺口数据 ----------
  function buildEvidenceGaps() {
    const eg = sd.evidence_gaps || {};
    return {
      total: eg.total_gaps || 0,
      highSeverity: eg.high_severity || 0,
      gaps: (eg.gaps || []).map(g => ({
        id: g.gap_id,
        topic: g.topic || '',
        gapType: g.gap_type || '',
        description: g.description || '',
        severity: g.severity || 'medium',
        source: g.source || ''
      }))
    };
  }

  // ---------- 构建关键研究比较表数据 ----------
  function buildKeyStudyTables() {
    const kst = sd.key_study_tables || {};
    return {
      total: kst.total_tables || 0,
      tables: (kst.tables || []).map(t => ({
        id: t.table_id,
        topic: t.topic || '',
        source: t.source || '',
        rowCount: t.row_count || 0,
        columns: t.columns || [],
        rows: t.rows || []
      }))
    };
  }

  // ---------- 新增: 总体核心洞察 ----------
  function buildOverallCoreInsight() {
    const d = sd.overall_core_insight || {};
    const es = d.evidence_scope || {};
    return {
      title: d.title || '',
      oneLineConclusion: d.one_line_conclusion || '',
      evidenceScope: {
        totalLiterature: es.total_literature || 0,
        chinaDirect: es.china_direct || 0,
        chinaCollab: es.china_collab || 0,
        international: es.international || 0,
        unknown: es.unknown || 0,
        chinaEvidencePct: es.china_evidence_pct || 0,
        yearRange: es.year_range || '',
        abEvidencePct: es.ab_evidence_pct || 0,
        clusterCount: es.cluster_count || 0,
        clusterAssociatedTotal: es.cluster_associated_total || 0,
      },
      coreFindings: d.core_findings || [],
      coreGap2030: d.core_gap_2030 || '',
      marketImplication: d.market_implication || '',
      allianceValue: d.alliance_value || '',
      evidenceStrength: d.evidence_strength || '',
      sourceCount: d.source_count || 0,
    };
  }

  // ---------- 新增: 首页六条一级洞察 ----------
  function buildHomepageInsights() {
    const d = sd.homepage_core_insights || {};
    return {
      total: d.total_insights || 0,
      insights: (d.insights || []).map(i => ({
        id: i.insight_id || '',
        category: i.category || '',
        navTarget: i.nav_target || '',
        title: i.title || '',
        oneLine: i.one_line || '',
        description: i.description || '',
        evidenceCount: i.evidence_count || 0,
        associatedCount: i.associated_count || 0,
        abCount: i.ab_count || 0,
        confidence: i.confidence || '',
        keyNumbers: i.key_numbers || [],
      }))
    };
  }

  // ---------- 新增: 市场部策略总览 ----------
  function buildMarketStrategy() {
    const d = sd.market_strategy_overview || {};
    return {
      summary: d.summary || '',
      strategyTable: (d.strategy_table || []).map(s => ({
        stage: s.stage || '',
        coreInsight: s.core_insight || '',
        barrier: s.barrier || '',
        targetAudience: s.target_audience || '',
        evidenceCommunication: s.evidence_communication || '',
        project: s.project || '',
        kpi: s.kpi || '',
        sourceCount: s.source_count || 0,
      })),
      strategyTypes: d.strategy_types || [],
      compliance: d.compliance || [],
    };
  }

  // ---------- 新增: 最新证据动态 ----------
  function buildLatestUpdates() {
    const d = sd.latest_updates || {};
    return {
      lastSync: d.last_sync || '',
      totalRecords: d.total_records || 0,
      byYear: d.by_year || {},
      recentCount24h: d.recent_count_24h || 0,
      recentCount7d: d.recent_count_7d || 0,
      recentPublications: (d.recent_publications || []).map(r => ({
        title: r.title || '',
        journal: r.journal || '',
        year: r.year,
        evidenceLevel: r.evidence_level || '',
        topic: r.topic || '',
        chinaEvidence: r.china_evidence || false,
        chinaEvidenceType: r.china_evidence_type || '',
        pmid: r.pmid || '',
        doi: r.doi || '',
      })),
    };
  }

  // ---------- 新增: 专题概览 ----------
  function buildTopicOverview(key) {
    const d = sd[key + '_overview'] || {};
    const es = d.evidence_summary || {};
    return {
      title: d.title || '',
      subtitle: d.subtitle || '',
      pageKey: d.page_key || key,
      evidenceSummary: {
        uniqueRecords: es.unique_records || 0,
        associatedRecords: es.associated_records || 0,
        chinaCount: es.china_count || 0,
        chinaPct: es.china_pct || 0,
        abCount: es.ab_count || 0,
        abPct: es.ab_pct || 0,
        yearRange: es.year_range || {},
        studyDesigns: es.study_designs || {},
        evidenceLevels: es.evidence_levels || {},
        chinaEvidenceBreakdown: es.china_evidence_breakdown || {},
      },
      keyFindings: d.key_findings || [],
      topicValidated: d.topic_validated || null,
    };
  }

  // ---------- 组装完整应用数据 ----------
  const allLiterature = buildLiterature();

  window.APP_DATA = {
    statistics: buildStatistics(),
    clusters: buildClusters(),
    topics: buildTopics(),
    literature: allLiterature,
    audit: buildAudit(),
    meta: buildMeta(),
    strategy2030: buildStrategy2030(),
    allianceActions: buildAllianceActions(),
    topicReviews: buildTopicReviews(),
    literatureInsights: buildLiteratureInsights(),
    evidenceGaps: buildEvidenceGaps(),
    keyStudyTables: buildKeyStudyTables(),
    // 新增数据
    overallCoreInsight: buildOverallCoreInsight(),
    homepageInsights: buildHomepageInsights(),
    marketStrategy: buildMarketStrategy(),
    latestUpdates: buildLatestUpdates(),
    screeningOverview: buildTopicOverview('screening'),
    diagnosisOverview: buildTopicOverview('diagnosis'),
    treatmentOverview: buildTopicOverview('treatment'),
    managementOverview: buildTopicOverview('management'),
    hccOverview: buildTopicOverview('hcc'),
    allianceOverview: buildTopicOverview('alliance'),
    insightVersions: sd.insight_versions || {},
    changeReport: sd.change_report || {},
    // 策略图表数据
    charts: sd.charts || {},
    // 产品数据（TMF/横木）
    products: sd.products || {},
    productConfig: sd.product_config || {},
    // 辅助函数
    filterLiterature: filterLiterature,
    getLiteratureByCluster: getLiteratureByCluster,
    getLiteratureByTopic: getLiteratureByTopic,
    // 簇到导航映射
    clusterNavMap: CLUSTER_NAV_MAP,
    // 专题映射
    topicMap: TOPIC_MAP,
    hasRealData: true
  };

  console.log('[Data Adapter] 文献洞察报告数据加载完成 v3.0', {
    文献总数: window.APP_DATA.statistics.totalLiterature,
    中国直接证据: (window.APP_DATA.statistics.chinaEvidenceBreakdown || {}).chinaDirect || 0,
    文献簇数: window.APP_DATA.clusters.length,
    首页洞察: window.APP_DATA.homepageInsights.total,
    市场策略: window.APP_DATA.marketStrategy.strategyTable.length,
    数据版本: window.APP_DATA.meta.version
  });

})();
