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
  first_department: string;
  second_department: string;
  /**
   * 管理员自定义字段：fieldKey → 值。
   *
   * 内置的 LABEL_PATTERNS 是写死的十几条正则，只认标准字段；管理员新加的
   * 「作品链接」「社团经历」这类导出得出去、导不回来，用户得对着 Word 手抄一遍。
   * 现在按本周期的字段配置动态生成模式，自定义字段也能原样认回来。
   */
  custom: Record<string, string>;
  /** 原始全文，供用户参考 */
  rawText: string;
}

/** 中英文标签 → fieldKey 映射 */
// 单行字段一律用 [ \t]* 而不是 \s*：\s 能匹配换行，
// 「GitHub：」为空时会把下一行「第一志愿：项目部」整行吞进 GitHub 字段（线上实测踩坑）
const LABEL_PATTERNS: Array<{ regex: RegExp; key: keyof ExtractedFields }> = [
  { regex: /姓\s*名[：:][ \t]*(.+)/, key: 'name' },
  { regex: /学\s*号[：:][ \t]*(.+)/, key: 'student_id' },
  { regex: /性\s*别[：:][ \t]*(.+)/, key: 'gender' },
  { regex: /年\s*级[：:][ \t]*(.+)/, key: 'grade' },
  { regex: /专\s*业[：:][ \t]*(.+)/, key: 'major' },
  { regex: /邮\s*箱[：:][ \t]*(.+)/, key: 'email' },
  { regex: /电\s*话[：:][ \t]*(.+)/, key: 'phone' },
  { regex: /手\s*机[号]?[：:][ \t]*(.+)/, key: 'phone' },
  { regex: /GitHub\s*主?页?[：:][ \t]*(.+)/i, key: 'github' },
  { regex: /第一\s*志愿[：:][ \t]*(.+)/, key: 'first_department' },
  { regex: /第二\s*志愿[：:][ \t]*(.+)/, key: 'second_department' },
  { regex: /自我\s*介绍[：:]\s*([\s\S]+?)(?=(?:\n\s*(?:加入理由|技术栈|项目经验|技术能力|面试|第一志愿|第二志愿|志愿|联系方式|教育|经历|$))|$)/, key: 'self_introduction' },
  { regex: /加入\s*理由[：:]\s*([\s\S]+?)(?=(?:\n\s*(?:自我介绍|技术栈|项目经验|技术能力|面试|第一志愿|第二志愿|志愿|联系方式|教育|经历|$))|$)/, key: 'reason' },
  { regex: /技术\s*栈[：:][ \t]*(.+)/, key: 'tech_stack' },
  { regex: /项目\s*经验[：:]\s*([\s\S]+?)(?=(?:\n\s*(?:自我介绍|加入理由|技术栈|技术能力|面试|第一志愿|第二志愿|志愿|联系方式|教育|经历|$))|$)/, key: 'project_experience' },
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
/**
 * 用管理员配置的标签临时生成一组匹配模式。
 *
 * 导出已改为使用管理员配置的标签（见 exportResume 的 ExportFieldMeta）。
 * 若这边只认内置的中文标签，管理员一改名，「导出模板 → Word 里填 → 导入回填」
 * 这条回环就静默断掉：文件导得出、填得进去，导入却什么都认不出来。
 *
 * 内置模式不能删、也不能被顶掉：它还负责解析学生自带的外部简历，
 * 以及改名之前导出的旧模板。所以这里是**叠加**——先试配置标签，
 * 认不出再落回内置模式。
 *
 * 只覆盖单行字段。长文小节（自我介绍/加入理由/项目经验）的内置模式带有
 * 「一直吃到下一个小节标题为止」的前瞻，改名后那串前瞻也得跟着变，
 * 拼错了反而会吞掉后面几节 —— 留给内置模式处理更稳妥。
 */
const STANDARD_SINGLE_LINE: Array<[string, keyof ExtractedFields]> = [
  ['name', 'name'], ['student_id', 'student_id'], ['gender', 'gender'],
  ['grade', 'grade'], ['major', 'major'], ['email', 'email'],
  ['phone', 'phone'], ['github', 'github'],
  ['first_choice', 'first_department'], ['second_choice', 'second_department'],
  ['tech_stack', 'tech_stack'],
];

/** 正则元字符转义：标签是管理员自由填的，直接拼进正则会炸或误匹配 */
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function patternsFromLabels(
  labelOverrides: Record<string, string>,
): Array<{ regex: RegExp; key: keyof ExtractedFields }> {
  const out: Array<{ regex: RegExp; key: keyof ExtractedFields }> = [];
  for (const [fieldKey, target] of STANDARD_SINGLE_LINE) {
    const label = (labelOverrides[fieldKey] || '').trim();
    if (!label) continue;
    // 单行字段一律用 [ \t]* 而不是 \s*：\s 能匹配换行，
    // 标签为空时会把下一行整行吞进来（内置模式里已踩过这个坑）
    out.push({ regex: new RegExp(`${escapeRe(label)}[：:][ \\t]*(.+)`), key: target });
  }
  return out;
}

/**
 * 自定义字段的解析模式。
 *
 * 与单行字段不同，这里用「一直吃到下一个标签为止」的前瞻：自定义字段可能是
 * 多行文本（管理员加的「社团经历」之类），只截第一行会把内容切掉一半。
 * 前瞻里列出本周期**所有**标签，遇到任何一个就停——导出的 Word 里
 * 「其他信息」一节是逐行的「标签：值」，这样切最贴合它的实际排版。
 */
function customFieldPatterns(
  customLabels: Array<{ fieldKey: string; label: string }>,
  allLabels: string[],
): Array<{ regex: RegExp; fieldKey: string }> {
  if (customLabels.length === 0) return [];
  const stop = allLabels.filter(Boolean).map(escapeRe).join('|');
  return customLabels
    .filter((c) => c.fieldKey && c.label.trim())
    .map((c) => ({
      fieldKey: c.fieldKey,
      regex: new RegExp(
        `${escapeRe(c.label.trim())}[：:]\\s*([\\s\\S]+?)(?=\\n\\s*(?:${stop})[：:]|$)`,
      ),
    }));
}

export function extractFieldsFromText(
  text: string,
  /** 本周期的 fieldKey → 标签；管理员改过名时必须传，否则导入认不出自家模板 */
  labelOverrides: Record<string, string> = {},
  /** 本周期的自定义字段（标准字段之外的）；不传则只认标准字段 */
  customFields: Array<{ fieldKey: string; label: string }> = [],
): ExtractedFields {
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
    first_department: '',
    second_department: '',
    custom: {},
    rawText: text,
  };

  const cleaned = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 第一遍：按标签匹配。管理员配置的标签优先，内置模式兜底
  // （外部简历、以及改名之前导出的旧模板都靠内置模式认出来）
  for (const { regex, key } of [...patternsFromLabels(labelOverrides), ...LABEL_PATTERNS]) {
    const match = cleaned.match(regex);
    if (match) {
      const value = (match[1] || '').trim();
      if (value && !(result as any)[key]) {
        (result as any)[key] = value;
      }
    }
  }

  // 第二遍：自定义字段。放在标准字段之后——万一管理员把自定义字段的标签
  // 起成了「姓名」，先到先得的规则会让标准字段先认走，不至于串位
  const allLabels = [
    ...Object.values(labelOverrides),
    ...customFields.map((c) => c.label),
    '姓名', '学号', '性别', '年级', '专业', '邮箱', '电话', '手机', 'GitHub',
    '第一志愿', '第二志愿', '自我介绍', '加入理由', '技术栈', '项目经验', '其他信息',
  ].map((l) => String(l || '').trim()).filter(Boolean);
  for (const { regex, fieldKey } of customFieldPatterns(customFields, allLabels)) {
    const match = cleaned.match(regex);
    const value = (match?.[1] || '').trim();
    if (value) {
      result.custom[fieldKey] = value;
    }
  }

  // 第三遍：独立模式匹配（补充标签没匹配到的）
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
export async function importResumeFile(
  file: File,
  /** 本周期的 fieldKey → 标签。管理员改过标签时必须传，否则导入认不出自家导出的模板 */
  labelOverrides: Record<string, string> = {},
  /** 本周期的自定义字段；传了才认得回管理员新加的那几栏 */
  customFields: Array<{ fieldKey: string; label: string }> = [],
): Promise<ExtractedFields | null> {
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

  const extracted = extractFieldsFromText(text, labelOverrides, customFields);
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
  if (keys.some((k) => {
    const v = fields[k];
    return v && String(v).trim().length > 0;
  })) {
    return true;
  }
  // 只认出自定义字段也算「有内容」——否则一份全是自定义字段的简历会被
  // 判成「什么都没提取到」，弹窗直接劝人手填
  return Object.values(fields.custom || {}).some((v) => String(v || '').trim().length > 0);
}
