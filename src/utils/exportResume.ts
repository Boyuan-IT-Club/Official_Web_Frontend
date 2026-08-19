// src/utils/exportResume.ts
import JSZip from 'jszip';
import { message } from 'antd';

export interface ResumeExportData {
  name: string; studentId: string; gender: string; grade: string;
  major: string; email: string; phone: string; github: string;
  firstDepartment: string; secondDepartment: string;
  selfIntroduction: string; reason: string;
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
    techStack, projectExperience: getVal('project_experience'),
    photoBase64: photoBase64 || '', interviewTimes: it,
  };
}

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

/** 构造一个 run 元素（支持多行、字号、颜色、加粗）。text 可为非字符串，内部会做 String 转换 */
function run(text: unknown, opts: RunOpts = {}): string {
  const { bold = false, color = '262626', sz = 21 } = opts;
  const b = bold ? '<w:b/><w:bCs/>' : '';
  return `<w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="微软雅黑"/>${b}<w:color w:val="${color}"/><w:sz w:val="${sz}"/></w:rPr>${runInner(text)}</w:r>`;
}

/** 「标签：值」两个 run，标签加粗、值深色 */
function labelValue(label: string, value: unknown, sz: number): string {
  const labelColor = sz === 20 ? '595959' : '262626';
  return run(label, { bold: true, color: labelColor, sz }) + run(value, { color: '262626', sz });
}

/** 构造一个段落（center=居中，left=左对齐） */
function paragraph(inner: string, align: 'center' | 'left' = 'center'): string {
  const jc = align === 'center' ? '<w:jc w:val="center"/>' : '';
  return `<w:p><w:pPr>${jc}</w:pPr>${inner}</w:p>`;
}

/** 取出单元格的 <w:tcPr>（保留列宽/合并/边框等属性） */
function cellPr(cellXml: string): string {
  const m = cellXml.match(/<w:tcPr[\s\S]*?<\/w:tcPr>/);
  return m ? m[0] : '';
}

/** 用新内容整体重写单元格，仅保留 <w:tcPr> */
function rewriteCell(cellXml: string, innerXml: string): string {
  return `<w:tc>${cellPr(cellXml)}${innerXml}</w:tc>`;
}

/** 替换指定 paraId 段落的 run 内容，保留其 pPr（缩进/行距/边框等） */
function replacePara(xml: string, paraId: string, innerXml: string): string {
  const re = new RegExp(`<w:p w14:paraId="${paraId}"[^>]*>[\\s\\S]*?</w:p>`);
  const m = xml.match(re);
  if (!m) return xml;
  const pPr = (m[0].match(/<w:pPr[\s\S]*?<\/w:pPr>/) || [''])[0];
  return xml.replace(re, `<w:p w14:paraId="${paraId}">${pPr}${innerXml}</w:p>`);
}

/** 从 base64 中提取二进制数据 */
function base64ToUint8(b64: string): Uint8Array {
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

// 社团简历.docx（官方列表版模板）里各值段落的 paraId
const PID = {
  name: '12ACC151',
  studentId: '504F9911',
  gender: '73CF0EA6',
  major: '66303FE3',
  grade: '7FD7AD0F',
  github: '6522EAB5',
  email: '6E40EF02',
  phone: '463C10B1',
  firstDept: '73170630',
  secondDept: '257BBD37',
  interview: '7ADCF665',
  tech: '4016DA15',
  intro: '46C9D947',
} as const;

async function fillTemplate(data: ResumeExportData): Promise<Blob> {
  const resp = await fetch('/resume_template.docx');
  if (!resp.ok) throw new Error('模板加载失败');
  const zip = await JSZip.loadAsync(await resp.arrayBuffer());
  let xml = await zip.file('word/document.xml')!.async('string');

  // 各字段「有值才替换」，无值保留模板占位符原样
  if (data.name) {
    xml = replacePara(xml, PID.name,
      run(data.name, { bold: true, color: '2060C0', sz: 44 }));
  }
  if (data.studentId) xml = replacePara(xml, PID.studentId, labelValue('学号：', String(data.studentId), 20));
  if (data.gender) xml = replacePara(xml, PID.gender, labelValue('性别：', data.gender, 20));
  if (data.major) xml = replacePara(xml, PID.major, labelValue('专业：', data.major, 20));
  if (data.grade) xml = replacePara(xml, PID.grade, labelValue('年级：', data.grade, 20));
  if (data.github) xml = replacePara(xml, PID.github, labelValue('GitHub主页：', data.github, 20));

  if (data.email) xml = replacePara(xml, PID.email, labelValue('邮箱：', data.email, 21));
  if (data.phone) xml = replacePara(xml, PID.phone, labelValue('手机号：', data.phone, 21));

  if (data.firstDepartment) xml = replacePara(xml, PID.firstDept, labelValue('第一志愿：', data.firstDepartment, 21));
  if (data.secondDepartment) xml = replacePara(xml, PID.secondDept, labelValue('第二志愿：', data.secondDepartment, 21));
  if (data.interviewTimes) {
    const can = data.interviewTimes.canAttend === 'no' ? '不能参加' : '能参加';
    xml = replacePara(xml, PID.interview, labelValue('能否参加线下面试：', can, 21));
  }

  const techLines: string[] = [];
  if (data.techStack.length) techLines.push('技术栈：' + data.techStack.join('、'));
  if (data.projectExperience) techLines.push('项目经验：' + data.projectExperience);
  if (techLines.length) xml = replacePara(xml, PID.tech, run(techLines.join('\n'), { sz: 21 }));

  const introLines: string[] = [];
  if (data.selfIntroduction) introLines.push(data.selfIntroduction);
  if (data.reason) introLines.push('加入理由：' + data.reason);
  if (introLines.length) xml = replacePara(xml, PID.intro, run(introLines.join('\n'), { sz: 21 }));

  // ─── 照片 ───
  if (data.photoBase64) {
    const m = data.photoBase64.match(/^data:image\/(\w+);base64,(.+)$/);
    if (m) {
      const ext = m[1] === 'png' ? 'png' : 'jpeg';
      zip.file(`word/media/image1.${ext}`, base64ToUint8(m[2]));
      // 更新 relationships
      let rels = await zip.file('word/_rels/document.xml.rels')!.async('string');
      rels = rels.replace('</Relationships>',
        `<Relationship Id="rId10" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.${ext}"/></Relationships>`);
      zip.file('word/_rels/document.xml.rels', rels);
      // 更新 content types
      let ct = await zip.file('[Content_Types].xml')!.async('string');
      if (!ct.includes(`Extension="${ext}"`)) {
        ct = ct.replace('</Types>', `<Default Extension="${ext}" ContentType="image/${ext === 'png' ? 'png' : 'jpeg'}"/></Types>`);
        zip.file('[Content_Types].xml', ct);
      }
      // 替换「照片」单元格内容为图片段落（保留 tcPr 边框）
      const emuW = 1143000, emuH = 1524000; // 120×160px
      const id = Math.floor(Math.random() * 90000 + 10000);
      const drawing = `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="${emuW}" cy="${emuH}"/><wp:docPr id="${id}" name="photo"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${id}" name="photo"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId10" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${emuW}" cy="${emuH}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`;
      xml = xml.replace(/<w:tc>[\s\S]*?<\/w:tc>/g, (cell) =>
        cell.includes('<w:t>照片</w:t>') ? rewriteCell(cell, paragraph(drawing, 'center')) : cell
      );
    }
  }

  zip.file('word/document.xml', xml);
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

export async function exportResumeAsDOCX(data: ResumeExportData): Promise<void> {
  try {
    const blob = await fillTemplate(data);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = data.name ? `个人简历_${data.name}.docx` : '个人简历.docx';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    message.success('简历导出成功');
  } catch (e: any) { console.error(e); message.error(e?.message || '导出失败'); }
}
