#!/usr/bin/env python3
"""
恒沐/TMF PDF文献处理管线（优化版）
1. 复制上传的PDF到工作目录
2. 计算SHA-256
3. 提取文本
4. 多维度提取文献信息（文件名+正文）
5. 文献去重与研究实体归并
6. 生成批次manifest
"""

import os
import json
import hashlib
import shutil
import re
from datetime import datetime
from pathlib import Path

try:
    from pypdf import PdfReader
except ImportError:
    from PyPDF2 import PdfReader

ATTACHMENT_DIR = "/Users/fanglu/.trae-cn/attachments/6a8fbcf5c5ec3eef23c0a225"
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF_RAW_DIR = os.path.join(PROJECT_DIR, 'data', 'tmf_pdfs', 'raw')
PDF_EXTRACTED_DIR = os.path.join(PROJECT_DIR, 'data', 'tmf_pdfs', 'extracted')
MANIFEST_PATH = os.path.join(PROJECT_DIR, 'data', 'products', 'hengmu_tmf', 'import_manifest.json')
LITERATURE_PATH = os.path.join(PROJECT_DIR, 'data', 'products', 'hengmu_tmf', 'literature.json')
STUDIES_PATH = os.path.join(PROJECT_DIR, 'data', 'products', 'hengmu_tmf', 'studies.json')


def sha256_file(filepath):
    """计算文件SHA-256"""
    h = hashlib.sha256()
    with open(filepath, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            h.update(chunk)
    return h.hexdigest()


def normalize_title(title):
    """标准化标题用于去重"""
    if not title:
        return ''
    t = title.lower().strip()
    t = re.sub(r'[\s\-_:;,.()\[\]{}]', '', t)
    return t


def extract_pdf_text(pdf_path, max_pages=None):
    """提取PDF文本"""
    try:
        reader = PdfReader(pdf_path)
        pages = []
        total_pages = len(reader.pages)
        extract_pages = total_pages if max_pages is None else min(max_pages, total_pages)
        
        for i in range(extract_pages):
            try:
                text = reader.pages[i].extract_text()
                if text:
                    pages.append(text)
            except Exception as e:
                pages.append(f"[第{i+1}页提取失败: {str(e)}]")
        
        return {
            'success': True,
            'total_pages': total_pages,
            'extracted_pages': extract_pages,
            'pages': pages,
            'full_text': '\n\n'.join(pages),
            'error': None
        }
    except Exception as e:
        return {
            'success': False,
            'total_pages': 0,
            'extracted_pages': 0,
            'pages': [],
            'full_text': '',
            'error': str(e)
        }


def parse_filename(filename):
    """从文件名解析文献信息
    文件名格式: UUID1_UUID2_序号-作者-标题.pdf
    或: UUID_序号-作者-标题.pdf
    """
    info = {
        'seq_num': None,
        'first_author_cn': '',
        'title_from_filename': '',
    }
    
    # 去掉UUID前缀（可能有1-2个UUID，用下划线分隔）
    # 格式: [UUID-...]_序号-作者-标题.pdf
    match = re.match(r'^(?:[0-9a-f-]+_){1,2}(\d+)-(.+?)\.pdf$', filename, re.IGNORECASE)
    if match:
        info['seq_num'] = int(match.group(1))
        rest = match.group(2)
        
        # 尝试提取作者（第一个'-'前的部分，通常是作者名）
        # 格式: 作者-标题 或 作者-作者2-标题 或 作者-标题-副标题
        parts = rest.split('-')
        if len(parts) >= 2:
            # 第一个部分可能是作者
            first_part = parts[0].strip()
            # 判断是否为中文作者名（2-4个中文字符）
            if len(first_part) <= 6 and re.match(r'^[\u4e00-\u9fa5]+$', first_part):
                info['first_author_cn'] = first_part
                # 剩余部分作为标题
                info['title_from_filename'] = '-'.join(parts[1:]).replace('_', ' ').strip()
            else:
                # 可能第一部分不是作者，全部作为标题
                info['title_from_filename'] = rest.replace('_', ' ').strip()
        else:
            info['title_from_filename'] = rest.replace('_', ' ').strip()
    
    return info


def is_garbled_text(text):
    """判断文本是否为乱码"""
    if not text:
        return True
    # 检查是否包含base64-like乱码
    if 'fmx_T3RoZXJNaXJyb3Jz' in text:
        return True
    if '/G2' in text and len(re.findall(r'/G[0-9A-F]', text)) > 3:
        return True
    # 检查是否太短
    if len(text.strip()) < 8:
        return True
    return False


def extract_title_from_text(first_page_text):
    """从首页文本提取标题"""
    lines = [l.strip() for l in first_page_text.split('\n') if l.strip()]
    
    # 跳过明显不是标题的行
    skip_patterns = [
        r'^https?://',
        r'^DOI',
        r'^Copyright',
        r'^\d+$',
        r'^[A-Z][a-z]+\s+\d{4}',  # 期刊+年份
        r'^www\.',
        r'^Received',
        r'^Accepted',
        r'^Check for updates',
    ]
    
    candidate_lines = []
    for line in lines[:20]:
        # 跳过太短的行
        if len(line) < 10:
            continue
        # 跳过匹配skip模式的行
        skip = False
        for pat in skip_patterns:
            if re.match(pat, line, re.IGNORECASE):
                skip = True
                break
        if skip:
            continue
        # 跳过乱码行
        if is_garbled_text(line):
            continue
        candidate_lines.append(line)
    
    if candidate_lines:
        # 第一行候选通常是标题
        return candidate_lines[0]
    
    return ''


def extract_basic_info(filename, text_result):
    """从文件名和文本中提取基本信息（优化版）"""
    info = {
        'filename': filename,
        'title_cn': '',
        'title_en': '',
        'first_author': '',
        'authors': '',
        'journal': '',
        'year': None,
        'pmid': '',
        'doi': '',
        'trial_registration': '',
        'study_type': '',
        'study_phase': '',
        'evidence_level': 'C',
        'is_china_study': False,
        'china_relevance': '',
        'sample_size': None,
        'tmf_group_size': None,
        'control_group_size': None,
        'intervention': 'TMF/艾米替诺福韦',
        'control': '',
        'follow_up_weeks': None,
        'patient_population': [],
        'prior_treatment': '',
        'primary_endpoints': [],
        'secondary_endpoints': [],
        'efficacy_results': {},
        'safety_results': {},
        'conclusion': '',
        'limitations': '',
        'sponsor': '',
        'conflict_of_interest': '',
        'key_tables': [],
        'key_figures': [],
    }
    
    full_text = text_result.get('full_text', '') if text_result else ''
    first_page = text_result.get('pages', [''])[0] if text_result else ''
    text_lower = full_text.lower()
    
    # 1. 从文件名解析
    fn_info = parse_filename(filename)
    
    # 2. 从文本提取标题
    text_title = extract_title_from_text(first_page)
    
    # 3. 确定最终标题
    if not is_garbled_text(text_title) and len(text_title) >= 15:
        # 判断是中文还是英文标题
        if re.search(r'[\u4e00-\u9fa5]', text_title):
            info['title_cn'] = text_title
        else:
            info['title_en'] = text_title
    
    # 如果中文标题不好，用文件名
    if is_garbled_text(info['title_cn']) or len(info['title_cn']) < 10:
        if fn_info['title_from_filename']:
            info['title_cn'] = fn_info['title_from_filename']
    
    # 设置第一作者
    if fn_info['first_author_cn']:
        info['first_author'] = fn_info['first_author_cn']
    
    # 4. 提取DOI
    doi_match = re.search(r'10\.\d{4,9}/[^\s,;)+]+', full_text)
    if doi_match:
        doi = doi_match.group(0).rstrip('.,;)')
        # 清理可能的错误字符
        doi = re.sub(r'[^\x20-\x7E]', '', doi)
        info['doi'] = doi
    
    # 5. 提取PMID
    pmid_match = re.search(r'PMID[:\s]+(\d{6,})', full_text, re.IGNORECASE)
    if pmid_match:
        info['pmid'] = pmid_match.group(1)
    
    # 6. 提取临床试验注册号
    trial_patterns = [
        r'(NCT\d{6,})',
        r'(ChiCTR[\w\-]+)',
        r'(CTR\d+)',
        r'注册号[:\s]+([\w\-]+)',
        r'clinicaltrials\.gov/ct2/show/(NCT\d+)',
    ]
    for pat in trial_patterns:
        trial_match = re.search(pat, full_text, re.IGNORECASE)
        if trial_match:
            info['trial_registration'] = trial_match.group(1)
            break
    
    # 7. 提取年份
    year_matches = re.findall(r'\b(199[0-9]|20[0-2][0-9])\b', full_text)
    if year_matches:
        years = [int(y) for y in year_matches if 1990 <= int(y) <= 2026]
        if years:
            # 取出现频率最高或最大的年份作为发表年
            from collections import Counter
            year_counts = Counter(years)
            most_common = year_counts.most_common(3)
            # 优先选择较近的年份
            info['year'] = max(y for y, c in most_common)
    
    # 8. 判断研究类型
    study_type_indicators = [
        (['randomized controlled trial', 'randomised controlled trial', '随机对照试验', '随机、双盲', '多中心、随机'], '随机对照试验', 'A'),
        (['real-world study', 'real world study', '真实世界研究', '真实世界', 'real-world'], '真实世界研究', 'B'),
        (['phase iii', 'phase 3', 'Ⅲ期', 'iii期临床'], 'Ⅲ期临床试验', 'A'),
        (['phase ii', 'phase 2', 'Ⅱ期', 'ii期临床'], 'Ⅱ期临床试验', 'B'),
        (['phase ib', 'phase 1b', 'Ⅰb期', 'ib期'], 'Ⅰb期临床试验', 'C'),
        (['phase i ', 'phase 1 ', 'Ⅰ期', 'i期临床', '一期临床'], 'Ⅰ期临床试验', 'C'),
        (['prospective cohort', '前瞻性队列', '队列研究'], '前瞻性队列研究', 'B'),
        (['retrospective', '回顾性'], '回顾性研究', 'C'),
        (['systematic review', 'meta-analysis', '系统综述', 'meta分析'], '系统综述/Meta分析', 'A'),
        (['review', '综述', '述评'], '综述/述评', 'C'),
        (['mechanism', 'pharmacokinetic', '药代动力学', '机制研究', '结构优势', 'pk/pd'], '机制/药代研究', 'D'),
        (['case report', '病例报告'], '病例报告', 'D'),
    ]
    
    for keywords, stype, elevel in study_type_indicators:
        if any(kw in text_lower for kw in keywords):
            info['study_type'] = stype
            info['evidence_level'] = elevel
            break
    
    # 9. 判断研究阶段
    phase_indicators = [
        (['phase ib', 'Ⅰb期', 'ib期'], 'Ⅰb期'),
        (['phase i', 'Ⅰ期', 'i期'], 'Ⅰ期'),
        (['phase ii', 'Ⅱ期', 'ii期'], 'Ⅱ期'),
        (['phase iii', 'Ⅲ期', 'iii期'], 'Ⅲ期'),
    ]
    
    for keywords, phase in phase_indicators:
        if any(kw in text_lower for kw in keywords):
            info['study_phase'] = phase
            break
    
    # 随访时间判断
    if not info['study_phase']:
        fu_weeks = []
        fu_patterns = [
            r'(\d+)\s*周',
            r'(\d+)-week',
            r'(\d+)\s*weeks?\s+(?:of\s+)?(?:treatment|follow-?up)',
        ]
        for pattern in fu_patterns:
            matches = re.findall(pattern, full_text, re.IGNORECASE)
            for m in matches:
                w = int(m)
                if 4 <= w <= 520:
                    fu_weeks.append(w)
        
        if fu_weeks:
            max_fu = max(fu_weeks)
            info['follow_up_weeks'] = max_fu
            if max_fu >= 144:
                info['study_phase'] = '144周/延长期'
            elif max_fu >= 96:
                info['study_phase'] = '96周随访'
            elif max_fu >= 48:
                info['study_phase'] = '48周分析'
            elif max_fu >= 24:
                info['study_phase'] = '24周分析'
    
    # 10. 判断中国研究
    china_keywords = [
        'china', '中国', 'chinese', '中华', '国内', '北京', '上海', '广州',
        '多中心', '三甲医院', '国家药品监督管理局', 'nmpa'
    ]
    if any(k in text_lower for k in china_keywords):
        info['is_china_study'] = True
        info['china_relevance'] = '中国直接证据'
    
    # 11. 提取样本量
    sample_patterns = [
        r'(\d+)\s*例(?:患者|慢性乙型肝炎|CHB|受试者)',
        r'(\d+)\s*patients?\s+with\s+(?:chronic|hepatitis)',
        r'(\d+)\s+patients\s+were\s+(?:enrolled|randomized|treated)',
        r'enrolled\s+(\d+)',
        r'randomized\s+(\d+)',
        r'共纳入\s*(\d+)',
        r'n\s*=\s*(\d+)',
        r'sample size\s*[:=]\s*(\d+)',
        r'纳入\s*(\d+)\s*例',
    ]
    for pattern in sample_patterns:
        matches = re.findall(pattern, full_text, re.IGNORECASE)
        if matches:
            nums = [int(m) for m in matches if 10 <= int(m) <= 10000]
            if nums:
                info['sample_size'] = max(nums)
                break
    
    # 12. 患者人群识别
    pop_keywords = {
        '初治': ['treatment-naive', 'naïve', 'naive', '初治', '未接受过治疗', '未接受过抗病毒'],
        '经治': ['treatment-experienced', '经治', '既往接受过', 'previously treated', '已接受治疗'],
        'ETV经治': ['entecavir', ' etv ', '恩替卡韦', '经etv', 'etv经治', 'etv治疗'],
        'TDF经治': ['tenofovir disoproxil', ' tdf ', '富马酸替诺福韦', '经tdf', 'tdf经治', 'tdf转换', 'tdf治疗'],
        'TAF经治': ['tenofovir alafenamide', ' taf ', '丙酚替诺福韦', '经taf', 'taf经治', 'taf转换', 'taf治疗'],
        '转换治疗': ['switch', '转换', '换用', '改为', 'transition', '转用', '序贯'],
        'HBeAg阳性': ['hbeag-positive', 'hbeag positive', 'hbeag(+)', 'hbeag 阳性', 'e抗原阳性', 'hbeag阳性'],
        'HBeAg阴性': ['hbeag-negative', 'hbeag negative', 'hbeag(-)', 'hbeag 阴性', 'e抗原阴性'],
        '高病毒载量': ['high viral load', '高病毒载量', '高载量', 'high hbv dna'],
        '低病毒血症': ['low-level viremia', ' llv ', '低病毒血症', '低病毒载量'],
        '不完全应答': ['partial response', '不完全应答', '应答不佳', 'suboptimal response', '部分应答'],
        '肝硬化': ['cirrhosis', '肝硬化', 'liver cirrhosis', 'hepatic cirrhosis', '代偿期', '失代偿期'],
        '老年': ['elderly', 'older patients', '老年', '年龄≥60', 'age≥60', '65岁以上', '60岁以上', '高龄'],
        '肾功能风险': ['renal', 'kidney', 'egfr', 'creatinine', '肾功能', '肾功', '血磷', 'renal impairment'],
        '骨代谢风险': ['bone mineral density', 'bmd', '骨密度', '骨代谢', 'bone safety', '骨折'],
        '血脂代谢': ['lipid', 'cholesterol', 'ldl', 'hdl', 'triglyceride', '血脂', '胆固醇', '甘油三酯', '脂质代谢'],
        '肝纤维化': ['fibrosis', '肝纤维化', 'fibrosis stage'],
    }
    
    populations = []
    for pop, keywords in pop_keywords.items():
        for kw in keywords:
            if kw.lower() in text_lower:
                populations.append(pop)
                break
    
    info['patient_population'] = list(set(populations)) if populations else ['未明确']
    
    # 13. 疗效结果提取
    efficacy = {}
    
    # HBV DNA应答率
    dna_patterns = [
        r'hbv dna.*?(?:<\s*(\d+)\s*(?:iu|copies)[^.]*?(?:应答率|转阴率|抑制率|rate).*?(\d+(?:\.\d+)?)\s*%)',
        r'(?:病毒学应答|hbv dna.*?应答).*?(\d+(?:\.\d+)?)\s*%',
        r'(\d+(?:\.\d+)?)\s*%.*?(?:病毒学应答|hbv dna.*?<)',
        r'virological response.*?(\d+(?:\.\d+)?)\s*%',
        r'hbv dna\s*<\s*20.*?(\d+(?:\.\d+)?)\s*%',
        r'hbv dna\s*<\s*200.*?(\d+(?:\.\d+)?)\s*%',
    ]
    for pat in dna_patterns:
        matches = re.findall(pat, full_text, re.IGNORECASE)
        if matches:
            # 提取百分比数值
            percentages = []
            for m in matches:
                if isinstance(m, tuple):
                    for val in m:
                        try:
                            v = float(val)
                            if 0 < v <= 100:
                                percentages.append(v)
                        except:
                            pass
                else:
                    try:
                        v = float(m)
                        if 0 < v <= 100:
                            percentages.append(v)
                    except:
                        pass
            if percentages:
                efficacy['hbv_dna_response_rates'] = sorted(list(set(percentages)), reverse=True)[:5]
                break
    
    # ALT复常率
    alt_patterns = [
        r'alt.*?(?:复常|normalization).*?(\d+(?:\.\d+)?)\s*%',
        r'(\d+(?:\.\d+)?)\s*%.*?alt.*?(?:复常|normal)',
        r'alt\s+normalization.*?(\d+(?:\.\d+)?)\s*%',
        r'丙氨酸氨基转移酶.*?复常.*?(\d+(?:\.\d+)?)\s*%',
    ]
    for pat in alt_patterns:
        matches = re.findall(pat, full_text, re.IGNORECASE)
        if matches:
            percentages = [float(m) for m in matches if 0 < float(m) <= 100]
            if percentages:
                efficacy['alt_normalization_rates'] = sorted(list(set(percentages)), reverse=True)[:5]
                break
    
    # HBeAg血清学转换
    hbeag_patterns = [
        r'hbeag.*?(?:血清学转换|seroconversion|血清转换).*?(\d+(?:\.\d+)?)\s*%',
        r'(\d+(?:\.\d+)?)\s*%.*?hbeag.*?(?:转换|seroconversion)',
        r'hbeag seroconversion.*?(\d+(?:\.\d+)?)\s*%',
    ]
    for pat in hbeag_patterns:
        matches = re.findall(pat, full_text, re.IGNORECASE)
        if matches:
            percentages = [float(m) for m in matches if 0 < float(m) <= 100]
            if percentages:
                efficacy['hbeag_seroconversion_rates'] = sorted(list(set(percentages)), reverse=True)[:5]
                break
    
    # HBsAg相关
    hbsag_clear = re.findall(r'hbsag.*?(?:清除|clearance|消失).*?(\d+(?:\.\d+)?)\s*%', full_text, re.IGNORECASE)
    if hbsag_clear:
        percentages = [float(m) for m in hbsag_clear if 0 < float(m) <= 100]
        if percentages:
            efficacy['hbsag_clearance_rates'] = sorted(list(set(percentages)), reverse=True)[:3]
    
    info['efficacy_results'] = efficacy
    
    # 14. 安全性结果提取
    safety = {}
    
    # 总体不良事件
    ae_patterns = [
        r'(?:总体不良事件|治疗相关不良事件|adverse events?|treatment-emergent).*?(\d+(?:\.\d+)?)\s*%',
        r'(\d+(?:\.\d+)?)\s*%.*?(?:不良事件|adverse event)',
    ]
    for pat in ae_patterns:
        matches = re.findall(pat, full_text, re.IGNORECASE)
        if matches:
            percentages = [float(m) for m in matches if 0 < float(m) <= 100]
            if percentages:
                safety['adverse_event_rates'] = sorted(list(set(percentages)), reverse=True)[:5]
                break
    
    # 严重不良事件
    sae_patterns = [
        r'(?:严重不良事件|serious adverse event|sae).*?(\d+(?:\.\d+)?)\s*%',
        r'(\d+(?:\.\d+)?)\s*%.*?(?:严重不良事件|sae)',
    ]
    for pat in sae_patterns:
        matches = re.findall(pat, full_text, re.IGNORECASE)
        if matches:
            percentages = [float(m) for m in matches if 0 < float(m) <= 100]
            if percentages:
                safety['serious_adverse_event_rates'] = sorted(list(set(percentages)), reverse=True)[:3]
                break
    
    # 肾安全性 - eGFR变化
    egfr_patterns = [
        r'egfr.*?(?:变化|change|下降|decline).*?([-+]?\d+(?:\.\d+)?)',
        r'([-+]?\d+(?:\.\d+)?).*?egfr.*?(?:变化|change)',
    ]
    for pat in egfr_patterns:
        matches = re.findall(pat, full_text, re.IGNORECASE)
        if matches:
            values = [float(m) for m in matches if -100 < float(m) < 100]
            if values:
                safety['egfr_changes'] = values[:5]
                break
    
    # 血磷变化
    phos_patterns = [
        r'(?:血磷|serum phosphate|phosphorus).*?(?:变化|change|下降).*?([-+]?\d+(?:\.\d+)?)',
    ]
    for pat in phos_patterns:
        matches = re.findall(pat, full_text, re.IGNORECASE)
        if matches:
            values = [float(m) for m in matches if -100 < float(m) < 100]
            if values:
                safety['phosphate_changes'] = values[:5]
                break
    
    # 血脂变化
    ldl_patterns = [
        r'ldl.*?(?:变化|change|升高|增加|下降).*?([-+]?\d+(?:\.\d+)?)',
        r'([-+]?\d+(?:\.\d+)?).*?ldl.*?(?:变化|change)',
    ]
    for pat in ldl_patterns:
        matches = re.findall(pat, full_text, re.IGNORECASE)
        if matches:
            values = [float(m) for m in matches if -100 < float(m) < 200]
            if values:
                safety['ldl_changes'] = values[:5]
                break
    
    tc_patterns = [
        r'(?:总胆固醇|total cholesterol|tc).*?(?:变化|change|升高|增加).*?([-+]?\d+(?:\.\d+)?)',
    ]
    for pat in tc_patterns:
        matches = re.findall(pat, full_text, re.IGNORECASE)
        if matches:
            values = [float(m) for m in matches if -100 < float(m) < 200]
            if values:
                safety['total_cholesterol_changes'] = values[:5]
                break
    
    info['safety_results'] = safety
    
    # 15. 提取结论
    conclusion_patterns = [
        r'(?:结论|conclusion)[\s：:]*([^\n。]{30,400})',
        r'(?:in conclusion|in summary|taken together)[\s，,]*([^\n.]{30,400})',
        r'(?:结果显示|results showed|our results)[\s，,]*([^\n。]{30,300})',
    ]
    for pattern in conclusion_patterns:
        match = re.search(pattern, full_text, re.IGNORECASE)
        if match:
            conclusion = match.group(1).strip()
            # 清理
            conclusion = re.sub(r'\s+', ' ', conclusion)
            info['conclusion'] = conclusion[:400]
            break
    
    # 16. 提取申办方/利益冲突
    sponsor_patterns = [
        r'(?:资助|sponsor|funded by|supported by)[:\s]+([^\n.。]{5,150})',
        r'(?:本研究由|the study was)[\s，,]*([^\n.。]{5,150})',
    ]
    for pattern in sponsor_patterns:
        match = re.search(pattern, full_text, re.IGNORECASE)
        if match:
            sponsor = match.group(1).strip()
            sponsor = re.sub(r'\s+', ' ', sponsor)
            info['sponsor'] = sponsor[:150]
            break
    
    # 利益冲突
    coi_patterns = [
        r'(?:利益冲突|conflict of interest|disclosure|competing interests)[:\s]+([^\n。]{5,250})',
    ]
    for pattern in coi_patterns:
        match = re.search(pattern, full_text, re.IGNORECASE)
        if match:
            coi = match.group(1).strip()
            coi = re.sub(r'\s+', ' ', coi)
            info['conflict_of_interest'] = coi[:250]
            break
    
    # 17. 提取期刊
    journal_patterns = [
        r'([\u4e00-\u9fa5]+杂志(?:[\u4e00-\u9fa5]+)?)',
        r'([A-Z][a-zA-Z]+\s+[A-Z][a-zA-Z]+)\s+\d{4}',
        r'(Journal of [A-Z][a-zA-Z]+)',
    ]
    for pat in journal_patterns:
        match = re.search(pat, first_page)
        if match:
            try:
                info['journal'] = match.group(1).strip()[:50]
            except IndexError:
                info['journal'] = match.group(0).strip()[:50]
            break
    
    # 18. 识别对照药物
    control_drugs = []
    if 'tenofovir disoproxil' in text_lower or 'tdf' in text_lower or '富马酸替诺福韦' in full_text:
        control_drugs.append('TDF/富马酸替诺福韦二吡呋酯')
    if 'tenofovir alafenamide' in text_lower or 'taf' in text_lower or '丙酚替诺福韦' in full_text:
        control_drugs.append('TAF/丙酚替诺福韦')
    if 'entecavir' in text_lower or 'etv' in text_lower or '恩替卡韦' in full_text:
        control_drugs.append('ETV/恩替卡韦')
    
    if control_drugs:
        info['control'] = '; '.join(control_drugs)
    
    # 19. 提取局限性
    limitation_patterns = [
        r'(?:局限性|limitations?|本研究的局限)[\s：:]*([^\n。]{30,300})',
        r'(?:however|nevertheless|本研究存在)[\s，,]*([^\n。]{30,200})',
    ]
    for pattern in limitation_patterns:
        match = re.search(pattern, full_text, re.IGNORECASE)
        if match:
            lim = match.group(1).strip()
            lim = re.sub(r'\s+', ' ', lim)
            info['limitations'] = lim[:300]
            break
    
    return info


def identify_study_entity(info, all_records):
    """识别研究实体ID（优化版）
    
    基于：
    1. 临床试验注册号（最强）
    2. 研究名称 + 样本量 + 治疗方案
    3. 第一作者 + 年份 + 标题关键词
    """
    trial_id = info.get('trial_registration', '').strip()
    
    # 1. 基于注册号
    if trial_id and trial_id.upper().startswith(('NCT', 'CHICTR', 'CTR')):
        return f"study_{trial_id.upper()}"
    
    # 2. 基于标题关键词 + 样本量
    title = info.get('title_cn', '') or info.get('title_en', '')
    sample = info.get('sample_size') or 0
    phase = info.get('study_phase', '')
    
    # 提取标题中的关键研究名称
    study_name_keywords = []
    
    # 检查是否是关键研究
    title_lower = title.lower()
    if 'promote' in title_lower or 'promote研究' in title:
        study_name_keywords.append('PROMOTE')
    if 'nct03903796' in title_lower:
        study_name_keywords.append('NCT03903796')
    
    # 基于研究特征生成ID
    if sample and sample > 50:
        # 大样本研究，用样本量+阶段作为特征
        feature = f"sample{sample}_phase{phase}"
    else:
        # 小样本，用标题hash
        title_norm = normalize_title(title)
        if title_norm:
            short_hash = hashlib.md5(title_norm[:40].encode()).hexdigest()[:8]
            feature = f"title_{short_hash}"
        else:
            feature = f"unknown_{info.get('filename', '')[:20]}"
    
    return f"study_{feature}"


def merge_study_entities(records):
    """归并研究实体 - 基于多维度判断"""
    # 先用注册号归并
    trial_groups = {}
    for i, rec in enumerate(records):
        trial = rec.get('trial_registration', '').strip().upper()
        if trial:
            if trial not in trial_groups:
                trial_groups[trial] = []
            trial_groups[trial].append(i)
    
    # 为每个记录分配研究实体ID
    study_ids = {}
    study_counter = 0
    
    # 处理注册号分组
    for trial, indices in trial_groups.items():
        study_counter += 1
        study_id = f"study_{study_counter:03d}_{trial}"
        for idx in indices:
            study_ids[idx] = study_id
    
    # 处理没有注册号的记录
    # 基于标题相似度和研究特征归并
    unassigned = [i for i in range(len(records)) if i not in study_ids]
    
    for i in unassigned:
        rec = records[i]
        matched = False
        
        # 尝试与已有研究匹配
        for j, sid in study_ids.items():
            if i >= len(records) or j >= len(records):
                continue
            
            # 比较研究特征
            rec_i = records[i]
            rec_j = records[j]
            
            # 相同样本量+相同研究类型+重叠人群
            if (rec_i.get('sample_size') == rec_j.get('sample_size') and 
                rec_i.get('sample_size') and
                rec_i.get('study_type') == rec_j.get('study_type') and
                rec_i.get('study_type') == '随机对照试验'):
                study_ids[i] = sid
                matched = True
                break
            
            # 标题关键词重叠
            title_i_words = set(normalize_title(rec_i.get('title_cn', '')))
            title_j_words = set(normalize_title(rec_j.get('title_cn', '')))
            if title_i_words and title_j_words:
                overlap = len(title_i_words & title_j_words)
                total = len(title_i_words | title_j_words)
                if total > 0 and overlap / total > 0.5:
                    study_ids[i] = sid
                    matched = True
                    break
        
        if not matched:
            study_counter += 1
            study_id = f"study_{study_counter:03d}"
            study_ids[i] = study_id
    
    return study_ids


def process_pdfs():
    """主处理函数（优化版）"""
    print("=" * 60)
    print("恒沐/TMF PDF文献处理（优化版）")
    print("=" * 60)
    
    # 查找所有PDF文件
    pdf_files = []
    
    # 同时检查附件目录和已有raw目录
    attachment_dir = Path(ATTACHMENT_DIR)
    if attachment_dir.exists():
        for f in attachment_dir.iterdir():
            if f.suffix.lower() == '.pdf':
                pdf_files.append(f)
    
    # 也检查raw目录（已复制的PDF）
    raw_dir = Path(PDF_RAW_DIR)
    if raw_dir.exists():
        for f in raw_dir.iterdir():
            if f.suffix.lower() == '.pdf':
                # 避免重复
                if not any(f.name == pf.name for pf in pdf_files):
                    pdf_files.append(f)
    
    print(f"找到 {len(pdf_files)} 个PDF文件")
    
    # 加载已有manifest（增量处理）
    existing_manifest = None
    if os.path.exists(MANIFEST_PATH):
        with open(MANIFEST_PATH, 'r', encoding='utf-8') as f:
            existing_manifest = json.load(f)
        print(f"已有导入批次: {existing_manifest.get('batch_id', 'unknown')}")
        print(f"已有文献: {existing_manifest.get('total_files', 0)} 篇")
    
    # 计算每个文件的SHA-256并处理
    records = []
    existing_shas = set()
    
    # 收集已有SHA
    if existing_manifest:
        for f in existing_manifest.get('files', []):
            if f.get('sha256'):
                existing_shas.add(f['sha256'])
    
    parsed_success = 0
    parsed_failed = 0
    new_count = 0
    existing_count = 0
    
    os.makedirs(PDF_RAW_DIR, exist_ok=True)
    os.makedirs(PDF_EXTRACTED_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(MANIFEST_PATH), exist_ok=True)
    
    for pdf_path in sorted(pdf_files):
        filename = pdf_path.name
        sha = sha256_file(str(pdf_path))
        
        # 检查是否已处理
        if sha in existing_shas:
            existing_count += 1
            # 从已有manifest加载
            if existing_manifest:
                for f in existing_manifest.get('files', []):
                    if f.get('sha256') == sha:
                        records.append(f)
                        break
            print(f"  [已存在] {filename[:50]}...")
            continue
        
        print(f"  [新文件] {filename[:60]}...")
        new_count += 1
        
        # 复制PDF到raw目录（如果不在那里）
        dest_path = os.path.join(PDF_RAW_DIR, filename)
        if str(pdf_path) != dest_path:
            shutil.copy2(str(pdf_path), dest_path)
        
        # 提取文本
        text_result = extract_pdf_text(dest_path, max_pages=40)
        
        if text_result['success']:
            parsed_success += 1
            
            # 保存提取的文本
            txt_filename = filename.replace('.pdf', '.txt')
            txt_path = os.path.join(PDF_EXTRACTED_DIR, txt_filename)
            with open(txt_path, 'w', encoding='utf-8') as f:
                f.write(text_result['full_text'][:80000])
            
            # 提取结构化信息
            basic_info = extract_basic_info(filename, text_result)
            basic_info['sha256'] = sha
            basic_info['pdf_pages'] = text_result['total_pages']
            basic_info['parse_status'] = 'success'
            
            records.append(basic_info)
        else:
            parsed_failed += 1
            records.append({
                'filename': filename,
                'sha256': sha,
                'parse_status': 'failed',
                'parse_error': text_result['error'],
            })
    
    # 研究实体归并
    success_records = [r for r in records if r.get('parse_status') == 'success']
    study_ids = merge_study_entities(success_records)
    
    # 构建研究实体信息
    study_entities = {}
    for idx, rec in enumerate(success_records):
        sid = study_ids.get(idx, f"study_unknown_{idx}")
        if sid not in study_entities:
            study_entities[sid] = {
                'study_id': sid,
                'publications': [],
                'patient_population': set(),
                'study_phases': set(),
                'study_types': set(),
                'total_sample_size': 0,
                'max_follow_up_weeks': 0,
                'highest_evidence_level': 'D',
                'trial_registration': '',
                'publication_years': set(),
            }
        
        se = study_entities[sid]
        se['publications'].append(rec.get('filename', ''))
        
        for pop in rec.get('patient_population', []):
            se['patient_population'].add(pop)
        
        if rec.get('study_phase'):
            se['study_phases'].add(rec['study_phase'])
        
        if rec.get('study_type'):
            se['study_types'].add(rec['study_type'])
        
        if rec.get('sample_size'):
            se['total_sample_size'] = max(se['total_sample_size'], rec['sample_size'])
        
        if rec.get('follow_up_weeks'):
            se['max_follow_up_weeks'] = max(se['max_follow_up_weeks'], rec['follow_up_weeks'])
        
        if rec.get('year'):
            se['publication_years'].add(rec['year'])
        
        if rec.get('trial_registration'):
            se['trial_registration'] = rec['trial_registration']
        
        # 证据等级取最高
        level_order = {'A': 4, 'B': 3, 'C': 2, 'D': 1}
        if rec.get('evidence_level'):
            if level_order.get(rec['evidence_level'], 0) > level_order.get(se['highest_evidence_level'], 0):
                se['highest_evidence_level'] = rec['evidence_level']
    
    # 转换set为list并排序
    for se in study_entities.values():
        se['patient_population'] = sorted(list(se['patient_population']))
        se['study_phases'] = sorted(list(se['study_phases']))
        se['study_types'] = sorted(list(se['study_types']))
        se['publication_years'] = sorted(list(se['publication_years']))
        se['publication_count'] = len(se['publications'])
    
    # 生成批次manifest
    batch_id = f"TMF-{datetime.now().strftime('%Y%m%d')}-01"
    manifest = {
        'batch_id': batch_id,
        'total_files': len(pdf_files),
        'new_files_this_batch': new_count,
        'existing_files': existing_count,
        'parsed_success': parsed_success,
        'parsed_failed': parsed_failed,
        'total_literature': len([r for r in records if r.get('parse_status') == 'success']),
        'duplicate_literature': 0,
        'study_entity_count': len(study_entities),
        'completed_at': datetime.now().isoformat(),
        'files': records,
    }
    
    # 保存manifest
    with open(MANIFEST_PATH, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    
    # 保存文献记录
    lit_records = []
    for i, rec in enumerate(success_records):
        sid = study_ids.get(i, f"study_unknown_{i}")
        lit = {
            'id': f"tmf_{i+1:03d}",
            'source_id': f"tmf_{i+1:03d}",
            'filename': rec.get('filename', ''),
            'sha256': rec.get('sha256', ''),
            'title_cn': rec.get('title_cn', ''),
            'title_en': rec.get('title_en', ''),
            'first_author': rec.get('first_author', ''),
            'authors': rec.get('authors', ''),
            'journal': rec.get('journal', ''),
            'year': rec.get('year'),
            'pmid': rec.get('pmid', ''),
            'doi': rec.get('doi', ''),
            'trial_registration': rec.get('trial_registration', ''),
            'study_type': rec.get('study_type', ''),
            'study_phase': rec.get('study_phase', ''),
            'evidence_level': rec.get('evidence_level', 'C'),
            'is_china_study': rec.get('is_china_study', False),
            'china_relevance': rec.get('china_relevance', ''),
            'sample_size': rec.get('sample_size'),
            'tmf_group_size': rec.get('tmf_group_size'),
            'control_group_size': rec.get('control_group_size'),
            'intervention': rec.get('intervention', 'TMF/艾米替诺福韦'),
            'control': rec.get('control', ''),
            'follow_up_weeks': rec.get('follow_up_weeks'),
            'patient_population': rec.get('patient_population', []),
            'prior_treatment': rec.get('prior_treatment', ''),
            'primary_endpoints': rec.get('primary_endpoints', []),
            'secondary_endpoints': rec.get('secondary_endpoints', []),
            'efficacy_results': rec.get('efficacy_results', {}),
            'safety_results': rec.get('safety_results', {}),
            'conclusion': rec.get('conclusion', ''),
            'limitations': rec.get('limitations', ''),
            'sponsor': rec.get('sponsor', ''),
            'conflict_of_interest': rec.get('conflict_of_interest', ''),
            'key_tables': rec.get('key_tables', []),
            'key_figures': rec.get('key_figures', []),
            'pdf_pages': rec.get('pdf_pages', 0),
            'parse_status': 'ai_parsed',
            'review_status': '待人工审核',
            'study_entity_id': sid,
            'product_name': '恒沐®',
            'product_generic_name': '艾米替诺福韦片（TMF）',
            'display_in_web': True,
        }
        lit_records.append(lit)
    
    literature_data = {
        'total': len(lit_records),
        'records': lit_records,
        'generated_at': datetime.now().isoformat(),
        'batch_id': batch_id,
    }
    
    with open(LITERATURE_PATH, 'w', encoding='utf-8') as f:
        json.dump(literature_data, f, ensure_ascii=False, indent=2)
    
    # 保存研究实体
    studies_list = sorted(study_entities.values(), key=lambda x: x['study_id'])
    studies_data = {
        'total': len(studies_list),
        'studies': studies_list,
        'generated_at': datetime.now().isoformat(),
    }
    
    with open(STUDIES_PATH, 'w', encoding='utf-8') as f:
        json.dump(studies_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n{'='*60}")
    print(f"[处理完成]")
    print(f"  PDF文件总数: {len(pdf_files)} 个")
    print(f"  新增文件: {new_count} 个")
    print(f"  已有文件: {existing_count} 个")
    print(f"  解析成功: {parsed_success} 篇")
    print(f"  解析失败: {parsed_failed} 篇")
    print(f"  研究实体: {len(study_entities)} 项")
    print(f"  Manifest: {MANIFEST_PATH}")
    print(f"  文献数据: {LITERATURE_PATH}")
    print(f"  研究实体: {STUDIES_PATH}")
    print(f"{'='*60}")
    
    return True


if __name__ == '__main__':
    success = process_pdfs()
    import sys
    sys.exit(0 if success else 1)
