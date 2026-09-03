// src/utils/exportResume.ts
//
// 简历导出（Word）：不再依赖 public/resume_template.docx 的段落 ID 魔法，
// 整个 .docx 包在这里从零构建，版式与后端 PDF 同一设计语言
// （深蓝横幅 + 双列信息栅格 + 品牌色小节）。
//
// 这份文件同时是「离线填写模板」：所有字段都以「标签：值」输出，空字段留白，
// 用户在 Word 里填完，回到投递页导入即可按标签回填（importResume.ts 按同一组
// 标签正则解析——两边的标签必须逐字一致，改动要成对改）。
import JSZip from 'jszip';
import { message } from 'antd';
import { request } from '@/utils';
import logoMarkUrl from '@/assets/logo-mark.png';

export interface ResumeExportData {
  name: string; studentId: string; gender: string; grade: string;
  major: string; email: string; phone: string; github: string;
  firstDepartment: string; secondDepartment: string;
  selfIntroduction: string; reason: string; introduction?: string;
  techStack: string[]; projectExperience: string;
  photoBase64?: string;
  interviewTimes?: { first: string; second: string; canAttend: 'yes' | 'no' };
}

export function buildExportData(
  fieldIdMapping: Record<string, number>,
  fieldValueMap: Map<number, { fieldValue?: unknown } | string>,
  departments: { first: string; second: string },
  techStackItems: string[],
  photoBase64?: string,
): ResumeExportData {
  const getVal = (key: string): string => {
    const id = fieldIdMapping[key];
    if (!id) return '';
    const raw = fieldValueMap.get(id);
    if (raw == null) return '';
    // fieldValueMap 实际存的是 FieldValueItem 对象，取其中的 fieldValue；
    // 兼容直接存字符串的情况
    const v = typeof raw === 'object' ? (raw as { fieldValue?: unknown }).fieldValue : raw;
    return v == null ? '' : String(v);
  };
  // 两层都要防：字段值可能不是 JSON 数组，传进来的 techStackItems 也可能不是数组。
  // 线上崩过一次 —— 某字段存的是 123，JSON.parse 得到数字后被塞进 techStackItems，
  // 这里的 techStackItems.filter 直接 TypeError 把整页打白。
  // 本函数是导出用的公共工具，不该因为调用方传了脏数据就崩。
  const safeItems = Array.isArray(techStackItems) ? techStackItems.filter(Boolean) : [];
  let techStack: string[] = [];
  try {
    const r = getVal('tech_stack');
    const parsed = r ? JSON.parse(r) : [];
    techStack = Array.isArray(parsed) ? parsed : safeItems;
  } catch {
    techStack = safeItems;
  }
  let it: ResumeExportData['interviewTimes'];
  try { const r = getVal('expected_interview_time'); if (r) { const p = JSON.parse(r); it = { first: p.first || '', second: p.second || '', canAttend: p.canAttend === 'no' ? 'no' : 'yes' }; } } catch {}
  return {
    name: getVal('name'), studentId: getVal('student_id'), gender: getVal('gender'),
    grade: getVal('grade'), major: getVal('major'), email: getVal('email'),
    phone: getVal('phone'), github: getVal('github'),
    firstDepartment: departments.first || '', secondDepartment: departments.second || '',
    selfIntroduction: getVal('self_introduction'), reason: getVal('reason'),
    introduction: getVal('introduction'),
    techStack, projectExperience: getVal('project_experience'),
    photoBase64: photoBase64 || '', interviewTimes: it,
  };
}

/** 管理端从 ResumeDTO.simpleFields（字段标签→值）拼导出数据，与投递页共用同一台 Word 生成器 */
export function buildExportDataFromSimpleFields(
  simpleFields: Array<{ fieldLabel?: string; fieldValue?: string }> | undefined,
  fallback?: { userName?: string; userEmail?: string },
): ResumeExportData {
  const byLabel = new Map<string, string>();
  (simpleFields ?? []).forEach((f) => {
    if (f.fieldLabel && f.fieldValue != null) byLabel.set(f.fieldLabel, String(f.fieldValue));
  });
  const val = (...labels: string[]) => {
    for (const label of labels) {
      const v = byLabel.get(label);
      if (v && v.trim()) return v;
    }
    return '';
  };
  const parseArr = (raw: string): string[] => {
    try { const p = JSON.parse(raw); return Array.isArray(p) ? p.map(String) : []; } catch { return []; }
  };
  const depts = parseArr(val('期望部门'));
  const photo = [...byLabel.values()].find((v) => v.startsWith('data:image/')) ?? '';
  return {
    name: val('姓名') || fallback?.userName || '',
    studentId: val('学号'), gender: val('性别'), grade: val('年级'), major: val('专业'),
    email: val('邮箱') || fallback?.userEmail || '',
    phone: val('手机号', '电话', '手机'), github: val('GitHub主页', 'GitHub'),
    firstDepartment: depts[0] ?? val('第一志愿'), secondDepartment: depts[1] ?? val('第二志愿'),
    // 自我介绍与个人简介是两个独立字段，各自成节。
    // 原来 selfIntroduction 回落到「个人简介」——两者都填时，个人简介
    // 会被静默丢掉（查看视图也有同样的毛病，一并修了）。
    selfIntroduction: val('自我介绍'),
    introduction: val('个人简介'),
    reason: val('加入理由', '加入原因'),
    techStack: parseArr(val('技术栈')),
    projectExperience: val('项目经验'),
    photoBase64: photo,
  };
}

// ─── OOXML 构件 ──────────────────────────────────────────────────────────────

/** 设计令牌：与后端 PdfExportUtil 的配色保持同一语言 */
const C = {
  brand: '1F3A60',      // 深蓝横幅
  brandSub: 'C8D7EB',   // 横幅副标题
  accent: '1F76CC',     // 品牌蓝（小节标题/竖条）
  label: '6E7887',      // 标签灰
  text: '232830',       // 正文深色
  body: '373E48',       // 长文本
  line: 'E1E8F0',       // 浅分隔线
  hint: '9AA3AF',       // 提示灰
} as const;

function escXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** 把可能含 \n 的多行文本拆成 <w:t>/<w:br/> 片段（OOXML 里换行必须用 <w:br/>） */
function runInner(text: unknown): string {
  const s = text == null ? '' : String(text);
  return s
    .split('\n')
    .map((seg, i) => (i === 0 ? '' : '<w:br/>') + `<w:t xml:space="preserve">${escXml(seg)}</w:t>`)
    .join('');
}

interface RunOpts { bold?: boolean; color?: string; sz?: number; }

function run(text: unknown, opts: RunOpts = {}): string {
  const { bold = false, color = C.text, sz = 21 } = opts;
  const b = bold ? '<w:b/><w:bCs/>' : '';
  return `<w:r><w:rPr><w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI" w:eastAsia="微软雅黑"/>${b}<w:color w:val="${color}"/><w:sz w:val="${sz}"/></w:rPr>${runInner(text)}</w:r>`;
}

interface ParaOpts {
  align?: 'center' | 'left' | 'right';
  /** 行距（240=单倍），长文本用 360 */
  line?: number;
  before?: number; after?: number;
  /** 左侧品牌色竖条（小节标题用） */
  accentBar?: boolean;
}

function para(inner: string, opts: ParaOpts = {}): string {
  const { align, line, before, after, accentBar } = opts;
  const jc = align ? `<w:jc w:val="${align}"/>` : '';
  const spacing = `<w:spacing${before != null ? ` w:before="${before}"` : ''}${after != null ? ` w:after="${after}"` : ''}${line != null ? ` w:line="${line}" w:lineRule="auto"` : ''}/>`;
  const bar = accentBar
    ? `<w:pBdr><w:left w:val="single" w:sz="18" w:space="6" w:color="${C.accent}"/></w:pBdr>`
    : '';
  return `<w:p><w:pPr>${spacing}${bar}${jc}</w:pPr>${inner}</w:p>`;
}

/** 「标签：值」——同一段落输出，保证导入侧 mammoth/pdf.js 提取出「标签：值」整行 */
function labeledPara(label: string, value: string, opts: ParaOpts = {}): string {
  return para(
    run(`${label}：`, { color: C.label, sz: 19 }) + run(value ?? '', { bold: true, color: C.text, sz: 21 }),
    { after: 60, ...opts },
  );
}

/** 表格单元格：可设底部浅线与内边距 */
function cell(innerParas: string, opts: { width?: number; bottomLine?: boolean; fill?: string; vAlign?: string } = {}): string {
  const { width, bottomLine = false, fill, vAlign } = opts;
  const w = width != null ? `<w:tcW w:w="${width}" w:type="dxa"/>` : '<w:tcW w:w="0" w:type="auto"/>';
  const borders = `<w:tcBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:right w:val="nil"/><w:bottom w:val="${bottomLine ? 'single' : 'nil'}"${bottomLine ? ` w:sz="4" w:color="${C.line}"` : ''}/></w:tcBorders>`;
  const shd = fill ? `<w:shd w:val="clear" w:fill="${fill}"/>` : '';
  const va = vAlign ? `<w:vAlign w:val="${vAlign}"/>` : '';
  const margins = '<w:tcMar><w:top w:w="110" w:type="dxa"/><w:bottom w:w="110" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar>';
  return `<w:tc><w:tcPr>${w}${borders}${shd}${va}${margins}</w:tcPr>${innerParas}</w:tc>`;
}

function table(rows: string[], opts: { widths?: number[] } = {}): string {
  const grid = opts.widths
    ? `<w:tblGrid>${opts.widths.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>`
    : '';
  return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr>${grid}${rows.join('')}</w:tbl>`;
}

function base64ToUint8(b64: string): Uint8Array {
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/** 照片 drawing（内联图片，3:4 证件照比例） */
function photoDrawing(relId: string): string {
  const emuW = 1080000, emuH = 1440000; // ~30×40mm
  return `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="${emuW}" cy="${emuH}"/><wp:docPr id="101" name="photo"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="101" name="photo"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${emuW}" cy="${emuH}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`;
}

/**
 * 社徽 drawing。跟在副标题「博远信息技术社」前面，与文字同高，
 * 不单独占一行——文档的主角是姓名，logo 只是署名，和 PDF 导出保持一致。
 */
function logoDrawing(relId: string): string {
  // 1pt = 12700 EMU；副标题 sz:19（=9.5pt），社徽取 12pt 略高于文字
  const emuH = 12 * 12700;
  const emuW = Math.round((emuH * LOGO_ASPECT));
  return `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="${emuW}" cy="${emuH}"/><wp:docPr id="102" name="logo"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="102" name="logo"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${emuW}" cy="${emuH}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`;
}

/** 裁掉留白后的社徽宽高比（116×120）。 */
const LOGO_ASPECT = 116 / 120;

/**
 * 取打包进来的社徽字节。走 fetch 而不是把 base64 硬编进源码：
 * 这个图本来就是站点左上角那枚，浏览器早已缓存，读它不产生额外网络往返。
 * 拿不到就返回 null——少一个 logo 不该让简历导不出来。
 */
async function loadLogoBytes(): Promise<Uint8Array | null> {
  try {
    const res = await fetch(logoMarkUrl);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/** 组装 word/document.xml 正文。extras：本周期的自定义字段（标签→值），跟随简历字段配置 */
function buildDocumentXml(data: ResumeExportData, hasPhoto: boolean, extras: Array<[string, string]> = [], hasLogo = false): string {
  const body: string[] = [];

  // ── 页眉区：大号姓名 + 灰色副标题，右侧证件照；不用大色块，打印件更耐看 ──
  const nameShown = data.name || '（姓名）';
  const headLeft = cell(
    para(run(nameShown, { bold: true, color: C.text, sz: 52 }), { after: 60 })
    + para((hasLogo ? logoDrawing('rIdLogo') + run(' ', { sz: 19 }) : '')
        + run('博远信息技术社 · 招新申请简历', { color: C.accent, sz: 19 })),
    { vAlign: 'center' },
  );
  const headCells = hasPhoto
    ? headLeft + cell(para(photoDrawing('rIdPhoto'), { align: 'right' }), { vAlign: 'center', width: 1900 })
    : headLeft;
  body.push(table([`<w:tr>${headCells}</w:tr>`], hasPhoto ? { widths: [7700, 1900] } : undefined));

  // 品牌色粗分隔线：靠段落底边框画，比色块横幅克制
  body.push(`<w:p><w:pPr><w:spacing w:before="60" w:after="40"/><w:pBdr><w:bottom w:val="single" w:sz="14" w:space="1" w:color="${C.accent}"/></w:pBdr></w:pPr></w:p>`);

  // ── 填写说明：这份文件同时是离线填写模板 ──
  body.push(para(
    run('本文件可离线填写：在各「标签：」后补全内容并保存，回到官网「简历投递」页点「导入已填写的文件」即可自动回填。', { color: C.hint, sz: 16 }),
    { before: 60, after: 200 },
  ));

  // ── 基本信息栅格：两列，浅底线分行 ──
  const pairs: Array<[string, string]> = [
    ['姓名', data.name], ['学号', data.studentId],
    ['性别', data.gender], ['年级', data.grade],
    ['专业', data.major], ['邮箱', data.email],
    ['手机号', data.phone], ['GitHub', data.github],
    ['第一志愿', data.firstDepartment], ['第二志愿', data.secondDepartment],
  ];
  const rows: string[] = [];
  for (let i = 0; i < pairs.length; i += 2) {
    const left = pairs[i];
    const right = pairs[i + 1];
    rows.push(`<w:tr>${
      cell(labeledPara(left[0], left[1]), { bottomLine: true })
    }${
      right ? cell(labeledPara(right[0], right[1]), { bottomLine: true }) : cell(para(run('')), { bottomLine: true })
    }</w:tr>`);
  }
  // 技术栈单独一行贯通两列（顿号分隔，导入侧按同格式拆回数组）
  rows.push(`<w:tr>${cell(labeledPara('技术栈', data.techStack.join('、')), { bottomLine: true })}${cell(para(run('')), { bottomLine: true })}</w:tr>`);
  body.push(table(rows, { widths: [4800, 4800] }));

  // ── 长文小节：品牌色竖条标题（标题带冒号，导入按标签取到下一小节前）──
  // 顺序与 resumeFieldRegistry 一致（自我介绍 10 → 加入理由 11 → 个人简介 12
  // → 项目经验 20）。原来是「自我介绍 / 项目经验 / 加入理由」，与配置抽屉、
  // 投递表单、查看视图各不相同；「个人简介」更是整个漏在导出之外。
  const sections: Array<[string, string]> = [
    ['自我介绍', data.selfIntroduction],
    ['加入理由', data.reason],
    ['个人简介', data.introduction ?? ''],
    ['项目经验', data.projectExperience],
  ];
  for (const [title, content] of sections) {
    body.push(para(run(`${title}：`, { bold: true, color: C.accent, sz: 23 }), { before: 300, after: 110, accentBar: true }));
    // 空小节输出空行而不是占位文案——占位文字会被「导入」当成真实内容回填
    body.push(para(run(content || '', { color: C.body, sz: 21 }), { line: 380, after: 120 }));
    if (!content) body.push(para(run(''), { after: 120 }));
  }

  // ── 本周期的自定义字段：简历字段是按周期配置的，导出跟着配置走，不漏字段 ──
  if (extras.length > 0) {
    body.push(para(run('其他信息：', { bold: true, color: C.accent, sz: 23 }), { before: 300, after: 110, accentBar: true }));
    for (const [label, value] of extras) {
      body.push(labeledPara(label, value, { after: 90 }));
    }
  }

  const sect = '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1000" w:right="1100" w:bottom="1000" w:left="1100" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body.join('')}${sect}</w:body></w:document>`;
}

async function buildDocx(data: ResumeExportData, extras: Array<[string, string]> = []): Promise<Blob> {
  const zip = new JSZip();
  const photo = data.photoBase64?.match(/^data:image\/(\w+);base64,(.+)$/) || null;
  const ext = photo ? (photo[1] === 'png' ? 'png' : 'jpeg') : null;
  const logo = await loadLogoBytes();

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${ext && ext !== 'png' ? `<Default Extension="${ext}" ContentType="image/jpeg"/>` : ''}${ext === 'png' || logo ? '<Default Extension="png" ContentType="image/png"/>' : ''}<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);

  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);

  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${photo ? `<Relationship Id="rIdPhoto" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/photo.${ext}"/>` : ''}${logo ? '<Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.png"/>' : ''}</Relationships>`);

  if (photo) zip.file(`word/media/photo.${ext}`, base64ToUint8(photo[2]));
  if (logo) zip.file('word/media/logo.png', logo);

  zip.file('word/document.xml', buildDocumentXml(data, !!photo, extras, !!logo));
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

/** 仅供测试：验证手拼 OOXML 的包结构（Word 对畸形包零容忍） */
export const __buildDocxForTest = buildDocx;

function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export async function exportResumeAsDOCX(data: ResumeExportData, extras: Array<[string, string]> = []): Promise<void> {
  try {
    const blob = await buildDocx(data, extras);
    const empty = !data.name && !data.studentId && !data.selfIntroduction;
    saveBlob(blob, empty ? '博远招新简历模板.docx' : `博远招新简历_${data.name || '未命名'}.docx`);
    message.success(empty ? '空白模板已导出，填写后可导入自动回填' : 'Word 简历导出成功');
  } catch (e: any) { console.error(e); message.error(e?.message || '导出失败'); }
}

/** 后端渲染的 PDF（与 Word 同一版式语言），本人或管理员可导 */
export async function exportResumeAsPDF(resumeId: number, name?: string): Promise<void> {
  try {
    const res: any = await request({
      url: `/api/resumes/export/pdf/${resumeId}`,
      method: 'get',
      responseType: 'blob',
    });
    const blob: Blob = res?.data instanceof Blob ? res.data : res;
    saveBlob(blob, name ? `博远招新简历_${name}.pdf` : `博远招新简历_${resumeId}.pdf`);
    message.success('PDF 简历导出成功');
  } catch (e: any) {
    console.error(e);
    message.error(e?.message || 'PDF 导出失败');
  }
}
