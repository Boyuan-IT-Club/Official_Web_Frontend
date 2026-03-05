import React, { useEffect } from 'react';
import { Modal, Form, Card, Row, Col, Input, Select, Switch, Button, Space } from 'antd';
import type { ResumeField } from '@/store/modules/resumeFields';

const { Option } = Select;

interface ResumeFieldModalProps {
  visible: boolean;
  onCancel: () => void;
  onSave: (fields: ResumeField[]) => void;
  fields: ResumeField[];
  fieldTypeOptions: { value: string; label: string }[];
  loading?: boolean;
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

const ResumeFieldModal: React.FC<ResumeFieldModalProps> = ({ visible, onCancel, onSave, fields, fieldTypeOptions, loading = false }) => {
  const [form] = Form.useForm<{ fields: ResumeField[] }>();

  useEffect(() => {
    form.setFieldsValue({ fields });
  }, [fields, form]);

  const handleAddField = () => {
    const newFields = [...(form.getFieldValue('fields') || []), { ...emptyField, key: `field_${Date.now()}` }];
    form.setFieldsValue({ fields: newFields });
  };

  const handleDeleteField = (index: number) => {
    const newFields = [...(form.getFieldValue('fields') || [])];
    newFields.splice(index, 1);
    form.setFieldsValue({ fields: newFields });
  };

  const handleInsertAfter = (index: number) => {
    const newFields = [...(form.getFieldValue('fields') || [])];
    newFields.splice(index + 1, 0, { ...emptyField, key: `field_${Date.now()}` });
    form.setFieldsValue({ fields: newFields });
  };

  const handleOk = async () => {
    try {
      await form.validateFields();
      onSave(form.getFieldValue('fields'));
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Modal
      title="编辑简历表字段"
      open={visible}
      onCancel={onCancel}
      onOk={handleOk}
      width={800}
      okText="保存配置"
      cancelText="取消"
      confirmLoading={loading}
    >
      <Form form={form} layout="vertical" name="resumeForm">
        {(form.getFieldValue('fields') || []).map((field, index) => (
          <Card
            key={field.key || index}
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
                <Button type="primary" size="small" onClick={() => handleInsertAfter(index)}>＋</Button>
                <Button danger size="small" onClick={() => handleDeleteField(index)}>删除</Button>
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
                  label="字段格式"
                  rules={[{ required: true, message: '请选择字段格式' }]}
                >
                  <Select placeholder="请选择字段格式">
                    {fieldTypeOptions.map(opt => <Option key={opt.value} value={opt.value}>{opt.label}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              noStyle
              shouldUpdate={(prev, cur) => prev.fields?.[index]?.type !== cur.fields?.[index]?.type}
            >
              {({ getFieldValue }) => {
                const type = getFieldValue(['fields', index, 'type']);
                if (type === 'input' || type === 'textarea') {
                  return (
                    <Form.Item name={['fields', index, 'placeholder']} label="提示信息">
                      <Input placeholder="请输入提示内容" />
                    </Form.Item>
                  );
                }
                if (type === 'radio' || type === 'checkbox' || type === 'select') {
                  return (
                    <Form.List name={['fields', index, 'options']}>
                      {(optionFields, { add, remove }) => (
                        <Form.Item label="选项内容">
                          {optionFields.map((opt, optIndex) => (
                            <Space key={opt.key} style={{ display: 'flex', marginBottom: 8 }}>
                              <Form.Item {...opt} noStyle rules={[{ required: true, message: '请输入选项内容' }]}>
                                <Input placeholder={`选项 ${optIndex + 1}`} />
                              </Form.Item>
                              <Button type="primary" danger onClick={() => remove(optIndex)}>删除</Button>
                            </Space>
                          ))}
                          <Button type="dashed" block onClick={add}>+ 添加选项</Button>
                        </Form.Item>
                      )}
                    </Form.List>
                  );
                }
                return null;
              }}
            </Form.Item>
          </Card>
        ))}
        <Button type="primary" block onClick={handleAddField}>+ 添加字段</Button>
      </Form>
    </Modal>
  );
};

export default ResumeFieldModal;
