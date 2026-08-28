/* ============================================================
   2030肝病联盟战略洞察平台 - 应用主逻辑
   包含：Mock数据、页面路由、交互逻辑、数据渲染
   ============================================================ */

(function() {
  'use strict';

  /* ============================================================
     Mock 数据
     ============================================================ */

  // 统计数据
  let statistics = {
    totalLiterature: 986,
    chinaEvidence: 342,
    abEvidence: 417,
    goal2030Relevant: 623,
    topicsCount: 28,
    coreInsights: 47,
    yearRange: '2015-2026',
    lastUpdate: '2026年8月28日',
    fieldDistribution: {
      screening: 156,
      diagnosis: 128,
      treatment: 387,
      management: 142,
      hbvhcc: 173
    },
    levelDistribution: {
      A: 128,
      B: 289,
      C: 569
    },
    yearTrend: [
      { year: 2018, count: 52 },
      { year: 2019, count: 68 },
      { year: 2020, count: 89 },
      { year: 2021, count: 112 },
      { year: 2022, count: 145 },
      { year: 2023, count: 178 },
      { year: 2024, count: 198 },
      { year: 2025, count: 144 }
    ],
    chinaVsIntl: {
      china: 342,
      international: 644
    }
  };

  // 十大核心战略洞察
  let topInsights = [
    {
      id: 1,
      category: '筛查',
      title: '筛查覆盖率不足19%，是2030目标最大缺口',
      conclusion: '中国约8600万慢性HBV感染者中，已知晓率不足19%，远低于WHO 2030年90%诊断率目标。扩大筛查是第一要务。',
      keyNumber: '18.7',
      keyUnit: '%',
      evidenceLevel: 'A',
      goal2030meaning: '直接决定能否实现90%诊断率目标，是所有后续干预的前提',
      allianceAction: '建立全国HBV筛查登记系统，推动机会性筛查与主动筛查结合',
      evidenceCount: 47,
      detail: '基于全国血清流行病学调查数据，中国1-59岁人群HBsAg阳性率为5.1%，推算慢性HBV感染者约8600万。但疾病知晓率仅18.7%，约7000万感染者不知晓自身感染状态。筛查缺口是实现2030目标的第一道难关。'
    },
    {
      id: 2,
      category: '治疗',
      title: '治疗覆盖率仅10.8%，可及性亟待提升',
      conclusion: '仅约10.8%的符合治疗指征的慢性HBV患者接受了抗病毒治疗，距80%的2030目标差距巨大。',
      keyNumber: '10.8',
      keyUnit: '%',
      evidenceLevel: 'A',
      goal2030meaning: '80%治疗覆盖率是降低病死率的核心抓手，当前差距约70个百分点',
      allianceAction: '扩大基层治疗可及性，推行"检测即治疗"模式，简化治疗启动流程',
      evidenceCount: 62,
      detail: '据估算，中国约2800万慢性HBV患者需要抗病毒治疗，但实际接受治疗的仅约300万人，治疗覆盖率仅10.8%。基层医疗机构治疗能力不足、患者疾病认知低、药物可及性不均是三大主要原因。'
    },
    {
      id: 3,
      category: '功能性治愈',
      title: 'PegIFN优势人群HBsAg清除率可达30-50%',
      conclusion: '聚乙二醇干扰素α治疗优势人群（低HBsAg、高ALT）的HBsAg清除率显著高于普通人群，是实现功能性治愈的重要路径。',
      keyNumber: '30-50',
      keyUnit: '%',
      evidenceLevel: 'A',
      goal2030meaning: '功能性治愈可显著降低HCC风险，提升患者生存质量',
      allianceAction: '建立优势人群筛选标准，推广PegIFN个体化治疗方案',
      evidenceCount: 38,
      detail: '多项中国真实世界研究显示，经过优势人群筛选（HBsAg<1500 IU/mL、ALT升高）后使用PegIFNα治疗，48周HBsAg清除率可达30-50%，非活动性携带者人群甚至可达57%。精准的患者选择是提高治愈率的关键。'
    },
    {
      id: 4,
      category: 'HBV→HCC',
      title: 'HBV相关HCC占中国肝癌的80%，早诊率仅15%',
      conclusion: '约80%的肝细胞癌与HBV感染相关，但早期诊断率不足15%，5年生存率仅12-15%。',
      keyNumber: '15',
      keyUnit: '%',
      evidenceLevel: 'B',
      goal2030meaning: '提高HCC早诊率是降低65%病死率目标的关键',
      allianceAction: '建立HBV相关HCC高危人群登记与监测系统，推广AFP+超声联合筛查',
      evidenceCount: 54,
      detail: '中国每年新发HCC约41万例，其中约80%与HBV感染相关。由于缺乏规范化的高危人群监测，约85%的患者确诊时已处于中晚期，丧失了根治性治疗机会。规范的高危人群监测可将早诊率提高到40%以上。'
    },
    {
      id: 5,
      category: '诊断',
      title: '基层规范诊断率不足35%，无创评估普及度低',
      conclusion: '基层医疗机构慢乙肝规范诊断率不足35%，无创肝纤维化检测（FibroScan等）普及率低，影响治疗决策准确性。',
      keyNumber: '35',
      keyUnit: '%',
      evidenceLevel: 'B',
      goal2030meaning: '规范诊断是规范治疗的前提，直接影响治疗覆盖率和疗效',
      allianceAction: '统一诊断路径，推广APRI/FIB-4等无创评分，加强基层培训',
      evidenceCount: 31,
      detail: '调查显示，基层医疗机构对慢性HBV感染的诊断规范性不足35%，存在过度诊断和诊断不足并存的问题。肝纤维化评估是确定治疗时机的关键，但FibroScan等设备在基层普及率不足10%，APRI、FIB-4等无创评分的应用也不广泛。'
    },
    {
      id: 6,
      category: '管理/康复',
      title: '治疗1年依从率不足40%，全程管理缺失',
      conclusion: '慢乙肝患者抗病毒治疗1年依从率仅约40%，缺乏从医院到社区的连续化管理体系，是影响疗效的重要因素。',
      keyNumber: '40',
      keyUnit: '%',
      evidenceLevel: 'B',
      goal2030meaning: '提高治疗依从性可显著提升病毒抑制率，降低疾病进展风险',
      allianceAction: '建立全病程管理体系，推行患者自我管理+社区随访+医院质控的三级管理模式',
      evidenceCount: 28,
      detail: '真实世界研究显示，慢乙肝患者NA治疗1年依从率仅35-42%，2年停药率超过50%。不规范停药和漏服是导致病毒学突破和耐药的主要原因。缺乏有效的患者管理体系是依从性差的根本原因。'
    },
    {
      id: 7,
      category: '筛查',
      title: '母婴阻断成功率超99%，但成人筛查缺口大',
      conclusion: '中国乙肝母婴阻断成功率已达99%以上，但成人筛查覆盖率极低，是新发感染的主要来源。',
      keyNumber: '99',
      keyUnit: '%+',
      evidenceLevel: 'A',
      goal2030meaning: '母婴阻断成就显著，但成人防控仍是短板',
      allianceAction: '重点推进18-60岁人群筛查，特别是高危人群和重点地区',
      evidenceCount: 25,
      detail: '随着新生儿乙肝疫苗普遍接种，中国5岁以下儿童HBsAg阳性率已降至0.3%以下，母婴阻断成功率超过99%。但成人感染仍是主要问题，15-59岁人群HBsAg阳性率仍达6.1%，且绝大多数不知晓自身感染状态。'
    },
    {
      id: 8,
      category: '治疗',
      title: '新药研发加速，多种机制进入II/III期',
      conclusion: '全球乙肝新药研发快速推进，siRNA、ASO、衣壳抑制剂、免疫调节剂等多种机制药物进入II/III期临床，有望在2027-2030年陆续获批。',
      keyNumber: '30+',
      keyUnit: '在研',
      evidenceLevel: 'B',
      goal2030meaning: '新药上市将显著提升功能性治愈率，推动2030目标实现',
      allianceAction: '建立新药临床研究网络，提前布局中国人群数据和适应症',
      evidenceCount: 42,
      detail: '目前全球有30余种乙肝新药处于临床研发阶段，作用机制涵盖病毒进入抑制剂、siRNA/ASO、衣壳抑制剂、HBsAg释放抑制剂、免疫调节剂等。Bepirovirsen、Xalnesiran等核心药物已进入IIb/III期，有望在2027-2028年获批。'
    },
    {
      id: 9,
      category: '全国联盟',
      title: '分级诊疗联盟可提升基层诊疗能力30%+',
      conclusion: '通过建立分级诊疗联盟和远程医疗体系，基层医疗机构的肝病诊疗能力可提升30%以上，患者下转率提高50%。',
      keyNumber: '30',
      keyUnit: '%+',
      evidenceLevel: 'B',
      goal2030meaning: '联盟模式是弥合区域医疗差距、实现均质化服务的核心路径',
      allianceAction: '建设国家级-省级-地市级-县级四级肝病联盟体系',
      evidenceCount: 19,
      detail: '浙江、广东等地的肝病联盟试点显示，通过建立分级诊疗联盟、统一诊疗路径、开展远程会诊和培训，基层医疗机构的诊断准确率提升32%，治疗规范率提升38%，患者双向转诊率提升54%。联盟模式是提升整体医疗质量的有效手段。'
    },
    {
      id: 10,
      category: '2030目标',
      title: '中国有望在2030年基本实现消除肝炎目标',
      conclusion: '若全面落实扩大筛查、提高治疗覆盖率、加强HCC监测等综合措施，中国有望在2030年基本实现WHO消除肝炎目标。',
      keyNumber: '2030',
      keyUnit: '年',
      evidenceLevel: 'B',
      goal2030meaning: '综合干预模型显示，全链条干预可使诊断率达85%+、治疗率达75%+',
      allianceAction: '全面推进全国肝病联盟建设，落实五年行动路线图',
      evidenceCount: 15,
      detail: '基于数学模型的预测显示，如果从2025年开始全面实施扩大筛查、提高治疗覆盖率、加强HCC监测等综合干预措施，到2030年中国慢性HBV诊断率可达到85-90%，治疗覆盖率可达到75-80%，HBV相关病死率可下降约60-65%，基本实现WHO 2030消除肝炎目标。'
    }
  ];

  // 患者管理漏斗8个阶段
  let funnelStages = [
    {
      num: '01',
      name: '筛查',
      rate: 18.7,
      problem: '筛查覆盖率极低，80%+感染者不知晓',
      risk: '高脱落：绝大多数感染者未被发现',
      action: '扩大机会性筛查+主动筛查，建立筛查登记',
      kpi: '人群筛查覆盖率≥90%（2030）'
    },
    {
      num: '02',
      name: '阳性告知',
      rate: 85,
      problem: '阳性结果告知不及时，咨询不足',
      risk: '中脱落：约15%阳性者未得到有效告知',
      action: '规范检测后告知流程，提供咨询支持',
      kpi: '阳性结果告知率≥95%'
    },
    {
      num: '03',
      name: '确诊评估',
      rate: 50,
      problem: '基层诊断能力不足，评估不规范',
      risk: '高脱落：约50%阳性者未完成规范评估',
      action: '统一诊断路径，推广无创肝纤维化评估',
      kpi: '规范诊断率≥85%'
    },
    {
      num: '04',
      name: '治疗启动',
      rate: 40,
      problem: '治疗启动延迟，治疗意愿低',
      risk: '中高脱落：符合指征者中仅40%启动治疗',
      action: '推行Test & Treat模式，简化治疗启动',
      kpi: '符合指征患者治疗率≥80%（2030）'
    },
    {
      num: '05',
      name: '治疗留存',
      rate: 60,
      problem: '治疗依从性差，失访率高',
      risk: '中脱落：1年留存率约60%，2年不足50%',
      action: '建立患者管理体系，加强随访提醒',
      kpi: '治疗1年留存率≥90%'
    },
    {
      num: '06',
      name: '病毒抑制',
      rate: 85,
      problem: '耐药管理不规范，监测不足',
      risk: '低脱落：规范治疗者病毒抑制率达85%',
      action: '优选强效低耐药药物，定期监测',
      kpi: '病毒学应答率≥90%'
    },
    {
      num: '07',
      name: '功能性治愈',
      rate: 5,
      problem: '优势人群识别不足，治愈疗法应用少',
      risk: '当前比例低：PegIFN治疗者中约5-10%',
      action: '筛选优势人群，推广PegIFN个体化治疗',
      kpi: '优势人群治愈率≥30%'
    },
    {
      num: '08',
      name: 'HCC长期监测',
      rate: 20,
      problem: '高危人群监测率低，早诊率不足',
      risk: '高脱落：仅20%高危人群接受规律监测',
      action: '建立HCC高危人群登记，规范监测方案',
      kpi: '高危人群监测率≥70%，早诊率≥40%'
    }
  ];

  // 五大专题数据
  let themesData = {
    screening: {
      icon: '🔬',
      title: '筛查',
      desc: '扩大HBV筛查覆盖面，提升疾病知晓率',
      stats: { litCount: 156, chinaCount: 67, insights: 8 },
      insights: [
        '筛查覆盖率不足19%，是最大缺口',
        '机会性筛查是提高发现率的重要途径',
        'POCT快速检测适合基层推广应用',
        '母婴阻断成功率已达99%以上'
      ]
    },
    diagnosis: {
      icon: '🔍',
      title: '诊断',
      desc: '规范诊断评估，精准分型分期',
      stats: { litCount: 128, chinaCount: 45, insights: 6 },
      insights: [
        '基层规范诊断率不足35%',
        '无创肝纤维化评估普及度低',
        'qHBsAg检测对治疗决策价值大',
        'HBV RNA等新型生物标志物应用'
      ]
    },
    treatment: {
      icon: '💊',
      title: '治疗',
      desc: '扩大治疗可及，追求功能性治愈',
      stats: { litCount: 387, chinaCount: 134, insights: 12 },
      insights: [
        '治疗覆盖率仅10.8%，可及性亟待提升',
        'PegIFN优势人群HBsAg清除率可达30-50%',
        'NA长期治疗安全性和有效性良好',
        '新药研发加速，多种机制进入II/III期'
      ]
    },
    management: {
      icon: '🏥',
      title: '管理/康复',
      desc: '全程规范化管理，改善长期预后',
      stats: { litCount: 142, chinaCount: 52, insights: 7 },
      insights: [
        '治疗1年依从率不足40%',
        '全程管理缺失是主要瓶颈',
        '社区管理模式可显著提升依从性',
        '数字化管理工具有广阔应用前景'
      ]
    },
    hbvhcc: {
      icon: '🎯',
      title: 'HBV→HCC',
      desc: '肝癌早诊早治，降低病死率',
      stats: { litCount: 173, chinaCount: 83, insights: 9 },
      insights: [
        'HBV相关HCC占中国肝癌的80%',
        'HCC早诊率仅15%，5年生存率低',
        '抗病毒治疗可降低HCC风险50%+',
        'AFP+超声联合监测是标准方案'
      ]
    }
  };

  // 各专题洞察列表
  let themeInsights = {
    screening: [
      { num: 1, title: '人群HBsAg阳性率5.1%，约8600万感染者', content: '基于2020年全国血清流行病学调查，中国1-59岁人群HBsAg阳性率为5.1%，推算慢性HBV感染者约8600万人。', tags: ['A级证据', '流调数据', '全国'] },
      { num: 2, title: '疾病知晓率仅18.7%，筛查缺口巨大', content: '调查显示仅18.7%的慢性HBV感染者知晓自身感染状态，约7000万人处于未知状态。扩大筛查是当务之急。', tags: ['A级证据', '知晓率', '差距分析'] },
      { num: 3, title: '机会性筛查可显著提高发现率', content: '在体检中心、牙科门诊、皮肤科等场所开展机会性HBV筛查，阳性发现率约1.5-2%，是提高筛查覆盖率的有效途径。', tags: ['B级证据', '机会性筛查'] },
      { num: 4, title: 'POCT检测适合基层推广', content: 'HBsAg快速检测试剂（POCT）灵敏度和特异度均达95%以上，操作简便，适合基层医疗机构和现场筛查使用。', tags: ['B级证据', 'POCT', '基层'] },
      { num: 5, title: '母婴阻断成功率超99%', content: '随着新生儿乙肝疫苗+免疫球蛋白联合免疫的普及，中国乙肝母婴阻断成功率已达99%以上，5岁以下儿童HBsAg阳性率降至0.3%以下。', tags: ['A级证据', '母婴阻断'] },
      { num: 6, title: '重点地区和重点人群筛查成本效果最优', content: '在HBsAg阳性率>8%的高发地区和30-50岁高危人群中开展筛查，成本效果比最优，每发现1例感染者的成本最低。', tags: ['B级证据', '成本效果'] }
    ],
    diagnosis: [
      { num: 1, title: '基层规范诊断率不足35%', content: '调查显示基层医疗机构对慢性HBV感染的规范诊断率不足35%，存在过度诊断和诊断不足并存的问题。', tags: ['B级证据', '基层', '诊断规范'] },
      { num: 2, title: '无创肝纤维化评估普及度低', content: 'FibroScan等瞬时弹性成像设备在基层普及率不足10%，APRI、FIB-4等无创评分的临床应用也不广泛。', tags: ['B级证据', '无创评估'] },
      { num: 3, title: 'qHBsAg定量检测价值显著', content: '定量HBsAg检测在指导PegIFN治疗、预测停药后复发、定义功能性治愈等方面具有重要价值，应作为常规检测项目。', tags: ['A级证据', 'qHBsAg'] },
      { num: 4, title: 'HBV RNA反映cccDNA转录活性', content: '血清HBV RNA水平可较好反映肝内cccDNA的转录活性，在预测停药后复发方面具有潜在价值。', tags: ['B级证据', '生物标志物'] },
      { num: 5, title: '肝穿刺仍是纤维化金标准', content: '虽然无创评估方法发展迅速，但肝组织活检仍是肝纤维化分期的金标准，尤其在诊断不明确的情况下。', tags: ['A级证据', '肝活检'] }
    ],
    treatment: [
      { num: 1, title: '治疗覆盖率仅10.8%', content: '中国约2800万慢性HBV患者需要抗病毒治疗，但实际接受治疗的仅约300万人，治疗覆盖率仅10.8%。', tags: ['A级证据', '治疗覆盖率'] },
      { num: 2, title: 'PegIFN优势人群HBsAg清除率30-50%', content: '经过优势人群筛选（HBsAg<1500 IU/mL、ALT升高）后使用PegIFNα治疗，48周HBsAg清除率可达30-50%。', tags: ['A级证据', 'PegIFN', '功能性治愈'] },
      { num: 3, title: 'NA长期治疗安全有效', content: 'ETV、TDF、TAF等核苷（酸）类似物长期治疗可显著抑制HBV DNA，改善肝组织学，降低HCC风险。', tags: ['A级证据', 'NA治疗'] },
      { num: 4, title: '新药研发快速推进', content: '全球有30余种乙肝新药处于临床研发阶段，siRNA、ASO、衣壳抑制剂等多种机制药物进入II/III期临床。', tags: ['B级证据', '新药研发'] },
      { num: 5, title: '联合治疗是未来方向', content: '不同作用机制药物的联合应用（如NA+PegIFN、siRNA+免疫调节剂等）有望显著提高功能性治愈率。', tags: ['B级证据', '联合治疗'] },
      { num: 6, title: '非活动性携带者PegIFN治愈率可达57%', content: '对非活动性HBsAg携带者使用PegIFNα治疗，HBsAg清除率可达50-57%，是值得探索的治疗人群。', tags: ['B级证据', '非活动性携带者'] }
    ],
    management: [
      { num: 1, title: '治疗1年依从率仅40%', content: '真实世界研究显示，慢乙肝患者NA治疗1年依从率仅35-42%，2年停药率超过50%。', tags: ['B级证据', '依从性'] },
      { num: 2, title: '社区管理模式可提升依从性50%+', content: '建立社区-医院联动的患者管理模式，通过定期随访、健康教育、用药提醒，可将治疗依从性提升50%以上。', tags: ['B级证据', '社区管理'] },
      { num: 3, title: '数字化管理工具前景广阔', content: '移动APP、微信小程序等数字化管理工具在提高患者依从性、监测不良反应、健康教育等方面显示出良好效果。', tags: ['B级证据', '数字化管理'] },
      { num: 4, title: '患者教育是管理基础', content: '系统的患者健康教育可显著提高疾病认知水平，改善治疗态度，是提高依从性的基础措施。', tags: ['B级证据', '患者教育'] },
      { num: 5, title: '定期监测是管理核心', content: '规范的定期监测（病毒学、生化学、影像学）可及时发现病情变化和耐药，是全程管理的核心内容。', tags: ['A级证据', '监测'] }
    ],
    hbvhcc: [
      { num: 1, title: 'HBV相关HCC占中国肝癌80%', content: '中国每年新发HCC约41万例，其中约80%与HBV感染相关，HBV是中国肝癌的首要病因。', tags: ['A级证据', '流行病学'] },
      { num: 2, title: 'HCC早诊率仅15%', content: '由于缺乏规范化的高危人群监测，约85%的HCC患者确诊时已处于中晚期，早期诊断率不足15%。', tags: ['B级证据', '早诊率'] },
      { num: 3, title: '抗病毒治疗降低HCC风险50%+', content: '规范的抗病毒治疗可使HBV相关HCC发生风险降低50-60%，是HCC一级预防的核心措施。', tags: ['A级证据', 'HCC预防'] },
      { num: 4, title: 'AFP+超声联合监测是标准方案', content: 'AFP联合肝脏超声每6个月监测1次，是目前推荐的HCC高危人群监测方案，可将早诊率提高2-3倍。', tags: ['A级证据', '监测方案'] },
      { num: 5, title: 'HBsAg清除后HCC风险仍存在', content: '即使实现HBsAg清除（功能性治愈），HCC发生风险仍未完全消除，仍需长期监测，尤其是肝硬化患者。', tags: ['B级证据', '功能性治愈后监测'] },
      { num: 6, title: 'HCC风险预测模型可优化监测策略', content: 'PAGE-B、REACH-B等HCC风险预测模型可对患者进行风险分层，优化监测资源配置，提高监测效率。', tags: ['B级证据', '风险预测'] }
    ]
  };

  // 联盟架构
  let allianceLayers = [
    { level: '第一层', name: '国家级中心', role: '战略引领、标准制定、质量控制、科研创新', count: '3-5个', icon: '🏛️', color: '#003d66' },
    { level: '第二层', name: '省级中心', role: '区域统筹、技术指导、人才培养、区域质控', count: '约30个', icon: '🏢', color: '#005691' },
    { level: '第三层', name: '地市级医院', role: '诊疗骨干、双向转诊、患者管理、数据上报', count: '约300个', icon: '🏥', color: '#1a73b8' },
    { level: '第四层', name: '县级医院', role: '网底诊疗、初筛初治、基层转诊、基础管理', count: '约2800个', icon: '🏨', color: '#008a7a' },
    { level: '第五层', name: '基层医疗机构', role: '前哨筛查、健康教育、随访管理、信息采集', count: '约30万个', icon: '🏠', color: '#00A896' },
    { level: '第六层', name: '患者管理平台', role: '患者自我管理、远程监测、数据互联、智能提醒', count: '全人群', icon: '📱', color: '#E8742C' }
  ];

  // 路线图
  let roadmapPhases = [
    {
      year: '2025',
      period: '第1年',
      name: '标准建设年',
      goal: '建立联盟标准体系，完成顶层设计',
      actions: [
        '成立全国肝病联盟理事会和专家委员会',
        '制定统一的筛查、诊断、治疗、管理标准',
        '建设联盟数据平台和质控体系',
        '完成3个省级试点的启动和基线调查'
      ],
      milestones: ['联盟成立', '标准发布V1.0', '数据平台上线', '3省试点']
    },
    {
      year: '2026',
      period: '第2年',
      name: '区域试点年',
      goal: '10个省份试点，验证模式有效性',
      actions: [
        '扩大至10个省级试点，覆盖1亿人口',
        '建立分级诊疗和双向转诊机制',
        '开展基层医务人员大规模培训',
        '开展试点评估，优化标准路径'
      ],
      milestones: ['10省试点', '筛查率25%', '治疗率15%', '标准V2.0']
    },
    {
      year: '2027',
      period: '第3年',
      name: '联盟扩展年',
      goal: '覆盖全国50%以上省份',
      actions: [
        '联盟扩展至20个省份，覆盖5亿人口',
        '建立区域医学中心和远程会诊体系',
        '推动新药临床研究网络建设',
        '启动HCC高危人群登记项目'
      ],
      milestones: ['20省覆盖', '筛查率50%', '治疗率40%', 'HCC登记启动']
    },
    {
      year: '2028-2029',
      period: '第4-5年',
      name: '全国复制年',
      goal: '实现全国覆盖，模式成熟运行',
      actions: [
        '联盟扩展至全国所有省份',
        '完善六级联动的肝病防治网络',
        '推动功能性治愈规范化应用',
        '建立真实世界研究证据体系'
      ],
      milestones: ['全国覆盖', '筛查率75%', '治疗率65%', '功能治愈推广']
    },
    {
      year: '2030',
      period: '第6年',
      name: '目标评价年',
      goal: '全面评估2030目标实现情况',
      actions: [
        '开展全国性消除肝炎目标评估',
        '总结联盟模式经验并向国际推广',
        '制定下一阶段（2030-2035）战略规划',
        '持续优化诊疗路径和质量标准'
      ],
      milestones: ['90%诊断率', '80%治疗率', '65%病死率下降', 'WHO认证']
    }
  ];

  // 文献库（25条示例）
  let literatureList = [
    { id: 1, title: '中国慢性乙型肝炎防治指南（2022年版）', journal: '中华肝脏病杂志', authors: '中华医学会感染病学分会, 中华医学会肝病学分会', year: 2022, level: 'A', region: 'china', theme: ['screening', 'diagnosis', 'treatment'], goal2030: 'high', type: '指南共识', sampleSize: '全国' },
    { id: 2, title: 'Global prevalence, treatment, and prevention of hepatitis B virus infection in 2016: a modelling study', journal: 'Lancet Gastroenterol Hepatol', authors: 'WHO Global Hepatitis Report', year: 2018, level: 'A', region: 'intl', theme: ['screening', 'treatment'], goal2030: 'high', type: '模型研究', sampleSize: '全球' },
    { id: 3, title: 'Seroprevalence of hepatitis B and C virus infections in China, 2020', journal: 'China CDC Weekly', authors: 'Chinese CDC', year: 2021, level: 'A', region: 'china', theme: ['screening'], goal2030: 'high', type: '流行病学调查', sampleSize: '全国' },
    { id: 4, title: 'Peginterferon alfa-2a in patients with HBeAg-negative chronic hepatitis B: 5-year follow-up', journal: 'J Hepatol', authors: 'Marcellin P, et al.', year: 2019, level: 'A', region: 'intl', theme: ['treatment'], goal2030: 'mid', type: 'RCT', sampleSize: '177例' },
    { id: 5, title: '中国慢性乙型肝炎患者疾病认知和治疗现状调查', journal: '中华流行病学杂志', authors: '中国疾控中心', year: 2023, level: 'B', region: 'china', theme: ['screening', 'management'], goal2030: 'high', type: '横断面调查', sampleSize: '8234例' },
    { id: 6, title: 'Bepirovirsen for treatment of chronic hepatitis B: a phase 2b randomised trial', journal: 'NEJM', authors: 'Yuen MF, et al.', year: 2024, level: 'A', region: 'intl', theme: ['treatment'], goal2030: 'mid', type: 'RCT', sampleSize: '457例' },
    { id: 7, title: 'Peginterferon alfa-2a plus entecavir in HBeAg-positive chronic hepatitis B', journal: 'Hepatology', authors: 'Ning Q, et al.', year: 2022, level: 'A', region: 'china', theme: ['treatment'], goal2030: 'high', type: 'RCT', sampleSize: '320例' },
    { id: 8, title: 'Hepatocellular carcinoma surveillance in chronic hepatitis B: a systematic review and meta-analysis', journal: 'J Hepatol', authors: 'Singal AG, et al.', year: 2021, level: 'A', region: 'intl', theme: ['hbvhcc'], goal2030: 'high', type: '系统综述', sampleSize: '42项研究' },
    { id: 9, title: '中国肝细胞癌筛查与监测指南（2023版）', journal: '中华肝脏病杂志', authors: '中国抗癌协会', year: 2023, level: 'A', region: 'china', theme: ['hbvhcc'], goal2030: 'high', type: '指南共识', sampleSize: '全国' },
    { id: 10, title: 'Tenofovir alafenamide versus tenofovir disoproxil fumarate in Chinese patients with chronic hepatitis B', journal: 'J Viral Hepat', authors: 'Hou J, et al.', year: 2020, level: 'A', region: 'china', theme: ['treatment'], goal2030: 'mid', type: 'RCT', sampleSize: '489例' },
    { id: 11, title: '基层医疗机构慢性乙型肝炎诊疗现状调查', journal: '中国全科医学', authors: '中国医师协会', year: 2024, level: 'B', region: 'china', theme: ['diagnosis', 'treatment'], goal2030: 'high', type: '横断面调查', sampleSize: '156家机构' },
    { id: 12, title: 'Entecavir treatment and reduction of hepatocellular carcinoma in chronic hepatitis B: a meta-analysis', journal: 'Clin Gastroenterol Hepatol', authors: 'Kim SU, et al.', year: 2020, level: 'A', region: 'intl', theme: ['treatment', 'hbvhcc'], goal2030: 'high', type: 'Meta分析', sampleSize: '25项研究' },
    { id: 13, title: '社区干预对慢性乙型肝炎患者治疗依从性的影响', journal: '中国公共卫生', authors: '浙江省疾控中心', year: 2023, level: 'B', region: 'china', theme: ['management'], goal2030: 'high', type: '社区干预研究', sampleSize: '2340例' },
    { id: 14, title: 'HBV RNA as a predictor of post-treatment relapse in chronic hepatitis B', journal: 'J Hepatol', authors: 'Wang H, et al.', year: 2021, level: 'B', region: 'intl', theme: ['diagnosis'], goal2030: 'mid', type: '队列研究', sampleSize: '186例' },
    { id: 15, title: '母婴传播阻断技术规范及效果评估（2020年版）', journal: '中国疫苗和免疫', authors: '国家免疫规划技术工作组', year: 2020, level: 'A', region: 'china', theme: ['screening'], goal2030: 'high', type: '技术规范', sampleSize: '全国' },
    { id: 16, title: 'APRI and FIB-4 for liver fibrosis staging in chronic hepatitis B: a meta-analysis', journal: 'BMC Infect Dis', authors: 'Dong C, et al.', year: 2019, level: 'B', region: 'intl', theme: ['diagnosis'], goal2030: 'mid', type: 'Meta分析', sampleSize: '40项研究' },
    { id: 17, title: '新型siRNA药物治疗慢性乙型肝炎II期临床研究', journal: 'Hepatol Int', authors: '中国多中心研究组', year: 2024, level: 'B', region: 'china', theme: ['treatment'], goal2030: 'mid', type: 'II期临床', sampleSize: '120例' },
    { id: 18, title: 'Chronic hepatitis B infection management and outcomes: real-world evidence from China', journal: 'Liver Int', authors: 'Chinese CHB Registry', year: 2023, level: 'B', region: 'china', theme: ['treatment', 'management'], goal2030: 'high', type: '真实世界研究', sampleSize: '51423例' },
    { id: 19, title: 'Prediction of hepatocellular carcinoma in chronic hepatitis B: the REACH-B model', journal: 'Lancet Oncol', authors: 'Yuen MF, et al.', year: 2019, level: 'A', region: 'intl', theme: ['hbvhcc'], goal2030: 'mid', type: '预测模型', sampleSize: '3582例' },
    { id: 20, title: '数字化管理平台对慢乙肝患者依从性和疗效的影响', journal: '中华消化病杂志', authors: '上海交通大学附属瑞金医院', year: 2024, level: 'B', region: 'china', theme: ['management'], goal2030: 'mid', type: 'RCT', sampleSize: '568例' },
    { id: 21, title: 'Inactive hepatitis B surface antigen carriers treated with peginterferon: a multicenter study', journal: 'J Viral Hepat', authors: 'Hu Y, et al.', year: 2023, level: 'B', region: 'china', theme: ['treatment'], goal2030: 'high', type: '多中心研究', sampleSize: '180例' },
    { id: 22, title: 'Opportunistic screening for hepatitis B in general hospitals: a cost-effectiveness analysis', journal: 'Value Health', authors: 'Liu X, et al.', year: 2022, level: 'B', region: 'china', theme: ['screening'], goal2030: 'high', type: '成本效果分析', sampleSize: '模型研究' },
    { id: 23, title: 'Transient elastography versus liver biopsy for staging of liver fibrosis: an individual patient data meta-analysis', journal: 'Ann Intern Med', authors: 'Singh S, et al.', year: 2020, level: 'A', region: 'intl', theme: ['diagnosis'], goal2030: 'low', type: 'IPD Meta分析', sampleSize: '38项研究' },
    { id: 24, title: '分级诊疗模式下肝病联盟建设实践与效果评价', journal: '中国医院管理', authors: '浙江省医院协会', year: 2023, level: 'C', region: 'china', theme: ['management'], goal2030: 'high', type: '实践研究', sampleSize: '12家医院' },
    { id: 25, title: 'Towards 2030 elimination of viral hepatitis as a public health threat in China: modelling analysis', journal: 'Bull WHO', authors: 'China WHO Collaborative Study', year: 2024, level: 'B', region: 'china', theme: ['screening', 'treatment', 'hbvhcc'], goal2030: 'high', type: '模型研究', sampleSize: '全国' }
  ];

  /* ============================================================
     真实数据集成（如存在window.APP_DATA则覆盖Mock数据）
     ============================================================ */
  if (window.APP_DATA && window.APP_DATA.hasRealData) {
    const ad = window.APP_DATA;
    statistics = ad.statistics || statistics;
    topInsights = ad.topInsights || topInsights;
    funnelStages = ad.funnelStages || funnelStages;
    themesData = ad.themesData || themesData;
    themeInsights = ad.themeInsights || themeInsights;
    allianceLayers = ad.allianceLayers || allianceLayers;
    roadmapPhases = ad.roadmapPhases || roadmapPhases;
    literatureList = ad.literatureList || literatureList;
    console.log('[App] 使用真实数据：' + statistics.totalLiterature + '篇文献，' + topInsights.length + '条核心洞察');
  } else {
    console.log('[App] 使用Mock数据（演示模式）');
  }

  /* ============================================================
     全局状态
     ============================================================ */
  const state = {
    currentPage: 'overview',
    filters: {
      theme: 'all',
      level: 'all',
      region: 'all',
      year: 'all',
      goal2030: 'all',
      search: ''
    },
    charts: {} // 存储ECharts实例
  };

  /* ============================================================
     页面导航
     ============================================================ */
  function navigate(page) {
    // 更新状态
    state.currentPage = page;

    // 隐藏所有页面
    document.querySelectorAll('.page').forEach(p => {
      p.classList.remove('active');
    });

    // 显示目标页面
    const targetPage = document.getElementById('page-' + page);
    if (targetPage) {
      targetPage.classList.add('active');
    }

    // 更新导航高亮
    updateNavActive(page);

    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // 延迟初始化图表（等待页面显示）
    setTimeout(() => {
      initPageCharts(page);
    }, 100);
  }

  function updateNavActive(page) {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
      if (item.dataset.page === page) {
        item.classList.add('active');
      }
    });
    // 专题页高亮"筛诊治管康"
    const themePages = ['screening', 'diagnosis', 'treatment', 'management', 'hbvhcc'];
    if (themePages.includes(page)) {
      const parent = document.querySelector('.nav-item.has-sub');
      if (parent) parent.classList.add('active');
    }
  }

  function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    menu.classList.toggle('active');
    const btn = document.getElementById('mobileMenuBtn');
    btn.classList.toggle('active');
  }

  /* ============================================================
     渲染：核心数字卡片（6个）
     ============================================================ */
  function renderStatGrid6() {
    const grid = document.getElementById('statGrid6');
    if (!grid) return;

    const stats = [
      { num: statistics.totalLiterature, label: '文献总量', sub: '近10年循证证据', color: 'primary' },
      { num: statistics.chinaEvidence, label: '中国证据占比', sub: (statistics.chinaEvidence / statistics.totalLiterature * 100).toFixed(1) + '%', color: 'teal' },
      { num: statistics.abEvidence, label: 'A/B级证据', sub: (statistics.abEvidence / statistics.totalLiterature * 100).toFixed(1) + '%', color: 'orange' },
      { num: statistics.goal2030Relevant, label: '2030高相关证据', sub: (statistics.goal2030Relevant / statistics.totalLiterature * 100).toFixed(1) + '%', color: 'primary' },
      { num: statistics.topicsCount, label: '覆盖专题', sub: '筛诊治管康全链条', color: 'teal' },
      { num: statistics.coreInsights, label: '核心洞察', sub: '提炼 actionable insights', color: 'orange' }
    ];

    grid.innerHTML = stats.map(s => `
      <div class="stat-card-6">
        <div class="stat-num" style="color: var(--${s.color === 'primary' ? 'primary' : s.color === 'teal' ? 'secondary' : 'accent'})">${s.num}</div>
        <div class="stat-label">${s.label}</div>
        <div class="stat-sub">${s.sub}</div>
      </div>
    `).join('');
  }

  /* ============================================================
     渲染：十大核心战略洞察
     ============================================================ */
  function renderTopInsights() {
    const container = document.getElementById('insightScroll');
    if (!container) return;

    container.innerHTML = topInsights.map(insight => `
      <div class="insight-card" onclick="openInsightModal(${insight.id})">
        <div class="insight-num">${insight.id}</div>
        <div class="insight-category">${insight.category}</div>
        <h4>${insight.title}</h4>
        <p class="insight-conclusion">${insight.conclusion}</p>
        <div class="insight-meta-row">
          <div class="insight-key-num">
            <span class="num">${insight.keyNumber}</span>
            <span class="unit">${insight.keyUnit}</span>
          </div>
          <span class="evidence-badge level-${insight.evidenceLevel.toLowerCase()}">证据等级 ${insight.evidenceLevel}</span>
        </div>
        <div class="insight-action">
          <span>查看详情</span>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </div>
      </div>
    `).join('');
  }

  /* ============================================================
     渲染：漏斗阶段卡片
     ============================================================ */
  function renderFunnelStages() {
    const grid = document.getElementById('funnelStagesGrid');
    if (!grid) return;

    grid.innerHTML = funnelStages.map(stage => `
      <div class="funnel-stage-card">
        <div class="stage-num">阶段 ${stage.num}</div>
        <div class="stage-name">${stage.name} <span style="font-size:12px;color:var(--primary);font-weight:600">${stage.rate}%</span></div>
        <div class="stage-label">当前问题</div>
        <div class="stage-item problem">${stage.problem}</div>
        <div class="stage-label">脱落风险</div>
        <div class="stage-item risk">${stage.risk}</div>
        <div class="stage-label">推荐行动</div>
        <div class="stage-item action">${stage.action}</div>
        <div class="stage-label">KPI</div>
        <div class="stage-item kpi">${stage.kpi}</div>
      </div>
    `).join('');
  }

  /* ============================================================
     渲染：筛诊治管康专题导航
     ============================================================ */
  function renderThemeGrid() {
    const grid = document.getElementById('themeGrid');
    if (!grid) return;

    const themeKeys = ['screening', 'diagnosis', 'treatment', 'management', 'hbvhcc'];
    grid.innerHTML = themeKeys.map(key => {
      const t = themesData[key];
      return `
        <div class="theme-card ${key}" onclick="navigate('${key}')">
          <div class="theme-icon">${t.icon}</div>
          <h4>${t.title}</h4>
          <p class="theme-desc">${t.desc}</p>
          <div class="theme-stats">
            <div class="theme-stat"><strong>${t.stats.litCount}</strong>文献</div>
            <div class="theme-stat"><strong>${t.stats.chinaCount}</strong>中国证据</div>
          </div>
          <div class="theme-insights-list">
            ${t.insights.slice(0, 3).map(i => `<div class="theme-insight-item">${i}</div>`).join('')}
          </div>
          <div class="theme-more">
            查看全部 ${t.stats.insights} 条洞察 →
          </div>
        </div>
      `;
    }).join('');
  }

  /* ============================================================
     渲染：联盟架构
     ============================================================ */
  function renderAllianceArch() {
    const container = document.getElementById('allianceArch');
    if (!container) return;

    container.innerHTML = allianceLayers.map((layer, i) => `
      <div class="alliance-layer layer-${i + 1}">
        <div class="layer-level">${layer.level}</div>
        <div class="layer-content">
          <div class="layer-name">${layer.name}</div>
          <div class="layer-role">${layer.role}</div>
        </div>
        <div class="layer-count">${layer.count}</div>
      </div>
    `).join('');
  }

  function renderAllianceArchLarge() {
    const container = document.getElementById('allianceArchLarge');
    if (!container) return;

    container.innerHTML = allianceLayers.map((layer, i) => `
      <div class="alliance-layer-large" style="border-left-color: ${layer.color}">
        <div class="layer-icon">${layer.icon}</div>
        <div>
          <div class="layer-name-lg">${layer.level} · ${layer.name}</div>
          <div class="layer-desc-lg">${layer.role}</div>
        </div>
        <div class="layer-badge" style="background: ${layer.color}15; color: ${layer.color}">${layer.count}</div>
      </div>
    `).join('');
  }

  /* ============================================================
     渲染：路线图时间线
     ============================================================ */
  function renderRoadmapTimeline() {
    const container = document.getElementById('roadmapTimeline');
    if (!container) return;

    container.innerHTML = roadmapPhases.map((phase, i) => `
      <div class="roadmap-phase ${i === 0 ? 'active' : ''}">
        <div class="phase-dot"></div>
        <div class="phase-year">${phase.year}</div>
        <div class="phase-name">${phase.name}</div>
        <div class="phase-desc">${phase.goal}</div>
      </div>
    `).join('');
  }

  function renderRoadmapFull() {
    const container = document.getElementById('roadmapFull');
    if (!container) return;

    container.innerHTML = roadmapPhases.map(phase => `
      <div class="roadmap-phase-full">
        <div class="rpf-left">
          <div class="rpf-year">${phase.year}</div>
          <div class="rpf-period">${phase.period}</div>
          <div class="rpf-dot"></div>
        </div>
        <div class="rpf-right">
          <div class="rpf-title">${phase.name}</div>
          <div class="rpf-goal">🎯 ${phase.goal}</div>
          <div class="rpf-actions">
            ${phase.actions.map(a => `
              <div class="rpf-action-item">
                <div class="action-check">✓</div>
                <div class="action-text">${a}</div>
              </div>
            `).join('')}
          </div>
          <div class="rpf-milestone">
            ${phase.milestones.map(m => `<span class="milestone-tag">🏁 ${m}</span>`).join('')}
          </div>
        </div>
      </div>
    `).join('');
  }

  /* ============================================================
     渲染：专题页洞察列表
     ============================================================ */
  function renderThemeInsights() {
    const themes = ['screening', 'diagnosis', 'treatment', 'management', 'hbvhcc'];
    themes.forEach(theme => {
      const container = document.getElementById(theme + 'Insights');
      if (!container || !themeInsights[theme]) return;

      container.innerHTML = themeInsights[theme].map(item => `
        <div class="insight-item-detail">
          <div class="iid-num">${item.num}</div>
          <div class="iid-content">
            <h4>${item.title}</h4>
            <p>${item.content}</p>
            <div class="iid-tags">
              ${item.tags.map(t => `<span class="iid-tag">${t}</span>`).join('')}
            </div>
          </div>
        </div>
      `).join('');
    });
  }

  /* ============================================================
     渲染：文献列表
     ============================================================ */
  function renderLiteratureGrid(list) {
    const grid = document.getElementById('literatureGrid');
    const empty = document.getElementById('emptyState');
    const countEl = document.getElementById('resultCount');

    if (!grid) return;

    countEl.textContent = list.length;

    if (list.length === 0) {
      grid.innerHTML = '';
      empty.style.display = 'block';
      return;
    }

    empty.style.display = 'none';
    grid.innerHTML = list.map(lit => `
      <div class="lit-card" onclick="openLitModal(${lit.id})">
        <div class="lit-journal">${lit.journal}</div>
        <div class="lit-title">${lit.title}</div>
        <div class="lit-authors">${lit.authors}</div>
        <div class="lit-meta">
          <span class="lit-meta-item">${lit.year}</span>
          <span class="lit-meta-item level-${lit.level.toLowerCase()}">${lit.level}级证据</span>
          ${lit.region === 'china' ? '<span class="lit-meta-item china">中国研究</span>' : ''}
          <span class="lit-meta-item">${lit.type}</span>
        </div>
      </div>
    `).join('');
  }

  /* ============================================================
     筛选逻辑
     ============================================================ */
  function filterEvidence() {
    const search = document.getElementById('evidenceSearch').value.toLowerCase().trim();
    const sortBy = document.getElementById('sortSelect').value;
    state.filters.search = search;

    let filtered = literatureList.filter(lit => {
      // 搜索
      if (search) {
        const inTitle = lit.title.toLowerCase().includes(search);
        const inAuthors = lit.authors.toLowerCase().includes(search);
        const inJournal = lit.journal.toLowerCase().includes(search);
        if (!inTitle && !inAuthors && !inJournal) return false;
      }
      // 专题
      if (state.filters.theme !== 'all') {
        if (!lit.theme.includes(state.filters.theme)) return false;
      }
      // 证据等级
      if (state.filters.level !== 'all') {
        if (lit.level !== state.filters.level) return false;
      }
      // 地区
      if (state.filters.region !== 'all') {
        if (lit.region !== state.filters.region) return false;
      }
      // 年份
      if (state.filters.year !== 'all') {
        if (state.filters.year === '2024-2026' && (lit.year < 2024 || lit.year > 2026)) return false;
        if (state.filters.year === '2020-2023' && (lit.year < 2020 || lit.year > 2023)) return false;
        if (state.filters.year === 'before2020' && lit.year >= 2020) return false;
      }
      // 2030相关度
      if (state.filters.goal2030 !== 'all') {
        if (lit.goal2030 !== state.filters.goal2030) return false;
      }
      return true;
    });

    // 排序
    if (sortBy === 'date_desc') {
      filtered.sort((a, b) => b.year - a.year);
    } else if (sortBy === 'level_desc') {
      const levelOrder = { A: 3, B: 2, C: 1 };
      filtered.sort((a, b) => levelOrder[b.level] - levelOrder[a.level]);
    }

    renderLiteratureGrid(filtered);
  }

  function setFilter(type, value, el) {
    state.filters[type] = value;
    // 更新UI
    const parent = el.parentElement;
    parent.querySelectorAll('.filter-tag').forEach(tag => tag.classList.remove('active'));
    el.classList.add('active');
    // 触发筛选
    filterEvidence();
  }

  function toggleFilterPanel() {
    const panel = document.getElementById('filterPanel');
    panel.classList.toggle('active');
  }

  /* ============================================================
     弹窗：文献详情
     ============================================================ */
  function openLitModal(id) {
    const lit = literatureList.find(l => l.id === id);
    if (!lit) return;

    const body = document.getElementById('litModalBody');
    const relatedInsights = topInsights.filter(ins => {
      const catMap = {
        '筛查': 'screening', '诊断': 'diagnosis', '治疗': 'treatment',
        '管理/康复': 'management', 'HBV→HCC': 'hbvhcc',
        '功能性治愈': 'treatment', '全国联盟': 'management', '2030目标': 'screening'
      };
      return lit.theme.includes(catMap[ins.category] || '');
    }).slice(0, 3);

    body.innerHTML = `
      <div class="lit-detail">
        <div class="lit-d-journal">${lit.journal} · ${lit.year}</div>
        <h3>${lit.title}</h3>
        <div class="lit-d-authors">${lit.authors}</div>
        <div class="lit-d-meta">
          <span class="lit-meta-item level-${lit.level.toLowerCase()}">证据等级：${lit.level}级</span>
          <span class="lit-meta-item ${lit.region === 'china' ? 'china' : ''}">${lit.region === 'china' ? '中国研究' : '国际研究'}</span>
          <span class="lit-meta-item">研究类型：${lit.type}</span>
          <span class="lit-meta-item">样本量：${lit.sampleSize}</span>
        </div>
        <div class="lit-d-section">
          <h4>研究背景</h4>
          <p>该研究聚焦于慢性乙型肝炎防治领域的关键科学问题，针对当前临床实践中的重要争议和未满足需求开展系统研究，为优化诊疗策略提供循证医学证据。</p>
        </div>
        <div class="lit-d-section">
          <h4>主要发现</h4>
          <p>研究结果显示，在慢性HBV感染的诊疗管理方面，规范化的诊疗路径和全程管理模式可显著改善患者预后，提高治疗效果，降低疾病进展风险。研究结论与国内外最新指南推荐一致。</p>
        </div>
        <div class="lit-d-section">
          <h4>临床意义</h4>
          <p>该研究结果对优化临床诊疗策略、提高医疗质量、推动2030消除肝炎目标具有重要的指导意义，为全国肝病联盟的标准制定和质量改进提供了重要的循证依据。</p>
        </div>
        ${relatedInsights.length > 0 ? `
        <div class="related-insights">
          <h5>📌 关联战略洞察</h5>
          ${relatedInsights.map(ins => `
            <div class="evidence-item" onclick="openInsightModal(${ins.id}); closeLitModal();">
              <div class="ev-title">${ins.title}</div>
              <div class="ev-meta">${ins.category} · ${ins.evidenceCount}篇证据</div>
            </div>
          `).join('')}
        </div>
        ` : ''}
      </div>
    `;

    document.getElementById('litModal').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLitModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('litModal').classList.remove('active');
    document.body.style.overflow = '';
  }

  /* ============================================================
     弹窗：洞察详情
     ============================================================ */
  function openInsightModal(id) {
    const insight = topInsights.find(i => i.id === id);
    if (!insight) return;

    const body = document.getElementById('insightModalBody');
    const relatedLits = literatureList.filter(lit => {
      const catMap = {
        '筛查': 'screening', '诊断': 'diagnosis', '治疗': 'treatment',
        '管理/康复': 'management', 'HBV→HCC': 'hbvhcc',
        '功能性治愈': 'treatment', '全国联盟': 'management', '2030目标': 'screening'
      };
      return lit.theme.includes(catMap[insight.category] || '');
    }).slice(0, 4);

    body.innerHTML = `
      <div class="insight-detail">
        <div class="insight-d-header">
          <div class="insight-d-num">${insight.id}</div>
          <div>
            <div class="insight-d-cat">${insight.category}</div>
            <h3>${insight.title}</h3>
            <p class="insight-d-conclusion">${insight.conclusion}</p>
          </div>
        </div>
        <div class="insight-d-grid">
          <div class="insight-d-box">
            <h4>关键数字</h4>
            <p style="font-family: var(--font-serif); font-size: 28px; font-weight: 700; color: var(--primary);">
              ${insight.keyNumber} <span style="font-size: 14px; color: var(--ink-500);">${insight.keyUnit}</span>
            </p>
          </div>
          <div class="insight-d-box">
            <h4>证据强度</h4>
            <p><span class="evidence-badge level-${insight.evidenceLevel.toLowerCase()}" style="font-size: 14px; padding: 4px 12px;">${insight.evidenceLevel}级证据 · ${insight.evidenceCount}篇文献支撑</span></p>
          </div>
          <div class="insight-d-box">
            <h4>2030意义</h4>
            <p>${insight.goal2030meaning}</p>
          </div>
          <div class="insight-d-box">
            <h4>联盟行动</h4>
            <p>${insight.allianceAction}</p>
          </div>
        </div>
        <div class="lit-d-section">
          <h4>详细说明</h4>
          <p>${insight.detail}</p>
        </div>
        <div class="evidence-list">
          <h4>📚 核心支撑证据（${relatedLits.length}篇）</h4>
          ${relatedLits.map(lit => `
            <div class="evidence-item" onclick="openLitModal(${lit.id}); closeInsightModal();">
              <div class="ev-title">${lit.title}</div>
              <div class="ev-meta">${lit.journal}, ${lit.year} · ${lit.level}级证据${lit.region === 'china' ? ' · 中国研究' : ''}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    document.getElementById('insightModal').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeInsightModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('insightModal').classList.remove('active');
    document.body.style.overflow = '';
  }

  /* ============================================================
     回到顶部
     ============================================================ */
  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleScroll() {
    const btn = document.getElementById('backToTop');
    if (window.scrollY > 300) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  }

  /* ============================================================
     图表初始化
     ============================================================ */
  function initPageCharts(page) {
    // 销毁之前的图表实例
    Object.values(state.charts).forEach(chart => {
      if (chart && chart.dispose) chart.dispose();
    });
    state.charts = {};

    // 根据页面初始化对应图表
    switch (page) {
      case 'overview':
        initOverviewCharts();
        break;
      case 'goals2030':
        initGoalsCharts();
        break;
      case 'screening':
        initThemeCharts('screening');
        break;
      case 'diagnosis':
        initThemeCharts('diagnosis');
        break;
      case 'treatment':
        initThemeCharts('treatment');
        break;
      case 'management':
        initThemeCharts('management');
        break;
      case 'hbvhcc':
        initThemeCharts('hbvhcc');
        break;
      case 'alliance':
        initAllianceCharts();
        break;
    }
  }

  function initOverviewCharts() {
    // 漏斗图
    const funnelEl = document.getElementById('funnelChart');
    if (funnelEl && typeof window.initFunnelChart === 'function') {
      state.charts.funnel = window.initFunnelChart(funnelEl);
    }
  }

  function initGoalsCharts() {
    const gapEl = document.getElementById('gapChart');
    if (gapEl && typeof window.initGapChart === 'function') {
      state.charts.gap = window.initGapChart(gapEl);
    }
  }

  function initThemeCharts(theme) {
    // 专题页的分布小图
    const distMap = {
      screening: 'screeningDistChart',
      diagnosis: 'diagnosisDistChart',
      treatment: 'treatmentDistChart',
      management: 'managementDistChart',
      hbvhcc: 'hbvhccDistChart'
    };
    const el = document.getElementById(distMap[theme]);
    if (el && typeof window.initThemeDistChart === 'function') {
      state.charts.themeDist = window.initThemeDistChart(el, theme);
    }

    // 证据分布图
    const evChartId = theme + 'EvidenceChart';
    const evEl = document.getElementById(evChartId);
    if (evEl && typeof window.initEvidenceDistChart === 'function') {
      state.charts.evidenceDist = window.initEvidenceDistChart(evEl, theme);
    }
  }

  function initAllianceCharts() {
    const kpiEl = document.getElementById('kpiHeatmap');
    if (kpiEl && typeof window.initKPIHeatmap === 'function') {
      state.charts.kpi = window.initKPIHeatmap(kpiEl);
    }
  }

  /* ============================================================
     窗口resize处理
     ============================================================ */
  function handleResize() {
    Object.values(state.charts).forEach(chart => {
      if (chart && chart.resize) chart.resize();
    });
  }

  /* ============================================================
     初始化
     ============================================================ */
  function init() {
    // 渲染所有静态内容
    renderStatGrid6();
    renderTopInsights();
    renderFunnelStages();
    renderThemeGrid();
    renderAllianceArch();
    renderAllianceArchLarge();
    renderRoadmapTimeline();
    renderRoadmapFull();
    renderThemeInsights();

    // 初始化文献列表
    filterEvidence();

    // 初始化首页图表
    setTimeout(() => {
      initPageCharts('overview');
    }, 200);

    // 事件绑定
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);

    // ESC关闭弹窗
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        document.getElementById('litModal').classList.remove('active');
        document.getElementById('insightModal').classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  }

  // 暴露全局函数
  window.navigate = navigate;
  window.toggleMobileMenu = toggleMobileMenu;
  window.filterEvidence = filterEvidence;
  window.setFilter = setFilter;
  window.toggleFilterPanel = toggleFilterPanel;
  window.openLitModal = openLitModal;
  window.closeLitModal = closeLitModal;
  window.openInsightModal = openInsightModal;
  window.closeInsightModal = closeInsightModal;
  window.scrollToTop = scrollToTop;

  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 暴露数据供charts.js使用
  window._platformData = {
    statistics,
    funnelStages,
    themesData,
    topInsights,
    literatureList
  };

})();
