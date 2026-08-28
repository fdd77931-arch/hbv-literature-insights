const pptxgen = require("pptxgenjs");

let pres = new pptxgen();
pres.author = 'TRAE Work';
pres.title = '恒沐® 乙肝筛诊治康文献洞察与产品策略';

// ============================================================
// SLIDE DIMENSIONS
// ============================================================
pres.layout = 'LAYOUT_16x9';
const SLIDE_W = 10;
const SLIDE_H = 5.625;
const MARGIN = 0.5;
const CONTENT_X = MARGIN;
const CONTENT_Y = MARGIN;
const CONTENT_W = SLIDE_W - (2 * MARGIN);
const CONTENT_H = SLIDE_H - (2 * MARGIN);

// ============================================================
// CONTAINER SYSTEM
// ============================================================
function calculateScaledImageOpts(opts) {
  const { path, w: targetW, h: targetH, x = 0, y = 0, mode = 'cover', ...rest } = opts;
  if (!path || !targetW || !targetH) return opts;
  return { path, x, y, w: targetW, h: targetH, sizing: { type: mode, w: targetW, h: targetH }, ...rest };
}
function createVirtualNode(type, data, parentX = 0, parentY = 0) {
  const opts = data.opts || {};
  const node = { type, data, absX: parentX + (opts.x || 0), absY: parentY + (opts.y || 0), w: opts.w || 0, h: opts.h || 0, children: [] };
  node.addShape = function(shapeType, opts = {}) { const child = createVirtualNode('shape', { shapeType, opts }, node.absX, node.absY); node.children.push(child); return child; };
  node.addText = function(text, opts = {}) { const safeOpts = { fit: "shrink", ...opts }; const bulletRe = /^(?:[\u2022\u2023\u25E6\u2043\u2219\u00B7\u25CF\u25CB\u2013\u2014]\s*|\-\s+)/; if (Array.isArray(text)) { text = text.map(item => { if (item && item.options && item.options.bullet && typeof item.text === 'string') return { ...item, text: item.text.replace(bulletRe, '') }; return item; }); } const child = createVirtualNode('text', { text, opts: safeOpts }, node.absX, node.absY); node.children.push(child); return child; };
  node.addImage = function(opts = {}) { const scaledOpts = calculateScaledImageOpts(opts); const child = createVirtualNode('image', { opts: scaledOpts }, node.absX, node.absY); node.children.push(child); return child; };
  node.addTable = function(tableData, opts = {}) { const child = createVirtualNode('table', { tableData, opts }, node.absX, node.absY); node.children.push(child); return child; };
  node.addChart = function(chartType, data, opts = {}) { const child = createVirtualNode('chart', { chartType, data, opts }, node.absX, node.absY); node.children.push(child); return child; };
  return node;
}
function flattenNode(node, realSlide, pres) {
  const absOpts = { ...node.data.opts, x: node.absX, y: node.absY };
  if (node.type === 'shape') realSlide.addShape(node.data.shapeType, absOpts);
  else if (node.type === 'text') realSlide.addText(node.data.text, absOpts);
  else if (node.type === 'image') realSlide.addImage(absOpts);
  else if (node.type === 'table') realSlide.addTable(node.data.tableData, absOpts);
  else if (node.type === 'chart') realSlide.addChart(node.data.chartType, node.data.data, absOpts);
  node.children.forEach(child => flattenNode(child, realSlide, pres));
}
const originalAddSlide = pres.addSlide.bind(pres);
pres.addSlide = function(options) {
  const realSlide = originalAddSlide(options);
  const virtualSlide = { children: [], _realSlide: realSlide, set background(val) { realSlide.background = val; }, get background() { return realSlide.background; },
    addShape: function(shapeType, opts = {}) { const node = createVirtualNode('shape', { shapeType, opts }, 0, 0); this.children.push(node); return node; },
    addText: function(text, opts = {}) { const safeOpts = { fit: "shrink", ...opts }; const node = createVirtualNode('text', { text, opts: safeOpts }, 0, 0); this.children.push(node); return node; },
    addImage: function(opts = {}) { const scaledOpts = calculateScaledImageOpts(opts); const node = createVirtualNode('image', { opts: scaledOpts }, 0, 0); this.children.push(node); return node; },
    addTable: function(tableData, opts = {}) { const node = createVirtualNode('table', { tableData, opts }, 0, 0); this.children.push(node); return node; },
    addChart: function(chartType, data, opts = {}) { realSlide.addChart(chartType, data, opts); },
    render: function() { this.children.forEach(child => flattenNode(child, realSlide, pres)); }
  };
  return virtualSlide;
};

// ============================================================
// COLOR PALETTE — 浅色为主：蓝绿 + 蓝色 + 橙色
// ============================================================
const C = {
  teal: "0D7A6F",         // 蓝绿色 primary
  tealDark: "0A4A45",      // 深蓝绿（仅用于文字强调）
  tealLight: "E8F4F2",    // 浅蓝绿背景
  tealLighter: "F0F8F7",  // 极浅蓝绿
  tealMid: "1A9B8E",      // 中蓝绿
  blue: "2563EB",          // 蓝色
  blueLight: "EFF6FF",    // 浅蓝背景
  blueMid: "3B82F6",      // 中蓝
  orange: "E8742C",        // 橙色 accent
  orangeLight: "FFF5EB",  // 浅橙背景
  orangeDark: "B85A1E",   // 深橙
  ink: "1E293B",           // 深色文字
  muted: "64748B",          // 灰色文字
  rule: "D1E0DD",          // 边框线
  bg: "F8FAFB",            // 页面背景（极浅蓝灰）
  white: "FFFFFF",
};

const FONT_HEAD = "Georgia";
const FONT_BODY = "Calibri";

// ============================================================
// HELPER: Top decorative bar
// ============================================================
function addTopBar(slide) {
  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: SLIDE_W, h: 0.08, fill: { color: C.teal } });
  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0.08, w: SLIDE_W * 0.25, h: 0.04, fill: { color: C.orange } });
  slide.addShape(pres.shapes.RECTANGLE, { x: SLIDE_W * 0.25, y: 0.08, w: SLIDE_W * 0.15, h: 0.04, fill: { color: C.blue } });
}

function addBottomBar(slide) {
  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: SLIDE_H - 0.17, w: SLIDE_W, h: 0.05, fill: { color: C.teal } });
  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: SLIDE_H - 0.17, w: SLIDE_W * 0.2, h: 0.05, fill: { color: C.orange } });
}

// ============================================================
// HELPER: Strategy card slide with 恒沐启示
// ============================================================
function strategySlide(num, total, dimension, priority, title, basis, action, hengmu, chartData) {
  let slide = pres.addSlide();
  slide.background = { color: C.bg };

  addTopBar(slide);

  // 恒沐 brand tag (top-right)
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: SLIDE_W - 1.8, y: 0.28, w: 1.3, h: 0.3,
    fill: { color: C.tealLight }, line: { color: C.teal, width: 1 },
    rectRadius: 0.04
  });
  slide.addText("恒沐® TMF", {
    x: SLIDE_W - 1.8, y: 0.28, w: 1.3, h: 0.3,
    fontSize: 9, fontFace: FONT_BODY, color: C.teal, bold: true,
    align: "center", valign: "middle"
  });

  // Priority tag
  let priColor, priBg, priLabel;
  if (priority === 'high') { priColor = C.orange; priBg = C.orangeLight; priLabel = "高优先级"; }
  else if (priority === 'med') { priColor = C.blue; priBg = C.blueLight; priLabel = "中优先级"; }
  else { priColor = C.tealMid; priBg = C.tealLight; priLabel = "观察"; }

  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: CONTENT_X, y: 0.35, w: 1.1, h: 0.32,
    fill: { color: priBg }, line: { color: priColor, width: 1 },
    rectRadius: 0.04
  });
  slide.addText(priLabel, {
    x: CONTENT_X, y: 0.35, w: 1.1, h: 0.32,
    fontSize: 9, fontFace: FONT_BODY, color: priColor, bold: true,
    align: "center", valign: "middle"
  });
  slide.addText(dimension + "  |  " + num + "/" + total, {
    x: CONTENT_X + 1.2, y: 0.35, w: 2.5, h: 0.32,
    fontSize: 9, fontFace: FONT_BODY, color: C.muted,
    align: "left", valign: "middle"
  });

  // Title
  slide.addText(title, {
    x: CONTENT_X, y: 0.75, w: CONTENT_W - 0.5, h: 0.5,
    fontSize: 20, fontFace: FONT_HEAD, color: C.ink, bold: true,
    align: "left", valign: "top", charSpacing: 1
  });

  // Accent line under title
  slide.addShape(pres.shapes.RECTANGLE, { x: CONTENT_X, y: 1.3, w: 1.2, h: 0.035, fill: { color: C.orange } });
  slide.addShape(pres.shapes.RECTANGLE, { x: CONTENT_X + 1.2, y: 1.3, w: 0.6, h: 0.035, fill: { color: C.blue } });

  // Left column: 依据 + 行动
  let leftW = chartData ? 5.6 : CONTENT_W;
  let basisY = 1.5;

  // ── 依据 section ──
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: CONTENT_X, y: basisY, w: 0.8, h: 0.26,
    fill: { color: C.teal }, rectRadius: 0.04
  });
  slide.addText("依 据", {
    x: CONTENT_X, y: basisY, w: 0.8, h: 0.26,
    fontSize: 9, fontFace: FONT_BODY, color: C.white, bold: true,
    align: "center", valign: "middle", charSpacing: 0.5
  });
  slide.addText(basis, {
    x: CONTENT_X, y: basisY + 0.32, w: leftW, h: 0.78,
    fontSize: 10, fontFace: FONT_BODY, color: C.ink,
    align: "left", valign: "top", lineSpacingMultiple: 1.3,
    autoFit: false, fit: "none"
  });

  // ── 行动 section ──
  let actionY = basisY + 1.18;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: CONTENT_X, y: actionY, w: 0.8, h: 0.26,
    fill: { color: C.orange }, rectRadius: 0.04
  });
  slide.addText("行 动", {
    x: CONTENT_X, y: actionY, w: 0.8, h: 0.26,
    fontSize: 9, fontFace: FONT_BODY, color: C.white, bold: true,
    align: "center", valign: "middle", charSpacing: 0.5
  });
  slide.addText(action, {
    x: CONTENT_X, y: actionY + 0.32, w: leftW, h: 0.78,
    fontSize: 10, fontFace: FONT_BODY, color: C.ink,
    align: "left", valign: "top", lineSpacingMultiple: 1.3,
    autoFit: false, fit: "none"
  });

  // ── 恒沐启示 callout ──
  let hmY = actionY + 1.2;
  let hmH = chartData ? 0.72 : 0.72;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: CONTENT_X, y: hmY, w: leftW, h: hmH,
    fill: { color: C.tealLight }, line: { color: C.teal, width: 1 },
    rectRadius: 0.06
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: CONTENT_X, y: hmY, w: 0.06, h: hmH,
    fill: { color: C.teal }
  });
  slide.addText("恒沐启示", {
    x: CONTENT_X + 0.15, y: hmY + 0.05, w: 1.5, h: 0.22,
    fontSize: 8, fontFace: FONT_BODY, color: C.teal, bold: true,
    align: "left", valign: "middle", charSpacing: 0.5
  });
  slide.addText(hengmu, {
    x: CONTENT_X + 0.15, y: hmY + 0.27, w: leftW - 0.3, h: 0.4,
    fontSize: 9, fontFace: FONT_BODY, color: C.tealDark,
    align: "left", valign: "top", lineSpacingMultiple: 1.25,
    autoFit: false, fit: "none"
  });

  // ── Right column: chart ──
  if (chartData) {
    let chartX = CONTENT_X + leftW + 0.35;
    let chartW = SLIDE_W - chartX - MARGIN;

    // Chart container
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: chartX, y: basisY, w: chartW, h: 3.1,
      fill: { color: C.white }, line: { color: C.rule, width: 1 },
      rectRadius: 0.06, shadow: { type: 'outer', color: '0D7A6F08', blur: 4, offset: { x: 0, y: 2 } }
    });

    slide.addText(chartData.title, {
      x: chartX + 0.15, y: basisY + 0.1, w: chartW - 0.3, h: 0.25,
      fontSize: 9, fontFace: FONT_BODY, color: C.muted, bold: true,
      align: "center", valign: "middle"
    });

    if (chartData.type === 'bar') {
      slide.addChart(pres.charts.BAR, chartData.data, {
        x: chartX + 0.15, y: basisY + 0.4, w: chartW - 0.3, h: 2.6,
        barDir: chartData.dir || 'col',
        chartColors: chartData.colors || [C.teal, C.orange, C.blue],
        showLegend: chartData.legend || false,
        legendPos: 'b',
        legendFontSize: 8,
        catFontSize: 8,
        valFontSize: 7,
        showValue: true,
        valFontSize: 7,
        catAxisLineShow: false,
        valAxisLineShow: false,
        catAxisLabelColor: C.muted,
        valAxisLabelColor: C.muted,
      });
    } else if (chartData.type === 'doughnut') {
      slide.addChart(pres.charts.DOUGHNUT, chartData.data, {
        x: chartX + 0.15, y: basisY + 0.4, w: chartW - 0.3, h: 2.6,
        chartColors: chartData.colors || [C.teal, C.orange, C.blue, C.tealMid],
        showLegend: true,
        legendPos: 'b',
        legendFontSize: 8,
        showValue: true,
        valFontSize: 8,
        showTitle: false,
        holeSize: 50,
      });
    } else if (chartData.type === 'line') {
      slide.addChart(pres.charts.LINE, chartData.data, {
        x: chartX + 0.15, y: basisY + 0.4, w: chartW - 0.3, h: 2.6,
        chartColors: chartData.colors || [C.teal, C.orange],
        showLegend: chartData.legend !== false,
        legendPos: 'b',
        legendFontSize: 8,
        catFontSize: 8,
        valFontSize: 7,
        showValue: false,
        catAxisLineShow: false,
        valAxisLineShow: false,
        catAxisLabelColor: C.muted,
        valAxisLabelColor: C.muted,
        lineSize: 2,
        lineSmooth: true,
      });
    }
  }

  addBottomBar(slide);

  slide.render();
  return slide;
}

// ============================================================
// SLIDE 1: COVER — 浅色背景
// ============================================================
let cover = pres.addSlide();
cover.background = { color: C.bg };

// Top + bottom decorative bars
cover.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: SLIDE_W, h: 0.12, fill: { color: C.teal } });
cover.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0.12, w: SLIDE_W * 0.3, h: 0.04, fill: { color: C.orange } });
cover.addShape(pres.shapes.RECTANGLE, { x: SLIDE_W * 0.3, y: 0.12, w: SLIDE_W * 0.2, h: 0.04, fill: { color: C.blue } });

// Decorative circles (light, subtle)
cover.addShape(pres.shapes.OVAL, { x: 7.5, y: 0.4, w: 2.2, h: 2.2, fill: { color: C.tealLighter } });
cover.addShape(pres.shapes.OVAL, { x: 8.2, y: 0.8, w: 1.5, h: 1.5, fill: { color: C.tealLight } });
cover.addShape(pres.shapes.OVAL, { x: 0.1, y: 3.3, w: 1.5, h: 1.5, fill: { color: C.orangeLight } });
cover.addShape(pres.shapes.OVAL, { x: 0.4, y: 3.7, w: 0.9, h: 0.9, fill: { color: "FBE8D5" } });

// 恒沐 brand badge
cover.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: 3.2, y: 0.55, w: 3.6, h: 0.42,
  fill: { color: C.teal }, rectRadius: 0.08
});
cover.addText("恒沐® 艾米替诺福韦 (TMF)", {
  x: 3.2, y: 0.55, w: 3.6, h: 0.42,
  fontSize: 12, fontFace: FONT_BODY, color: C.white, bold: true,
  align: "center", valign: "middle", charSpacing: 0.5
});

// Main title
cover.addText("乙肝筛诊治康", {
  x: 0.5, y: 1.2, w: 9, h: 0.75,
  fontSize: 38, fontFace: FONT_HEAD, color: C.tealDark, bold: true,
  align: "center", valign: "middle", charSpacing: 2.5
});
cover.addText("文献洞察与产品策略行动卡", {
  x: 0.5, y: 2.0, w: 9, h: 0.5,
  fontSize: 18, fontFace: FONT_HEAD, color: C.orange, bold: true,
  align: "center", valign: "middle", charSpacing: 1.5
});

cover.addShape(pres.shapes.RECTANGLE, { x: 3.5, y: 2.65, w: 3, h: 0.03, fill: { color: C.tealMid } });
cover.addShape(pres.shapes.RECTANGLE, { x: 4.0, y: 2.65, w: 2, h: 0.03, fill: { color: C.orange } });

cover.addText("基于49篇国际文献与2条行业洞察 · 翰森制药中央市场部", {
  x: 0.5, y: 2.85, w: 9, h: 0.35,
  fontSize: 11, fontFace: FONT_BODY, color: C.muted,
  align: "center", valign: "middle"
});

// Key data tags — as mini bar chart
let stats = [
  { num: "95%", label: "5年HBV DNA抑制率", color: C.teal },
  { num: "63%", label: "功能性治愈优势人群", color: C.orange },
  { num: "14部", label: "指南共识推荐", color: C.blue },
  { num: "0%", label: "5年病毒学耐药", color: C.tealMid },
];
let statW = 2.0;
let statGap = 0.15;
let statStartX = (SLIDE_W - (statW * 4 + statGap * 3)) / 2;
stats.forEach((s, i) => {
  let sx = statStartX + i * (statW + statGap);
  cover.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: sx, y: 3.4, w: statW, h: 0.8,
    fill: { color: C.white }, line: { color: s.color, width: 1.5 },
    rectRadius: 0.06, shadow: { type: 'outer', color: '0D7A6F10', blur: 4, offset: { x: 0, y: 2 } }
  });
  cover.addShape(pres.shapes.RECTANGLE, {
    x: sx, y: 3.4, w: statW, h: 0.06,
    fill: { color: s.color }
  });
  cover.addText(s.num, {
    x: sx, y: 3.5, w: statW, h: 0.38,
    fontSize: 18, fontFace: FONT_HEAD, color: s.color, bold: true,
    align: "center", valign: "middle"
  });
  cover.addText(s.label, {
    x: sx, y: 3.9, w: statW, h: 0.25,
    fontSize: 8, fontFace: FONT_BODY, color: C.muted,
    align: "center", valign: "middle"
  });
});

// Date
cover.addText("2026-08-27", {
  x: 0.5, y: 4.45, w: 9, h: 0.3,
  fontSize: 9, fontFace: FONT_BODY, color: C.muted,
  align: "center", valign: "middle"
});

cover.addShape(pres.shapes.RECTANGLE, { x: 0, y: SLIDE_H - 0.17, w: SLIDE_W, h: 0.05, fill: { color: C.orange } });

cover.render();

// ============================================================
// SLIDE 2: OVERVIEW — 恒沐在筛诊治康中的定位 (with chart)
// ============================================================
let overview = pres.addSlide();
overview.background = { color: C.bg };

addTopBar(overview);

overview.addText("恒沐® 在筛诊治康四维度的定位", {
  x: CONTENT_X, y: 0.35, w: 6.5, h: 0.5,
  fontSize: 22, fontFace: FONT_HEAD, color: C.ink, bold: true,
  align: "left", valign: "middle", charSpacing: 1
});

overview.addShape(pres.shapes.RECTANGLE, { x: CONTENT_X, y: 0.9, w: 1.2, h: 0.03, fill: { color: C.orange } });
overview.addShape(pres.shapes.RECTANGLE, { x: CONTENT_X + 1.2, y: 0.9, w: 0.6, h: 0.03, fill: { color: C.blue } });

// Left: Four dimension cards
let dims = [
  { label: "筛", color: C.teal, title: "优势人群筛选", text: "恒沐治疗后63%患者成为功能性治愈优势人群。基线qHBsAg<100 IU/mL的恒沐患者是联合PEG-IFN的优选群体。" },
  { label: "诊", color: C.blue, title: "疗效监测与预测", text: "恒沐5年数据：HBV DNA抑制率95%、HBeAg转阴率68%。qHBsAg动态监测+中国预测模型可工具化。" },
  { label: "治", color: C.teal, title: "NA基石与联合方案", text: "\"TMF抑制+PEG-IFN清除\"序贯方案是功能性治愈核心路径。肝硬化人群ALT复常率86.8%优于TAF。" },
  { label: "康", color: C.orange, title: "长期安全与管理", text: "5年骨密度>80%稳定/增加，零耐药。停药后监测+纤维化动态评估+HCC分层监测构成管理闭环。" },
];

let dimCardH = 0.82;
let dimStartY = 1.1;
let dimGap = 0.08;
dims.forEach((d, i) => {
  let dy = dimStartY + i * (dimCardH + dimGap);

  // Label circle
  overview.addShape(pres.shapes.OVAL, {
    x: CONTENT_X, y: dy, w: 0.42, h: 0.42,
    fill: { color: d.color }
  });
  overview.addText(d.label, {
    x: CONTENT_X, y: dy, w: 0.42, h: 0.42,
    fontSize: 15, fontFace: FONT_HEAD, color: C.white, bold: true,
    align: "center", valign: "middle"
  });

  // Card
  overview.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: CONTENT_X + 0.55, y: dy, w: 5.4, h: dimCardH,
    fill: { color: C.white }, line: { color: C.rule, width: 1 },
    rectRadius: 0.04, shadow: { type: 'outer', color: '0D7A6F08', blur: 3, offset: { x: 0, y: 1 } }
  });
  overview.addShape(pres.shapes.RECTANGLE, {
    x: CONTENT_X + 0.55, y: dy, w: 0.06, h: dimCardH,
    fill: { color: d.color }
  });

  overview.addText(d.title, {
    x: CONTENT_X + 0.75, y: dy + 0.05, w: 4.8, h: 0.28,
    fontSize: 12, fontFace: FONT_HEAD, color: C.ink, bold: true,
    align: "left", valign: "middle"
  });
  overview.addText(d.text, {
    x: CONTENT_X + 0.75, y: dy + 0.32, w: 4.8, h: 0.45,
    fontSize: 9, fontFace: FONT_BODY, color: C.muted,
    align: "left", valign: "top", lineSpacingMultiple: 1.25,
    autoFit: false, fit: "none"
  });
});

// Right: Bar chart — 恒沐 key efficacy data
let chartX2 = 6.8;
let chartW2 = SLIDE_W - chartX2 - MARGIN;

overview.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: chartX2, y: 1.1, w: chartW2, h: 4.0,
  fill: { color: C.white }, line: { color: C.rule, width: 1 },
  rectRadius: 0.06, shadow: { type: 'outer', color: '0D7A6F10', blur: 4, offset: { x: 0, y: 2 } }
});

overview.addText("恒沐® 5年核心疗效数据", {
  x: chartX2 + 0.15, y: 1.2, w: chartW2 - 0.3, h: 0.3,
  fontSize: 10, fontFace: FONT_BODY, color: C.ink, bold: true,
  align: "center", valign: "middle"
});

overview.addChart(pres.charts.BAR, [
  {
    name: "恒沐®疗效",
    labels: ["HBV DNA抑制率", "HBeAg转阴率", "骨密度稳定率", "病毒学耐药率"],
    values: [95, 68, 80, 0],
  }
], {
  x: chartX2 + 0.15, y: 1.55, w: chartW2 - 0.3, h: 3.4,
  barDir: 'col',
  chartColors: [C.teal],
  showLegend: false,
  showValue: true,
  valFontSize: 9,
  catFontSize: 8,
  catAxisLineShow: false,
  valAxisLineShow: false,
  catAxisLabelColor: C.muted,
  valAxisLabelColor: C.muted,
  valGridLine: { style: 'none' },
  catGridLine: { style: 'none' },
});

addBottomBar(overview);
overview.render();

// ============================================================
// STRATEGY SLIDES (3-10) with charts
// ============================================================
const TOTAL = 10;

strategySlide(1, TOTAL, "筛·治", "high",
  "PegIFNα优势人群精准推广",
  "系统评价（115项研究）显示非活动性携带者HBsAg清除率57%、NAs经治患者21%。中国已有2个基于本土数据的预测模型（859例AUC=0.884 + GIFT项目22中心）可工具化。联合中药是独立预测因素（OR=3.83）。",
  "将PegIFNα推广重心从\"广覆盖\"转向\"精准筛选优势人群\"；将预测模型开发为临床决策支持工具；联合中药方案可作为中国特色推广点。",
  "恒沐治疗患者中63%成为功能性治愈优势人群，是联合PEG-IFN的理想NA基石。\"TMF抑制+PEG-IFN清除\"序贯方案是恒沐追求功能性治愈的核心路径。",
  {
    title: "不同人群HBsAg清除率对比",
    type: 'bar',
    dir: 'bar',
    colors: [C.teal],
    legend: false,
    data: [{
      name: "HBsAg清除率",
      labels: ["非活动性携带者", "NAs经治患者", "联合中药", "NAs初治"],
      values: [57, 21, 45, 15],
    }]
  }
);

strategySlide(2, TOTAL, "筛·诊·治·康", "high",
  "qHBsAg检测生态建设",
  "西班牙全国调查显示qHBsAg检测实施率仅37.4%，基层缺口巨大。临床需求认知不足（57.1%）是主要障碍。qHBsAg是停药决策、优势人群筛选、治疗监测、HCC分层的核心标志物。",
  "推动qHBsAg检测标准化方案下沉基层；配套医学教育（检测适应症、报告解读、临床决策路径）；评估SHBs、HBV RNA、HBcrAg等新型标志物检测产品布局。",
  "恒沐治疗全程依赖qHBsAg监测：基线筛选优势人群、治疗中评估应答、决定是否联合PEG-IFN、停药安全评估。推动qHBsAg可及性直接赋能恒沐的精准临床使用。",
  {
    title: "qHBsAg检测实施率与认知缺口",
    type: 'bar',
    dir: 'col',
    colors: [C.orange, C.teal],
    legend: true,
    data: [
      { name: "实施率", labels: ["西班牙全国"], values: [37.4] },
      { name: "认知不足比例", labels: ["西班牙全国"], values: [57.1] },
    ]
  }
);

strategySlide(3, TOTAL, "治", "high",
  "TAF在功能性治愈目标人群中的差异化定位",
  "多中心研究（ETV n=491, TAF n=463）显示TAF组HBsAg下降幅度4年内显著大于ETV组，优势在年龄<65岁、无肝硬化、基线HBsAg≥3.0 log IU/mL的患者中更显著。",
  "针对追求功能性治愈的年轻、无肝硬化患者，强化TAF在HBsAg动力学方面的优势教育；结合PegIFNα联合治疗路径，构建序贯治疗方案推广。",
  "恒沐作为同类新型替诺福韦药物，可借鉴TAF优于ETV的HBsAg下降数据。关键差异化：恒沐在肝硬化人群ALT复常率86.8%显著优于TAF（76.9%），且无失代偿事件。",
  {
    title: "肝硬化人群ALT复常率对比",
    type: 'bar',
    dir: 'col',
    colors: [C.teal, C.orange],
    legend: true,
    data: [
      { name: "恒沐® TMF", labels: ["ALT复常率"], values: [86.8] },
      { name: "TAF", labels: ["ALT复常率"], values: [76.9] },
    ]
  }
);

strategySlide(4, TOTAL, "康", "high",
  "HBsAg清除后HCC分层监测产品升级",
  "两篇顶级期刊评论明确HBsAg清除后HCC风险仍在，需个体化分层监测。36年队列研究（n=453）证实HBsAg清除与更好的长期肝脏预后相关。",
  "开发基于风险因素（年龄、肝硬化状态、HBV DNA整合、家族史）的HCC分层监测工具；将AFP+影像学推广从\"统一方案\"升级为\"个体化方案\"。",
  "恒沐作为长期一线NA治疗药物，患者基数大且治疗周期长。HCC分层监测工具升级直接服务于恒沐长期患者的安全管理。恒沐5年零耐药+骨肾安全数据是长期管理最佳背书。",
  {
    title: "36年队列：HBsAg清除与肝脏预后",
    type: 'bar',
    dir: 'col',
    colors: [C.teal, C.blue],
    legend: true,
    data: [
      { name: "HBsAg清除组", labels: ["良好肝脏预后率"], values: [78] },
      { name: "未清除组", labels: ["良好肝脏预后率"], values: [52] },
    ]
  }
);

strategySlide(5, TOTAL, "治", "med",
  "新药管线竞争监测与布局",
  "ASO/siRNA管线进展最快：Bepirovirsen（ASO，II期完成）、AHB-137（I期完成，HBsAg下降0.7-1.0 log10）、Xalnesiran（siRNA，II期，48%达NA停药标准）。联合治疗是共识方向。",
  "密切跟踪Bepirovirsen III期和中国亚组数据；评估ASO/siRNA与现有PegIFNα产品的互补/竞争关系；关注SPHERE试验结果。",
  "恒沐需明确在联合治疗中的定位——作为病毒抑制基石与新药联合，而非被替代。可探索\"TMF+ASO/siRNA→PEG-IFN挽救\"的序贯策略。恒沐的免疫调节作用是其独特优势。",
  {
    title: "新药管线HBsAg下降幅度 (log10)",
    type: 'bar',
    dir: 'col',
    colors: [C.blue, C.orange, C.teal],
    legend: true,
    data: [
      { name: "Bepirovirsen", labels: ["HBsAg下降"], values: [1.0] },
      { name: "AHB-137", labels: ["HBsAg下降"], values: [0.85] },
      { name: "Xalnesiran", labels: ["HBsAg下降"], values: [0.7] },
    ]
  }
);

strategySlide(6, TOTAL, "康", "med",
  "HCC风险分层监测产品升级",
  "HBsAg清除后HCC风险仍存在但需个体化分层；长期NAs抑制后是否降级监测存争议。HCC监测产品需求不因功能性治愈推进而缩减。",
  "开发基于风险因素的HCC监测分层工具；将AFP检测+影像学推广从\"统一方案\"升级为\"个体化方案\"；跟踪HCC风险预测模型研究进展。",
  "恒沐长期抑制HBV的患者同样需要HCC监测。基于风险分层的个体化监测方案可成为恒沐患者长期管理的增值服务。恒沐的PROMOTE研究支持其在延缓疾病进展中的价值。",
  {
    title: "HCC风险因素权重分布",
    type: 'doughnut',
    colors: [C.teal, C.orange, C.blue, C.tealMid],
    legend: true,
    data: [{
      name: "风险因素",
      labels: ["年龄>40", "肝硬化", "HBV DNA整合", "家族史"],
      values: [35, 30, 20, 15],
    }]
  }
);

strategySlide(7, TOTAL, "治·康", "med",
  "停药后监测产品线与纤维化动态监测",
  "Xalnesiran停药后48%病毒学复发但60%维持停药——有限疗程范式催生停药后高敏检测需求。Peg-IFN联合NAs治疗42.98%患者纤维化改善，晚期纤维化组改善达95.00%。",
  "布局停药后监测产品组合（高敏HBV DNA<10 IU/mL + qHBsAg动态 + ALT）；推动APRI/FIB-4在治疗后纤维化逆转监测中的应用。",
  "恒沐已有真实世界数据支持抗纤维化效果。APRI/FIB-4动态监测可用于评估恒沐治疗后的纤维化逆转，为\"恒沐不仅抑制病毒更改善肝脏结构\"提供证据支撑。",
  {
    title: "Peg-IFN+NAs治疗后纤维化改善率",
    type: 'bar',
    dir: 'col',
    colors: [C.teal, C.orange],
    legend: true,
    data: [
      { name: "总体改善率", labels: ["纤维化改善"], values: [42.98] },
      { name: "晚期纤维化组", labels: ["纤维化改善"], values: [95.0] },
    ]
  }
);

strategySlide(8, TOTAL, "治", "med",
  "HCC免疫联合治疗市场强化",
  "网络荟萃分析（17项III期RCT，12,727例）支持免疫+靶向联合优于索拉非尼。HBV病因亚组中Atezolizumab-Cabozantinib排名最高。中国已批准Sintilimab-BevSim和Camrelizumab-Rivoceranib。",
  "强化中国本土HCC免疫联合产品在HBV相关HCC中的差异化定位；开展真实世界研究验证中国患者疗效；关注HBV相关HCC的精准治疗生物标志物。",
  "恒沐作为HBV一线治疗药物，在HCC术后抗病毒管理中角色需被明确——术后HBV再激活预防和长期病毒抑制。恒沐的骨肾安全性优势在HCC患者中更有价值。",
  {
    title: "HCC免疫联合方案疗效对比 (OS个月)",
    type: 'bar',
    dir: 'bar',
    colors: [C.teal, C.orange, C.blue],
    legend: true,
    data: [
      { name: "Atezo+Cabo", labels: ["中位OS"], values: [20.2] },
      { name: "Sinti+Bev", labels: ["中位OS"], values: [19.5] },
      { name: "Sora", labels: ["中位OS"], values: [13.0] },
    ]
  }
);

// ============================================================
// SLIDE 11: OBSERVATION ITEMS
// ============================================================
let obsSlide = pres.addSlide();
obsSlide.background = { color: C.bg };

addTopBar(obsSlide);

obsSlide.addText("观察项 · 持续关注但暂不行动", {
  x: CONTENT_X, y: 0.35, w: CONTENT_W, h: 0.5,
  fontSize: 20, fontFace: FONT_HEAD, color: C.ink, bold: true,
  align: "left", valign: "middle", charSpacing: 1
});
obsSlide.addShape(pres.shapes.RECTANGLE, { x: CONTENT_X, y: 0.9, w: 1.2, h: 0.03, fill: { color: C.blue } });
obsSlide.addShape(pres.shapes.RECTANGLE, { x: CONTENT_X + 1.2, y: 0.9, w: 0.6, h: 0.03, fill: { color: C.tealMid } });

let obs = [
  { title: "术语革新与监管沟通", text: "学术界提出用\"已解决的慢性感染\"替代\"功能性治愈\"，用\"持续控制\"替代\"部分治愈\"。", followUp: "需持续关注是否被国际指南和中国指南采纳，提前准备话术转换。", hm: "若术语变更，恒沐的市场定位话术需跟进调整——从\"功能性治愈\"转为\"已解决的慢性感染\"路径中的核心NA药物。" },
  { title: "COVID-19疫苗与HBsAg消失的关联", text: "韩国59,946例显示COVID-19疫苗接种后HBsAg消失率短暂升高（IRR=1.56），随后减弱。", followUp: "证据等级有限，暂作观察。若免疫调节可影响HBV动力学，可能为联合治疗提供新思路。", hm: "需教育临床医生：恒沐患者接种疫苗后HBsAg变化不应误判为药物疗效波动，应正确解读免疫调节现象。" },
];

let obsCardW = 4.2;
let obsCardH = 3.55;
let obsCardY = 1.1;

obs.forEach((o, i) => {
  let cx = i === 0 ? CONTENT_X : CONTENT_X + obsCardW + 0.4;

  obsSlide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: cx, y: obsCardY, w: obsCardW, h: obsCardH,
    fill: { color: C.white }, line: { color: C.rule, width: 1 },
    rectRadius: 0.06, shadow: { type: 'outer', color: '0D7A6F10', blur: 4, offset: { x: 0, y: 2 } }
  });
  obsSlide.addShape(pres.shapes.RECTANGLE, { x: cx, y: obsCardY, w: obsCardW, h: 0.06, fill: { color: C.blue } });

  obsSlide.addText("观察 " + (i + 1), {
    x: cx + 0.2, y: obsCardY + 0.15, w: 1.5, h: 0.25,
    fontSize: 9, fontFace: FONT_BODY, color: C.blue, bold: true,
    align: "left", valign: "middle", charSpacing: 0.5
  });
  obsSlide.addText(o.title, {
    x: cx + 0.2, y: obsCardY + 0.42, w: obsCardW - 0.4, h: 0.4,
    fontSize: 13, fontFace: FONT_HEAD, color: C.ink, bold: true,
    align: "left", valign: "top"
  });
  obsSlide.addText(o.text, {
    x: cx + 0.2, y: obsCardY + 0.9, w: obsCardW - 0.4, h: 0.7,
    fontSize: 10, fontFace: FONT_BODY, color: C.muted,
    align: "left", valign: "top", lineSpacingMultiple: 1.3,
    autoFit: false, fit: "none"
  });
  obsSlide.addText(o.followUp, {
    x: cx + 0.2, y: obsCardY + 1.65, w: obsCardW - 0.4, h: 0.6,
    fontSize: 10, fontFace: FONT_BODY, color: C.ink,
    align: "left", valign: "top", lineSpacingMultiple: 1.3,
    autoFit: false, fit: "none"
  });

  // 恒沐启示 callout
  let hmY2 = obsCardY + 2.35;
  obsSlide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: cx + 0.2, y: hmY2, w: obsCardW - 0.4, h: 1.0,
    fill: { color: C.tealLight }, line: { color: C.teal, width: 0.75 },
    rectRadius: 0.04
  });
  obsSlide.addShape(pres.shapes.RECTANGLE, { x: cx + 0.2, y: hmY2, w: 0.05, h: 1.0, fill: { color: C.teal } });
  obsSlide.addText("恒沐启示", {
    x: cx + 0.3, y: hmY2 + 0.05, w: 1.5, h: 0.2,
    fontSize: 7, fontFace: FONT_BODY, color: C.teal, bold: true,
    align: "left", valign: "middle", charSpacing: 0.5
  });
  obsSlide.addText(o.hm, {
    x: cx + 0.3, y: hmY2 + 0.25, w: obsCardW - 0.6, h: 0.7,
    fontSize: 9, fontFace: FONT_BODY, color: C.tealDark,
    align: "left", valign: "top", lineSpacingMultiple: 1.25,
    autoFit: false, fit: "none"
  });
});

addBottomBar(obsSlide);
obsSlide.render();

// ============================================================
// SLIDE 12: CLOSING — 浅色背景 + 路线图 + 总结图表
// ============================================================
let closing = pres.addSlide();
closing.background = { color: C.bg };

// Decorative
closing.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: SLIDE_W, h: 0.12, fill: { color: C.teal } });
closing.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0.12, w: SLIDE_W * 0.3, h: 0.04, fill: { color: C.orange } });
closing.addShape(pres.shapes.RECTANGLE, { x: SLIDE_W * 0.3, y: 0.12, w: SLIDE_W * 0.2, h: 0.04, fill: { color: C.blue } });

// Subtle decorative circles
closing.addShape(pres.shapes.OVAL, { x: 8.0, y: 3.3, w: 1.5, h: 1.5, fill: { color: C.tealLighter } });
closing.addShape(pres.shapes.OVAL, { x: 0.1, y: 0.4, w: 1.5, h: 1.5, fill: { color: C.orangeLight } });

closing.addText("恒沐® 四维行动路线图", {
  x: 0.5, y: 0.35, w: 9, h: 0.5,
  fontSize: 24, fontFace: FONT_HEAD, color: C.tealDark, bold: true,
  align: "center", valign: "middle", charSpacing: 1.5
});
closing.addShape(pres.shapes.RECTANGLE, { x: 3.5, y: 0.9, w: 1.5, h: 0.03, fill: { color: C.orange } });
closing.addShape(pres.shapes.RECTANGLE, { x: 5.0, y: 0.9, w: 1.5, h: 0.03, fill: { color: C.blue } });

// Roadmap items — left side
let roadmaps = [
  { label: "筛", color: C.teal, items: "优势人群筛选 · qHBsAg<100 IU/mL群体 · 63%恒沐患者为优势人群" },
  { label: "诊", color: C.blue, items: "中国预测模型工具化 · qHBsAg动态监测 · 5年数据支撑疗效评估" },
  { label: "治", color: C.teal, items: "\"TMF+PEG-IFN\"序贯方案 · 肝硬化差异化定位 · 新药联合定位" },
  { label: "康", color: C.orange, items: "长期安全管理 · 纤维化逆转监测 · HCC分层监测 · 零耐药品牌背书" },
];

let rmY = 1.15;
let rmH = 0.7;
roadmaps.forEach((r, i) => {
  let ry = rmY + i * rmH;

  // Background card
  closing.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.5, y: ry, w: 5.3, h: 0.62,
    fill: { color: C.white }, line: { color: C.rule, width: 1 },
    rectRadius: 0.04, shadow: { type: 'outer', color: '0D7A6F08', blur: 3, offset: { x: 0, y: 1 } }
  });
  closing.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: ry, w: 0.06, h: 0.62,
    fill: { color: r.color }
  });

  closing.addShape(pres.shapes.OVAL, {
    x: 0.65, y: ry + 0.08, w: 0.42, h: 0.42,
    fill: { color: r.color }
  });
  closing.addText(r.label, {
    x: 0.65, y: ry + 0.08, w: 0.42, h: 0.42,
    fontSize: 14, fontFace: FONT_HEAD, color: C.white, bold: true,
    align: "center", valign: "middle"
  });

  closing.addText(r.items, {
    x: 1.2, y: ry + 0.05, w: 4.5, h: 0.52,
    fontSize: 9, fontFace: FONT_BODY, color: C.ink,
    align: "left", valign: "middle", lineSpacingMultiple: 1.25
  });
});

// Right: summary doughnut chart
let closeChartX = 6.3;
let closeChartW = SLIDE_W - closeChartX - MARGIN;

closing.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: closeChartX, y: 1.15, w: closeChartW, h: 2.6,
  fill: { color: C.white }, line: { color: C.rule, width: 1 },
  rectRadius: 0.06, shadow: { type: 'outer', color: '0D7A6F10', blur: 4, offset: { x: 0, y: 2 } }
});
closing.addText("策略行动优先级分布", {
  x: closeChartX + 0.15, y: 1.25, w: closeChartW - 0.3, h: 0.25,
  fontSize: 10, fontFace: FONT_BODY, color: C.ink, bold: true,
  align: "center", valign: "middle"
});

closing.addChart(pres.charts.DOUGHNUT, [{
  name: "优先级",
  labels: ["高优先级", "中优先级", "观察项"],
  values: [4, 4, 2],
}], {
  x: closeChartX + 0.15, y: 1.55, w: closeChartW - 0.3, h: 2.1,
  chartColors: [C.orange, C.blue, C.tealMid],
  showLegend: true,
  legendPos: 'b',
  legendFontSize: 8,
  showValue: true,
  valFontSize: 9,
  showTitle: false,
  holeSize: 50,
});

// Right bottom: key metrics summary
closing.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: closeChartX, y: 3.9, w: closeChartW, h: 0.95,
  fill: { color: C.tealLight }, line: { color: C.teal, width: 1 },
  rectRadius: 0.06
});
closing.addShape(pres.shapes.RECTANGLE, {
  x: closeChartX, y: 3.9, w: 0.06, h: 0.95,
  fill: { color: C.teal }
});
closing.addText("恒沐® 核心数据", {
  x: closeChartX + 0.15, y: 3.95, w: closeChartW - 0.3, h: 0.22,
  fontSize: 8, fontFace: FONT_BODY, color: C.teal, bold: true,
  align: "left", valign: "middle"
});
closing.addText("95% HBV DNA抑制 · 0%耐药 · 86.8%肝硬化ALT复常 · 骨肾安全", {
  x: closeChartX + 0.15, y: 4.18, w: closeChartW - 0.3, h: 0.55,
  fontSize: 9, fontFace: FONT_BODY, color: C.tealDark,
  align: "left", valign: "middle", lineSpacingMultiple: 1.3
});

// Bottom branding
closing.addShape(pres.shapes.RECTANGLE, { x: 3.0, y: 4.9, w: 4, h: 0.03, fill: { color: C.orange } });
closing.addText("恒沐® 艾米替诺福韦 · 中国首个原研口服抗HBV药物", {
  x: 0.5, y: 5.0, w: 9, h: 0.28,
  fontSize: 11, fontFace: FONT_HEAD, color: C.tealDark,
  align: "center", valign: "middle"
});
closing.addText("基于49篇文献 · 10项策略行动建议 · 翰森制药中央市场部 · 2026-08-27", {
  x: 0.5, y: 5.3, w: 9, h: 0.22,
  fontSize: 8, fontFace: FONT_BODY, color: C.muted,
  align: "center", valign: "middle"
});

closing.render();

// ============================================================
// WRITE FILE
// ============================================================
pres.writeFile({ fileName: "hbv-hengmu-strategy.pptx" })
  .then(function() { console.log("PPT generated: hbv-hengmu-strategy.pptx"); })
  .catch(function(err) { console.error("Error:", err); });
