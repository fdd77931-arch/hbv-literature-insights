/* ============================================================
   慢乙肝—HBV相关HCC文献洞察整合报告 - 图表配置
   使用 ECharts 5.x 渲染各类数据可视化图表
   数据来源：window.APP_DATA
   ============================================================ */

(function() {
  'use strict';

  // 颜色常量 — 报告式设计系统
  const COLORS = {
    primary: '#00688f',
    primaryDark: '#004a68',
    primaryLight: '#2a80a3',
    secondary: '#2d8659',
    secondaryDark: '#1f6b45',
    secondaryLight: '#3a9a6a',
    accent: '#c75d2c',
    accentLight: '#d9764a',
    danger: '#dc3545',
    success: '#2d8659',
    warning: '#e8a030',
    purple: '#6366f1',
    ink900: '#1a2332',
    ink700: '#2d3748',
    ink600: '#4a5568',
    ink500: '#5a6c80',
    ink400: '#7a8a9a',
    ink300: '#cbd5e0',
    ink200: '#d4dde5',
    ink100: '#eef2f5'
  };

  // 公共tooltip样式
  const tooltipStyle = {
    backgroundColor: 'rgba(15, 26, 38, 0.92)',
    borderColor: 'rgba(0, 86, 145, 0.3)',
    borderWidth: 1,
    padding: [10, 14],
    textStyle: { color: '#fff', fontSize: 12, lineHeight: 1.5 },
    extraCssText: 'border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.2);'
  };

  // 存储所有chart实例以便resize
  const chartInstances = [];

  function registerChart(c) {
    if (c) chartInstances.push(c);
    return c;
  }

  /* ============================================================
     文献年度趋势图（折线图）
     ============================================================ */
  function initYearTrendChart(dom) {
    if (!dom || typeof echarts === 'undefined') return null;
    const data = window.APP_DATA.statistics.yearTrend;
    if (!data || !data.length) return null;

    const chart = echarts.init(dom);
    chart.setOption({
      tooltip: {
        ...tooltipStyle, trigger: 'axis',
        formatter: function(p) { return p[0].name + '年<br/>新增文献：<strong>' + p[0].value + '篇</strong>'; }
      },
      grid: { left: 50, right: 20, top: 30, bottom: 30 },
      xAxis: {
        type: 'category', data: data.map(d => d.year),
        boundaryGap: false,
        axisLabel: { color: COLORS.ink500, fontSize: 11 },
        axisLine: { lineStyle: { color: COLORS.ink200 } },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value', name: '篇数',
        nameTextStyle: { color: COLORS.ink400, fontSize: 11 },
        axisLabel: { color: COLORS.ink500, fontSize: 11 },
        splitLine: { lineStyle: { color: COLORS.ink100, type: 'dashed' } }
      },
      series: [{
        type: 'line', data: data.map(d => d.count),
        smooth: true, symbol: 'circle', symbolSize: 8,
        lineStyle: { width: 3, color: COLORS.primary },
        itemStyle: { color: COLORS.primary, borderColor: '#fff', borderWidth: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(0, 86, 145, 0.2)' },
            { offset: 1, color: 'rgba(0, 86, 145, 0.02)' }
          ])
        },
        label: { show: true, position: 'top', color: COLORS.ink700, fontSize: 11, fontWeight: 600 }
      }]
    });
    return registerChart(chart);
  }

  /* ============================================================
     证据等级分布饼图
     ============================================================ */
  function initLevelPieChart(dom) {
    if (!dom || typeof echarts === 'undefined') return null;
    const data = window.APP_DATA.statistics.levelDistribution;

    const chart = echarts.init(dom);
    const pieData = [
      { value: data.A || 0, name: 'A级', itemStyle: { color: COLORS.primary } },
      { value: data.B || 0, name: 'B级', itemStyle: { color: COLORS.secondary } },
      { value: data.C || 0, name: 'C级', itemStyle: { color: COLORS.ink300 } },
      { value: data.D || 0, name: 'D级', itemStyle: { color: COLORS.accent } }
    ].filter(d => d.value > 0);

    chart.setOption({
      tooltip: { ...tooltipStyle, trigger: 'item', formatter: '{b}证据：{c}篇 ({d}%)' },
      legend: { bottom: 0, textStyle: { color: COLORS.ink600, fontSize: 12 } },
      series: [{
        type: 'pie', radius: ['45%', '68%'], center: ['50%', '45%'],
        itemStyle: { borderColor: '#fff', borderWidth: 3 },
        label: {
          show: true, position: 'outside',
          formatter: '{b}\n{c}篇', color: COLORS.ink700, fontSize: 12, fontWeight: 600, lineHeight: 1.4
        },
        labelLine: { length: 12, length2: 10 },
        data: pieData
      }]
    });
    return registerChart(chart);
  }

  /* ============================================================
     专题分布柱状图
     ============================================================ */
  function initTopicDistChart(dom) {
    if (!dom || typeof echarts === 'undefined') return null;
    const data = window.APP_DATA.statistics.topicDistribution;

    const chart = echarts.init(dom);
    const colors = [COLORS.primary, COLORS.secondary, COLORS.accent, COLORS.purple, COLORS.secondaryLight];

    chart.setOption({
      tooltip: {
        ...tooltipStyle, trigger: 'axis', axisPointer: { type: 'shadow' },
        formatter: function(p) { return p[0].name + '<br/>文献数量：<strong>' + p[0].value + '篇</strong>'; }
      },
      grid: { left: 60, right: 30, top: 20, bottom: 40 },
      xAxis: {
        type: 'category', data: data.map(d => d.name),
        axisLabel: { color: COLORS.ink600, fontSize: 11, interval: 0, rotate: 20 },
        axisLine: { lineStyle: { color: COLORS.ink200 } },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value', name: '文献数', nameTextStyle: { color: COLORS.ink400, fontSize: 11 },
        axisLabel: { color: COLORS.ink500, fontSize: 11 },
        splitLine: { lineStyle: { color: COLORS.ink100, type: 'dashed' } }
      },
      series: [{
        type: 'bar', barWidth: '50%',
        data: data.map((d, i) => ({ value: d.count, itemStyle: { color: colors[i % colors.length], borderRadius: [6, 6, 0, 0] } })),
        label: { show: true, position: 'top', color: COLORS.ink700, fontSize: 12, fontWeight: 600 }
      }]
    });
    return registerChart(chart);
  }

  /* ============================================================
     中国vs国际证据环形图
     ============================================================ */
  function initChinaIntlChart(dom) {
    if (!dom || typeof echarts === 'undefined') return null;
    const data = window.APP_DATA.statistics.chinaVsIntl;

    const chart = echarts.init(dom);
    chart.setOption({
      tooltip: { ...tooltipStyle, trigger: 'item', formatter: '{b}：{c}篇 ({d}%)' },
      legend: { bottom: 0, textStyle: { color: COLORS.ink600, fontSize: 12 } },
      title: {
        text: String(data.china), subtext: '中国证据',
        left: 'center', top: '38%',
        textStyle: { fontSize: 28, fontWeight: 700, color: COLORS.primary },
        subtextStyle: { fontSize: 12, color: COLORS.ink500 }
      },
      series: [{
        type: 'pie', radius: ['55%', '75%'], center: ['50%', '50%'],
        itemStyle: { borderColor: '#fff', borderWidth: 3 },
        label: { show: false }, labelLine: { show: false },
        data: [
          { value: data.china, name: '中国研究', itemStyle: { color: COLORS.secondary } },
          { value: data.international, name: '国际研究', itemStyle: { color: COLORS.primary } }
        ]
      }]
    });
    return registerChart(chart);
  }

  /* ============================================================
     专题年度趋势图（用于专题页）
     ============================================================ */
  function initTopicYearChart(dom, yearTrend) {
    if (!dom || typeof echarts === 'undefined') return null;
    if (!yearTrend || !yearTrend.length) return null;

    const chart = echarts.init(dom);
    chart.setOption({
      tooltip: {
        ...tooltipStyle, trigger: 'axis',
        formatter: function(p) { return p[0].name + '年<br/>文献数量：<strong>' + p[0].value + '篇</strong>'; }
      },
      grid: { left: 50, right: 20, top: 20, bottom: 30 },
      xAxis: {
        type: 'category', data: yearTrend.map(d => d.year),
        axisLabel: { color: COLORS.ink500, fontSize: 11 },
        axisLine: { lineStyle: { color: COLORS.ink200 } },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value', name: '篇数',
        nameTextStyle: { color: COLORS.ink400, fontSize: 11 },
        axisLabel: { color: COLORS.ink500, fontSize: 11 },
        splitLine: { lineStyle: { color: COLORS.ink100, type: 'dashed' } }
      },
      series: [{
        type: 'bar', barWidth: '50%',
        data: yearTrend.map(d => d.count),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: COLORS.primary },
            { offset: 1, color: COLORS.secondary }
          ]),
          borderRadius: [4, 4, 0, 0]
        },
        label: { show: true, position: 'top', color: COLORS.ink700, fontSize: 10, fontWeight: 500 }
      }]
    });
    return registerChart(chart);
  }

  /* ============================================================
     专题证据等级分布图
     ============================================================ */
  function initTopicLevelChart(dom, evidenceDist) {
    if (!dom || typeof echarts === 'undefined') return null;
    if (!evidenceDist) return null;

    const chart = echarts.init(dom);
    const levelMap = {
      '高': { color: COLORS.primary, label: '高' },
      '中-高': { color: COLORS.secondary, label: '中-高' },
      '中': { color: COLORS.secondaryLight, label: '中' },
      '中-低': { color: COLORS.accentLight, label: '中-低' },
      '低': { color: COLORS.accent, label: '低' },
      '未明确': { color: COLORS.ink300, label: '未明确' }
    };

    const pieData = Object.entries(evidenceDist).map(([level, count]) => ({
      value: count, name: levelMap[level] ? levelMap[level].label : level,
      itemStyle: { color: levelMap[level] ? levelMap[level].color : COLORS.ink300 }
    })).filter(d => d.value > 0);

    chart.setOption({
      tooltip: { ...tooltipStyle, trigger: 'item', formatter: '{b}：{c}篇 ({d}%)' },
      legend: { bottom: 0, textStyle: { color: COLORS.ink600, fontSize: 11 }, type: 'scroll' },
      series: [{
        type: 'pie', radius: ['40%', '65%'], center: ['50%', '45%'],
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
        label: { show: true, position: 'outside', formatter: '{b}\n{c}', fontSize: 11, color: COLORS.ink700 },
        labelLine: { length: 8, length2: 8 },
        data: pieData
      }]
    });
    return registerChart(chart);
  }

  /* ============================================================
     专题研究设计分布图
     ============================================================ */
  function initTopicDesignChart(dom, designDist) {
    if (!dom || typeof echarts === 'undefined') return null;
    if (!designDist) return null;

    const chart = echarts.init(dom);
    const entries = Object.entries(designDist)
      .map(([design, count]) => ({ design, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    chart.setOption({
      tooltip: {
        ...tooltipStyle, trigger: 'axis', axisPointer: { type: 'shadow' },
        formatter: function(p) { return p[0].name + '<br/>文献数量：<strong>' + p[0].value + '篇</strong>'; }
      },
      grid: { left: 100, right: 30, top: 10, bottom: 30 },
      xAxis: {
        type: 'value', name: '篇数',
        nameTextStyle: { color: COLORS.ink400, fontSize: 11 },
        axisLabel: { color: COLORS.ink500, fontSize: 11 },
        splitLine: { lineStyle: { color: COLORS.ink100, type: 'dashed' } }
      },
      yAxis: {
        type: 'category', data: entries.map(d => d.design).reverse(),
        axisLabel: { color: COLORS.ink600, fontSize: 11 },
        axisLine: { lineStyle: { color: COLORS.ink200 } },
        axisTick: { show: false }
      },
      series: [{
        type: 'bar', barWidth: '60%',
        data: entries.map(d => d.count).reverse(),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: COLORS.secondary },
            { offset: 1, color: COLORS.primary }
          ]),
          borderRadius: [0, 4, 4, 0]
        },
        label: { show: true, position: 'right', color: COLORS.ink700, fontSize: 11, fontWeight: 600 }
      }]
    });
    return registerChart(chart);
  }

  /* ============================================================
     2030差距仪表盘（横向条形图）
     ============================================================ */
  function init2030GapChart(dom) {
    if (!dom || typeof echarts === 'undefined') return null;
    const chartData = (window.APP_DATA && window.APP_DATA.charts && window.APP_DATA.charts['2030_gap']) || {};
    const stages = chartData.stages || [];
    if (!stages.length) return null;

    const chart = echarts.init(dom);
    const gapColors = { 'low': COLORS.secondary, 'medium': COLORS.primary, 'high': COLORS.accent };
    const gapLabels = { 'low': '低', 'medium': '中', 'high': '高' };

    chart.setOption({
      animation: false,
      tooltip: {
        ...tooltipStyle,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: function(params) {
          const s = stages[params[0].dataIndex];
          return '<strong>' + s.name + '</strong><br/>' +
            '证据成熟度: ' + s.evidence_maturity_score + '/100<br/>' +
            '差距等级: ' + gapLabels[s.gap_level] + '<br/>' +
            '相关文献: ' + s.evidence_total + '篇<br/>' +
            'AB级证据: ' + s.evidence_ab + '篇<br/>' +
            '中国证据: ' + s.evidence_china + '篇';
        }
      },
      grid: { left: 120, right: 80, top: 20, bottom: 40 },
      xAxis: {
        type: 'value', min: 0, max: 100,
        name: '证据成熟度 →',
        nameTextStyle: { color: COLORS.ink400, fontSize: 11 },
        axisLabel: { color: COLORS.ink500, fontSize: 11 },
        splitLine: { lineStyle: { color: COLORS.ink100, type: 'dashed' } }
      },
      yAxis: {
        type: 'category',
        data: stages.map(function(s) { return s.name; }),
        axisLabel: { color: COLORS.ink700, fontSize: 12, fontWeight: 500 },
        axisLine: { lineStyle: { color: COLORS.ink200 } }
      },
      series: [{
        type: 'bar',
        data: stages.map(function(s) {
          return {
            value: s.evidence_maturity_score,
            itemStyle: { color: gapColors[s.gap_level] || COLORS.primary },
            stageData: s
          };
        }),
        barWidth: '55%',
        label: {
          show: true,
          position: 'right',
          color: COLORS.ink700,
          fontSize: 11,
          fontWeight: 600,
          formatter: function(p) { return p.value + '分'; }
        }
      }]
    });
    return registerChart(chart);
  }

  /* ============================================================
     筛查漏斗图
     ============================================================ */
  function initScreeningFunnelChart(dom) {
    if (!dom || typeof echarts === 'undefined') return null;
    const chartData = (window.APP_DATA && window.APP_DATA.charts && window.APP_DATA.charts['screening_funnel']) || {};
    const stages = chartData.stages || [];
    if (!stages.length) return null;

    const chart = echarts.init(dom);

    // 用文献数量做相对漏斗展示（注明非实际人群比例）
    const values = stages.map(function(s) { return Math.max(1, s.related_studies); });
    const maxVal = Math.max.apply(null, values);

    chart.setOption({
      animation: false,
      tooltip: {
        ...tooltipStyle,
        trigger: 'item',
        formatter: function(p) {
          const s = stages[p.dataIndex];
          return '<strong>' + s.name + '</strong><br/>' +
            '相关研究: ' + s.related_studies + '篇<br/>' +
            'AB级证据: ' + s.ab_evidence + '篇<br/>' +
            '中国证据: ' + (s.has_china_evidence ? '有' : '暂无') + '<br/>' +
            s.evidence_note;
        }
      },
      series: [{
        type: 'funnel',
        left: '10%',
        top: 20,
        bottom: 20,
        width: '80%',
        min: 0,
        max: maxVal,
        minSize: '30%',
        maxSize: '100%',
        sort: 'descending',
        gap: 2,
        label: {
          show: true,
          position: 'inside',
          color: '#fff',
          fontSize: 12,
          fontWeight: 600,
          formatter: function(p) { return p.name + '\n' + p.value + '篇'; }
        },
        labelLine: { show: false },
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 2
        },
        data: stages.map(function(s, i) {
          const colors = [COLORS.primary, '#1a7ba3', '#2a80a3', '#3a90b3',
                         COLORS.secondary, '#3a9a6a', '#4aaa7a', COLORS.accent, COLORS.accent2];
          return {
            value: Math.max(1, s.related_studies),
            name: s.name,
            itemStyle: { color: colors[i % colors.length] }
          };
        })
      }],
      graphic: [{
        type: 'text',
        left: 'center',
        bottom: 5,
        style: {
          text: '注：展示各环节相关研究数量，非实际人群比例',
          fill: COLORS.ink400,
          fontSize: 11
        }
      }]
    });
    return registerChart(chart);
  }

  /* ============================================================
     生物标志物气泡图
     ============================================================ */
  function initBiomarkerBubbleChart(dom) {
    if (!dom || typeof echarts === 'undefined') return null;
    const chartData = (window.APP_DATA && window.APP_DATA.charts && window.APP_DATA.charts['diagnosis_biomarker_landscape']) || {};
    const biomarkers = chartData.biomarkers || [];
    if (!biomarkers.length) return null;

    const chart = echarts.init(dom);

    const statusColors = {
      'clinical_practice': COLORS.primary,
      'clinical_validation': COLORS.accent,
      'exploratory': COLORS.secondary
    };

    chart.setOption({
      animation: false,
      tooltip: {
        ...tooltipStyle,
        trigger: 'item',
        formatter: function(p) {
          const bm = biomarkers[p.dataIndex];
          return '<strong>' + bm.name + '</strong><br/>' +
            '临床成熟度: ' + bm.clinical_maturity + '/100<br/>' +
            '支持文献: ' + bm.evidence_count + '篇<br/>' +
            '中国证据: ' + bm.china_evidence_count + '篇<br/>' +
            '应用场景: ' + (bm.categories || []).join('、');
        }
      },
      grid: { left: 60, right: 40, top: 30, bottom: 60 },
      xAxis: {
        type: 'value', min: 0, max: 100,
        name: '临床应用成熟度 →',
        nameLocation: 'middle',
        nameGap: 35,
        nameTextStyle: { color: COLORS.ink400, fontSize: 11 },
        axisLabel: { color: COLORS.ink500, fontSize: 11 },
        splitLine: { lineStyle: { color: COLORS.ink100, type: 'dashed' } }
      },
      yAxis: {
        type: 'value', min: 0, max: 100,
        name: '创新性/科研价值 →',
        nameLocation: 'middle',
        nameGap: 45,
        nameTextStyle: { color: COLORS.ink400, fontSize: 11 },
        axisLabel: { color: COLORS.ink500, fontSize: 11 },
        splitLine: { lineStyle: { color: COLORS.ink100, type: 'dashed' } }
      },
      series: [{
        type: 'scatter',
        symbolSize: function(data) { return data[2]; },
        data: biomarkers.map(function(bm) {
          return {
            name: bm.name,
            value: [bm.clinical_maturity, bm.innovation_base, bm.bubble_size],
            itemStyle: { color: statusColors[bm.evidence_status] || COLORS.primary }
          };
        }),
        label: {
          show: true,
          formatter: function(p) { return p.data.name; },
          position: 'top',
          color: COLORS.ink700,
          fontSize: 11,
          fontWeight: 600
        }
      }]
    });
    return registerChart(chart);
  }

  /* ============================================================
     治疗人群结局对比图（分组柱状图）
     ============================================================ */
  function initTreatmentOutcomesChart(dom) {
    if (!dom || typeof echarts === 'undefined') return null;
    const chartData = (window.APP_DATA && window.APP_DATA.charts && window.APP_DATA.charts['treatment_population_outcomes']) || {};
    const populations = chartData.populations || [];
    if (!populations.length) return null;

    const chart = echarts.init(dom);

    chart.setOption({
      animation: false,
      tooltip: {
        ...tooltipStyle,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: function(params) {
          const p = populations[params[0].dataIndex];
          return '<strong>' + p.name + '</strong><br/>' +
            '相关研究: ' + p.related_studies + '篇<br/>' +
            'AB级证据: ' + p.ab_evidence + '篇<br/>' +
            '中国证据: ' + p.china_evidence + '篇<br/>' +
            '置信度: ' + p.confidence + '<br/>' +
            p.evidence_note;
        }
      },
      grid: { left: 50, right: 30, top: 30, bottom: 70 },
      xAxis: {
        type: 'category',
        data: populations.map(function(p) { return p.name; }),
        axisLabel: { color: COLORS.ink700, fontSize: 11, interval: 0, rotate: 20 },
        axisLine: { lineStyle: { color: COLORS.ink200 } }
      },
      yAxis: {
        type: 'value',
        name: '相关研究数（篇）',
        nameTextStyle: { color: COLORS.ink400, fontSize: 11 },
        axisLabel: { color: COLORS.ink500, fontSize: 11 },
        splitLine: { lineStyle: { color: COLORS.ink100 } }
      },
      series: [{
        type: 'bar',
        data: populations.map(function(p) {
          let color = COLORS.primary;
          if (p.ab_evidence >= 5) color = COLORS.secondary;
          else if (p.ab_evidence >= 2) color = COLORS.primary;
          else color = COLORS.accent;
          return { value: p.related_studies, itemStyle: { color: color } };
        }),
        barWidth: '55%',
        label: {
          show: true,
          position: 'top',
          color: COLORS.ink700,
          fontSize: 12,
          fontWeight: 700,
          formatter: function(p) { return p.value + '篇'; }
        }
      }],
      graphic: [{
        type: 'text',
        left: 'center',
        bottom: 5,
        style: {
          text: '注：展示相关研究数量，不列合并清除率（人群/方案/随访异质性大）',
          fill: COLORS.ink400,
          fontSize: 11
        }
      }]
    });
    return registerChart(chart);
  }

  /* ============================================================
     新药管线气泡矩阵图
     ============================================================ */
  function initPipelineBubbleChart(dom) {
    if (!dom || typeof echarts === 'undefined') return null;
    const chartData = (window.APP_DATA && window.APP_DATA.charts && window.APP_DATA.charts['functional_cure_pipeline']) || {};
    const drugs = chartData.drugs || [];
    const stageLabels = chartData.stage_labels || [];
    if (!drugs.length) return null;

    const chart = echarts.init(dom);

    chart.setOption({
      animation: false,
      tooltip: {
        ...tooltipStyle,
        trigger: 'item',
        formatter: function(p) {
          const d = drugs[p.dataIndex];
          return '<strong>' + d.name + '</strong> (' + d.category + ')<br/>' +
            '临床阶段: ' + d.stage_label + '<br/>' +
            '效果评分: ' + d.efficacy_score + '/100<br/>' +
            '支持文献: ' + d.evidence_count + '篇<br/>' +
            '中国证据: ' + d.china_evidence_count + '篇<br/>' +
            (d.is_clinical_human ? '人体临床数据' : '临床前/动物实验');
        }
      },
      grid: { left: 80, right: 120, top: 30, bottom: 50 },
      xAxis: {
        type: 'value', min: 0, max: 100,
        name: 'HBsAg下降/清除效果相对评分 →',
        nameLocation: 'middle',
        nameGap: 35,
        nameTextStyle: { color: COLORS.ink400, fontSize: 11 },
        axisLabel: { color: COLORS.ink500, fontSize: 11 },
        splitLine: { lineStyle: { color: COLORS.ink100, type: 'dashed' } }
      },
      yAxis: {
        type: 'category',
        data: stageLabels,
        axisLabel: { color: COLORS.ink700, fontSize: 11 },
        axisLine: { lineStyle: { color: COLORS.ink200 } }
      },
      series: [{
        type: 'scatter',
        symbolSize: function(data) { return data[2]; },
        data: drugs.map(function(d) {
          return {
            name: d.name,
            value: [d.efficacy_score, d.stage, d.bubble_size * 0.8],
            itemStyle: { color: d.color, opacity: d.is_clinical_human ? 1 : 0.6 }
          };
        }),
        label: {
          show: true,
          formatter: function(p) { return p.data.name; },
          position: 'right',
          color: COLORS.ink700,
          fontSize: 10,
          fontWeight: 600
        }
      }],
      graphic: [{
        type: 'text',
        left: 'center',
        bottom: 5,
        style: {
          text: '注：效果评分为相对比较，不同研究不可直接横向比较；淡色为临床前数据',
          fill: COLORS.ink400,
          fontSize: 11
        }
      }]
    });
    return registerChart(chart);
  }

  /* ============================================================
     患者留存漏斗图
     ============================================================ */
  function initPatientRetentionChart(dom) {
    if (!dom || typeof echarts === 'undefined') return null;
    const chartData = (window.APP_DATA && window.APP_DATA.charts && window.APP_DATA.charts['patient_retention_funnel']) || {};
    const stages = chartData.stages || [];
    if (!stages.length) return null;

    const chart = echarts.init(dom);

    const riskColors = { 'low': COLORS.secondary, 'medium': COLORS.primary, 'high': COLORS.accent };

    chart.setOption({
      animation: false,
      tooltip: {
        ...tooltipStyle,
        trigger: 'item',
        formatter: function(p) {
          const s = stages[p.dataIndex];
          return '<strong>' + s.name + '</strong><br/>' +
            '时间点: ' + s.time_point_months + '个月<br/>' +
            '相关研究: ' + s.related_studies + '篇<br/>' +
            '脱落风险: ' + s.dropout_risk_text + '<br/>' +
            s.note;
        }
      },
      series: [{
        type: 'funnel',
        left: '10%',
        top: 20,
        bottom: 30,
        width: '80%',
        min: 1,
        max: stages.length + 2,
        minSize: '40%',
        maxSize: '100%',
        sort: 'descending',
        gap: 3,
        label: {
          show: true,
          position: 'inside',
          color: '#fff',
          fontSize: 11,
          fontWeight: 600,
          formatter: function(p) { return p.name; }
        },
        labelLine: { show: false },
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
        data: stages.map(function(s) {
          return {
            value: stages.length + 2 - stages.indexOf(s),
            name: s.name + '\n(' + s.dropout_risk_text + ')',
            itemStyle: { color: riskColors[s.dropout_risk_level] || COLORS.primary }
          };
        })
      }],
      graphic: [{
        type: 'text',
        left: 'center',
        bottom: 5,
        style: {
          text: '注：脱落风险基于相关研究中提到的问题频次评估，非实际脱落率',
          fill: COLORS.ink400,
          fontSize: 11
        }
      }]
    });
    return registerChart(chart);
  }

  /* ============================================================
     HCC残余风险热力图
     ============================================================ */
  function initHCCRiskChart(dom) {
    if (!dom || typeof echarts === 'undefined') return null;
    const chartData = (window.APP_DATA && window.APP_DATA.charts && window.APP_DATA.charts['hcc_residual_risk']) || {};
    const factors = chartData.risk_factors || [];
    if (!factors.length) return null;

    const chart = echarts.init(dom);

    const strengthMap = { 'strong': 3, 'moderate': 2, 'weak': 1 };
    const contributionMap = { 'high': 3, 'medium': 2, 'low': 1 };

    const heatData = factors.map(function(f, i) {
      return [i, 0, strengthMap[f.evidence_strength] || 1, f];
    });

    chart.setOption({
      animation: false,
      tooltip: {
        ...tooltipStyle,
        formatter: function(p) {
          const f = p.data[3];
          return '<strong>' + f.factor + '</strong><br/>' +
            '证据强度: ' + f.evidence_strength + '<br/>' +
            '风险贡献: ' + f.risk_contribution + '<br/>' +
            '相关研究: ' + f.related_studies + '篇<br/>' +
            '中国证据: ' + f.china_evidence + '篇';
        }
      },
      grid: { left: 140, right: 40, top: 20, bottom: 40 },
      xAxis: {
        type: 'category',
        data: ['HCC风险贡献度'],
        axisLabel: { color: COLORS.ink500, fontSize: 11 },
        axisLine: { lineStyle: { color: COLORS.ink200 } }
      },
      yAxis: {
        type: 'category',
        data: factors.map(function(f) { return f.factor; }),
        axisLabel: { color: COLORS.ink700, fontSize: 11 },
        axisLine: { lineStyle: { color: COLORS.ink200 } }
      },
      visualMap: {
        min: 1,
        max: 3,
        calculable: false,
        orient: 'horizontal',
        left: 'center',
        bottom: 5,
        inRange: { color: [COLORS.secondaryLight, COLORS.primary, COLORS.accent] },
        text: ['高', '低'],
        textStyle: { color: COLORS.ink500, fontSize: 10 }
      },
      series: [{
        type: 'heatmap',
        data: heatData.map(function(d) {
          return { value: [d[1], d[0], d[2]], fdata: d[3] };
        }),
        label: {
          show: true,
          color: '#fff',
          fontSize: 11,
          fontWeight: 600,
          formatter: function(p) { return p.data.fdata.related_studies + '篇'; }
        },
        itemStyle: { borderColor: '#fff', borderWidth: 2 }
      }]
    });
    return registerChart(chart);
  }

  /* ============================================================
     联盟行动矩阵（气泡图）
     ============================================================ */
  function initAllianceMatrixChart(dom) {
    if (!dom || typeof echarts === 'undefined') return null;
    const chartData = (window.APP_DATA && window.APP_DATA.charts && window.APP_DATA.charts['alliance_action_matrix']) || {};
    const domains = chartData.domains || [];
    if (!domains.length) return null;

    const chart = echarts.init(dom);

    const priorityColors = { 'high': COLORS.primary, 'medium': COLORS.accent, 'low': COLORS.secondary };

    chart.setOption({
      animation: false,
      tooltip: {
        ...tooltipStyle,
        trigger: 'item',
        formatter: function(p) {
          const d = domains[p.dataIndex];
          return '<strong>' + d.domain + '</strong><br/>' +
            '可行性: ' + d.feasibility + '/100<br/>' +
            '影响力: ' + d.impact + '/100<br/>' +
            '优先级: ' + (d.priority === 'high' ? '高' : d.priority === 'medium' ? '中' : '低') + '<br/>' +
            '支持文献: ' + d.evidence_count + '篇<br/>' +
            d.description;
        }
      },
      grid: { left: 60, right: 40, top: 40, bottom: 60 },
      xAxis: {
        type: 'value', min: 0, max: 100,
        name: '实施可行性 →',
        nameLocation: 'middle',
        nameGap: 35,
        nameTextStyle: { color: COLORS.ink400, fontSize: 11 },
        axisLabel: { color: COLORS.ink500, fontSize: 11 },
        splitLine: { lineStyle: { color: COLORS.ink100, type: 'dashed' } }
      },
      yAxis: {
        type: 'value', min: 0, max: 100,
        inverse: true,
        name: '对2030目标影响力 ↑',
        nameLocation: 'middle',
        nameGap: 45,
        nameTextStyle: { color: COLORS.ink400, fontSize: 11 },
        axisLabel: { color: COLORS.ink500, fontSize: 11 },
        splitLine: { lineStyle: { color: COLORS.ink100, type: 'dashed' } }
      },
      series: [{
        type: 'scatter',
        symbolSize: function(data) { return data[2]; },
        data: domains.map(function(d) {
          return {
            name: d.domain,
            value: [d.feasibility, d.impact, d.bubble_size],
            itemStyle: { color: priorityColors[d.priority] || COLORS.primary }
          };
        }),
        label: {
          show: true,
          formatter: function(p) { return p.data.name; },
          position: 'top',
          color: COLORS.ink700,
          fontSize: 10,
          fontWeight: 600
        }
      }]
    });
    return registerChart(chart);
  }

  /* ============================================================
     市场策略矩阵图
     ============================================================ */
  function initMarketStrategyChart(dom) {
    if (!dom || typeof echarts === 'undefined') return null;
    const chartData = (window.APP_DATA && window.APP_DATA.charts && window.APP_DATA.charts['market_strategy_map']) || {};
    const strategies = chartData.strategies || [];
    if (!strategies.length) return null;

    const chart = echarts.init(dom);

    const priorityColors = { 'high': COLORS.primary, 'medium': COLORS.accent, 'low': COLORS.secondary };

    chart.setOption({
      animation: false,
      tooltip: {
        ...tooltipStyle,
        trigger: 'item',
        formatter: function(p) {
          const s = strategies[p.dataIndex];
          return '<strong>' + s.name + '</strong><br/>' +
            '类别: ' + s.category + '<br/>' +
            '优先级: ' + (s.priority === 'high' ? '高' : s.priority === 'medium' ? '中' : '低') + '<br/>' +
            '市场价值: ' + s.market_value + '/100<br/>' +
            '实施难度: ' + s.implementation_difficulty + '/100<br/>' +
            '支持文献: ' + s.evidence_count + '篇';
        }
      },
      grid: { left: 60, right: 40, top: 40, bottom: 60 },
      xAxis: {
        type: 'value', min: 0, max: 100,
        name: '市场价值 →',
        nameLocation: 'middle',
        nameGap: 35,
        nameTextStyle: { color: COLORS.ink400, fontSize: 11 },
        axisLabel: { color: COLORS.ink500, fontSize: 11 },
        splitLine: { lineStyle: { color: COLORS.ink100, type: 'dashed' } }
      },
      yAxis: {
        type: 'value', min: 0, max: 100,
        inverse: true,
        name: '实施难度 ↑',
        nameLocation: 'middle',
        nameGap: 45,
        nameTextStyle: { color: COLORS.ink400, fontSize: 11 },
        axisLabel: { color: COLORS.ink500, fontSize: 11 },
        splitLine: { lineStyle: { color: COLORS.ink100, type: 'dashed' } }
      },
      series: [{
        type: 'scatter',
        symbolSize: function(data) { return data[2]; },
        data: strategies.map(function(s) {
          return {
            name: s.name,
            value: [s.market_value, s.implementation_difficulty, s.bubble_size],
            itemStyle: { color: priorityColors[s.priority] || COLORS.primary }
          };
        }),
        label: {
          show: true,
          formatter: function(p) { return p.data.name; },
          position: 'top',
          color: COLORS.ink700,
          fontSize: 10,
          fontWeight: 600
        }
      }]
    });
    return registerChart(chart);
  }

  /* ============================================================
     证据等级横向条形图
     ============================================================ */
  function initEvidenceQualityChart(dom) {
    if (!dom || typeof echarts === 'undefined') return null;
    const chartData = (window.APP_DATA && window.APP_DATA.charts && window.APP_DATA.charts['evidence_quality']) || {};
    const levels = chartData.levels || [];
    if (!levels.length) return null;

    const chart = echarts.init(dom);

    chart.setOption({
      animation: false,
      tooltip: {
        ...tooltipStyle,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: function(params) {
          const l = levels[params[0].dataIndex];
          return '<strong>' + l.name + '</strong><br/>' +
            '数量: ' + l.count + '篇<br/>' +
            '占比: ' + l.percentage + '%';
        }
      },
      grid: { left: 180, right: 60, top: 20, bottom: 30 },
      xAxis: {
        type: 'value',
        name: '文献数（篇）',
        nameTextStyle: { color: COLORS.ink400, fontSize: 11 },
        axisLabel: { color: COLORS.ink500, fontSize: 11 },
        splitLine: { lineStyle: { color: COLORS.ink100, type: 'dashed' } }
      },
      yAxis: {
        type: 'category',
        data: levels.map(function(l) { return l.name; }),
        axisLabel: { color: COLORS.ink700, fontSize: 11 },
        axisLine: { lineStyle: { color: COLORS.ink200 } }
      },
      series: [{
        type: 'bar',
        data: levels.map(function(l) {
          return { value: l.count, itemStyle: { color: l.color } };
        }),
        barWidth: '55%',
        label: {
          show: true,
          position: 'right',
          color: COLORS.ink700,
          fontSize: 12,
          fontWeight: 600,
          formatter: function(p) {
            const l = levels[p.dataIndex];
            return p.value + '篇 (' + l.percentage + '%)';
          }
        }
      }]
    });
    return registerChart(chart);
  }

  // 窗口resize时重绘所有图表
  window.addEventListener('resize', function() {
    chartInstances.forEach(function(c) {
      if (c && !c.isDisposed()) c.resize();
    });
  });

  // 暴露全局函数
  window.ChartFns = {
    initYearTrendChart: initYearTrendChart,
    initLevelPieChart: initLevelPieChart,
    initTopicDistChart: initTopicDistChart,
    initChinaIntlChart: initChinaIntlChart,
    initTopicYearChart: initTopicYearChart,
    initTopicLevelChart: initTopicLevelChart,
    initTopicDesignChart: initTopicDesignChart,
    init2030GapChart: init2030GapChart,
    initScreeningFunnelChart: initScreeningFunnelChart,
    initBiomarkerBubbleChart: initBiomarkerBubbleChart,
    initTreatmentOutcomesChart: initTreatmentOutcomesChart,
    initPipelineBubbleChart: initPipelineBubbleChart,
    initPatientRetentionChart: initPatientRetentionChart,
    initHCCRiskChart: initHCCRiskChart,
    initAllianceMatrixChart: initAllianceMatrixChart,
    initMarketStrategyChart: initMarketStrategyChart,
    initEvidenceQualityChart: initEvidenceQualityChart
  };

})();
