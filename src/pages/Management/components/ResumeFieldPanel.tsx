import React, { useEffect } from 'react';
import { Form, Card, Row, Col, Input, Select, Switch, Button, Space } from 'antd';
const { Option } = Select;

export interface ResumeField {
  key: string;
  label: string;
  type: 'input' | 'textarea' | 'radio' | 'checkbox' | 'select' | 'custom';
  required: boolean;
  enabled: boolean;
  placeholder?: string;
  options?: string[];
  order?: number;
}

interface ResumeFieldPanelProps {
  fields: ResumeField[];
  fieldTypeOptions?: { value: string; label: string }[];
  onSave: (fields: ResumeField[]) => void;
}

const emptyField: ResumeField = {
  key: '',
  label: '',
  type: 'input',
  required: false,
  enabled: true,
  placeholder: '',
  options: [],
};

const ResumeFieldPanel: React.FC<ResumeFieldPanelProps> = ({ fields, fieldTypeOptions = [], onSave }) => {
  const [form] = Form.useForm<{ fields: ResumeField[] }>();

  useEffect(() => {
    form.setFieldsValue({ fields });
  }, [fields, form]);

  const addField = () => {
    const newField = { ...emptyField, key: `field_${Date.now()}` };
    const oldFields = form.getFieldValue('fields') || [];
    const newFields = [newField, ...oldFields.map((f, i) => ({ ...f, order: i + 2 }))];
    form.setFieldsValue({ fields: newFields });
  };

  const deleteField = (index: number) => {
    const newFields = [...(form.getFieldValue('fields') || [])];
    newFields.splice(index, 1);
    newFields.forEach((f, i) => f.order = i + 1);
    form.setFieldsValue({ fields: newFields });
  };

  const handleSave = async () => {
    try {
      await form.validateFields();
      onSave(form.getFieldValue('fields'));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Form form={form} layout="vertical">
      <Button type="primary" block onClick={handleSave} style={{ marginBottom: 16 }}>保存配置</Button>
      <Button type="primary" block onClick={addField} style={{ marginBottom: 16 }}>
        + 新增字段
      </Button>
      {(form.getFieldValue('fields') || []).map((field, index) => (
        <Card
          key={field.key}
          size="small"
          style={{ marginBottom: 12 }}
          title={field.label || '新字段'}
          extra={
            <Space>
              <Form.Item name={['fields', index, 'required']} valuePropName="checked" noStyle>
                <Switch checkedChildren="必填" unCheckedChildren="选填" size="small" />
              </Form.Item>
              <Form.Item name={['fields', index, 'enabled']} valuePropName="checked" noStyle>
                <Switch checkedChildren="启用" unCheckedChildren="停用" size="small" />
              </Form.Item>
              <Button danger size="small" onClick={() => deleteField(index)}>删除</Button>
            </Space>
          }
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name={['fields', index, 'label']}
                label="字段名称"
                rules={[{ required: true, message: '请输入字段名称' }]}
              >
                <Input placeholder="请输入字段显示名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name={['fields', index, 'type']}
                label="字段类型"
                rules={[{ required: true, message: '请选择字段类型' }]}
              >
                <Select placeholder="请选择字段类型">
                  {fieldTypeOptions.map(opt => <Option key={opt.value} value={opt.value}>{opt.label}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>
      ))}
    </Form>
  );
};

export default ResumeFieldPanel;
