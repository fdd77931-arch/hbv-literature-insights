(function() {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var accent3 = style.getPropertyValue('--accent3').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var bg2 = style.getPropertyValue('--bg2').trim();

  // --- Chart 1: Literature Field Distribution (Pie) ---
  var chart1 = echarts.init(document.getElementById('chart-field'), null, { renderer: 'svg' });
  chart1.setOption({
    animation: false,
    tooltip: { trigger: 'item', appendToBody: true, formatter: '{b}: {c}篇 ({d}%)' },
    legend: { bottom: 10, textStyle: { color: muted, fontSize: 12 } },
    series: [{
      type: 'pie',
      radius: ['35%', '60%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: true,
      itemStyle: { borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}\n{c}篇', color: ink, fontSize: 12, fontWeight: 600 },
      labelLine: { length: 15, length2: 10 },
      data: [
        { value: 32, name: 'HBV功能性治愈', itemStyle: { color: accent } },
        { value: 9, name: 'HBV现有治疗', itemStyle: { color: accent2 } },
        { value: 4, name: 'HBV→HCC', itemStyle: { color: accent3 } },
        { value: 3, name: 'HCC全病程', itemStyle: { color: '#8b6dc7' } },
        { value: 1, name: '指南与共识', itemStyle: { color: '#e0a040' } }
      ]
    }]
  });
  window.addEventListener('resize', function() { chart1.resize(); });

  // --- Chart 2: Secondary Topics (Horizontal Bar) ---
  var topicsData = [
    { name: 'HBsAg清除', count: 26 },
    { name: '生物标志物', count: 12 },
    { name: '联合治疗', count: 11 },
    { name: '核苷（酸）类似物', count: 10 },
    { name: '免疫调节', count: 10 },
    { name: '优势人群筛选', count: 9 },
    { name: '聚乙二醇干扰素', count: 8 },
    { name: 'siRNA/ASO', count: 7 },
    { name: '停药策略', count: 6 },
    { name: '真实世界研究', count: 5 },
    { name: '治疗性疫苗', count: 4 },
    { name: '特殊人群', count: 3 },
    { name: '衣壳抑制剂', count: 2 },
    { name: '肝癌风险预测', count: 2 },
    { name: '肝癌筛查与监测', count: 2 }
  ];
  topicsData.sort(function(a, b) { return a.count - b.count; });
  var chart2 = echarts.init(document.getElementById('chart-topics'), null, { renderer: 'svg' });
  chart2.setOption({
    animation: false,
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, appendToBody: true },
    grid: { left: 140, right: 40, top: 20, bottom: 30 },
    xAxis: { type: 'value', name: '篇数', nameTextStyle: { color: muted, fontSize: 11 }, axisLabel: { color: muted }, splitLine: { lineStyle: { color: rule } } },
    yAxis: { type: 'category', data: topicsData.map(function(d) { return d.name; }), axisLabel: { color: ink, fontSize: 12 }, axisLine: { lineStyle: { color: rule } } },
    series: [{
      type: 'bar',
      data: topicsData.map(function(d, i) {
        var color = d.count >= 20 ? accent : (d.count >= 10 ? accent2 : accent3);
        return { value: d.count, itemStyle: { color: color } };
      }),
      barWidth: '55%',
      label: { show: true, position: 'right', color: ink, fontSize: 12, fontWeight: 600 }
    }]
  });
  window.addEventListener('resize', function() { chart2.resize(); });

  // --- Chart 3: Biomarker Positioning (Scatter) ---
  var chart3 = echarts.init(document.getElementById('chart-biomarker'), null, { renderer: 'svg' });
  chart3.setOption({
    animation: false,
    tooltip: {
      trigger: 'item',
      appendToBody: true,
      formatter: function(p) {
        return p.data.name + '<br/>临床应用度: ' + p.data.value[0] + '<br/>创新性: ' + p.data.value[1] + '<br/>' + p.data.desc;
      }
    },
    grid: { left: 60, right: 40, top: 30, bottom: 50 },
    xAxis: { name: '临床应用成熟度 →', nameLocation: 'middle', nameGap: 30, nameTextStyle: { color: muted, fontSize: 11 }, min: 0, max: 100, axisLabel: { color: muted }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
    yAxis: { name: '创新性 →', nameLocation: 'middle', nameGap: 40, nameTextStyle: { color: muted, fontSize: 11 }, min: 0, max: 100, axisLabel: { color: muted }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
    series: [{
      type: 'scatter',
      symbolSize: function(data) { return data[2]; },
      data: [
        { name: 'qHBsAg', value: [80, 30, 40], desc: '治疗监测+停药决策+优势人群筛选', itemStyle: { color: accent } },
        { name: 'APRI/FIB-4', value: [75, 25, 35], desc: '非侵入性纤维化评估', itemStyle: { color: accent } },
        { name: 'HBsAg亚型(SHBs)', value: [35, 70, 35], desc: '停药后清除预测，补充qHBsAg', itemStyle: { color: accent2 } },
        { name: 'HBV RNA', value: [45, 65, 35], desc: '反映cccDNA转录活性', itemStyle: { color: accent2 } },
        { name: 'HBcrAg', value: [40, 60, 30], desc: '定义CHB阶段', itemStyle: { color: accent2 } },
        { name: 'BSC-cccDNA qPCR', value: [15, 85, 30], desc: '区分cccDNA与rcDNA', itemStyle: { color: accent3 } },
        { name: 'HBV DNA整合', value: [20, 80, 30], desc: 'HCC风险+HBsAg持续阳性机制', itemStyle: { color: accent3 } }
      ],
      label: { show: true, formatter: function(p) { return p.data.name; }, position: 'top', color: ink, fontSize: 11, fontWeight: 600 }
    }]
  });
  window.addEventListener('resize', function() { chart3.resize(); });

  // --- Chart 4: PegIFNα HBsAg Clearance Rates (Bar) ---
  var chart4 = echarts.init(document.getElementById('chart-pegifn'), null, { renderer: 'svg' });
  chart4.setOption({
    animation: false,
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, appendToBody: true, formatter: function(params) { return params[0].name + ': ' + params[0].value + '%'; } },
    grid: { left: 50, right: 40, top: 30, bottom: 60 },
    xAxis: { type: 'category', data: ['初治CHB', 'NAs经治患者', '儿童CHB', '总体', '非活动性\n携带者'], axisLabel: { color: ink, fontSize: 11, interval: 0 }, axisLine: { lineStyle: { color: rule } } },
    yAxis: { type: 'value', name: 'HBsAg清除率(%)', nameTextStyle: { color: muted, fontSize: 11 }, axisLabel: { color: muted }, splitLine: { lineStyle: { color: rule } } },
    series: [{
      type: 'bar',
      data: [
        { value: 5, itemStyle: { color: '#b0b8c0' } },
        { value: 21, itemStyle: { color: accent2 } },
        { value: 22, itemStyle: { color: accent2 } },
        { value: 16, itemStyle: { color: accent } },
        { value: 57, itemStyle: { color: accent3 } }
      ],
      barWidth: '45%',
      label: { show: true, position: 'top', color: ink, fontSize: 13, fontWeight: 700, formatter: '{c}%' },
      markLine: { silent: true, data: [{ yAxis: 16, lineStyle: { color: accent, type: 'dashed' }, label: { formatter: '总体均值 16%', color: accent, fontSize: 10 } }] }
    }]
  });
  window.addEventListener('resize', function() { chart4.resize(); });

  // --- Chart 5: New Drug Pipeline (Bubble) ---
  var chart5 = echarts.init(document.getElementById('chart-pipeline'), null, { renderer: 'svg' });
  chart5.setOption({
    animation: false,
    tooltip: {
      trigger: 'item',
      appendToBody: true,
      formatter: function(p) { return p.data.name + ' (' + p.data.stage + ')<br/>HBsAg下降幅度: ' + p.data.value[0] + ' log10<br/>研究阶段: ' + p.data.stage; }
    },
    grid: { left: 60, right: 150, top: 30, bottom: 50 },
    xAxis: { name: 'HBsAg下降/清除效果 →', nameLocation: 'middle', nameGap: 30, nameTextStyle: { color: muted, fontSize: 11 }, min: 0, max: 3.5, axisLabel: { color: muted }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
    yAxis: { type: 'category', data: ['临床前', 'I期', 'II期', 'III期', '获批'], axisLabel: { color: ink, fontSize: 11 }, axisLine: { lineStyle: { color: rule } } },
    series: [{
      type: 'scatter',
      symbolSize: 28,
      data: [
        { name: 'ALG-001075', value: [2.5, 0], stage: '临床前', itemStyle: { color: accent3 } },
        { name: 'HBVZ10', value: [2.0, 0], stage: '临床前', itemStyle: { color: accent3 } },
        { name: 'Nab-TAC', value: [1.5, 0], stage: '临床前', itemStyle: { color: accent3 } },
        { name: 'LGN', value: [1.0, 0], stage: '临床前', itemStyle: { color: accent3 } },
        { name: 'mAb19-LS', value: [1.1, 1], stage: 'I期', itemStyle: { color: accent2 } },
        { name: 'AHB-137', value: [1.0, 1], stage: 'I期', itemStyle: { color: accent2 } },
        { name: '治疗性疫苗', value: [0.3, 1], stage: 'I/II期', itemStyle: { color: accent2 } },
        { name: 'Bepirovirsen', value: [1.5, 2], stage: 'II期', itemStyle: { color: accent } },
        { name: 'Xalnesiran', value: [1.2, 2], stage: 'II期', itemStyle: { color: accent } },
        { name: 'PegIFNα', value: [0.5, 4], stage: '获批', itemStyle: { color: '#e0a040' } },
        { name: 'TAF/ETV', value: [0.2, 4], stage: '获批', itemStyle: { color: '#e0a040' } }
      ],
      label: { show: true, formatter: function(p) { return p.data.name; }, position: 'right', color: ink, fontSize: 10, fontWeight: 600 }
    }]
  });
  window.addEventListener('resize', function() { chart5.resize(); });

  // --- Chart 6: Product Opportunity Matrix (Scatter) ---
  var chart6 = echarts.init(document.getElementById('chart-matrix'), null, { renderer: 'svg' });
  chart6.setOption({
    animation: false,
    tooltip: {
      trigger: 'item',
      appendToBody: true,
      formatter: function(p) { return p.data.name + '<br/>市场价值: ' + p.data.value[0] + '<br/>实施难度: ' + p.data.value[1] + '<br/>' + p.data.desc; }
    },
    grid: { left: 60, right: 40, top: 40, bottom: 60 },
    xAxis: { name: '市场价值 →', nameLocation: 'middle', nameGap: 30, nameTextStyle: { color: muted, fontSize: 11 }, min: 0, max: 100, axisLabel: { color: muted }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
    yAxis: { name: '实施难度 ↑', nameLocation: 'middle', nameGap: 40, nameTextStyle: { color: muted, fontSize: 11 }, min: 0, max: 100, inverse: true, axisLabel: { color: muted }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
    series: [{
      type: 'scatter',
      symbolSize: function(data) { return data[2]; },
      data: [
        { name: 'PegIFNα优势人群推广', value: [85, 35, 45], desc: '高优先级·已有中国数据模型', itemStyle: { color: accent } },
        { name: 'qHBsAg检测生态建设', value: [80, 55, 42], desc: '高优先级·基层缺口大', itemStyle: { color: accent } },
        { name: 'TAF差异化定位', value: [70, 30, 38], desc: '高优先级·追求治愈目标人群', itemStyle: { color: accent } },
        { name: 'HCC分层监测升级', value: [78, 48, 42], desc: '高优先级·治愈后风险仍在', itemStyle: { color: accent } },
        { name: '新药管线竞争监测', value: [65, 40, 35], desc: '中优先级·ASO/siRNA进展快', itemStyle: { color: accent2 } },
        { name: '停药后监测产品线', value: [62, 52, 36], desc: '中优先级·有限疗程新需求', itemStyle: { color: accent2 } },
        { name: 'HCC免疫联合强化', value: [55, 45, 33], desc: '中优先级·本土产品有竞争力', itemStyle: { color: accent2 } },
        { name: '预测模型工具化', value: [75, 45, 38], desc: '中优先级·2个中国模型可用', itemStyle: { color: accent3 } },
        { name: '纤维化动态监测', value: [58, 48, 34], desc: '中优先级·APRI/FIB-4全程监测', itemStyle: { color: accent3 } },
        { name: '长期预后数据推广', value: [52, 25, 32], desc: '中优先级·36年队列证据', itemStyle: { color: accent3 } },
        { name: '术语标准化', value: [30, 25, 28], desc: '观察·暂不主动变更', itemStyle: { color: muted } },
        { name: 'COVID疫苗关联', value: [25, 70, 25], desc: '观察·证据等级有限', itemStyle: { color: muted } }
      ],
      label: { show: true, formatter: function(p) { return p.data.name; }, position: 'top', color: ink, fontSize: 10, fontWeight: 600 }
    }]
  });
  window.addEventListener('resize', function() { chart6.resize(); });

})();
