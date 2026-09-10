// 简历模板（只读预览 + 导出）的纯逻辑。
//
// 周期还没开始时表单不能填，但同学想提前知道「要准备哪些材料」——尤其是
// 个人简介、项目经验这种要想一会儿的题，开放当天现场憋很吃亏。这里把
// 已配置好的字段定义整理成一份可看、可导出的空白模板。
//
// 抽成纯函数是为了能直接测：字段类型有六七种，选项、必填、占位提示的
// 呈现各不一样，塞在 JSX 里没法验。

export interface TemplateField {
  key: string;
  label: string;
  type: string;
  required: boolean;
  options: string[];
  placeholder?: string;
}

/** 字段类型 → 给人看的填写方式说明 */
export function fieldTypeHint(type: string, options: string[]): string {
  switch (type) {
    case 'textarea':
      return '多行文本';
    case 'radio':
      return options.length ? `单选：${options.join(' / ')}` : '单选';
    case 'checkbox':
      return options.length ? `多选：${options.join(' / ')}` : '多选';
    case 'select':
      return options.length ? `下拉选择：${options.join(' / ')}` : '下拉选择';
    case 'photo':
    case 'image':
      return '上传图片';
    case 'file':
      return '上传附件';
    case 'date':
      return '选择日期';
    default:
      return '单行文本';
  }
}

/**
 * 把后端的字段定义整理成模板行。
 *
 * 只保留启用中的字段（isActive=false 是管理员关掉的，学生根本看不到），
 * 按 sortOrder 排序——后端不保证顺序，直接渲染会和真实表单对不上，
 * 那样这份模板反而误导人。
 */
export function normalizeTemplateFields(raw: any[] | null | undefined): TemplateField[] {
  return (raw ?? [])
    .filter((f) => f && f.isActive !== false)
    .slice()
    .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0))
    .map((f) => ({
      key: String(f.fieldKey ?? f.key ?? f.fieldId ?? ''),
      label: String(f.fieldLabel ?? f.label ?? ''),
      type: String(f.fieldType ?? f.type ?? 'input'),
      required: Boolean(f.isRequired ?? f.required ?? false),
      // options 后端是 JSON 数组；老数据可能是逗号分隔的字符串
      options: Array.isArray(f.options)
        ? f.options.map((o: any) => String(o))
        : (typeof f.options === 'string' && f.options.trim()
          ? f.options.split(',').map((o: string) => o.trim()).filter(Boolean)
          : []),
      placeholder: f.placeholder ? String(f.placeholder) : undefined,
    }))
    .filter((f) => f.label);
}

const escapeHtml = (s: string) => s
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * 生成一份可打印/可用 Word 打开的空白模板。
 *
 * 用整页 HTML 而不是拼 docx：Word 能直接打开 HTML 并保留表格与样式，
 * 浏览器打印这同一份 HTML 就得到 PDF。一份产物两用，也不用为了导出
 * 引一个几百 KB 的文档库进来。
 */
export function templateToHtml(cycleName: string, fields: TemplateField[]): string {
  const rows = fields.map((f) => `
    <tr>
      <td class="label">${escapeHtml(f.label)}${f.required ? '<span class="req">*</span>' : ''}</td>
      <td class="value">
        <div class="hint">${escapeHtml(fieldTypeHint(f.type, f.options))}${
  f.placeholder ? `｜${escapeHtml(f.placeholder)}` : ''}</div>
        <div class="blank"></div>
      </td>
    </tr>`).join('');

  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<title>${escapeHtml(cycleName)} 报名表（空白模板）</title>
<style>
  body { font-family: "Microsoft YaHei", "PingFang SC", sans-serif; color: #222; margin: 32px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .sub { color: #777; font-size: 12px; margin: 0 0 18px; }
  table { border-collapse: collapse; width: 100%; }
  td { border: 1px solid #bbb; padding: 8px 10px; vertical-align: top; }
  td.label { width: 150px; font-weight: 600; background: #f6f6f6; }
  .req { color: #c00; margin-left: 3px; }
  .hint { color: #888; font-size: 12px; }
  .blank { min-height: 34px; }
</style></head>
<body>
  <h1>${escapeHtml(cycleName)} 报名表</h1>
  <p class="sub">空白模板，仅供提前准备内容之用；正式报名请在招募开放后到官网在线填写提交。带 * 为必填项。</p>
  <table>${rows}
  </table>
</body></html>`;
}

/** 下载成 .doc（Word 能直接打开这份 HTML） */
export function downloadTemplateWord(cycleName: string, fields: TemplateField[]): void {
  const html = templateToHtml(cycleName, fields);
  const url = URL.createObjectURL(new Blob([`﻿${html}`], { type: 'application/msword' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${cycleName}报名表模板.doc`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * 走浏览器打印导出 PDF。
 *
 * 不用 jsPDF 一类的前端库：它们默认字体不含中文，导出来是一片方框，
 * 要正常显示得再打包一份中文字体（好几 MB）。打印对话框里选「另存为 PDF」
 * 效果更好，也不增加包体积。
 */
export function printTemplateAsPdf(cycleName: string, fields: TemplateField[]): boolean {
  const w = window.open('', '_blank');
  if (!w) return false;   // 被拦截了，调用方给提示
  w.document.write(templateToHtml(cycleName, fields));
  w.document.close();
  w.focus();
  // 等一帧让样式生效，否则部分浏览器打印出来是无样式的裸表格
  setTimeout(() => w.print(), 300);
  return true;
}
