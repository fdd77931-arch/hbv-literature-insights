const pptxgen = require("pptxgenjs");

let pres = new pptxgen();
pres.author = 'TRAE Work';
pres.title = '乙肝筛诊治康文献洞察报告';

pres.layout = 'LAYOUT_16x9';
const SLIDE_W = 10, SLIDE_H = 5.625;
const MARGIN = 0.5;
const CONTENT_X = MARGIN, CONTENT_Y = MARGIN;
const CONTENT_W = SLIDE_W - 2 * MARGIN;
const CONTENT_H = SLIDE_H - 2 * MARGIN;

// Container system
function calculateScaledImageOpts(opts) {
  const { path, w: tW, h: tH, x = 0, y = 0, mode = 'cover', ...rest } = opts;
  if (!path || !tW || !tH) return opts;
  return { path, x, y, w: tW, h: tH, sizing: { type: mode, w: tW, h: tH }, ...rest };
}
function createVirtualNode(type, data, pX = 0, pY = 0) {
  const o = data.opts || {};
  const n = { type, data, absX: pX + (o.x||0), absY: pY + (o.y||0), w: o.w||0, h: o.h||0, children: [] };
  n.addShape = function(t, opts={}) { const c = createVirtualNode('shape', {shapeType:t, opts}, n.absX, n.absY); n.children.push(c); return c; };
  n.addText = function(text, opts={}) { const so = { fit:"shrink", ...opts }; const c = createVirtualNode('text', {text, opts:so}, n.absX, n.absY); n.children.push(c); return c; };
  n.addImage = function(opts={}) { const so = calculateScaledImageOpts(opts); const c = createVirtualNode('image', {opts:so}, n.absX, n.absY); n.children.push(c); return c; };
  n.addTable = function(td, opts={}) { const c = createVirtualNode('table', {tableData:td, opts}, n.absX, n.absY); n.children.push(c); return c; };
  n.addChart = function(ct, d, opts={}) { const c = createVirtualNode('chart', {chartType:ct, data:d, opts}, n.absX, n.absY); n.children.push(c); return c; };
  return n;
}
function flattenNode(node, rs, pres) {
  const ao = { ...node.data.opts, x: node.absX, y: node.absY };
  if (node.type === 'shape') rs.addShape(node.data.shapeType, ao);
  else if (node.type === 'text') rs.addText(node.data.text, ao);
  else if (node.type === 'image') rs.addImage(ao);
  else if (node.type === 'table') rs.addTable(node.data.tableData, ao);
  else if (node.type === 'chart') rs.addChart(node.data.chartType, node.data.data, ao);
  node.children.forEach(c => flattenNode(c, rs, pres));
}
const _addSlide = pres.addSlide.bind(pres);
pres.addSlide = function(opts) {
  const rs = _addSlide(opts);
  const vs = { children: [], _rs: rs, set background(v) { rs.background = v; }, get background() { return rs.background; },
    addShape: function(t, o={}) { const n = createVirtualNode('shape', {shapeType:t, opts:o}, 0, 0); this.children.push(n); return n; },
    addText: function(t, o={}) { const so = {fit:"shrink",...o}; const n = createVirtualNode('text', {text:t, opts:so}, 0, 0); this.children.push(n); return n; },
    addImage: function(o={}) { const so = calculateScaledImageOpts(o); const n = createVirtualNode('image', {opts:so}, 0, 0); this.children.push(n); return n; },
    addTable: function(td, o={}) { const n = createVirtualNode('table', {tableData:td, opts:o}, 0, 0); this.children.push(n); return n; },
    addChart: function(ct, d, o={}) { rs.addChart(ct, d, o); },
    render: function() { this.children.forEach(c => flattenNode(c, rs, pres)); }
  };
  return vs;
};

// Colors from HTML
const C = {
  accent: "00688F", accent2: "C75D2C", accent3: "2D8659",
  ink: "1A2332", muted: "5A6C80", rule: "D4DDE5",
  bg: "F7F9FA", bg2: "EEF2F5", white: "FFFFFF",
};
const FH = "Georgia", FB = "Calibri";

function topBar(s) {
  s.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:SLIDE_W, h:0.08, fill:{color:C.accent} });
  s.addShape(pres.shapes.RECTANGLE, { x:0, y:0.08, w:SLIDE_W*0.25, h:0.04, fill:{color:C.accent2} });
}
function botBar(s) {
  s.addShape(pres.shapes.RECTANGLE, { x:0, y:SLIDE_H-0.17, w:SLIDE_W, h:0.05, fill:{color:C.accent} });
  s.addShape(pres.shapes.RECTANGLE, { x:0, y:SLIDE_H-0.17, w:SLIDE_W*0.2, h:0.05, fill:{color:C.accent2} });
}
function chLabel(s, label, title, y=0.35) {
  s.addText(label, { x:CONTENT_X, y:y, w:CONTENT_W, h:0.22, fontSize:9, fontFace:FB, color:C.accent, bold:true, align:"left", valign:"middle", charSpacing:1.5 });
  s.addText(title, { x:CONTENT_X, y:y+0.22, w:CONTENT_W, h:0.45, fontSize:24, fontFace:FH, color:C.ink, bold:true, align:"left", valign:"middle", charSpacing:1 });
  s.addShape(pres.shapes.RECTANGLE, { x:CONTENT_X, y:y+0.72, w:1.2, h:0.03, fill:{color:C.accent2} });
}

// ── SLIDE 1: COVER ──
let s1 = pres.addSlide();
s1.background = { color: C.accent };
s1.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:SLIDE_W, h:0.12, fill:{color:C.accent2} });
s1.addShape(pres.shapes.OVAL, { x:7.5, y:0.3, w:2.2, h:2.2, fill:{color:"004A68"} });
s1.addShape(pres.shapes.OVAL, { x:0.1, y:3.3, w:1.5, h:1.5, fill:{color:"004A68"} });
s1.addText("乙肝筛诊治康文献洞察报告", { x:0.5, y:1.2, w:9, h:0.8, fontSize:36, fontFace:FH, color:C.white, bold:true, align:"center", valign:"middle", charSpacing:2 });
s1.addText("基于49篇国际文献与行业洞察，面向中央市场部的产品策略分析", { x:0.5, y:2.1, w:9, h:0.5, fontSize:16, fontFace:FB, color:"B0D8E0", align:"center", valign:"middle" });
let tags = ["筛查","诊断","治疗","康复管理",'功能性治愈'];
let tw = 1.6, tg = 0.2, tsx = (SLIDE_W - (tw*5 + tg*4))/2;
tags.forEach((t,i) => {
  let tx = tsx + i*(tw+tg);
  s1.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:tx, y:2.8, w:tw, h:0.35, fill:{color:"005A78"}, line:{color:"0080A0", width:1}, rectRadius:0.15 });
  s1.addText(t, { x:tx, y:2.8, w:tw, h:0.35, fontSize:10, fontFace:FB, color:C.white, bold:true, align:"center", valign:"middle" });
});
s1.addShape(pres.shapes.RECTANGLE, { x:3.5, y:3.5, w:3, h:0.03, fill:{color:C.accent2} });
s1.addText("数据来源：飞书多维表格 · HBV文献主表（49条）+ 行业洞察表（2条）· 2026-08-27", { x:0.5, y:3.7, w:9, h:0.3, fontSize:9, fontFace:FB, color:"80B0C0", align:"center", valign:"middle" });
s1.addText("翰森制药 · 中央市场部", { x:0.5, y:4.2, w:9, h:0.35, fontSize:14, fontFace:FH, color:C.white, bold:true, align:"center", valign:"middle" });
s1.addShape(pres.shapes.RECTANGLE, { x:0, y:SLIDE_H-0.17, w:SLIDE_W, h:0.05, fill:{color:C.accent2} });
s1.render();

// ── SLIDE 2: OVERVIEW ──
let s2 = pres.addSlide();
s2.background = { color: C.bg };
topBar(s2);
chLabel(s2, "报告概览", "文献库全景");
s2.addText("本报告基于飞书多维表格中的HBV文献主表（49条）和行业洞察表（2条），围绕乙肝的筛、诊、治、康四个维度提炼产品策略洞察。", { x:CONTENT_X, y:1.25, w:CONTENT_W, h:0.4, fontSize:11, fontFace:FB, color:C.muted, align:"left", valign:"top", lineSpacingMultiple:1.3, autoFit:false, fit:"none" });
let stats = [{n:"49",l:"文献总量",c:C.accent},{n:"32",l:"功能性治愈相关",c:C.accent2},{n:"12",l:"高中国市场相关",c:C.accent3},{n:"100%",l:"国际研究来源",c:C.accent}];
let sw=2.0, sg=0.2, ssx=(SLIDE_W-(sw*4+sg*3))/2;
stats.forEach((st,i) => {
  let sx = ssx+i*(sw+sg);
  s2.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:sx, y:1.8, w:sw, h:0.85, fill:{color:C.white}, line:{color:st.c, width:1.5}, rectRadius:0.06, shadow:{type:'outer',color:'D0E0E4',blur:4,offset:{x:0,y:2}} });
  s2.addShape(pres.shapes.RECTANGLE, { x:sx, y:1.8, w:sw, h:0.06, fill:{color:st.c} });
  s2.addText(st.n, { x:sx, y:1.9, w:sw, h:0.4, fontSize:24, fontFace:FH, color:st.c, bold:true, align:"center", valign:"middle" });
  s2.addText(st.l, { x:sx, y:2.32, w:sw, h:0.25, fontSize:9, fontFace:FB, color:C.muted, align:"center", valign:"middle" });
});
s2.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:CONTENT_X, y:2.95, w:CONTENT_W, h:1.6, fill:{color:"E8F0F2"}, line:{color:C.accent, width:1}, rectRadius:0.06 });
s2.addShape(pres.shapes.RECTANGLE, { x:CONTENT_X, y:2.95, w:0.06, h:1.6, fill:{color:C.accent} });
s2.addText("核心发现", { x:CONTENT_X+0.15, y:3.0, w:2, h:0.25, fontSize:8, fontFace:FB, color:C.accent, bold:true, align:"left", valign:"middle", charSpacing:1 });
s2.addText("文献库以HBV功能性治愈为绝对核心（65%），其中HBsAg清除（26篇）和新型生物标志物（12篇）是最高频主题。现有治疗优化和HBV→HCC监测是次要焦点。12篇标注中国市场相关性为'高'，主要集中在基于中国患者数据的研究。", { x:CONTENT_X+0.15, y:3.25, w:CONTENT_W-0.3, h:1.2, fontSize:11, fontFace:FB, color:C.ink, align:"left", valign:"top", lineSpacingMultiple:1.4, autoFit:false, fit:"none" });
botBar(s2);
s2.render();

// ── SLIDE 3: Chart 1 - Pie ──
let s3 = pres.addSlide();
s3.background = { color: C.bg };
topBar(s3);
chLabel(s3, "报告概览", "图1：文献一级领域分布");
s3.addChart(pres.charts.PIE, [{ name:"领域", labels:["HBV功能性治愈","HBV现有治疗","HBV→HCC","HCC全病程","指南与共识"], values:[32,9,4,3,1] }], {
  x:0.5, y:1.3, w:5, h:3.5,
  chartColors: [C.accent, C.accent2, C.accent3, "8B6DC7", "E0A040"],
  showLegend: true, legendPos: 'r', legendFontSize: 10,
  showValue: true, valFontSize: 10,
  showTitle: false, holeSize: 0,
  dataLabelColor: C.ink, dataLabelFontSize: 10,
});
s3.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:5.8, y:1.5, w:3.7, h:3, fill:{color:C.white}, line:{color:C.rule, width:1}, rectRadius:0.06, shadow:{type:'outer',color:'D0E0E4',blur:4,offset:{x:0,y:2}} });
s3.addText("关键洞察", { x:6.0, y:1.6, w:3.3, h:0.25, fontSize:9, fontFace:FB, color:C.accent, bold:true, align:"left", valign:"middle" });
s3.addText("功能性治愈占绝对主导（65%），是产品策略的核心战场。现有治疗优化（18%）和HCC监测（8%）构成次要焦点。", { x:6.0, y:1.9, w:3.3, h:0.9, fontSize:10, fontFace:FB, color:C.ink, align:"left", valign:"top", lineSpacingMultiple:1.35, autoFit:false, fit:"none" });
s3.addShape(pres.shapes.RECTANGLE, { x:6.0, y:2.9, w:3.3, h:0.02, fill:{color:C.rule} });
s3.addText("市场启示", { x:6.0, y:2.95, w:3.3, h:0.25, fontSize:9, fontFace:FB, color:C.accent2, bold:true, align:"left", valign:"middle" });
s3.addText("功能性治愈领域文献密度最高，意味着临床证据基础最雄厚，推广阻力最小。应将功能性治愈作为产品推广的核心叙事。", { x:6.0, y:3.2, w:3.3, h:1.2, fontSize:10, fontFace:FB, color:C.ink, align:"left", valign:"top", lineSpacingMultiple:1.35, autoFit:false, fit:"none" });
botBar(s3);
s3.render();

// ── SLIDE 4: Chart 2 - Bar ──
let s4 = pres.addSlide();
s4.background = { color: C.bg };
topBar(s4);
chLabel(s4, "报告概览", "图2：文献二级主题热力分布（Top 15）");
let topicsData = [["肝癌筛查与监测",2],["肝癌风险预测",2],["衣壳抑制剂",2],["特殊人群",3],["治疗性疫苗",4],["真实世界研究",5],["停药策略",6],["siRNA/ASO",7],["聚乙二醇干扰素",8],["优势人群筛选",9],["核苷（酸）类似物",10],["免疫调节",10],["联合治疗",11],["生物标志物",12],["HBsAg清除",26]];
s4.addChart(pres.charts.BAR, [{ name:"篇数", labels: topicsData.map(d=>d[0]), values: topicsData.map(d=>d[1]) }], {
  x:0.5, y:1.3, w:9, h:3.5,
  barDir: 'bar',
  chartColors: [C.accent],
  showLegend: false,
  showValue: true, valFontSize: 9,
  catFontSize: 9, catAxisLabelColor: C.ink,
  valFontSize: 8, valAxisLabelColor: C.muted,
  catAxisLineShow: false, valAxisLineShow: false,
  valGridLine: { style: 'none' },
  catGridLine: { style: 'none' },
});
botBar(s4);
s4.render();

// ── SLIDE 5: 筛 - qHBsAg + 优势人群 ──
let s5 = pres.addSlide();
s5.background = { color: C.bg };
topBar(s5);
chLabel(s5, "第一章 · 筛", "qHBsAg检测与优势人群筛选");
s5.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:CONTENT_X, y:1.25, w:4.2, h:1.5, fill:{color:C.white}, line:{color:C.rule, width:1}, rectRadius:0.06, shadow:{type:'outer',color:'D0E0E4',blur:3,offset:{x:0,y:1}} });
s5.addShape(pres.shapes.RECTANGLE, { x:CONTENT_X, y:1.25, w:0.06, h:1.5, fill:{color:C.accent} });
s5.addText("qHBsAg检测实施率仅37.4%", { x:CONTENT_X+0.15, y:1.3, w:3.9, h:0.25, fontSize:10, fontFace:FB, color:C.ink, bold:true, align:"left", valign:"middle" });
s5.addText("西班牙全国调查显示基层缺口巨大（<200床医院0%），认知不足（57.1%）是主要障碍。中国市场同样存在巨大缺口。", { x:CONTENT_X+0.15, y:1.55, w:3.9, h:1.1, fontSize:9, fontFace:FB, color:C.muted, align:"left", valign:"top", lineSpacingMultiple:1.3, autoFit:false, fit:"none" });
s5.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:CONTENT_X+4.5, y:1.25, w:4.5, h:1.5, fill:{color:C.white}, line:{color:C.rule, width:1}, rectRadius:0.06, shadow:{type:'outer',color:'D0E0E4',blur:3,offset:{x:0,y:1}} });
s5.addShape(pres.shapes.RECTANGLE, { x:CONTENT_X+4.5, y:1.25, w:0.06, h:1.5, fill:{color:C.accent2} });
s5.addText("多维预测指标组合", { x:CONTENT_X+4.65, y:1.3, w:4.2, h:0.25, fontSize:10, fontFace:FB, color:C.ink, bold:true, align:"left", valign:"middle" });
s5.addText("① 基线HBsAg<100 IU/mL（HR=0.32）\n② HBsAg亚型SHBs（HR 0.205）\n③ APRI/FIB-4纤维化分层\n④ HBV DNA整合检测", { x:CONTENT_X+4.65, y:1.55, w:4.2, h:1.1, fontSize:9, fontFace:FB, color:C.muted, align:"left", valign:"top", lineSpacingMultiple:1.3, autoFit:false, fit:"none" });
s5.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:CONTENT_X, y:3.0, w:CONTENT_W, h:1.5, fill:{color:"FBEAE0"}, line:{color:C.accent2, width:1}, rectRadius:0.06 });
s5.addShape(pres.shapes.RECTANGLE, { x:CONTENT_X, y:3.0, w:0.06, h:1.5, fill:{color:C.accent2} });
s5.addText("HCC监测策略", { x:CONTENT_X+0.15, y:3.05, w:3, h:0.25, fontSize:9, fontFace:FB, color:C.accent2, bold:true, align:"left", valign:"middle" });
s5.addText("HBsAg清除后HCC风险仍存在，'一刀切'监测不适用。需从'统一监测'转向基于风险分层的个体化监测方案。HCC监测产品需求不因功能性治愈推进而缩减，反而需要分层工具。", { x:CONTENT_X+0.15, y:3.3, w:CONTENT_W-0.3, h:1.1, fontSize:10, fontFace:FB, color:C.ink, align:"left", valign:"top", lineSpacingMultiple:1.35, autoFit:false, fit:"none" });
botBar(s5);
s5.render();

// ── SLIDE 6: 诊 - 生物标志物 ──
let s6 = pres.addSlide();
s6.background = { color: C.bg };
topBar(s6);
chLabel(s6, "第二章 · 诊", "新型生物标志物与预测模型");
let bioTable = [
  [{text:"标志物",options:{bold:true,fill:{color:C.accent},color:C.white}},{text:"临床定位",options:{bold:true,fill:{color:C.accent},color:C.white}},{text:"证据等级",options:{bold:true,fill:{color:C.accent},color:C.white}}],
  [{text:"qHBsAg",options:{bold:true}},{text:"治疗监测·停药决策·优势人群筛选",options:{}},{text:"高",options:{color:C.accent3,bold:true}}],
  [{text:"HBsAg亚型(SHBs)",options:{}},{text:"停药后清除预测",options:{}},{text:"中",options:{color:C.accent2}}],
  [{text:"HBV RNA",options:{}},{text:"反映cccDNA转录活性",options:{}},{text:"中",options:{color:C.accent2}}],
  [{text:"HBcrAg",options:{}},{text:"定义CHB阶段",options:{}},{text:"中",options:{color:C.accent2}}],
  [{text:"APRI/FIB-4",options:{bold:true}},{text:"非侵入性纤维化评估·全程监测",options:{}},{text:"高",options:{color:C.accent3,bold:true}}],
];
s6.addTable(bioTable, { x:CONTENT_X, y:1.25, w:5.2, colW:[1.5,2.7,1.0], rowH:0.35, fontSize:9, fontFace:FB, color:C.ink, border:{type:'solid',color:C.rule,pt:1}, valign:'middle' });
s6.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:5.9, y:1.25, w:3.6, h:1.5, fill:{color:"E8F2EC"}, line:{color:C.accent3, width:1}, rectRadius:0.06 });
s6.addShape(pres.shapes.RECTANGLE, { x:5.9, y:1.25, w:0.06, h:1.5, fill:{color:C.accent3} });
s6.addText("中国预测模型（n=859）", { x:6.05, y:1.3, w:3.3, h:0.25, fontSize:9, fontFace:FB, color:C.accent3, bold:true, align:"left", valign:"middle" });
s6.addText("纳入基线HBsAg、AST、联合中药、ETV方案四变量，AUC=0.884。联合中药是独立预测因素（OR=3.83）——中国临床特色。", { x:6.05, y:1.55, w:3.3, h:1.1, fontSize:9, fontFace:FB, color:C.ink, align:"left", valign:"top", lineSpacingMultiple:1.3, autoFit:false, fit:"none" });
s6.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:5.9, y:2.9, w:3.6, h:1.4, fill:{color:C.white}, line:{color:C.rule, width:1}, rectRadius:0.06 });
s6.addText("GIFT项目", { x:6.05, y:2.95, w:3.3, h:0.25, fontSize:9, fontFace:FB, color:C.accent, bold:true, align:"left", valign:"middle" });
s6.addText("中国22中心前瞻性，300例NAs经治患者。基于qHBsAg动力学预测指数（Pi）分层。假设清除率35% vs 20%。", { x:6.05, y:3.2, w:3.3, h:1.0, fontSize:9, fontFace:FB, color:C.muted, align:"left", valign:"top", lineSpacingMultiple:1.3, autoFit:false, fit:"none" });
s6.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:CONTENT_X, y:2.95, w:5.2, h:1.35, fill:{color:"E8F0F2"}, line:{color:C.accent, width:1}, rectRadius:0.06 });
s6.addText("术语革新趋势", { x:CONTENT_X+0.15, y:3.0, w:3, h:0.25, fontSize:9, fontFace:FB, color:C.accent, bold:true, align:"left", valign:"middle" });
s6.addText("'已解决的慢性感染'替代'功能性治愈'\n'持续控制'替代'部分治愈'\n→ 影响临床终点、监管沟通、市场话术", { x:CONTENT_X+0.15, y:3.25, w:4.9, h:0.95, fontSize:9, fontFace:FB, color:C.ink, align:"left", valign:"top", lineSpacingMultiple:1.3, autoFit:false, fit:"none" });
botBar(s6);
s6.render();

// ── SLIDE 7: Chart 4 - PegIFNα ──
let s7 = pres.addSlide();
s7.background = { color: C.bg };
topBar(s7);
chLabel(s7, "第三章 · 治", "图4：PegIFNα不同人群HBsAg清除率");
s7.addChart(pres.charts.BAR, [{ name:"清除率%", labels:["初治CHB","NAs经治患者","儿童CHB","总体","非活动性携带者"], values:[5,21,22,16,57] }], {
  x:0.5, y:1.3, w:5.5, h:3.5,
  barDir: 'col',
  chartColors: [C.accent],
  showLegend: false,
  showValue: true, valFontSize: 10,
  catFontSize: 9, catAxisLabelColor: C.ink,
  valFontSize: 8, valAxisLabelColor: C.muted,
  valAxisMinVal: 0, valAxisMaxVal: 65,
  catAxisLineShow: false, valAxisLineShow: false,
  valGridLine: { style: 'dash', color: C.rule },
  catGridLine: { style: 'none' },
});
s7.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:6.3, y:1.5, w:3.2, h:3, fill:{color:C.white}, line:{color:C.rule, width:1}, rectRadius:0.06, shadow:{type:'outer',color:'D0E0E4',blur:4,offset:{x:0,y:2}} });
s7.addText("市场策略", { x:6.5, y:1.6, w:2.8, h:0.25, fontSize:9, fontFace:FB, color:C.accent, bold:true, align:"left", valign:"middle" });
s7.addText("PegIFNα推广应聚焦优势人群——非活动性携带者（57%）和NAs经治患者（21%）是核心目标。中国非活动性携带者比例较高，市场潜力巨大。", { x:6.5, y:1.9, w:2.8, h:1.2, fontSize:10, fontFace:FB, color:C.ink, align:"left", valign:"top", lineSpacingMultiple:1.35, autoFit:false, fit:"none" });
s7.addShape(pres.shapes.RECTANGLE, { x:6.5, y:3.15, w:2.8, h:0.02, fill:{color:C.rule} });
s7.addText("关键数据", { x:6.5, y:3.2, w:2.8, h:0.25, fontSize:9, fontFace:FB, color:C.accent2, bold:true, align:"left", valign:"middle" });
s7.addText("115项研究荟萃分析\n总体清除率16%\n优势人群可达57%", { x:6.5, y:3.45, w:2.8, h:0.9, fontSize:10, fontFace:FB, color:C.ink, align:"left", valign:"top", lineSpacingMultiple:1.3, autoFit:false, fit:"none" });
botBar(s7);
s7.render();

// ── SLIDE 8: 治 - 新药管线 ──
let s8 = pres.addSlide();
s8.background = { color: C.bg };
topBar(s8);
chLabel(s8, "第三章 · 治", "新药管线与联合治疗");
let pipeTable = [
  [{text:"药物/平台",options:{bold:true,fill:{color:C.accent},color:C.white}},{text:"机制",options:{bold:true,fill:{color:C.accent},color:C.white}},{text:"阶段",options:{bold:true,fill:{color:C.accent},color:C.white}},{text:"核心数据",options:{bold:true,fill:{color:C.accent},color:C.white}}],
  [{text:"Bepirovirsen",options:{bold:true}},{text:"ASO",options:{}},{text:"II期完成",options:{color:C.accent,bold:true}},{text:"剂量依赖性HBsAg下降",options:{}}],
  [{text:"AHB-137",options:{bold:true}},{text:"未缀合ASO",options:{}},{text:"I期完成",options:{color:C.accent2,bold:true}},{text:"下降0.7-1.0 log10",options:{}}],
  [{text:"Xalnesiran",options:{bold:true}},{text:"siRNA",options:{}},{text:"II期",options:{color:C.accent,bold:true}},{text:"48%达NA停药标准",options:{}}],
  [{text:"治疗性疫苗",options:{}},{text:"病毒载体/蛋白",options:{}},{text:"I/II期",options:{color:C.accent2,bold:true}},{text:"联合siRNA+IFN≈50%清除",options:{}}],
];
s8.addTable(pipeTable, { x:CONTENT_X, y:1.25, w:5.8, colW:[1.2,1.3,0.9,2.4], rowH:0.4, fontSize:8, fontFace:FB, color:C.ink, border:{type:'solid',color:C.rule,pt:1}, valign:'middle' });
s8.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:6.5, y:1.25, w:3, h:1.7, fill:{color:"FBEAE0"}, line:{color:C.accent2, width:1}, rectRadius:0.06 });
s8.addShape(pres.shapes.RECTANGLE, { x:6.5, y:1.25, w:0.06, h:1.7, fill:{color:C.accent2} });
s8.addText("联合治疗是必由之路", { x:6.65, y:1.3, w:2.7, h:0.25, fontSize:9, fontFace:FB, color:C.accent2, bold:true, align:"left", valign:"middle" });
s8.addText("siRNA+PEG-IFN+疫苗联合方案报告约50% HBsAg丢失率——文献库最高清除率。单一产品效果有限。", { x:6.65, y:1.55, w:2.7, h:1.3, fontSize:9, fontFace:FB, color:C.ink, align:"left", valign:"top", lineSpacingMultiple:1.3, autoFit:false, fit:"none" });
s8.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:CONTENT_X, y:3.2, w:CONTENT_W, h:1.2, fill:{color:"E8F0F2"}, line:{color:C.accent, width:1}, rectRadius:0.06 });
s8.addShape(pres.shapes.RECTANGLE, { x:CONTENT_X, y:3.2, w:0.06, h:1.2, fill:{color:C.accent} });
s8.addText("停药策略与HCC治疗", { x:CONTENT_X+0.15, y:3.25, w:3, h:0.25, fontSize:9, fontFace:FB, color:C.accent, bold:true, align:"left", valign:"middle" });
s8.addText("Xalnesiran停药后60%维持停药，48%病毒学复发但均恢复。有限疗程范式催生停药后高敏检测需求。\nHCC免疫联合：17项RCT支持免疫+靶向优于索拉非尼，中国已批准Sintilimab-BevSim和Camrelizumab-Rivoceranib。", { x:CONTENT_X+0.15, y:3.5, w:CONTENT_W-0.3, h:0.85, fontSize:9, fontFace:FB, color:C.ink, align:"left", valign:"top", lineSpacingMultiple:1.3, autoFit:false, fit:"none" });
botBar(s8);
s8.render();

// ── SLIDE 9: 康 ──
let s9 = pres.addSlide();
s9.background = { color: C.bg };
topBar(s9);
chLabel(s9, "第四章 · 康", "康复管理与长期健康");
s9.addText("功能性治愈不等于'一劳永逸'——治愈后的健康管理需求不降反升", { x:CONTENT_X, y:1.15, w:CONTENT_W, h:0.3, fontSize:11, fontFace:FH, color:C.accent, bold:true, align:"left", valign:"middle" });
let kangItems = [
  { t:"HCC分层监测", d:"HBsAg清除后风险仍在，从'统一监测'转向风险分层个体化方案。年龄、肝硬化、HBV DNA整合、家族史为风险因素。", c:C.accent2 },
  { t:"停药后管理", d:"Xalnesiran停药后48%复发但60%维持停药。催生高敏HBV DNA<10 IU/mL + qHBsAg动态 + ALT监测产品组合。", c:C.accent },
  { t:"纤维化逆转", d:"Peg-IFN联合NAs治疗42.98%患者纤维化改善，晚期纤维化组达95%。APRI/FIB-4从诊断升级为全程动态监测工具。", c:C.accent3 },
  { t:"长期预后数据", d:"西班牙36年队列（n=453）：HBsAg清除与更好长期肝脏预后相关。可作为功能性治愈推广核心素材。", c:C.accent },
];
kangItems.forEach((it,i) => {
  let ky = 1.6 + i*0.88;
  s9.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:CONTENT_X, y:ky, w:CONTENT_W, h:0.8, fill:{color:C.white}, line:{color:C.rule, width:1}, rectRadius:0.04, shadow:{type:'outer',color:'E8F0F2',blur:3,offset:{x:0,y:1}} });
  s9.addShape(pres.shapes.RECTANGLE, { x:CONTENT_X, y:ky, w:0.06, h:0.8, fill:{color:it.c} });
  s9.addText(it.t, { x:CONTENT_X+0.15, y:ky+0.05, w:2, h:0.25, fontSize:11, fontFace:FH, color:it.c, bold:true, align:"left", valign:"middle" });
  s9.addText(it.d, { x:CONTENT_X+0.15, y:ky+0.3, w:CONTENT_W-0.3, h:0.45, fontSize:9, fontFace:FB, color:C.muted, align:"left", valign:"top", lineSpacingMultiple:1.25, autoFit:false, fit:"none" });
});
botBar(s9);
s9.render();

// ── SLIDE 10: 策略 - 高优先级 ──
let s10 = pres.addSlide();
s10.background = { color: C.bg };
topBar(s10);
chLabel(s10, "第五章 · 策略", "高优先级行动建议");
let highPri = [
  { t:"PegIFNα优势人群精准推广", d:"非活动性携带者清除率57%、NAs经治21%。已有2个中国预测模型可工具化。行动：从'广覆盖'转向精准筛选。", c:C.accent2 },
  { t:"qHBsAg检测生态建设", d:"实施率仅37.4%，贯穿筛诊治康全链路。行动：标准化方案下沉基层+医学教育+新型标志物布局。", c:C.accent2 },
  { t:"TAF差异化定位", d:"TAF在HBsAg下降方面优于ETV，优势在年轻无肝硬化患者。行动：构建'TAF抑制+PegIFNα清除'序贯方案推广。", c:C.accent2 },
  { t:"HCC分层监测产品升级", d:"HBsAg清除后HCC风险仍在。行动：开发风险分层工具，从'统一方案'升级为'个体化方案'。", c:C.accent2 },
];
highPri.forEach((it,i) => {
  let col = i % 2, row = Math.floor(i/2);
  let cx = CONTENT_X + col * 4.6;
  let cy = 1.25 + row * 1.75;
  s10.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:cx, y:cy, w:4.3, h:1.6, fill:{color:C.white}, line:{color:C.rule, width:1}, rectRadius:0.06, shadow:{type:'outer',color:'D0E0E4',blur:3,offset:{x:0,y:2}} });
  s10.addShape(pres.shapes.RECTANGLE, { x:cx, y:cy, w:4.3, h:0.06, fill:{color:it.c} });
  s10.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:cx+0.15, y:cy+0.15, w:0.8, h:0.25, fill:{color:"F5D8C8"}, line:{color:C.accent2, width:0.75}, rectRadius:0.04 });
  s10.addText("高优先级", { x:cx+0.15, y:cy+0.15, w:0.8, h:0.25, fontSize:7, fontFace:FB, color:C.accent2, bold:true, align:"center", valign:"middle" });
  s10.addText(it.t, { x:cx+0.15, y:cy+0.45, w:4.0, h:0.3, fontSize:11, fontFace:FH, color:C.ink, bold:true, align:"left", valign:"middle" });
  s10.addText(it.d, { x:cx+0.15, y:cy+0.75, w:4.0, h:0.8, fontSize:8, fontFace:FB, color:C.muted, align:"left", valign:"top", lineSpacingMultiple:1.25, autoFit:false, fit:"none" });
});
botBar(s10);
s10.render();

// ── SLIDE 11: 策略 - 中优先级 ──
let s11 = pres.addSlide();
s11.background = { color: C.bg };
topBar(s11);
chLabel(s11, "第五章 · 策略", "中优先级行动建议");
let medPri = [
  { t:"新药管线竞争监测", d:"ASO/siRNA进展最快。跟踪Bepirovirsen III期+中国亚组，评估互补/竞争关系。" },
  { t:"HCC风险分层监测", d:"从'统一方案'转向'个体化方案'，开发基于风险因素的HCC监测分层工具。" },
  { t:"停药后监测产品线", d:"布局高敏HBV DNA<10 + qHBsAg动态 + ALT组合，推动APRI/FIB-4纤维化逆转监测。" },
  { t:"HCC免疫联合治疗强化", d:"中国本土产品有竞争力，强化HBV相关HCC差异化定位+真实世界研究。" },
];
medPri.forEach((it,i) => {
  let col = i % 2, row = Math.floor(i/2);
  let cx = CONTENT_X + col * 4.6;
  let cy = 1.25 + row * 1.75;
  s11.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:cx, y:cy, w:4.3, h:1.6, fill:{color:C.white}, line:{color:C.rule, width:1}, rectRadius:0.06, shadow:{type:'outer',color:'D0E0E4',blur:3,offset:{x:0,y:2}} });
  s11.addShape(pres.shapes.RECTANGLE, { x:cx, y:cy, w:4.3, h:0.06, fill:{color:C.accent} });
  s11.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:cx+0.15, y:cy+0.15, w:0.8, h:0.25, fill:{color:"D5E5EA"}, line:{color:C.accent, width:0.75}, rectRadius:0.04 });
  s11.addText("中优先级", { x:cx+0.15, y:cy+0.15, w:0.8, h:0.25, fontSize:7, fontFace:FB, color:C.accent, bold:true, align:"center", valign:"middle" });
  s11.addText(it.t, { x:cx+0.15, y:cy+0.45, w:4.0, h:0.3, fontSize:11, fontFace:FH, color:C.ink, bold:true, align:"left", valign:"middle" });
  s11.addText(it.d, { x:cx+0.15, y:cy+0.75, w:4.0, h:0.8, fontSize:8, fontFace:FB, color:C.muted, align:"left", valign:"top", lineSpacingMultiple:1.25, autoFit:false, fit:"none" });
});
botBar(s11);
s11.render();

// ── SLIDE 12: 策略 - 观察项 ──
let s12 = pres.addSlide();
s12.background = { color: C.bg };
topBar(s12);
chLabel(s12, "第五章 · 策略", "观察项 · 持续关注但暂不行动");
let obs = [
  { t:"术语革新与监管沟通", d:"学术界提出用'已解决的慢性感染'替代'功能性治愈'。需持续关注是否被指南采纳，提前准备话术转换。" },
  { t:"COVID-19疫苗与HBsAg消失的关联", d:"韩国59,946例显示疫苗接种后HBsAg消失率短暂升高（IRR=1.56）。证据有限，暂作观察。" },
];
obs.forEach((it,i) => {
  let cx = CONTENT_X + i * 4.6;
  s12.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:cx, y:1.25, w:4.3, h:2.5, fill:{color:C.white}, line:{color:C.rule, width:1}, rectRadius:0.06, shadow:{type:'outer',color:'D0E0E4',blur:4,offset:{x:0,y:2}} });
  s12.addShape(pres.shapes.RECTANGLE, { x:cx, y:1.25, w:4.3, h:0.06, fill:{color:C.accent3} });
  s12.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:cx+0.15, y:1.4, w:0.6, h:0.25, fill:{color:"DCEBE0"}, line:{color:C.accent3, width:0.75}, rectRadius:0.04 });
  s12.addText("观察", { x:cx+0.15, y:1.4, w:0.6, h:0.25, fontSize:7, fontFace:FB, color:C.accent3, bold:true, align:"center", valign:"middle" });
  s12.addText(it.t, { x:cx+0.15, y:1.75, w:4.0, h:0.4, fontSize:12, fontFace:FH, color:C.ink, bold:true, align:"left", valign:"top" });
  s12.addText(it.d, { x:cx+0.15, y:2.2, w:4.0, h:1.4, fontSize:9, fontFace:FB, color:C.muted, align:"left", valign:"top", lineSpacingMultiple:1.35, autoFit:false, fit:"none" });
});
s12.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:CONTENT_X, y:4.0, w:CONTENT_W, h:0.55, fill:{color:"E8F0F2"}, line:{color:C.accent, width:1}, rectRadius:0.04 });
s12.addText("两个观察项均不影响当前行动节奏，但需保持跟踪，为未来话术调整和临床解读做好准备。", { x:CONTENT_X+0.15, y:4.05, w:CONTENT_W-0.3, h:0.45, fontSize:9, fontFace:FB, color:C.ink, align:"left", valign:"middle", lineSpacingMultiple:1.3 });
botBar(s12);
s12.render();

// ── SLIDE 13: Chart 6 - 产品机会矩阵 ──
let s13 = pres.addSlide();
s13.background = { color: C.bg };
topBar(s13);
chLabel(s13, "总结", "图6：筛诊治康全链路产品机会矩阵");
let matData = [
  { name:"PegIFNα推广", x:85, y:35 },
  { name:"qHBsAg生态", x:80, y:55 },
  { name:"TAF定位", x:70, y:30 },
  { name:"HCC分层监测", x:78, y:48 },
  { name:"新药管线监测", x:65, y:40 },
  { name:"停药监测", x:62, y:52 },
  { name:"HCC免疫联合", x:55, y:45 },
  { name:"预测模型工具化", x:75, y:45 },
  { name:"纤维化动态监测", x:58, y:48 },
  { name:"长期预后推广", x:52, y:25 },
];
s13.addChart(pres.charts.BAR, [{ name:"市场价值", labels:matData.map(d=>d.name), values:matData.map(d=>d.x) }], {
  x:0.5, y:1.3, w:9, h:3.5,
  barDir: 'bar',
  chartColors: [C.accent],
  showLegend: false,
  showValue: true, valFontSize: 8,
  catFontSize: 8, catAxisLabelColor: C.ink,
  valFontSize: 7, valAxisLabelColor: C.muted,
  catAxisLineShow: false, valAxisLineShow: false,
  valGridLine: { style: 'none' },
  catGridLine: { style: 'none' },
});
botBar(s13);
s13.render();

// ── SLIDE 14: 总结 ──
let s14 = pres.addSlide();
s14.background = { color: C.bg };
topBar(s14);
chLabel(s14, "总结", "四维核心结论");
let summary = [
  { l:"筛", c:C.accent, t:"检测标准化 + 预测模型工具化", d:"qHBsAg缺口大，多维标志物组合取代单一指标，HCC监测转向风险分层个体化。" },
  { l:"诊", c:C.accent2, t:"模型工具化 + 标志物检测 + 话术标准化", d:"2个中国本土模型可商业化，新型标志物从研究走向临床，术语体系正在革新。" },
  { l:"治", c:C.accent3, t:"PegIFNα精准推广 + 新药竞争监测 + 联合定位", d:"优势人群清除率57%，ASO/siRNA进展最快，联合治疗是必由之路，停药催生检测需求。" },
  { l:"康", c:C.accent, t:"分层监测 + 停药管理 + 纤维化动态 + 长期数据", d:"治愈≠一劳永逸，HCC风险仍在需分层监测，APRI/FIB-4升级全程监测，36年队列赋能推广。" },
];
summary.forEach((it,i) => {
  let ky = 1.2 + i*0.85;
  s14.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:CONTENT_X, y:ky, w:CONTENT_W, h:0.78, fill:{color:C.white}, line:{color:C.rule, width:1}, rectRadius:0.04, shadow:{type:'outer',color:'E8F0F2',blur:3,offset:{x:0,y:1}} });
  s14.addShape(pres.shapes.OVAL, { x:CONTENT_X, y:ky+0.12, w:0.42, h:0.42, fill:{color:it.c} });
  s14.addText(it.l, { x:CONTENT_X, y:ky+0.12, w:0.42, h:0.42, fontSize:16, fontFace:FH, color:C.white, bold:true, align:"center", valign:"middle" });
  s14.addText(it.t, { x:CONTENT_X+0.55, y:ky+0.05, w:8.5, h:0.28, fontSize:11, fontFace:FH, color:it.c, bold:true, align:"left", valign:"middle" });
  s14.addText(it.d, { x:CONTENT_X+0.55, y:ky+0.32, w:8.5, h:0.42, fontSize:9, fontFace:FB, color:C.muted, align:"left", valign:"top", lineSpacingMultiple:1.25, autoFit:false, fit:"none" });
});
s14.addShape(pres.shapes.RECTANGLE, { x:0, y:SLIDE_H-0.17, w:SLIDE_W, h:0.05, fill:{color:C.accent} });
s14.addShape(pres.shapes.RECTANGLE, { x:0, y:SLIDE_H-0.17, w:SLIDE_W*0.2, h:0.05, fill:{color:C.accent2} });
s14.render();

// ── SLIDE 15: CLOSING ──
let s15 = pres.addSlide();
s15.background = { color: C.accent };
s15.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:SLIDE_W, h:0.12, fill:{color:C.accent2} });
s15.addShape(pres.shapes.OVAL, { x:7.8, y:0.3, w:1.8, h:1.8, fill:{color:"004A68"} });
s15.addShape(pres.shapes.OVAL, { x:0.2, y:3.3, w:1.3, h:1.3, fill:{color:"004A68"} });
s15.addText("乙肝筛诊治康文献洞察报告", { x:0.5, y:1.0, w:9, h:0.6, fontSize:28, fontFace:FH, color:C.white, bold:true, align:"center", valign:"middle", charSpacing:1.5 });
s15.addShape(pres.shapes.RECTANGLE, { x:3.5, y:1.7, w:3, h:0.03, fill:{color:C.accent2} });
s15.addText("49篇文献 · 6张图表 · 10项策略行动建议", { x:0.5, y:1.9, w:9, h:0.4, fontSize:14, fontFace:FB, color:"B0D8E0", align:"center", valign:"middle" });
s15.addText("翰森制药 · 中央市场部 · 2026-08-27", { x:0.5, y:2.5, w:9, h:0.35, fontSize:11, fontFace:FB, color:"80B0C0", align:"center", valign:"middle" });
s15.addText("本报告由 Trae Work 基于飞书多维表格数据自动生成", { x:0.5, y:3.1, w:9, h:0.3, fontSize:9, fontFace:FB, color:"5A90A0", align:"center", valign:"middle" });
s15.addShape(pres.shapes.RECTANGLE, { x:0, y:SLIDE_H-0.17, w:SLIDE_W, h:0.05, fill:{color:C.accent2} });
s15.render();

// ── WRITE ──
pres.writeFile({ fileName: "hbv-insights-report.pptx" })
  .then(() => console.log("PPT generated: hbv-insights-report.pptx"))
  .catch(err => console.error("Error:", err));
