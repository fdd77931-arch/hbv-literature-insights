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
    initTopicDesignChart: initTopicDesignChart
  };

})();
