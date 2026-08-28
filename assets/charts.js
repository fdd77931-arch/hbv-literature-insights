/* ============================================================
   2030肝病联盟战略洞察平台 - 图表配置
   使用 ECharts 5.x 渲染各类数据可视化图表
   ============================================================ */

(function() {
  'use strict';

  // 颜色常量
  const COLORS = {
    primary: '#005691',
    primaryDark: '#003d66',
    primaryLight: '#1a73b8',
    secondary: '#00A896',
    secondaryDark: '#008a7a',
    secondaryLight: '#33b9aa',
    accent: '#E8742C',
    accentLight: '#f2995f',
    danger: '#DC3545',
    success: '#28A745',
    warning: '#FFC107',
    ink900: '#0f1a26',
    ink700: '#2d3748',
    ink500: '#718096',
    ink400: '#a0aec0',
    ink300: '#cbd5e0',
    ink200: '#e2e8f0',
    ink100: '#edf2f7',
    bgGray: '#f5f7fa'
  };

  // 公共tooltip样式
  const tooltipStyle = {
    backgroundColor: 'rgba(15, 26, 38, 0.92)',
    borderColor: 'rgba(0, 86, 145, 0.3)',
    borderWidth: 1,
    padding: [10, 14],
    textStyle: {
      color: '#fff',
      fontSize: 12,
      lineHeight: 1.5
    },
    extraCssText: 'border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.2);'
  };

  /* ============================================================
     漏斗图：慢乙肝患者管理漏斗
     ============================================================ */
  function initFunnelChart(dom) {
    if (!dom || typeof echarts === 'undefined') return null;

    const chart = echarts.init(dom);
    const data = window._platformData.funnelStages;

    const funnelData = data.map((stage, i) => ({
      name: stage.name,
      value: stage.rate,
      itemStyle: {
        color: i < 3 ? COLORS.primary : (i < 6 ? COLORS.secondary : COLORS.accent)
      }
    })).reverse();

    chart.setOption({
      tooltip: {
        ...tooltipStyle,
        trigger: 'item',
        formatter: function(params) {
          const stage = data.find(s => s.name === params.name);
          if (!stage) return params.name;
          return `
            <div style="font-weight:600; margin-bottom:6px;">${params.name}</div>
            <div>留存率：<strong>${params.value}%</strong></div>
            <div style="margin-top:4px; opacity:0.8; font-size:11px;">${stage.problem}</div>
          `;
        }
      },
      legend: {
        bottom: 0,
        left: 'center',
        itemWidth: 12,
        itemHeight: 8,
        textStyle: {
          color: COLORS.ink500,
          fontSize: 11
        },
        data: data.map(d => d.name)
      },
      series: [{
        name: '患者管理漏斗',
        type: 'funnel',
        left: '10%',
        top: 30,
        bottom: 50,
        width: '80%',
        min: 0,
        max: 100,
        minSize: '10%',
        maxSize: '100%',
        sort: 'descending',
        gap: 4,
        label: {
          show: true,
          position: 'inside',
          formatter: function(params) {
            return params.name + '\n' + params.value + '%';
          },
          color: '#fff',
          fontSize: 12,
          fontWeight: 600,
          lineHeight: 1.4
        },
        labelLine: {
          show: false
        },
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 2
        },
        emphasis: {
          label: {
            fontSize: 14
          }
        },
        data: funnelData
      }]
    });

    return chart;
  }

  /* ============================================================
     柱状对比图：2030目标差距
     ============================================================ */
  function initGapChart(dom) {
    if (!dom || typeof echarts === 'undefined') return null;

    const chart = echarts.init(dom);

    chart.setOption({
      tooltip: {
        ...tooltipStyle,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: function(params) {
          const current = params[0];
          const target = params[1];
          const gap = (target.value - current.value).toFixed(1);
          return `
            <div style="font-weight:600; margin-bottom:8px;">${current.name}</div>
            <div>当前水平：<strong style="color:${COLORS.accent}">${current.value}%</strong></div>
            <div>2030目标：<strong style="color:${COLORS.primary}">${target.value}%</strong></div>
            <div style="margin-top:6px; padding-top:6px; border-top:1px solid rgba(255,255,255,0.2);">
              差距：<strong style="color:${COLORS.danger}">${gap}%</strong>
            </div>
          `;
        }
      },
      grid: {
        left: 60,
        right: 30,
        top: 40,
        bottom: 30
      },
      xAxis: {
        type: 'category',
        data: ['诊断率', '治疗率', '病毒抑制率', 'HCC早诊率', '病死率下降'],
        axisLabel: {
          color: COLORS.ink600,
          fontSize: 12,
          interval: 0
        },
        axisLine: { lineStyle: { color: COLORS.ink200 } },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        name: '百分比 (%)',
        nameTextStyle: {
          color: COLORS.ink400,
          fontSize: 11,
          padding: [0, 0, 0, -20]
        },
        max: 100,
        axisLabel: {
          color: COLORS.ink500,
          fontSize: 11,
          formatter: '{value}%'
        },
        splitLine: {
          lineStyle: {
            color: COLORS.ink100,
            type: 'dashed'
          }
        }
      },
      series: [
        {
          name: '当前水平',
          type: 'bar',
          barWidth: 18,
          data: [
            { value: 18.7, itemStyle: { color: COLORS.accent } },
            { value: 10.8, itemStyle: { color: COLORS.accent } },
            { value: 70, itemStyle: { color: COLORS.secondary } },
            { value: 15, itemStyle: { color: COLORS.accent } },
            { value: 10, itemStyle: { color: COLORS.accent } }
          ],
          label: {
            show: true,
            position: 'top',
            color: COLORS.accent,
            fontSize: 11,
            fontWeight: 600,
            formatter: '{c}%'
          },
          itemStyle: {
            borderRadius: [4, 4, 0, 0]
          }
        },
        {
          name: '2030目标',
          type: 'bar',
          barWidth: 18,
          data: [
            { value: 90, itemStyle: { color: COLORS.primary } },
            { value: 80, itemStyle: { color: COLORS.primary } },
            { value: 90, itemStyle: { color: COLORS.primary } },
            { value: 40, itemStyle: { color: COLORS.primary } },
            { value: 65, itemStyle: { color: COLORS.primary } }
          ],
          label: {
            show: true,
            position: 'top',
            color: COLORS.primary,
            fontSize: 11,
            fontWeight: 600,
            formatter: '{c}%'
          },
          itemStyle: {
            borderRadius: [4, 4, 0, 0]
          }
        }
      ]
    });

    return chart;
  }

  /* ============================================================
     专题分布小图（环形图）
     ============================================================ */
  function initThemeDistChart(dom, theme) {
    if (!dom || typeof echarts === 'undefined') return null;

    const chart = echarts.init(dom);
    const data = window._platformData.statistics;

    // 各专题的证据等级分布
    const distributions = {
      screening: [
        { value: 32, name: 'A级', itemStyle: { color: COLORS.primary } },
        { value: 54, name: 'B级', itemStyle: { color: COLORS.secondary } },
        { value: 70, name: 'C级', itemStyle: { color: COLORS.ink300 } }
      ],
      diagnosis: [
        { value: 25, name: 'A级', itemStyle: { color: COLORS.primary } },
        { value: 42, name: 'B级', itemStyle: { color: COLORS.secondary } },
        { value: 61, name: 'C级', itemStyle: { color: COLORS.ink300 } }
      ],
      treatment: [
        { value: 68, name: 'A级', itemStyle: { color: COLORS.primary } },
        { value: 118, name: 'B级', itemStyle: { color: COLORS.secondary } },
        { value: 201, name: 'C级', itemStyle: { color: COLORS.ink300 } }
      ],
      management: [
        { value: 18, name: 'A级', itemStyle: { color: COLORS.primary } },
        { value: 48, name: 'B级', itemStyle: { color: COLORS.secondary } },
        { value: 76, name: 'C级', itemStyle: { color: COLORS.ink300 } }
      ],
      hbvhcc: [
        { value: 35, name: 'A级', itemStyle: { color: COLORS.primary } },
        { value: 58, name: 'B级', itemStyle: { color: COLORS.secondary } },
        { value: 80, name: 'C级', itemStyle: { color: COLORS.ink300 } }
      ]
    };

    chart.setOption({
      tooltip: {
        ...tooltipStyle,
        trigger: 'item',
        formatter: '{b}: {c}篇 ({d}%)'
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 'center',
        itemWidth: 10,
        itemHeight: 10,
        textStyle: {
          color: COLORS.ink600,
          fontSize: 11
        }
      },
      series: [{
        type: 'pie',
        radius: ['50%', '72%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 2
        },
        label: { show: false },
        labelLine: { show: false },
        data: distributions[theme] || distributions.screening
      }]
    });

    return chart;
  }

  /* ============================================================
     证据分布图（柱状图 - 年度趋势）
     ============================================================ */
  function initEvidenceDistChart(dom, theme) {
    if (!dom || typeof echarts === 'undefined') return null;

    const chart = echarts.init(dom);
    const yearTrend = window._platformData.statistics.yearTrend;

    // 各专题的年度数据比例系数
    const ratios = {
      screening: 0.16,
      diagnosis: 0.13,
      treatment: 0.39,
      management: 0.14,
      hbvhcc: 0.18
    };
    const ratio = ratios[theme] || 0.2;

    chart.setOption({
      tooltip: {
        ...tooltipStyle,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: function(params) {
          return params[0].name + '年<br/>文献数量：<strong>' + params[0].value + '篇</strong>';
        }
      },
      grid: {
        left: 50,
        right: 20,
        top: 30,
        bottom: 30
      },
      xAxis: {
        type: 'category',
        data: yearTrend.map(d => d.year),
        axisLabel: {
          color: COLORS.ink500,
          fontSize: 11
        },
        axisLine: { lineStyle: { color: COLORS.ink200 } },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        name: '篇数',
        nameTextStyle: {
          color: COLORS.ink400,
          fontSize: 11
        },
        axisLabel: {
          color: COLORS.ink500,
          fontSize: 11
        },
        splitLine: {
          lineStyle: {
            color: COLORS.ink100,
            type: 'dashed'
          }
        }
      },
      series: [{
        type: 'bar',
        data: yearTrend.map(d => Math.round(d.count * ratio)),
        barWidth: '50%',
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: COLORS.primary },
            { offset: 1, color: COLORS.secondary }
          ]),
          borderRadius: [4, 4, 0, 0]
        },
        label: {
          show: true,
          position: 'top',
          color: COLORS.ink700,
          fontSize: 10,
          fontWeight: 500
        }
      }]
    });

    return chart;
  }

  /* ============================================================
     联盟KPI矩阵热力图
     ============================================================ */
  function initKPIHeatmap(dom) {
    if (!dom || typeof echarts === 'undefined') return null;

    const chart = echarts.init(dom);

    const dimensions = ['筛查覆盖', '诊断规范', '治疗可及', '病毒抑制', 'HCC监测', '患者管理'];
    const levels = ['国家级', '省级', '地市级', '县级', '基层'];

    // KPI达标率数据
    const data = [
      [0, 0, 95], [1, 0, 92], [2, 0, 88], [3, 0, 85], [4, 0, 80], [5, 0, 78],
      [0, 1, 85], [1, 1, 82], [2, 1, 78], [3, 1, 75], [4, 1, 70], [5, 1, 68],
      [0, 2, 65], [1, 2, 60], [2, 2, 55], [3, 2, 50], [4, 2, 45], [5, 2, 42],
      [0, 3, 45], [1, 3, 40], [2, 3, 35], [3, 3, 30], [4, 3, 25], [5, 3, 28],
      [0, 4, 25], [1, 4, 20], [2, 4, 18], [3, 4, 15], [4, 4, 12], [5, 4, 15]
    ];

    chart.setOption({
      tooltip: {
        ...tooltipStyle,
        position: 'top',
        formatter: function(params) {
          return `
            <div style="font-weight:600;">${levels[params.data[1]]} · ${dimensions[params.data[0]]}</div>
            <div>达标率：<strong>${params.data[2]}%</strong></div>
          `;
        }
      },
      grid: {
        left: 65,
        right: 20,
        top: 10,
        bottom: 50
      },
      xAxis: {
        type: 'category',
        data: dimensions,
        axisLabel: {
          color: COLORS.ink600,
          fontSize: 10,
          interval: 0,
          rotate: 30
        },
        axisLine: { lineStyle: { color: COLORS.ink200 } },
        axisTick: { show: false },
        splitArea: { show: false }
      },
      yAxis: {
        type: 'category',
        data: levels,
        axisLabel: {
          color: COLORS.ink600,
          fontSize: 11
        },
        axisLine: { lineStyle: { color: COLORS.ink200 } },
        axisTick: { show: false },
        splitArea: { show: false }
      },
      visualMap: {
        min: 10,
        max: 100,
        calculable: false,
        orient: 'horizontal',
        left: 'center',
        bottom: 5,
        itemWidth: 12,
        itemHeight: 100,
        textStyle: {
          color: COLORS.ink500,
          fontSize: 10
        },
        inRange: {
          color: [COLORS.ink200, COLORS.accentLight, COLORS.accent, COLORS.secondary, COLORS.primary]
        },
        text: ['高', '低'],
        textGap: 10
      },
      series: [{
        name: 'KPI达标率',
        type: 'heatmap',
        data: data,
        label: {
          show: true,
          color: '#fff',
          fontSize: 11,
          fontWeight: 600,
          formatter: function(params) {
            return params.data[2] + '%';
          }
        },
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 2,
          borderRadius: 4
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.3)'
          }
        }
      }]
    });

    return chart;
  }

  /* ============================================================
     文献年度趋势图（折线图）- 首页使用
     ============================================================ */
  function initYearTrendChart(dom) {
    if (!dom || typeof echarts === 'undefined') return null;

    const chart = echarts.init(dom);
    const data = window._platformData.statistics.yearTrend;

    chart.setOption({
      tooltip: {
        ...tooltipStyle,
        trigger: 'axis',
        formatter: function(params) {
          return params[0].name + '年<br/>新增文献：<strong>' + params[0].value + '篇</strong>';
        }
      },
      grid: {
        left: 50,
        right: 20,
        top: 30,
        bottom: 30
      },
      xAxis: {
        type: 'category',
        data: data.map(d => d.year),
        boundaryGap: false,
        axisLabel: { color: COLORS.ink500, fontSize: 11 },
        axisLine: { lineStyle: { color: COLORS.ink200 } },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        name: '篇数',
        nameTextStyle: { color: COLORS.ink400, fontSize: 11 },
        axisLabel: { color: COLORS.ink500, fontSize: 11 },
        splitLine: { lineStyle: { color: COLORS.ink100, type: 'dashed' } }
      },
      series: [{
        type: 'line',
        data: data.map(d => d.count),
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { width: 3, color: COLORS.primary },
        itemStyle: { color: COLORS.primary, borderColor: '#fff', borderWidth: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(0, 86, 145, 0.2)' },
            { offset: 1, color: 'rgba(0, 86, 145, 0.02)' }
          ])
        },
        label: {
          show: true,
          position: 'top',
          color: COLORS.ink700,
          fontSize: 11,
          fontWeight: 600
        }
      }]
    });

    return chart;
  }

  /* ============================================================
     证据等级分布饼图
     ============================================================ */
  function initLevelPieChart(dom) {
    if (!dom || typeof echarts === 'undefined') return null;

    const chart = echarts.init(dom);
    const data = window._platformData.statistics.levelDistribution;

    chart.setOption({
      tooltip: {
        ...tooltipStyle,
        trigger: 'item',
        formatter: '{b}级证据：{c}篇 ({d}%)'
      },
      legend: {
        bottom: 0,
        textStyle: { color: COLORS.ink600, fontSize: 12 }
      },
      series: [{
        type: 'pie',
        radius: ['45%', '68%'],
        center: ['50%', '45%'],
        itemStyle: { borderColor: '#fff', borderWidth: 3 },
        label: {
          show: true,
          position: 'outside',
          formatter: '{b}级\n{c}篇',
          color: COLORS.ink700,
          fontSize: 12,
          fontWeight: 600,
          lineHeight: 1.4
        },
        labelLine: { length: 12, length2: 10 },
        data: [
          { value: data.A, name: 'A', itemStyle: { color: COLORS.primary } },
          { value: data.B, name: 'B', itemStyle: { color: COLORS.secondary } },
          { value: data.C, name: 'C', itemStyle: { color: COLORS.ink300 } }
        ]
      }]
    });

    return chart;
  }

  /* ============================================================
     中国vs国际证据环形图
     ============================================================ */
  function initChinaIntlChart(dom) {
    if (!dom || typeof echarts === 'undefined') return null;

    const chart = echarts.init(dom);
    const data = window._platformData.statistics.chinaVsIntl;

    chart.setOption({
      tooltip: {
        ...tooltipStyle,
        trigger: 'item',
        formatter: '{b}：{c}篇 ({d}%)'
      },
      legend: {
        bottom: 0,
        textStyle: { color: COLORS.ink600, fontSize: 12 }
      },
      title: {
        text: '342',
        subtext: '中国证据',
        left: 'center',
        top: '38%',
        textStyle: {
          fontFamily: 'serif',
          fontSize: 28,
          fontWeight: 700,
          color: COLORS.primary
        },
        subtextStyle: {
          fontSize: 12,
          color: COLORS.ink500
        }
      },
      series: [{
        type: 'pie',
        radius: ['55%', '75%'],
        center: ['50%', '50%'],
        itemStyle: { borderColor: '#fff', borderWidth: 3 },
        label: { show: false },
        labelLine: { show: false },
        data: [
          { value: data.china, name: '中国研究', itemStyle: { color: COLORS.accent } },
          { value: data.international, name: '国际研究', itemStyle: { color: COLORS.primary } }
        ]
      }]
    });

    return chart;
  }

  /* ============================================================
     筛诊治管康分布柱状图
     ============================================================ */
  function initFieldBarChart(dom) {
    if (!dom || typeof echarts === 'undefined') return null;

    const chart = echarts.init(dom);
    const data = window._platformData.statistics.fieldDistribution;

    const categories = [
      { key: 'screening', name: '筛查', color: COLORS.primary },
      { key: 'diagnosis', name: '诊断', color: COLORS.secondary },
      { key: 'treatment', name: '治疗', color: '#6366f1' },
      { key: 'management', name: '管理/康复', color: '#8b5cf6' },
      { key: 'hbvhcc', name: 'HBV→HCC', color: COLORS.accent }
    ];

    chart.setOption({
      tooltip: {
        ...tooltipStyle,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: function(params) {
          return params[0].name + '<br/>文献数量：<strong>' + params[0].value + '篇</strong>';
        }
      },
      grid: {
        left: 60,
        right: 30,
        top: 20,
        bottom: 30
      },
      xAxis: {
        type: 'category',
        data: categories.map(c => c.name),
        axisLabel: { color: COLORS.ink600, fontSize: 12 },
        axisLine: { lineStyle: { color: COLORS.ink200 } },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        name: '文献数（篇）',
        nameTextStyle: { color: COLORS.ink400, fontSize: 11 },
        axisLabel: { color: COLORS.ink500, fontSize: 11 },
        splitLine: { lineStyle: { color: COLORS.ink100, type: 'dashed' } }
      },
      series: [{
        type: 'bar',
        data: categories.map(c => ({
          value: data[c.key],
          itemStyle: { color: c.color, borderRadius: [6, 6, 0, 0] }
        })),
        barWidth: '45%',
        label: {
          show: true,
          position: 'top',
          color: COLORS.ink700,
          fontSize: 12,
          fontWeight: 600
        }
      }]
    });

    return chart;
  }

  // 暴露全局函数
  window.initFunnelChart = initFunnelChart;
  window.initGapChart = initGapChart;
  window.initThemeDistChart = initThemeDistChart;
  window.initEvidenceDistChart = initEvidenceDistChart;
  window.initKPIHeatmap = initKPIHeatmap;
  window.initYearTrendChart = initYearTrendChart;
  window.initLevelPieChart = initLevelPieChart;
  window.initChinaIntlChart = initChinaIntlChart;
  window.initFieldBarChart = initFieldBarChart;

})();
