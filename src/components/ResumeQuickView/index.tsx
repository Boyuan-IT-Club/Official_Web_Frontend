// 简历速览：把简历的动态字段（simpleFields）排版成一页纸的紧凑视图。
// 学生端在「我的申请」里看自己的简历，管理端在面试评价表里速览候选人，共用这一份排版。
import React from 'react';
import { sortByCanonicalOrder, specOf } from '@/config/resumeFieldRegistry';
import { Space, Tag, Typography } from 'antd';
import './index.scss';

const { Text } = Typography;

/** 简历动态字段 */
export interface ResumeSimpleField {
  fieldId?: number | string;
  fieldKey?: string;
  fieldLabel?: string;
  fieldValue?: string | null;
}

export interface ResumeQuickViewProps {
  resume?: { simpleFields?: ResumeSimpleField[] } | null;
  /** 简历为空时的提示文案 */
  emptyText?: string;
}

// 字段顺序与分组统一走 resumeFieldRegistry —— 这里原来另有一套
// BASIC_KEYS / LONG_KEYS，与配置抽屉、投递表单、导出各不相同。
//
// 顺带修掉旧写法的一个 bug：LONG_KEYS 里 self_introduction 与 introduction
// 的标题都写成「个人简介」，而按标题去重会让两者只显示一个 ——
// 学生填了自我介绍又填了个人简介时，其中一份被静默吞掉。
// 现在标题取后端的 fieldLabel（回落到规范表），不再自造。

const renderFieldValue = (v?: string | null): React.ReactNode => {
  if (!v) return <span style={{ color: '#bbb' }}>未填写</span>;
  const str = String(v);
  if (str.startsWith('[')) {
    try {
      const arr = JSON.parse(str);
      if (Array.isArray(arr)) return arr.join('、');
    } catch { /* 原样展示 */ }
  }
  if (str.startsWith('/uploads') || str.startsWith('http')) {
    return <a href={str} target="_blank" rel="noreferrer">查看附件</a>;
  }
  return <span style={{ whiteSpace: 'pre-wrap' }}>{str}</span>;
};

const isImg = (v: any) => typeof v === 'string' && v.startsWith('data:image');

const asArr = (v: any): string[] => {
  try {
    const a = JSON.parse(String(v));
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
};

const ResumeQuickView: React.FC<ResumeQuickViewProps> = ({ resume, emptyText }) => {
  const fields: ResumeSimpleField[] = Array.isArray(resume?.simpleFields) ? resume!.simpleFields! : [];
  const filled = fields.filter((f) => f.fieldValue != null && String(f.fieldValue).trim() !== '');

  if (filled.length === 0) {
    return <Text type="secondary">{emptyText || '该周期的简历还没有填写内容'}</Text>;
  }

  const byKey: Record<string, ResumeSimpleField> = {};
  filled.forEach((f) => { if (f.fieldKey) byKey[f.fieldKey] = f; });
  const photo = filled.find((f) => isImg(f.fieldValue));

  // 头部与技术栈单独呈现，正文里不再重复
  const headerKeys = new Set(['name', 'personal_photo', 'expected_departments', 'tech_stack']);

  // 按规范顺序排一遍，再分成「并排的键值对」与「独占一块的长文本」
  const ordered = sortByCanonicalOrder(filled).filter(
    (f) => !headerKeys.has(f.fieldKey ?? '') && !isImg(f.fieldValue),
  );
  const basics = ordered.filter((f) => !specOf(f.fieldKey ?? '')?.longText);
  const longs = ordered.filter((f) => specOf(f.fieldKey ?? '')?.longText);

  return (
    <div className="resume-view">
      <div className="rv-head">
        <div>
          <div className="rv-name">{byKey.name?.fieldValue || '未填写姓名'}</div>
          <div className="rv-sub">
            {asArr(byKey.expected_departments?.fieldValue).map((d) => (
              <Tag color="blue" key={d}>{d}</Tag>
            ))}
          </div>
        </div>
        {photo && <img className="rv-photo" src={String(photo.fieldValue)} alt="证件照" />}
      </div>

      <div className="rv-basics">
        {basics.map((f) => (
          <div className="rv-basic-item" key={f.fieldId ?? f.fieldKey}>
            <span className="rv-label">
              {f.fieldLabel || specOf(f.fieldKey ?? '')?.label || f.fieldKey}
            </span>
            <span className="rv-value">{renderFieldValue(f.fieldValue)}</span>
          </div>
        ))}
      </div>

      {asArr(byKey.tech_stack?.fieldValue).length > 0 && (
        <div className="rv-section">
          <div className="rv-section-title">技术栈</div>
          <Space size={4} wrap>
            {asArr(byKey.tech_stack?.fieldValue).map((t) => <Tag key={t}>{t}</Tag>)}
          </Space>
        </div>
      )}

      {longs.map((f) => (
        <div className="rv-section" key={f.fieldId ?? f.fieldKey}>
          <div className="rv-section-title">
            {f.fieldLabel || specOf(f.fieldKey ?? '')?.label || f.fieldKey}
          </div>
          <div className="rv-prose">{String(f.fieldValue)}</div>
        </div>
      ))}
    </div>
  );
};

export default ResumeQuickView;
