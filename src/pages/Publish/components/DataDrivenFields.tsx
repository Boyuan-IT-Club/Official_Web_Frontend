// 投递表单的数据驱动渲染。
//
// 在这之前，表单是整块写死的 JSX：每个字段一行、顺序即代码顺序、分区标题
// 也写死。后果是管理员在「简历字段」里拖出来的顺序对学生看到的表单毫无影响，
// 而管理员新加的自定义字段学生端根本渲染不出来——填了也没地方填。
//
// 现在改成：字段清单、顺序、分区、标签、占位符、必填、选项全部来自后端配置，
// 本文件只负责「一个字段该用哪个控件画」。
//
// 顺序规则见 resumeFieldRegistry.sortByCanonicalOrder：后端 sortOrder 优先
// （管理员拖拽的结果要生效），规范表只在后端没给顺序时兜底。

import React from 'react';
import { Row, Col, Form } from 'antd';
import {
  IdcardOutlined, CommentOutlined, TeamOutlined, CalendarOutlined, CodeOutlined,
  FormOutlined,
} from '@ant-design/icons';

import TextInputField from './TextInputField';
import SelectField from './SelectField';
import TextAreaField from './TextAreaField';
import RadioGroupField from './RadioGroupField';
import TechStackInput from './TechStackInput';
import PhotoUpload from './PhotoUpload';
import FormSection from './FormSection';

import {
  FieldCategory, groupByCategory, specOf, FieldWidget,
} from '@/config/resumeFieldRegistry';

export interface OptionItem { value: string; label: string }

/** 一个待渲染字段。字段本身的信息全部来自后端配置。 */
export interface RenderableField {
  fieldKey: string;
  fieldLabel?: string;
  fieldType?: string;
  placeholder?: string;
  sortOrder?: number | null;
  required?: boolean;
  options?: string[];
}

export interface DataDrivenFieldsProps {
  fields: RenderableField[];
  /**
   * 后端没给 options 时的兜底选项（fieldKey → 选项）。
   * 不能省：改成数据驱动之后 select/radio 的选项只从配置来，
   * 而周期配置里 grade/gender 这类常常是空的，缺了兜底就是一个点不开的空下拉。
   */
  fallbackOptions?: Record<string, OptionItem[]>;
  canEdit: boolean;

  getValue: (fieldKey: string) => any;
  onChange: (fieldKey: string, value: any) => void;

  /** 照片（personal_photo） */
  photoBase64?: string;
  onPhotoUpload: (file: File) => Promise<boolean>;
  isPhotoCompressing?: boolean;

  /** 技术栈（tech_stack） */
  techStackItems: string[];
  onTechStackChange: (index: number, value: string) => void;
  onTechStackAdd: () => void;
  onTechStackRemove: (index: number) => void;

  /** 志愿部门（first_choice / second_choice） */
  departments: { first: string; second: string };
  onDepartmentChange: (which: 'first' | 'second', value: string) => void;
  firstDeptOptions: OptionItem[];
  secondDeptOptions: OptionItem[];
  disabledSecondDepts: string[];
  /** 面试已安排后志愿锁定 */
  intentLocked?: boolean;
}

const SECTION_ICON: Record<number, React.ReactNode> = {
  [FieldCategory.Basic]: <IdcardOutlined />,
  [FieldCategory.Statement]: <CommentOutlined />,
  [FieldCategory.Preference]: <TeamOutlined />,
  [FieldCategory.Interview]: <CalendarOutlined />,
  [FieldCategory.Skill]: <CodeOutlined />,
  [FieldCategory.Custom]: <FormOutlined />,
};

/** 后端 fieldType → 控件。规范表里有专属控件的字段以规范表为准。 */
function widgetOf(field: RenderableField): FieldWidget {
  const spec = specOf(field.fieldKey);
  if (spec) return spec.widget;
  // 规范表里没有 = 管理员新加的自定义字段，按后端声明的类型渲染
  switch (field.fieldType) {
    case 'textarea': return 'textarea';
    case 'select': return 'select';
    case 'radio': return 'radio';
    case 'checkbox': return 'checkbox';
    default: return 'text';
  }
}

/**
 * 半宽控件（并排两列）：短输入并排更紧凑，长文本与照片、技术栈这类
 * 专属控件独占一行。两个志愿下拉本来就是并排的，别在改造里退化成上下两行。
 */
function isHalfWidth(widget: FieldWidget): boolean {
  return widget === 'text' || widget === 'select' || widget === 'radio'
      || widget === 'department';
}

const DataDrivenFields: React.FC<DataDrivenFieldsProps> = ({
  fields, canEdit, fallbackOptions = {},
  getValue, onChange,
  photoBase64, onPhotoUpload, isPhotoCompressing,
  techStackItems, onTechStackChange, onTechStackAdd, onTechStackRemove,
  departments, onDepartmentChange,
  firstDeptOptions, secondDeptOptions, disabledSecondDepts, intentLocked,
}) => {
  const renderOne = (field: RenderableField): React.ReactNode => {
    const key = field.fieldKey;
    const widget = widgetOf(field);
    const label = field.fieldLabel || specOf(key)?.label || key;
    const placeholder = field.placeholder || '';
    const required = field.required !== false;
    const options: OptionItem[] = field.options?.length
      ? field.options.map((o) => ({ value: o, label: o }))
      : (fallbackOptions[key] ?? []);

    switch (widget) {
      case 'photo':
        return (
          <PhotoUpload
            photoBase64={photoBase64}
            onUpload={onPhotoUpload}
            isCompressing={isPhotoCompressing}
            disabled={!canEdit}
            required={required}
            label={label}
          />
        );

      case 'techStack':
        return (
          <Form.Item label={label} name={key} required={required}>
            <TechStackInput
              items={techStackItems}
              onChange={onTechStackChange}
              onAdd={onTechStackAdd}
              onRemove={onTechStackRemove}
              disabled={!canEdit}
              placeholder={placeholder || '请输入技术栈'}
            />
          </Form.Item>
        );

      case 'department': {
        // 志愿部门的值不直接存在自己的字段里，而是由这两个下拉合成
        // expected_departments 的 JSON——所以这里读写的是 departments 状态，
        // 不是 getValue/onChange
        const which = key === 'second_choice' ? 'second' : 'first';
        return (
          <SelectField
            label={label}
            /*
              表单字段名必须沿用 first_department / second_department，
              不能用字段自己的 key。antd 的 Form.Item name= 会用表单 store 里的值
              覆盖传进去的 value，而投递页是按这两个旧名 setFieldsValue 的
              （见 index.tsx 的 form.setFieldsValue({first_department...})）。
              改成 first_choice 之后 store 里查无此项，下拉就永远是空的 ——
              「部门填不上」就是这么来的。
            */
            name={which === 'second' ? 'second_department' : 'first_department'}
            placeholder={placeholder || (which === 'first' ? '请选择第一志愿部门' : '请选择第二志愿部门（选填）')}
            value={departments[which]}
            onChange={(value: string) => onDepartmentChange(which, value)}
            options={which === 'first' ? firstDeptOptions : secondDeptOptions}
            disabled={!canEdit || !!intentLocked}
            disabledOptions={which === 'second' ? disabledSecondDepts : undefined}
            required={which === 'first' ? true : required && false}
            className="compact-input"
          />
        );
      }

      case 'textarea':
        return (
          <TextAreaField
            label={label}
            name={key}
            placeholder={placeholder}
            value={getValue(key)}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(key, e.target.value)}
            disabled={!canEdit}
            required={required}
            rows={4}
          />
        );

      case 'select':
        return (
          <SelectField
            label={label}
            name={key}
            placeholder={placeholder}
            value={getValue(key)}
            onChange={(value: string) => onChange(key, value)}
            options={options}
            disabled={!canEdit}
            required={required}
            className="compact-input"
          />
        );

      case 'radio':
        return (
          <RadioGroupField
            label={label}
            name={key}
            value={getValue(key)}
            onChange={(e: any) => onChange(key, e.target.value)}
            options={options}
            disabled={!canEdit}
            required={required}
          />
        );

      // checkbox 目前没有专用控件；按单选组画不至于丢数据，
      // 真要多选得先补一个控件，别在这里凑合出一个半吊子
      case 'checkbox':
      case 'interviewTime':
      case 'text':
      default:
        return (
          <TextInputField
            label={label}
            name={key}
            placeholder={placeholder}
            value={getValue(key)}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(key, e.target.value)}
            disabled={!canEdit}
            required={required}
            className="compact-input"
          />
        );
    }
  };

  const groups = groupByCategory(fields);

  /** 普通字段流：短控件并排两列，长文本与专属控件独占一行。 */
  const fieldFlow = (list: RenderableField[]) => (
    <Row gutter={16}>
      {list.map((field) => {
        const half = isHalfWidth(widgetOf(field));
        return (
          <Col key={field.fieldKey} xs={24} md={half ? 12 : 24}>
            {renderOne(field)}
          </Col>
        );
      })}
    </Row>
  );

  return (
    <>
      {groups.map(({ category, label, fields: groupFields }) => {
        /*
          照片是这一区的「侧栏」而不是流里的一项：它竖着占掉整个基本信息区的
          右侧一栏，和左边的姓名/学号那些并列。
          数据驱动改造时我把它当成普通整宽字段排进流里，结果它掉到了所有
          文字字段的下面 —— 用户圈出来的正是它原本该在的位置。
        */
        const photo = groupFields.find((f) => widgetOf(f) === 'photo');
        const rest = photo ? groupFields.filter((f) => f !== photo) : groupFields;

        return (
          <FormSection key={category} title={label} icon={SECTION_ICON[category]}>
            {photo ? (
              <Row gutter={24}>
                <Col xs={24} md={16}>{fieldFlow(rest)}</Col>
                <Col xs={24} md={8}>{renderOne(photo)}</Col>
              </Row>
            ) : fieldFlow(rest)}
          </FormSection>
        );
      })}
    </>
  );
};

export default DataDrivenFields;
