// ResumeFieldPanel.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { Form, Card, Row, Col, Input, Switch, Button, Space, message, Popconfirm, Typography, InputNumber, Badge, Collapse } from 'antd';
import { DeleteOutlined, PlusOutlined, ReloadOutlined, MenuOutlined, PlusCircleOutlined, FolderOpenOutlined } from '@ant-design/icons';
import type { ResumeFieldUI } from '@/api/manage/resumeEntry';

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

const { Text } = Typography;

interface Props {
  cycleId: number;
  fields: ResumeFieldUI[];
  onSave: (fields: ResumeFieldUI[]) => Promise<void>;
  onFieldsChange?: (fields: ResumeFieldUI[]) => void;
  onResetToDefault?: () => void;
  loading?: boolean;
  fieldTypeOptions?: { value: string; label: string }[];
}

// 分类配置
const CATEGORY_CONFIG: Record<number, { name: string; icon: React.ReactNode; color: string }> = {
  1: { name: '基本信息', icon: <IdcardOutlined style={{ color: '#1473cc' }} />, color: '#000000' },
  2: { name: '个人陈述', icon: <CommentOutlined style={{ color: '#1473cc' }} />, color: '#000000' },
  3: { name: '志愿选择', icon: <TeamOutlined style={{ color: '#1473cc' }} />, color: '#000000' },
  4: { name: '面试安排', icon: <TeamOutlined style={{ color: '#1473cc' }} />, color: '#000000' },
  5: { name: '技术能力', icon: <CodeOutlined style={{ color: '#1473cc' }} />, color: '#000000' },
};

// 可拖拽的卡片组件（保持原来的样式不变）
const SortableItem: React.FC<{
  id: string;
  field: ResumeFieldUI;
  index: number;
  form: any;
  name: number;
  onDelete: (index: number) => void;
  onSortOrderChange: (value: number | null, index: number) => void;
}> = ({ id, field, index, form, name, onDelete, onSortOrderChange }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginBottom: 16,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'auto',
    zIndex: isDragging ? 999 : 'auto',
    boxShadow: isDragging ? '0 5px 15px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.06)',
  };

  const fieldLabel = form.getFieldValue(['fields', name, 'fieldLabel']) || '字段';
  const sortOrder = form.getFieldValue(['fields', name, 'sortOrder']) || index + 1;

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        size="small"
        style={{
          backgroundColor: '#ffffff',
          border: isDragging ? '2px solid #1890ff' : '1px solid #f0f0f0',
        }}
        title={
          <Space>
            {/* 拖拽手柄 */}
            <div
              {...attributes}
              {...listeners}
              style={{
                cursor: 'grab',
                padding: '4px 8px',
                borderRadius: '4px',
                backgroundColor: '#f5f5f5',
                display: 'inline-flex',
                alignItems: 'center',
                marginRight: '8px'
              }}
            >
              <MenuOutlined style={{ color: '#999', fontSize: '16px' }} />
            </div>
            {/* 字段序号 - 可编辑 */}
            <Text type="secondary" style={{ marginLeft: 4 }}>#</Text>
            <Form.Item name={[name, 'sortOrder']} noStyle>
              <InputNumber
                min={1}
                max={100}
                value={sortOrder}
                onChange={(value) => onSortOrderChange(value, name)}
                style={{ width: 70 }}
                placeholder="排列序号"
              />
            </Form.Item>
          </Space>
        }
        extra={
          <Space>
            <Form.Item name={[name, 'isRequired']} valuePropName="checked" noStyle>
              <Switch checkedChildren="必填" unCheckedChildren="选填" />
            </Form.Item>
            <Popconfirm
              title="删除字段"
              description={`确定要删除"${fieldLabel}"字段吗？`}
              onConfirm={() => onDelete(name)}
              okText="确定"
              cancelText="取消"
              placement="left"
            >
              <Button danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        }
      >
        <Row gutter={16} align="middle">
          <Col span={12}>
            <Form.Item
              name={[name, 'fieldLabel']}
              label="字段名称"
              rules={[{ required: true, message: '请输入字段名称' }]}
            >
              <Input placeholder="如：姓名、邮箱" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name={[name, 'fieldKey']}
              label="字段标识"
              rules={[{ required: true, message: '请输入字段标识' }]}
            >
              <Input placeholder="如：name、email" />
            </Form.Item>
          </Col>
        </Row>
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
  onAddFieldToCategory: (category: number) => void;
}> = ({
  category,
  fields,
  fieldsMeta,
  form,
  onDelete,
  onSortOrderChange,
  onAddFieldToCategory
}) => {
  const config = CATEGORY_CONFIG[category];
  
  if (!config) return null;

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

  // 为当前分类的字段创建拖拽ID
  const items = categoryFieldsWithMeta.map((_, idx) => `category-${category}-field-${idx}`);

  if (categoryFieldsWithMeta.length === 0) {
    return (
      <Card
        style={{
          marginBottom: 24,
          borderRadius: '12px',
          border: `2px solid #0967be`,
          backgroundColor: '#fafafa'
        }}
        title={
          <Space>
            <span style={{ fontSize: 18 }}>{config.icon}</span>
            <span style={{ fontSize: 16, fontWeight: 600, color: config.color }}>
              {config.name}
            </span>
            <Badge count={0} style={{ backgroundColor: config.color }} />
          </Space>
        }
        extra={
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => onAddFieldToCategory(category)}
          >
            添加字段
          </Button>
        }
      >
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 20px', 
          color: '#999',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8
        }}>
          <FolderOpenOutlined style={{ fontSize: 32, color: '#d9d9d9' }} />
          <Text type="secondary">暂无字段，点击上方按钮添加</Text>
        </div>
      </Card>
    );
  }

  return (
    <Card
      style={{
        marginBottom: 24,
        borderRadius: '12px',
        border: `2px solid #0967be`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }}
      title={
        <Space>
          <span style={{ fontSize: 18 }}>{config.icon}</span>
          <span style={{ fontSize: 16, fontWeight: 600, color: config.color }}>
            {config.name}
          </span>
        </Space>
      }
      extra={
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() => onAddFieldToCategory(category)}
        >
          添加字段
        </Button>
      }
    >
      <DndContext>
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          {categoryFieldsWithMeta.map(({ meta, globalIndex }, idx) => (
            <SortableItem
              key={meta.key}
              id={`category-${category}-field-${idx}`}
              field={fields[globalIndex]}
              index={globalIndex}
              form={form}
              name={meta.name}
              onDelete={onDelete}
              onSortOrderChange={onSortOrderChange}
            />
          ))}
        </SortableContext>
      </DndContext>
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

  // 添加字段到指定分类
  const addFieldToCategory = (category: number) => {
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
      isRequired: true,
      isActive: true,
      sortOrder: maxSortOrder + 1,
      fieldType: 'input',
      category: category,
    };

    const newFields = [...current, newField];
    form.setFieldsValue({ fields: newFields });
    onFieldsChange?.(newFields);

    const categoryName = CATEGORY_CONFIG[category]?.name || '未知分类';
    message.success(`已在「${categoryName}」添加新字段`);
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

  const handleSave = async () => {
    try {
      await form.validateFields();
      setSaving(true);

      const formFields = form.getFieldValue('fields') || [];

      if (!formFields.length) {
        message.warning('至少需要有一个字段');
        return;
      }

      await onSave(formFields);
      message.success('保存成功');
    } catch {
      message.error('保存失败，请检查字段信息');
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
    <div style={{
      backgroundColor: '#e4f0fc',
      padding: '24px',
      borderRadius: '8px',
      minHeight: '400px'
    }}>
      <Form form={form} layout="vertical">
        {/* 按钮行 */}
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Text
            type="secondary"
            style={{
              color: '#1f76cc',
              fontSize: 20,
              fontWeight: 'bold'
            }}>
            编辑简历字段
          </Text>

          <Space size={16}>
            <Button
              type="primary"
              onClick={handleSave}
              loading={saving || loading}
            >
              保存
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleResetToDefault}
              size="middle"
            >
              加载默认配置
            </Button>
          </Space>
        </Row>

        <Form.List name="fields">
          {(fieldsMeta) => {
            return (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                {/* 按分类顺序渲染 */}
                {[1, 2, 3, 4, 5].map(category => (
                  <CategoryCard
                    key={category}
                    category={category}
                    fields={currentFields}
                    fieldsMeta={fieldsMeta}
                    form={form}
                    onDelete={deleteField}
                    onSortOrderChange={handleSortOrderChange}
                    onAddFieldToCategory={addFieldToCategory}
                  />
                ))}
              </DndContext>
            );
          }}
        </Form.List>
      </Form>
    </div>
  );
};

export default ResumeFieldPanel;