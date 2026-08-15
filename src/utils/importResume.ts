// src/utils/importResume.ts
import mammoth from 'mammoth';
import { message } from 'antd';

/** pdf.js 全局类型声明 */
interface PDFJSStatic {
  getDocument: (params: { data: ArrayBuffer }) => { promise: Promise<PDFDocumentProxy> };
  GlobalWorkerOptions: { workerSrc: string };
  version: string;
}

interface PDFDocumentProxy {
  numPages: number;
  getPage: (pageNum: number) => Promise<PDFPageProxy>;
}

interface PDFPageProxy {
  getTextContent: () => Promise<{ items: Array<{ str: string }> }>;
}

/** 提取结果 */
export interface ExtractedFields {
  name: string;
  student_id: string;
  gender: string;
  grade: string;
  major: string;
  email: string;
  phone: string;
  github: string;
  self_introduction: string;
  reason: string;
  tech_stack: string;
  project_experience: string;
  /** 原始全文，供用户参考 */
  rawText: string;
}

/** 中英文标签 → fieldKey 映射 */
const LABEL_PATTERNS: Array<{ regex: RegExp; key: keyof ExtractedFields }> = [
  { regex: /姓\s*名[：:]\s*(.+)/, key: 'name' },
  { regex: /学\s*号[：:]\s*(.+)/, key: 'student_id' },
  { regex: /性\s*别[：:]\s*(.+)/, key: 'gender' },
  { regex: /年\s*级[：:]\s*(.+)/, key: 'grade' },
  { regex: /专\s*业[：:]\s*(.+)/, key: 'major' },
  { regex: /邮\s*箱[：:]\s*(.+)/, key: 'email' },
  { regex: /电\s*话[：:]\s*(.+)/, key: 'phone' },
  { regex: /手\s*机[号]?[：:]\s*(.+)/, key: 'phone' },
  { regex: /GitHub[：:]\s*(.+)/i, key: 'github' },
  { regex: /github[：:]\s*(.+)/i, key: 'github' },
  { regex: /自我\s*介绍[：:]\s*([\s\S]+?)(?=(?:\n\s*(?:加入理由|技术栈|项目经验|技术能力|面试|志愿|联系方式|教育|经历|$))|$)/, key: 'self_introduction' },
  { regex: /加入\s*理由[：:]\s*([\s\S]+?)(?=(?:\n\s*(?:自我介绍|技术栈|项目经验|技术能力|面试|志愿|联系方式|教育|经历|$))|$)/, key: 'reason' },
  { regex: /技术\s*栈[：:]\s*(.+)/, key: 'tech_stack' },
  { regex: /项目\s*经验[：:]\s*([\s\S]+?)(?=(?:\n\s*(?:自我介绍|加入理由|技术栈|技术能力|面试|志愿|联系方式|教育|经历|$))|$)/, key: 'project_experience' },
];

/** 独立模式匹配（不依赖标签） */
function extractByPatterns(text: string): Partial<ExtractedFields> {
  const result: Partial<ExtractedFields> = {};

  // 邮箱
  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch && !result.email) {
    result.email = emailMatch[1];
  }

  // 手机号（中国大陆）
  const phoneMatch = text.match(/(?:手机|电话|phone|tel)[^\d]*(\d{11})/i) || text.match(/(1[3-9]\d{9})/);
  if (phoneMatch && !result.phone) {
    result.phone = phoneMatch[1];
  }

  // 学号（常见格式：8-12位数字）
  const sidMatch = text.match(/(?:学号|student\s*id)[^\d]*(\d{6,12})/i) || text.match(/\b(\d{8,12})\b/);
  if (sidMatch && !result.student_id) {
    result.student_id = sidMatch[1];
  }

  // GitHub
  const ghMatch = text.match(/github[.\s]*com\/([a-zA-Z0-9_-]+)/i);
  if (ghMatch && !result.github) {
    result.github = `https://github.com/${ghMatch[1]}`;
  }

  // 性别
  if (text.includes('男') && !text.includes('女')) result.gender = '男';
  else if (text.includes('女') && !text.includes('男')) result.gender = '女';

  return result;
}

/**
 * 从文本中提取简历字段
 */
export function extractFieldsFromText(text: string): ExtractedFields {
  const result: ExtractedFields = {
    name: '',
    student_id: '',
    gender: '',
    grade: '',
    major: '',
    email: '',
    phone: '',
    github: '',
    self_introduction: '',
    reason: '',
    tech_stack: '',
    project_experience: '',
    rawText: text,
  };

  const cleaned = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 第一遍：按标签匹配
  for (const { regex, key } of LABEL_PATTERNS) {
    const match = cleaned.match(regex);
    if (match) {
      const value = (match[1] || '').trim();
      if (value && !(result as any)[key]) {
        (result as any)[key] = value;
      }
    }
  }

  // 第二遍：独立模式匹配（补充标签没匹配到的）
  const patternResult = extractByPatterns(cleaned);
  for (const key of Object.keys(patternResult) as Array<keyof ExtractedFields>) {
    if (!(result as any)[key] && (patternResult as any)[key]) {
      (result as any)[key] = (patternResult as any)[key];
    }
  }

  // 尝试从全文第一行提取姓名（如果还没匹配到）
  if (!result.name) {
    const lines = cleaned.split('\n').filter((l) => l.trim());
    for (const line of lines.slice(0, 5)) {
      const nameMatch = line.match(/^([一-龥]{2,4})\s*$/);
      if (nameMatch) {
        const notNames = ['简历', '个人简历', '申请表', '报名表', '基本信息', '个人信息', '教育背景', '工作经历', '项目经验', '技术栈', '自我介绍', '加入理由'];
        if (!notNames.includes(nameMatch[1])) {
          result.name = nameMatch[1];
          break;
        }
      }
    }
  }

  // 年级提取
  if (!result.grade) {
    const gradeMatch = cleaned.match(/(大一|大二|大三|大四|研一|研二|研三|研究生|硕士|博士)/);
    if (gradeMatch) result.grade = gradeMatch[1];
  }

  return result;
}

/** 动态加载 pdf.js（从 CDN） */
let pdfjsPromise: Promise<PDFJSStatic> | null = null;

function loadPDFJS(): Promise<PDFJSStatic> {
  if (pdfjsPromise) return pdfjsPromise;
  pdfjsPromise = new Promise((resolve, reject) => {
    // 检查是否已加载
    const existing = (window as any).pdfjsLib as PDFJSStatic | undefined;
    if (existing && typeof existing.getDocument === 'function') {
      existing.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';
      resolve(existing);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs';
    script.type = 'module';
    script.onload = () => {
      const lib = (window as any).pdfjsLib as PDFJSStatic;
      if (lib) {
        lib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';
        resolve(lib);
      } else {
        reject(new Error('pdf.js 加载失败'));
      }
    };
    script.onerror = () => reject(new Error('pdf.js CDN 加载失败'));
    document.head.appendChild(script);
  });
  return pdfjsPromise;
}

/**
 * 解析 PDF 文件，提取文本
 */
async function parsePDFFile(file: File): Promise<string> {
  const pdfjsLib = await loadPDFJS();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item) => item.str).join(' ');
    pages.push(text);
  }

  return pages.join('\n');
}

/**
 * 解析 DOCX 文件，提取文本
 */
async function parseDOCXFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

/**
 * 主入口：根据文件类型解析并提取字段
 */
export async function importResumeFile(file: File): Promise<ExtractedFields | null> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  let text: string;
  try {
    if (ext === 'pdf') {
      message.loading('正在解析 PDF 文件...', 0.5);
      text = await parsePDFFile(file);
    } else if (ext === 'docx' || ext === 'doc') {
      message.loading('正在解析 Word 文件...', 0.5);
      text = await parseDOCXFile(file);
    } else {
      message.error('仅支持 PDF (.pdf) 和 Word (.docx) 格式');
      return null;
    }
  } catch (err: any) {
    message.destroy();
    console.error('文件解析失败:', err);
    message.error(`文件解析失败: ${err?.message || '未知错误'}`);
    return null;
  }

  message.destroy();

  if (!text || text.trim().length === 0) {
    message.error('未能从文件中提取到文本内容，请确认文件不是扫描图片');
    return null;
  }

  const extracted = extractFieldsFromText(text);
  return extracted;
}

/**
 * 检查是否有任何字段被提取到
 */
export function hasAnyExtractedField(fields: ExtractedFields): boolean {
  const keys: Array<keyof ExtractedFields> = [
    'name', 'student_id', 'gender', 'grade', 'major',
    'email', 'phone', 'github', 'self_introduction',
    'reason', 'tech_stack', 'project_experience',
  ];
  return keys.some((k) => {
    const v = fields[k];
    return v && String(v).trim().length > 0;
  });
}
