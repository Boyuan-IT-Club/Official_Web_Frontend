// 简历速览：把简历的动态字段（simpleFields）排版成一页纸的紧凑视图。
// 学生端在「我的申请」里看自己的简历，管理端在面试评价表里速览候选人，共用这一份排版。
import React from 'react';
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

const BASIC_KEYS = ['student_id', 'email', 'phone', 'grade', 'gender', 'major', 'github'];

const LONG_KEYS = [
  { key: 'self_introduction', title: '个人简介' },
  { key: 'introduction', title: '个人简介' },
  { key: 'project_experience', title: '项目经验' },
  { key: 'reason', title: '加入原因' },
];

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

  const usedKeys = new Set(['name', 'personal_photo', 'expected_departments', 'tech_stack',
    ...BASIC_KEYS, ...LONG_KEYS.map((x) => x.key)]);
  const seenTitles = new Set<string>();

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
        {BASIC_KEYS.map((k) => byKey[k] && (
          <div className="rv-basic-item" key={k}>
            <span className="rv-label">{byKey[k].fieldLabel || k}</span>
            <span className="rv-value">{String(byKey[k].fieldValue)}</span>
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

      {LONG_KEYS.map(({ key, title }) => {
        const f = byKey[key];
        if (!f || seenTitles.has(title)) return null;
        seenTitles.add(title);
        return (
          <div className="rv-section" key={key}>
            <div className="rv-section-title">{title}</div>
            <div className="rv-prose">{String(f.fieldValue)}</div>
          </div>
        );
      })}

      {filled.filter((f) => !usedKeys.has(f.fieldKey ?? '') && !isImg(f.fieldValue)).map((f) => (
        <div className="rv-section" key={f.fieldId ?? f.fieldKey}>
          <div className="rv-section-title">{f.fieldLabel || f.fieldKey}</div>
          <div className="rv-prose">{renderFieldValue(f.fieldValue)}</div>
        </div>
      ))}
    </div>
  );
};

export default ResumeQuickView;
