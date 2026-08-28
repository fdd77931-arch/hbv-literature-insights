const pptxgen = require("pptxgenjs");

let pres = new pptxgen();
pres.author = 'TRAE Work';
pres.title = '乙肝筛诊治康 · 市场部产品策略行动卡';

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
const CENTER_X = SLIDE_W / 2;
const CENTER_Y = SLIDE_H / 2;

// ============================================================
// CONTAINER SYSTEM
// ============================================================
function calculateScaledImageOpts(opts) {
  const { path, w: targetW, h: targetH, x = 0, y = 0, mode = 'cover', ...rest } = opts;
  if (!path || !targetW || !targetH) return opts;
  return { path, x, y, w: targetW, h: targetH, sizing: { type: mode, w: targetW, h: targetH }, ...rest };
}

function createVirtualNode(type, data, parentX, parentY) {
  const opts = data.opts || {};
  const node = {
    type, data,
    absX: parentX + (opts.x || 0),
    absY: parentY + (opts.y || 0),
    w: opts.w || 0, h: opts.h || 0,
    children: []
  };
  node.addShape = function(shapeType, opts = {}) {
    const child = createVirtualNode('shape', { shapeType, opts }, node.absX, node.absY);
    node.children.push(child);
    return child;
  };
  node.addText = function(text, opts = {}) {
    const safeOpts = { fit: "shrink", ...opts };
    const bulletRe = /^(?:[\u2022\u2023\u25E6\u2043\u2219\u00B7\u25CF\u25CB\u2013\u2014]\s*|\-\s+)/;
    if (Array.isArray(text)) {
      text = text.map(item => {
        if (item && item.options && item.options.bullet && typeof item.text === 'string') {
          return { ...item, text: item.text.replace(bulletRe, '') };
        }
        return item;
      });
    }
    const child = createVirtualNode('text', { text, opts: safeOpts }, node.absX, node.absY);
    node.children.push(child);
    return child;
  };
  node.addImage = function(opts = {}) {
    const scaledOpts = calculateScaledImageOpts(opts);
    const child = createVirtualNode('image', { opts: scaledOpts }, node.absX, node.absY);
    node.children.push(child);
    return child;
  };
  node.addTable = function(tableData, opts = {}) {
    const child = createVirtualNode('table', { tableData, opts }, node.absX, node.absY);
    node.children.push(child);
    return child;
  };
  return node;
}

function flattenNode(node, realSlide, pres) {
  const absOpts = { ...node.data.opts, x: node.absX, y: node.absY };
  if (node.type === 'shape') realSlide.addShape(node.data.shapeType, absOpts);
  else if (node.type === 'text') realSlide.addText(node.data.text, absOpts);
  else if (node.type === 'image') realSlide.addImage(absOpts);
  else if (node.type === 'table') realSlide.addTable(node.data.tableData, absOpts);
  node.children.forEach(child => flattenNode(child, realSlide, pres));
}

const originalAddSlide = pres.addSlide.bind(pres);
pres.addSlide = function(options) {
  const realSlide = originalAddSlide(options);
  const virtualSlide = {
    children: [],
    _realSlide: realSlide,
    set background(val) { realSlide.background = val; },
    get background() { return realSlide.background; },
    addShape: function(shapeType, opts = {}) {
      const node = createVirtualNode('shape', { shapeType, opts }, 0, 0);
      this.children.push(node);
      return node;
    },
    addText: function(text, opts = {}) {
      const safeOpts = { fit: "shrink", ...opts };
      const node = createVirtualNode('text', { text, opts: safeOpts }, 0, 0);
      this.children.push(node);
      return node;
    },
    addImage: function(opts = {}) {
      const scaledOpts = calculateScaledImageOpts(opts);
      const node = createVirtualNode('image', { opts: scaledOpts }, 0, 0);
      this.children.push(node);
      return node;
    },
    addTable: function(tableData, opts = {}) {
      const node = createVirtualNode('table', { tableData, opts }, 0, 0);
      this.children.push(node);
      return node;
    },
    addChart: function(chartType, data, opts = {}) {
      realSlide.addChart(chartType, data, opts);
    },
    render: function() {
      this.children.forEach(child => flattenNode(child, realSlide, pres));
    }
  };
  return virtualSlide;
};

// ============================================================
// COLOR PALETTE (matching HTML report)
// ============================================================
const C = {
  primary: "00688F",
  primaryDark: "004A68",
  accent2: "C75D2C",
  accent3: "2D8659",
  ink: "1A2332",
  muted: "5A6C80",
  rule: "D4DDE5",
  bg: "F7F9FA",
  bg2: "EEF2F5",
  white: "FFFFFF",
  highBg: "FDF0EA",
  medBg: "EAF4F8",
  lowBg: "EAF5EF",
};

const FONT_HEAD = "Georgia";
const FONT_BODY = "Calibri";

// ============================================================
// HELPER: Strategy card slide
// ============================================================
function strategySlide(num, total, dimension, priority, title, basis, action) {
  let slide = pres.addSlide();
  slide.background = { color: C.bg };

  // Top accent bar
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: SLIDE_W, h: 0.08,
    fill: { color: C.primary }
  });

  // Priority tag
  let priColor, priBg, priLabel;
  if (priority === 'high') { priColor = C.accent2; priBg = C.highBg; priLabel = "高优先级"; }
  else if (priority === 'med') { priColor = C.primary; priBg = C.medBg; priLabel = "中优先级"; }
  else { priColor = C.accent3; priBg = C.lowBg; priLabel = "观察"; }

  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: CONTENT_X, y: 0.35, w: 1.2, h: 0.32,
    fill: { color: priBg }, line: { color: priColor, width: 1 },
    rectRadius: 0.04
  });
  slide.addText(priLabel, {
    x: CONTENT_X, y: 0.35, w: 1.2, h: 0.32,
    fontSize: 9, fontFace: FONT_BODY, color: priColor,
    align: "center", valign: "middle", bold: true
  });

  // Dimension tag
  slide.addText(dimension, {
    x: CONTENT_X + 1.35, y: 0.35, w: 1.5, h: 0.32,
    fontSize: 9, fontFace: FONT_BODY, color: C.muted,
    align: "left", valign: "middle"
  });

  // Page number
  slide.addText(num + " / " + total, {
    x: SLIDE_W - 1.2, y: 0.35, w: 0.7, h: 0.32,
    fontSize: 9, fontFace: FONT_BODY, color: C.muted,
    align: "right", valign: "middle"
  });

  // Title
  slide.addText(title, {
    x: CONTENT_X, y: 0.85, w: CONTENT_W, h: 0.55,
    fontSize: 24, fontFace: FONT_HEAD, color: C.ink,
    align: "left", valign: "top", bold: true,
    charSpacing: 1.5
  });

  // Divider line (subtle)
  slide.addShape(pres.shapes.RECTANGLE, {
    x: CONTENT_X, y: 1.5, w: 1.5, h: 0.03,
    fill: { color: priColor }
  });

  // Basis section
  let basisY = 1.75;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: CONTENT_X, y: basisY, w: 0.85, h: 0.3,
    fill: { color: C.primary }, rectRadius: 0.04
  });
  slide.addText("依 据", {
    x: CONTENT_X, y: basisY, w: 0.85, h: 0.3,
    fontSize: 10, fontFace: FONT_BODY, color: C.white,
    align: "center", valign: "middle", bold: true, charSpacing: 0.5
  });

  slide.addText(basis, {
    x: CONTENT_X, y: basisY + 0.4, w: CONTENT_W, h: 1.1,
    fontSize: 12, fontFace: FONT_BODY, color: C.ink,
    align: "left", valign: "top",
    lineSpacingMultiple: 1.4,
    autoFit: false, fit: "none"
  });

  // Action section
  let actionY = basisY + 1.65;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: CONTENT_X, y: actionY, w: 0.85, h: 0.3,
    fill: { color: C.accent3 }, rectRadius: 0.04
  });
  slide.addText("行 动", {
    x: CONTENT_X, y: actionY, w: 0.85, h: 0.3,
    fontSize: 10, fontFace: FONT_BODY, color: C.white,
    align: "center", valign: "middle", bold: true, charSpacing: 0.5
  });

  slide.addText(action, {
    x: CONTENT_X, y: actionY + 0.4, w: CONTENT_W, h: 1.2,
    fontSize: 12, fontFace: FONT_BODY, color: C.ink,
    align: "left", valign: "top",
    lineSpacingMultiple: 1.4,
    autoFit: false, fit: "none"
  });

  // Bottom bar
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: SLIDE_H - 0.06, w: SLIDE_W, h: 0.06,
    fill: { color: C.primary }
  });

  slide.render();
  return slide;
}

// ============================================================
// SLIDE 1: COVER
// ============================================================
let cover = pres.addSlide();
cover.background = { color: C.primaryDark };

cover.addShape(pres.shapes.RECTANGLE, {
  x: 0, y: 0, w: SLIDE_W, h: 0.15,
  fill: { color: C.accent2 }
});

cover.addText("乙肝筛诊治康", {
  x: 0.5, y: 1.2, w: 9, h: 0.8,
  fontSize: 40, fontFace: FONT_HEAD, color: C.white,
  align: "center", valign: "middle", bold: true,
  charSpacing: 2.5
});

cover.addText("市场部产品策略行动卡", {
  x: 0.5, y: 2.1, w: 9, h: 0.6,
  fontSize: 22, fontFace: FONT_HEAD, color: "B0D8E8",
  align: "center", valign: "middle",
  charSpacing: 1.5
});

cover.addShape(pres.shapes.RECTANGLE, {
  x: 3.5, y: 2.85, w: 3, h: 0.03,
  fill: { color: C.accent2 }
});

cover.addText("基于49篇国际文献与2条行业洞察的策略提炼", {
  x: 0.5, y: 3.1, w: 9, h: 0.4,
  fontSize: 13, fontFace: FONT_BODY, color: "8AB4C8",
  align: "center", valign: "middle"
});

// Priority summary tags
let tagY = 3.8;
let tagData = [
  { label: "高优先级 × 4", color: C.accent2 },
  { label: "中优先级 × 4", color: C.primary },
  { label: "观察 × 2", color: C.accent3 }
];
let tagW = 2.2;
let tagGap = 0.3;
let tagStartX = (SLIDE_W - (tagW * 3 + tagGap * 2)) / 2;
tagData.forEach((t, i) => {
  let tx = tagStartX + i * (tagW + tagGap);
  cover.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: tx, y: tagY, w: tagW, h: 0.4,
    fill: { color: C.primaryDark }, line: { color: t.color, width: 1.5 },
    rectRadius: 0.08
  });
  cover.addText(t.label, {
    x: tx, y: tagY, w: tagW, h: 0.4,
    fontSize: 11, fontFace: FONT_BODY, color: t.color,
    align: "center", valign: "middle", bold: true
  });
});

cover.addText("2026-08-27 · 中央市场部", {
  x: 0.5, y: 4.8, w: 9, h: 0.35,
  fontSize: 10, fontFace: FONT_BODY, color: "6A8FA3",
  align: "center", valign: "middle"
});

cover.addShape(pres.shapes.RECTANGLE, {
  x: 0, y: SLIDE_H - 0.14, w: SLIDE_W, h: 0.06,
  fill: { color: C.accent2 }
});

cover.render();

// ============================================================
// SLIDE 2: TABLE OF CONTENTS
// ============================================================
let toc = pres.addSlide();
toc.background = { color: C.bg };

toc.addShape(pres.shapes.RECTANGLE, {
  x: 0, y: 0, w: SLIDE_W, h: 0.08,
  fill: { color: C.primary }
});

toc.addText("策略行动卡目录", {
  x: CONTENT_X, y: 0.4, w: CONTENT_W, h: 0.5,
  fontSize: 28, fontFace: FONT_HEAD, color: C.ink,
  align: "left", valign: "middle", bold: true,
  charSpacing: 1.5
});

toc.addText("基于筛诊治康四维度文献洞察的10项策略行动建议", {
  x: CONTENT_X, y: 1.0, w: CONTENT_W, h: 0.35,
  fontSize: 12, fontFace: FONT_BODY, color: C.muted,
  align: "left", valign: "middle"
});

// Strategy list
let strategies = [
  { dim: "筛·治", pri: "high", title: "PegIFNα优势人群精准推广" },
  { dim: "筛·诊·康", pri: "high", title: "qHBsAg检测生态建设" },
  { dim: "治", pri: "high", title: "TAF在功能性治愈目标人群中的差异化定位" },
  { dim: "康", pri: "high", title: "HBsAg清除后HCC分层监测产品升级" },
  { dim: "治", pri: "med", title: "新药管线竞争监测与布局" },
  { dim: "康", pri: "med", title: "HCC风险分层监测产品升级" },
  { dim: "治·康", pri: "med", title: "停药后监测产品线与纤维化动态监测" },
  { dim: "治", pri: "med", title: "HCC免疫联合治疗市场强化" },
  { dim: "诊", pri: "low", title: "术语革新与监管沟通" },
  { dim: "治", pri: "low", title: "COVID-19疫苗与HBsAg消失的关联" },
];

let listStartY = 1.55;
let rowH = 0.37;
strategies.forEach((s, i) => {
  let ry = listStartY + i * rowH;
  let priColor = s.pri === 'high' ? C.accent2 : (s.pri === 'med' ? C.primary : C.accent3);
  let priText = s.pri === 'high' ? "高" : (s.pri === 'med' ? "中" : "观察");

  // Number circle
  toc.addShape(pres.shapes.OVAL, {
    x: CONTENT_X, y: ry, w: 0.28, h: 0.28,
    fill: { color: priColor }
  });
  toc.addText(String(i + 1), {
    x: CONTENT_X, y: ry, w: 0.28, h: 0.28,
    fontSize: 10, fontFace: FONT_BODY, color: C.white,
    align: "center", valign: "middle", bold: true
  });

  // Dimension tag
  toc.addText(s.dim, {
    x: CONTENT_X + 0.4, y: ry, w: 1.0, h: 0.28,
    fontSize: 9, fontFace: FONT_BODY, color: C.muted,
    align: "left", valign: "middle"
  });

  // Priority tag
  toc.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: CONTENT_X + 1.45, y: ry, w: 0.55, h: 0.28,
    fill: { color: priColor }, rectRadius: 0.04
  });
  toc.addText(priText, {
    x: CONTENT_X + 1.45, y: ry, w: 0.55, h: 0.28,
    fontSize: 8, fontFace: FONT_BODY, color: C.white,
    align: "center", valign: "middle", bold: true
  });

  // Title
  toc.addText(s.title, {
    x: CONTENT_X + 2.15, y: ry, w: 5.8, h: 0.28,
    fontSize: 12, fontFace: FONT_BODY, color: C.ink,
    align: "left", valign: "middle"
  });
});

toc.addShape(pres.shapes.RECTANGLE, {
  x: 0, y: SLIDE_H - 0.06, w: SLIDE_W, h: 0.06,
  fill: { color: C.primary }
});

toc.render();

// ============================================================
// SLIDES 3-6: HIGH PRIORITY (4 slides)
// ============================================================
const TOTAL = 10;

strategySlide(1, TOTAL, "筛 · 治", "high",
  "PegIFNα优势人群精准推广",
  "系统评价（115项研究）显示非活动性携带者HBsAg清除率57%、NAs经治患者21%，远高于初治患者5%。中国已有2个基于本土数据的预测模型（859例回顾性模型AUC=0.884 + GIFT前瞻性项目22中心）可工具化。联合中药方案是独立预测因素（OR=3.83），体现中国临床特色。",
  "将PegIFNα推广重心从\"广覆盖\"转向\"精准筛选优势人群\"；将预测模型开发为临床决策支持工具，作为医学教育核心抓手；联合中药方案（OR=3.83）可作为中国特色推广点。目标群体：非活动性携带者 + NAs经治患者。"
);

strategySlide(2, TOTAL, "筛 · 诊 · 治 · 康", "high",
  "qHBsAg检测生态建设",
  "西班牙全国调查显示qHBsAg检测实施率仅37.4%，基层缺口巨大（<200床医院0%）。临床需求认知不足（57.1%）是主要障碍。qHBsAg是停药决策、优势人群筛选、治疗监测、HCC风险分层的核心标志物，贯穿筛诊治康全链路。",
  "推动qHBsAg检测标准化方案下沉基层；配套医学教育（检测适应症、报告解读、临床决策路径）；评估SHBs、HBV RNA、HBcrAg等新型标志物检测产品布局，构建\"检测-解读-决策\"全链条教育体系。"
);

strategySlide(3, TOTAL, "治", "high",
  "TAF在功能性治愈目标人群中的差异化定位",
  "多中心倾向评分匹配研究（ETV n=491, TAF n=463，匹配后各334例）显示TAF组HBsAg下降幅度在4年内显著大于ETV组。优势在年龄<65岁、无肝硬化、基线HBsAg≥3.0 log IU/mL的患者中更显著。TAF和ETV均为中国医保覆盖一线药物。",
  "针对追求功能性治愈的年轻、无肝硬化患者，强化TAF在HBsAg动力学方面的优势教育；结合PegIFNα联合治疗路径，构建\"TAF抑制+PegIFNα清除\"的序贯治疗方案推广。需注意研究为观察性设计，未报告清除率。"
);

strategySlide(4, TOTAL, "康", "high",
  "HBsAg清除后HCC分层监测产品升级",
  "两篇顶级期刊编辑评论明确指出HBsAg清除后HCC风险仍在，需个体化分层监测；长期NAs抑制10年后是否可降级HCC监测仍存争议。36年队列研究（n=453）证实HBsAg清除与更好的长期肝脏预后相关。HCC监测产品需求不因功能性治愈推进而缩减。",
  "开发基于风险因素（年龄、肝硬化状态、HBV DNA整合、家族史）的HCC分层监测工具；将AFP+影像学推广从\"统一方案\"升级为\"个体化方案\"；利用36年队列数据作为功能性治愈理念推广的核心素材。"
);

// ============================================================
// SLIDES 5-8: MEDIUM PRIORITY (4 slides)
// ============================================================
strategySlide(5, TOTAL, "治", "med",
  "新药管线竞争监测与布局",
  "ASO/siRNA管线进展最快：Bepirovirsen（ASO，II期完成）、AHB-137（未缀合ASO，I期完成，HBsAg下降0.7-1.0 log10）、Xalnesiran（siRNA，II期，48%达NA停药标准）。衣壳抑制剂（ALG-001075）和单抗（mAb19-LS、HBVZ10）处于早期。联合治疗是共识方向。",
  "密切跟踪Bepirovirsen III期和中国亚组数据；评估ASO/siRNA与现有PegIFNα产品的互补/竞争关系；关注SPHERE试验（PegIFNα作为ASO/siRNA后挽救治疗）结果，可能为PegIFNα创造新适应症机会。"
);

strategySlide(6, TOTAL, "康", "med",
  "HCC风险分层监测产品升级",
  "HBsAg清除后HCC风险仍存在但需个体化分层；长期NAs抑制后是否降级监测存争议。HCC监测产品需求不因功能性治愈推进而缩减，反而需要从\"统一监测\"转向基于风险因素的个体化分层监测方案。",
  "开发基于风险因素（年龄、肝硬化状态、HBV DNA整合、家族史）的HCC监测分层工具；将AFP检测+影像学推广从\"统一方案\"升级为\"个体化方案\"；跟踪HCC风险预测模型研究进展。"
);

strategySlide(7, TOTAL, "治 · 康", "med",
  "停药后监测产品线与纤维化动态监测",
  "Xalnesiran停药后48%病毒学复发但60%维持停药——有限疗程范式催生停药后高敏检测需求。Peg-IFN联合NAs治疗42.98%患者纤维化改善，晚期纤维化/肝硬化组改善比例达95.00%。APRI/FIB-4可从\"一次性诊断\"升级为\"全程动态监测工具\"。",
  "布局停药后监测产品组合（高敏HBV DNA<10 IU/mL + qHBsAg动态 + ALT）；推动APRI/FIB-4在治疗后纤维化逆转监测中的应用；开发停药管理患者教育工具（发作识别、自我监测指征）。"
);

strategySlide(8, TOTAL, "治", "med",
  "HCC免疫联合治疗市场强化",
  "网络荟萃分析（17项III期RCT，12,727例）支持免疫+靶向联合优于索拉非尼。HBV病因亚组中Atezolizumab-Cabozantinib排名最高。中国已批准Sintilimab-BevSim和Camrelizumab-Rivoceranib，在OS上均优于索拉非尼。",
  "强化中国本土HCC免疫联合产品在HBV相关HCC中的差异化定位；开展真实世界研究验证中国患者疗效；关注HBV相关HCC的精准治疗生物标志物，推动个体化治疗决策。"
);

// ============================================================
// SLIDE 9: OBSERVATION ITEMS (2 items on one slide)
// ============================================================
let obsSlide = pres.addSlide();
obsSlide.background = { color: C.bg };

obsSlide.addShape(pres.shapes.RECTANGLE, {
  x: 0, y: 0, w: SLIDE_W, h: 0.08,
  fill: { color: C.accent3 }
});

obsSlide.addText("观察项 · 持续关注但暂不行动", {
  x: CONTENT_X, y: 0.4, w: CONTENT_W, h: 0.5,
  fontSize: 24, fontFace: FONT_HEAD, color: C.ink,
  align: "left", valign: "middle", bold: true,
  charSpacing: 1.5
});

obsSlide.addShape(pres.shapes.RECTANGLE, {
  x: CONTENT_X, y: 1.0, w: 1.5, h: 0.03,
  fill: { color: C.accent3 }
});

// Observation 1: left card
let cardW = 4.2;
let cardH = 3.3;
let cardY = 1.3;

// Card 1
obsSlide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: CONTENT_X, y: cardY, w: cardW, h: cardH,
  fill: { color: C.white }, line: { color: C.rule, width: 1 },
  rectRadius: 0.06, shadow: { type: 'outer', color: '00000020', blur: 4, offset: { x: 0, y: 2 } }
});
obsSlide.addShape(pres.shapes.RECTANGLE, {
  x: CONTENT_X, y: cardY, w: cardW, h: 0.06,
  fill: { color: C.accent3 }
});
obsSlide.addText("观察 1", {
  x: CONTENT_X + 0.2, y: cardY + 0.2, w: 1.5, h: 0.25,
  fontSize: 9, fontFace: FONT_BODY, color: C.accent3,
  align: "left", valign: "middle", bold: true, charSpacing: 0.5
});
obsSlide.addText("术语革新与监管沟通", {
  x: CONTENT_X + 0.2, y: cardY + 0.5, w: cardW - 0.4, h: 0.4,
  fontSize: 15, fontFace: FONT_HEAD, color: C.ink,
  align: "left", valign: "top", bold: true
});
obsSlide.addText("学术界提出用\"已解决的慢性感染\"替代\"功能性治愈\"，用\"持续控制\"替代\"部分治愈\"，而\"治愈\"仅保留用于清除或沉默所有cccDNA和整合HBV DNA。", {
  x: CONTENT_X + 0.2, y: cardY + 1.0, w: cardW - 0.4, h: 1.0,
  fontSize: 11, fontFace: FONT_BODY, color: C.muted,
  align: "left", valign: "top",
  lineSpacingMultiple: 1.4, autoFit: false, fit: "none"
});
obsSlide.addText("需持续关注是否被国际指南和中国指南采纳，提前准备话术转换和监管沟通策略，但暂不主动变更市场话术。", {
  x: CONTENT_X + 0.2, y: cardY + 2.1, w: cardW - 0.4, h: 0.8,
  fontSize: 11, fontFace: FONT_BODY, color: C.ink,
  align: "left", valign: "top",
  lineSpacingMultiple: 1.4, autoFit: false, fit: "none"
});

// Card 2
let card2X = CONTENT_X + cardW + 0.4;
obsSlide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: card2X, y: cardY, w: cardW, h: cardH,
  fill: { color: C.white }, line: { color: C.rule, width: 1 },
  rectRadius: 0.06, shadow: { type: 'outer', color: '00000020', blur: 4, offset: { x: 0, y: 2 } }
});
obsSlide.addShape(pres.shapes.RECTANGLE, {
  x: card2X, y: cardY, w: cardW, h: 0.06,
  fill: { color: C.accent3 }
});
obsSlide.addText("观察 2", {
  x: card2X + 0.2, y: cardY + 0.2, w: 1.5, h: 0.25,
  fontSize: 9, fontFace: FONT_BODY, color: C.accent3,
  align: "left", valign: "middle", bold: true, charSpacing: 0.5
});
obsSlide.addText("COVID-19疫苗与HBsAg消失的关联", {
  x: card2X + 0.2, y: cardY + 0.5, w: cardW - 0.4, h: 0.4,
  fontSize: 15, fontFace: FONT_HEAD, color: C.ink,
  align: "left", valign: "top", bold: true
});
obsSlide.addText("韩国中断时间序列分析（n=59,946）显示COVID-19疫苗接种后HBsAg消失率短暂升高（IRR=1.56），随后减弱。提示免疫调节可能影响HBV动力学。", {
  x: card2X + 0.2, y: cardY + 1.0, w: cardW - 0.4, h: 1.0,
  fontSize: 11, fontFace: FONT_BODY, color: C.muted,
  align: "left", valign: "top",
  lineSpacingMultiple: 1.4, autoFit: false, fit: "none"
});
obsSlide.addText("证据等级有限，暂作观察。若免疫调节可影响HBV动力学，可能为联合治疗策略提供新思路。中国广泛接种背景下需关注对HBsAg监测结果解读的影响。", {
  x: card2X + 0.2, y: cardY + 2.15, w: cardW - 0.4, h: 1.0,
  fontSize: 10, fontFace: FONT_BODY, color: C.ink,
  align: "left", valign: "top",
  lineSpacingMultiple: 1.3, autoFit: false, fit: "none"
});

obsSlide.addShape(pres.shapes.RECTANGLE, {
  x: 0, y: SLIDE_H - 0.06, w: SLIDE_W, h: 0.06,
  fill: { color: C.accent3 }
});

obsSlide.render();

// ============================================================
// SLIDE 10: CLOSING / SUMMARY
// ============================================================
let closing = pres.addSlide();
closing.background = { color: C.primaryDark };

closing.addShape(pres.shapes.RECTANGLE, {
  x: 0, y: 0, w: SLIDE_W, h: 0.15,
  fill: { color: C.accent2 }
});

closing.addText("四维总结", {
  x: 0.5, y: 0.5, w: 9, h: 0.5,
  fontSize: 26, fontFace: FONT_HEAD, color: C.white,
  align: "center", valign: "middle", bold: true,
  charSpacing: 1.5
});

let dims = [
  { label: "筛", text: "qHBsAg检测标准化 + 多维标志物组合 + HCC风险分层个体化" },
  { label: "诊", text: "中国数据预测模型工具化 + 新型标志物产品线 + 术语标准化" },
  { label: "治", text: "PegIFNα精准推广 + 新药竞争监测 + 联合方案定位" },
  { label: "康", text: "HCC分层监测 + 停药后监测 + 纤维化动态监测 + 长期预后数据赋能" }
];

let dimY = 1.2;
let dimH = 0.72;
dims.forEach((d, i) => {
  let dy = dimY + i * dimH;

  // Dimension label circle
  closing.addShape(pres.shapes.OVAL, {
    x: 0.8, y: dy, w: 0.5, h: 0.5,
    fill: { color: C.accent2 }
  });
  closing.addText(d.label, {
    x: 0.8, y: dy, w: 0.5, h: 0.5,
    fontSize: 16, fontFace: FONT_HEAD, color: C.white,
    align: "center", valign: "middle", bold: true
  });

  closing.addText(d.text, {
    x: 1.5, y: dy, w: 7.5, h: 0.5,
    fontSize: 12, fontFace: FONT_BODY, color: "C8DCE6",
    align: "left", valign: "middle",
    lineSpacingMultiple: 1.3
  });
});

closing.addShape(pres.shapes.RECTANGLE, {
  x: 3.5, y: 4.3, w: 3, h: 0.03,
  fill: { color: C.accent2 }
});

closing.addText("基于49篇文献 · 10项策略行动建议 · 中央市场部", {
  x: 0.5, y: 4.5, w: 9, h: 0.35,
  fontSize: 10, fontFace: FONT_BODY, color: "6A8FA3",
  align: "center", valign: "middle"
});

closing.addText("2026-08-27", {
  x: 0.5, y: 4.9, w: 9, h: 0.3,
  fontSize: 9, fontFace: FONT_BODY, color: "5A7A8E",
  align: "center", valign: "middle"
});

closing.addShape(pres.shapes.RECTANGLE, {
  x: 0, y: SLIDE_H - 0.14, w: SLIDE_W, h: 0.06,
  fill: { color: C.accent2 }
});

closing.render();

// ============================================================
// WRITE FILE
// ============================================================
pres.writeFile({ fileName: "hbv-strategy-cards.pptx" })
  .then(function() {
    console.log("PPT generated: hbv-strategy-cards.pptx");
  })
  .catch(function(err) {
    console.error("Error:", err);
  });
