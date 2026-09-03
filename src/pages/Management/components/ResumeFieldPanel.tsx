// ResumeFieldPanel.tsx
import React, { useEffect } from 'react';
import { Form, Card, Row, Col, Input, Switch, Button, Space, message, Typography, InputNumber, Badge, Select, Radio, Checkbox, Modal, Dropdown } from 'antd';
import {
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
  MenuOutlined,
  FolderOpenOutlined,
  FontSizeOutlined,
  AlignLeftOutlined,
  DownSquareOutlined,
  CheckCircleOutlined,
  CheckSquareOutlined,
  UploadOutlined,
  EditOutlined,
  MoreOutlined,
  DownOutlined,
  RightOutlined,
} from '@ant-design/icons';
import type { ResumeFieldUI, ResumeFieldType } from '@/api/manage/resumeEntry';
import {
  FIELD_TYPE_OPTIONS,
  FIELD_KEY_CATEGORY_MAP,
  fieldTypeNeedsOptions,
  parseFieldOptions,
} from '@/api/manage/resumeEntry';

// 拖拽排序相关库
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { IdcardOutlined, CommentOutlined, TeamOutlined, CodeOutlined } from '@ant-design/icons';
import { BRAND, NEUTRAL } from '@/theme/tokens';
import './ResumeFieldPanel.scss';

const { Text } = Typography;

interface Props {
  cycleId: number;
  fields: ResumeFieldUI[];
  onSave: (fields: ResumeFieldUI[]) => Promise<void>;
  onFieldsChange?: (fields: ResumeFieldUI[]) => void;
  onResetToDefault?: () => void;
  loading?: boolean;
  fieldTypeOptions?: { value: ResumeFieldType; label: string }[];
}

// 分类配置
const CATEGORY_CONFIG: Record<number, { name: string; icon: React.ReactNode; color: string }> = {
  1: { name: '基本信息', icon: <IdcardOutlined style={{ color: BRAND.primary }} />, color: BRAND.primary },
  2: { name: '个人陈述', icon: <CommentOutlined style={{ color: BRAND.primary }} />, color: BRAND.primary },
  3: { name: '志愿选择', icon: <TeamOutlined style={{ color: BRAND.primary }} />, color: BRAND.primary },
  4: { name: '面试安排', icon: <TeamOutlined style={{ color: BRAND.primary }} />, color: BRAND.primary },
  5: { name: '技术能力', icon: <CodeOutlined style={{ color: BRAND.primary }} />, color: BRAND.primary },
};

// 左栏题型面板：点击即新增对应类型的字段
const FIELD_TYPE_ICONS: Record<string, React.ReactNode> = {
  text: <FontSizeOutlined />,
  textarea: <AlignLeftOutlined />,
  select: <DownSquareOutlined />,
  radio: <CheckCircleOutlined />,
  checkbox: <CheckSquareOutlined />,
  file: <UploadOutlined />,
};

const FIELD_TYPE_ITEMS = FIELD_TYPE_OPTIONS.map((t) => ({
  ...t,
  icon: FIELD_TYPE_ICONS[t.value],
}));

/** 选项列表编辑（用于 select / radio / checkbox） */
const FieldOptionsEditor: React.FC<{ listName: number }> = ({ listName }) => (
  <div className="field-options-editor">
    <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
      选项配置（投递页将按顺序展示）
    </Text>
    <Form.List name={[listName, 'options']}>
      {(optionFields, { add, remove }) => (
        <>
          {optionFields.map(({ key, name: optIndex }) => (
            <Space key={key} align="start" style={{ display: 'flex', marginBottom: 8, width: '100%' }}>
              <Form.Item
                name={optIndex}
                rules={[{ required: true, whitespace: true, message: '请输入选项内容' }]}
                style={{ flex: 1, marginBottom: 0 }}
              >
                <Input placeholder={`选项 ${optIndex + 1}`} />
              </Form.Item>
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                disabled={optionFields.length <= 1}
                onClick={() => remove(optIndex)}
              />
            </Space>
          ))}
          <Button type="dashed" onClick={() => add('')} icon={<PlusOutlined />} block>
            添加选项
          </Button>
        </>
      )}
    </Form.List>
  </div>
);

// 可拖拽的字段卡片：默认收起只显示标题行，点「编辑」展开编辑表单
const SortableItem: React.FC<{
  id: string;
  field: ResumeFieldUI;
  index: number;
  form: any;
  name: number;
  onDelete: (index: number) => void;
  onSortOrderChange: (value: number | null, index: number) => void;
  fieldTypeOptions: { value: ResumeFieldType; label: string }[];
}> = ({ id, field, index, form, name, onDelete, onSortOrderChange, fieldTypeOptions }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const [editing, setEditing] = React.useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginBottom: 16,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'auto',
    zIndex: isDragging ? 999 : 'auto',
    boxShadow: isDragging ? '0 5px 15px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.06)',
  };

  const watchedLabel = Form.useWatch(['fields', name, 'fieldLabel'], form);
  const fieldLabel = watchedLabel || '未命名字段';
  // 卡片上显示「第几个」，不是原始 sortOrder。
  //
  // 原来直接显示 sortOrder，于是底层数据的问题全暴露在界面上：
  //   - 缺号：废弃字段(第一面试时间)被列表过滤掉，它占的号就成了空洞（16 → 18）
  //   - 重号：历史周期里存在重复的 sortOrder（周期 1、4 实测各有两对）
  // 展示位置序号后，看到的永远是连续的 1..N；真正的 sortOrder 仍可在
  // 展开后的「排列序号」里编辑，拖拽排序也照旧写它。
  const displayIndex = index + 1;
  const fieldType = Form.useWatch(['fields', name, 'fieldType'], form);
  const placeholder = Form.useWatch(['fields', name, 'placeholder'], form);
  const options = Form.useWatch(['fields', name, 'options'], form) || [];
  const isRequired = Form.useWatch(['fields', name, 'isRequired'], form);
  const showOptionsEditor = fieldTypeNeedsOptions(fieldType);

  const handleFieldTypeChange = (value: string): void => {
    if (!fieldTypeNeedsOptions(value)) return;
    const currentOptions = form.getFieldValue(['fields', name, 'options']);
    if (!Array.isArray(currentOptions) || currentOptions.length === 0) {
      form.setFieldValue(['fields', name, 'options'], ['']);
    }
  };

  const optionItems = (Array.isArray(options) ? options : [])
    .map((o) => String(o))
    .filter(Boolean)
    .map((o) => ({ value: o, label: o }));

  // 收起态：按字段类型渲染「最终简历页面」里的控件预览（只读）
  const renderPreview = () => {
    switch (fieldType) {
      case 'textarea':
        return <Input.TextArea disabled placeholder={placeholder} rows={3} />;
      case 'select':
        return <Select disabled placeholder={placeholder} options={optionItems} />;
      case 'radio':
        return <Radio.Group disabled options={optionItems} />;
      case 'checkbox':
        return <Checkbox.Group disabled options={optionItems} />;
      case 'file':
        return <Button disabled icon={<UploadOutlined />}>上传文件</Button>;
      case 'text':
      default:
        return <Input disabled placeholder={placeholder} />;
    }
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        size="small"
        className="resume-field-panel__field"
        style={{
          backgroundColor: NEUTRAL.cardBg,
          border: isDragging ? `2px solid ${BRAND.primary}` : `1px solid ${NEUTRAL.border}`,
        }}
        title={
          <Space size={8}>
            {/* 拖拽手柄 */}
            <div
              {...attributes}
              {...listeners}
              className="resume-field-panel__drag-handle"
            >
              <MenuOutlined />
            </div>
            <Text type="secondary" className="resume-field-panel__field-index">{displayIndex}.</Text>
          </Space>
        }
        extra={
          <Space size={4}>
            <Form.Item name={[name, 'isActive']} valuePropName="checked" noStyle>
              <Switch size="small" checkedChildren="启用" unCheckedChildren="停用" />
            </Form.Item>
            <Form.Item name={[name, 'isRequired']} valuePropName="checked" noStyle>
              <Switch size="small" checkedChildren="必填" unCheckedChildren="选填" />
            </Form.Item>
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => setEditing((v) => !v)}
            >
              {editing ? '收起' : '编辑'}
            </Button>
            <Dropdown
              trigger={["click"]}
              menu={{
                items: [
                  { key: "del", icon: <DeleteOutlined />, label: "删除字段", danger: true },
                ],
                onClick: () => {
                  Modal.confirm({
                    title: "删除字段",
                    content: `确定要删除「${fieldLabel}」字段吗？`,
                    okText: "删除",
                    okType: "danger",
                    cancelText: "取消",
                    onOk() {
                      onDelete(name);
                    },
                  });
                },
              }}
            >
              <Button type="text" size="small" icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        }
      >
        <Form.Item name={[name, 'fieldId']} hidden>
          <InputNumber style={{ display: 'none' }} />
        </Form.Item>
        <Form.Item name={[name, 'cycleId']} hidden>
          <InputNumber style={{ display: 'none' }} />
        </Form.Item>
        <Form.Item name={[name, 'category']} hidden>
          <InputNumber style={{ display: 'none' }} />
        </Form.Item>

        {editing ? (
          <>
            <Row gutter={16} align="middle">
              <Col span={8}>
                <Form.Item name={[name, 'sortOrder']} label="排列序号">
                  <InputNumber
                    min={1}
                    max={100}
                    style={{ width: '100%' }}
                    onChange={(value) => onSortOrderChange(value, name)}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name={[name, 'fieldType']}
                  label="字段类型"
                  rules={[{ required: true, message: '请选择字段类型' }]}
                >
                  <Select
                    placeholder="选择类型"
                    options={fieldTypeOptions.length ? fieldTypeOptions : FIELD_TYPE_OPTIONS}
                    onChange={handleFieldTypeChange}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name={[name, 'placeholder']} label="占位提示">
                  <Input placeholder="如：请提供个人简介" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16} align="middle">
              <Col span={12}>
                <Form.Item
                  name={[name, 'fieldLabel']}
                  label="字段名称"
                  rules={[{ required: true, message: '请输入字段名称' }]}
                >
                  <Input placeholder="如：个人简介" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name={[name, 'fieldKey']}
                  label="字段标识"
                  rules={[{ required: true, message: '请输入字段标识' }]}
                >
                  <Input placeholder="如：introduction" />
                </Form.Item>
              </Col>
            </Row>

            {showOptionsEditor && (
              <div style={{ marginTop: 8 }}>
                <FieldOptionsEditor listName={name} />
              </div>
            )}
          </>
        ) : (
          <Form.Item
            label={fieldLabel}
            required={isRequired}
            className="resume-field-panel__preview"
          >
            {renderPreview()}
          </Form.Item>
        )}
      </Card>
    </div>
  );
};

// 分类卡片组件
const CategoryCard: React.FC<{
  category: number;
  fields: ResumeFieldUI[];
  fieldsMeta: any[];
  form: any;
  onDelete: (index: number) => void;
  onSortOrderChange: (value: number | null, index: number) => void;
  fieldTypeOptions: { value: ResumeFieldType; label: string }[];
  categoryName?: string;
}> = ({
  category,
  fields,
  fieldsMeta,
  form,
  onDelete,
  onSortOrderChange,
  fieldTypeOptions,
  categoryName,
}) => {
  const config = CATEGORY_CONFIG[category];
  const name = config?.name || categoryName || `分类 ${category}`;
  const icon = config?.icon || <FolderOpenOutlined style={{ color: BRAND.primary }} />;
  const color = config?.color || BRAND.primary;
  const [collapsed, setCollapsed] = React.useState(false);

  // 获取当前分类下的字段及其在 fieldsMeta 中的对应项
  const categoryFieldsWithMeta: { field: ResumeFieldUI; meta: any; globalIndex: number }[] = [];

  fields.forEach((field, idx) => {
    if (field?.category === category && fieldsMeta[idx]) {
      categoryFieldsWithMeta.push({
        field,
        meta: fieldsMeta[idx],
        globalIndex: idx,
      });
    }
  });

  // 拖拽 ID 里编的必须是**全局下标**，不能是分类内序号。
  // handleDragEnd 解析出这个数字后是拿它去索引整个 fields 数组的，
  // 编分类内序号的话，第一个分类之外的拖拽全都会移错行。
  const items = categoryFieldsWithMeta.map(({ globalIndex }) => `category-${category}-field-${globalIndex}`);

  const titleNode = (
    <Space>
      <span className="resume-field-panel__category-icon">{icon}</span>
      <span className="resume-field-panel__category-name">{name}</span>
      <Badge count={categoryFieldsWithMeta.length} showZero color={color} />
    </Space>
  );

  const collapseBtn = (
    <Button
      type="text"
      size="small"
      icon={collapsed ? <RightOutlined /> : <DownOutlined />}
      onClick={() => setCollapsed((v) => !v)}
    />
  );

  if (categoryFieldsWithMeta.length === 0) {
    return (
      <Card
        className="resume-field-panel__category"
        title={titleNode}
        extra={collapseBtn}
      >
        {!collapsed && (
          <div className="resume-field-panel__empty">
            <FolderOpenOutlined style={{ fontSize: 32, color: '#d9d9d9' }} />
            <Text type="secondary">暂无字段，请在左侧选择类型添加</Text>
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card
      className={`resume-field-panel__category${collapsed ? ' is-collapsed' : ''}`}
      title={titleNode}
      extra={collapseBtn}
    >
      {!collapsed && (
        /*
          这里只能有 SortableContext，不能再套一层 DndContext。
          外层已经有一个带 sensors 与 onDragEnd 的 DndContext 了；
          内层这个是空壳（没 sensors、没 onDragEnd），
          而嵌套的 DndContext 会把拖拽事件截走自己处理 ——
          结果就是拖得动、松手什么也不发生。管理端字段拖不动就是这个原因。
        */
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
            {categoryFieldsWithMeta.map(({ meta, globalIndex }) => (
              <SortableItem
                key={meta.key}
                id={`category-${category}-field-${globalIndex}`}
                field={fields[globalIndex]}
                index={globalIndex}
                form={form}
                name={meta.name}
                onDelete={onDelete}
                onSortOrderChange={onSortOrderChange}
                fieldTypeOptions={fieldTypeOptions}
              />
          ))}
        </SortableContext>
      )}
    </Card>
  );
};

const ResumeFieldPanel: React.FC<Props> = ({
  cycleId,
  fields,
  onSave,
  onFieldsChange,
  onResetToDefault,
  loading = false,
  fieldTypeOptions = [],
}) => {
  const [form] = Form.useForm<{ fields: ResumeFieldUI[] }>();
  const [saving, setSaving] = React.useState(false);
  const [targetCategory, setTargetCategory] = React.useState<number>(1);
  // 自定义分类（纯前端分组，默认 5 类之外用户新增的）
  const [customCategories, setCustomCategories] = React.useState<{ id: number; name: string }[]>([]);
  const [categoryModalOpen, setCategoryModalOpen] = React.useState(false);
  const [newCategoryName, setNewCategoryName] = React.useState('');

  // 分类展示顺序：默认 5 类 + 自定义分类
  const categoryOrder = React.useMemo(
    () => [1, 2, 3, 4, 5, ...customCategories.map((c) => c.id)],
    [customCategories],
  );

  const categoryNameOf = (id: number) =>
    CATEGORY_CONFIG[id]?.name || customCategories.find((c) => c.id === id)?.name;

  // 配置拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    form.setFieldsValue({ fields });
  }, [fields, form]);

  // 在指定分类下新增一个指定类型的字段
  const addField = (fieldType: ResumeFieldType, category: number) => {
    const current = form.getFieldValue('fields') || [];

    // 计算最大的 sortOrder
    const maxSortOrder = current.length > 0
      ? Math.max(...current.map((f: ResumeFieldUI) => f.sortOrder || 0))
      : 0;

    const newField: ResumeFieldUI = {
      fieldId: 0,
      cycleId,
      fieldKey: `field_${Date.now()}`,
      fieldLabel: '新字段',
      fieldType,
      placeholder: '',
      isRequired: true,
      isActive: true,
      sortOrder: maxSortOrder + 1,
      category,
      options: fieldTypeNeedsOptions(fieldType) ? [''] : undefined,
    };

    const newFields = [...current, newField];
    form.setFieldsValue({ fields: newFields });
    onFieldsChange?.(newFields);

    const categoryName = categoryNameOf(category) || '未知分类';
    const typeLabel = FIELD_TYPE_ITEMS.find((t) => t.value === fieldType)?.label || fieldType;
    message.success(`已在「${categoryName}」添加「${typeLabel}」字段`);
  };

  // 新增自定义分类
  const handleAddCategory = () => {
    const name = newCategoryName.trim();
    if (!name) {
      message.warning('请输入分类名称');
      return;
    }
    const nextId = Math.max(100, ...customCategories.map((c) => c.id)) + 1;
    setCustomCategories((prev) => [...prev, { id: nextId, name }]);
    setTargetCategory(nextId);
    setNewCategoryName('');
    setCategoryModalOpen(false);
    message.success(`已新增分类「${name}」`);
  };

  const deleteField = (index: number) => {
    const newFields = [...(form.getFieldValue('fields') || [])];
    newFields.splice(index, 1);

    // 重新计算 sortOrder
    const reorderedFields = newFields.map((field, idx) => ({
      ...field,
      sortOrder: idx + 1,
    }));

    form.setFieldsValue({ fields: reorderedFields });
    onFieldsChange?.(reorderedFields);
    message.success('字段已删除');
  };

  // 处理排序变化
  const handleSortOrderChange = (value: number | null, index: number) => {
    if (!value) return;

    const currentFields = form.getFieldValue('fields') || [];
    const newFields = [...currentFields];

    // 更新当前字段的排序值
    newFields[index] = {
      ...newFields[index],
      sortOrder: value,
    };

    // 按 sortOrder 重新排序
    newFields.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    form.setFieldsValue({ fields: newFields });
    onFieldsChange?.(newFields);
  };

  // 处理拖拽结束
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const currentFields = form.getFieldValue('fields') || [];

      // 解析拖拽ID获取原始索引
      const activeMatch = String(active.id).match(/category-\d+-field-(\d+)/);
      const overMatch = String(over?.id).match(/category-\d+-field-(\d+)/);

      if (activeMatch && overMatch) {
        const oldIndex = parseInt(activeMatch[1]);
        const newIndex = parseInt(overMatch[1]);

        // 检查是否在同一分类
        if (currentFields[oldIndex]?.category === currentFields[newIndex]?.category) {
          const newFields = arrayMove(currentFields, oldIndex, newIndex);

          // 重新计算 sortOrder
          const reorderedFields = newFields.map((field: ResumeFieldUI, idx: number) => ({
            ...field,
            sortOrder: idx + 1,
          }));

          form.setFieldsValue({ fields: reorderedFields });
          onFieldsChange?.(reorderedFields);
          message.info('顺序已调整');
        } else {
          message.warning('暂不支持跨分类拖拽，请使用序号调整');
        }
      }
    }
  };

  const mergeFormFieldsForSave = (raw: ResumeFieldUI[]): ResumeFieldUI[] =>
    raw.map((item, index) => {
      const itemFieldId = Number(item.fieldId);
      const orig =
        (itemFieldId > 0
          ? fields.find((f) => Number(f.fieldId) === itemFieldId)
          : undefined) ||
        fields.find((f) => f.fieldKey && f.fieldKey === item.fieldKey) ||
        fields[index];
      const fieldKey = String(item.fieldKey || orig?.fieldKey || '').trim();
      const resolvedFieldId = itemFieldId > 0 ? itemFieldId : Number(orig?.fieldId) || 0;
      return {
        ...orig,
        ...item,
        fieldId: resolvedFieldId,
        cycleId: Number(item.cycleId) || Number(orig?.cycleId) || cycleId,
        category:
          Number(item.category) ||
          orig?.category ||
          FIELD_KEY_CATEGORY_MAP[fieldKey] ||
          1,
        fieldKey,
        fieldLabel: String(item.fieldLabel || orig?.fieldLabel || '').trim(),
        fieldType: item.fieldType || orig?.fieldType,
        isRequired: Boolean(item.isRequired),
        isActive: item.isActive !== false,
        sortOrder: Number(item.sortOrder) || orig?.sortOrder || index + 1,
        options: fieldTypeNeedsOptions(item.fieldType || orig?.fieldType)
          ? parseFieldOptions(item.options ?? orig?.options)
          : undefined,
      };
    });

  const handleSave = async () => {
    try {
      await form.validateFields();
      setSaving(true);

      const raw = form.getFieldValue('fields') || [];
      const formFields = mergeFormFieldsForSave(raw);

      if (!formFields.length) {
        message.warning('至少需要有一个字段');
        return;
      }

      const missingOptions = formFields.find(
        (f) => fieldTypeNeedsOptions(f.fieldType) && !(f.options && f.options.length > 0),
      );
      if (missingOptions) {
        message.warning(`「${missingOptions.fieldLabel || missingOptions.fieldKey}」请至少配置一个选项`);
        return;
      }

      await onSave(formFields);
      message.success('保存成功');
    } catch (err: any) {
      if (err?.errorFields?.length) {
        message.error('请检查表单必填项');
      } else {
        message.error(err?.message || '保存失败，请检查字段信息或网络连接');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = () => {
    if (onResetToDefault) {
      onResetToDefault();
    } else {
      message.warning('重置功能不可用');
    }
  };

  // 获取当前字段列表
  const currentFields = Form.useWatch('fields', form) || [];

  return (
    <div className="resume-field-panel">
      <Form form={form} layout="vertical" size="small" className="resume-field-form">
        {/* 头部：标题 + 操作 */}
        <div className="resume-field-panel__header">
          <div>
            <div className="resume-field-panel__title">编辑简历字段</div>
            <div className="resume-field-panel__subtitle">拖拽卡片或修改序号可调整投递页展示顺序</div>
          </div>
          <Space size={12}>
            <Button icon={<ReloadOutlined />} onClick={handleResetToDefault}>
              加载默认配置
            </Button>
            <Button type="primary" onClick={handleSave} loading={saving || loading}>
              保存
            </Button>
          </Space>
        </div>

        <div className="resume-field-panel__body">
          {/* 左栏：新增字段的类型面板 */}
          <aside className="resume-field-panel__sidebar">
            <div className="resume-field-panel__sidebar-title">添加字段</div>
            <div className="resume-field-panel__sidebar-label">添加到分类</div>
            <Select
              className="resume-field-panel__sidebar-select"
              value={targetCategory}
              onChange={setTargetCategory}
              options={categoryOrder.map((c) => ({
                value: c,
                label: categoryNameOf(c) || `分类 ${c}`,
              }))}
            />
            <Button
              className="resume-field-panel__sidebar-add-cat"
              type="dashed"
              icon={<PlusOutlined />}
              onClick={() => setCategoryModalOpen(true)}
            >
              新增分类
            </Button>
            <div className="resume-field-panel__sidebar-label">字段类型</div>
            <div className="resume-field-panel__type-list">
              {FIELD_TYPE_ITEMS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className="resume-field-panel__type-item"
                  onClick={() => addField(t.value, targetCategory)}
                >
                  <span className="resume-field-panel__type-icon">{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </aside>

          {/* 中间：分类题目流 */}
          <div className="resume-field-panel__content">
            <Form.List name="fields">
              {(fieldsMeta) => {
                return (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    {/* 按分类顺序渲染 */}
                    {categoryOrder.map(category => (
                      <CategoryCard
                        key={category}
                        category={category}
                        categoryName={categoryNameOf(category)}
                        fields={currentFields}
                        fieldsMeta={fieldsMeta}
                        form={form}
                        onDelete={deleteField}
                        onSortOrderChange={handleSortOrderChange}
                        fieldTypeOptions={fieldTypeOptions}
                      />
                    ))}
                  </DndContext>
                );
              }}
            </Form.List>
          </div>
        </div>
      </Form>

      <Modal
        title="新增分类"
        open={categoryModalOpen}
        onOk={handleAddCategory}
        onCancel={() => {
          setCategoryModalOpen(false);
          setNewCategoryName('');
        }}
        okText="新增"
        cancelText="取消"
        destroyOnClose
      >
        <Form layout="vertical">
          <Form.Item label="分类名称" required>
            <Input
              placeholder="如：其他"
              maxLength={20}
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onPressEnter={handleAddCategory}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ResumeFieldPanel;