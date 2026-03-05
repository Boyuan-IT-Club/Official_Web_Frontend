import React, { useEffect } from 'react';
import { Modal, Form, Card, Row, Col, Input, Switch, Button, Space, Typography } from 'antd';
const { TextArea } = Input;
const { Text } = Typography;

interface FormPrompt {
  id: string;
  title: string;
  content: string;
  enabled: boolean;
  order: number;
}

interface PromptModalProps {
  visible: boolean;
  onCancel: () => void;
  onSave: (prompts: FormPrompt[]) => void;
  prompts: FormPrompt[];
}

const PromptModal: React.FC<PromptModalProps> = ({ visible, onCancel, onSave, prompts }) => {
  const [form] = Form.useForm<{ prompts: FormPrompt[] }>();

  useEffect(() => {
    form.setFieldsValue({ prompts });
  }, [prompts, form]);

  const handleAddPrompt = () => {
    const newPrompts = [...(form.getFieldValue('prompts') || []), {
      id: `prompt_${Date.now()}`,
      title: '新提示',
      content: '',
      enabled: true,
      order: (form.getFieldValue('prompts')?.length || 0) + 1,
    }];
    form.setFieldsValue({ prompts: newPrompts });
  };

  const handleDeletePrompt = (index: number) => {
    const newPrompts = [...(form.getFieldValue('prompts') || [])];
    newPrompts.splice(index, 1);
    newPrompts.forEach((p, i) => p.order = i + 1);
    form.setFieldsValue({ prompts: newPrompts });
  };

  const handleInsertAfter = (index: number) => {
    const newPrompts = [...(form.getFieldValue('prompts') || [])];
    newPrompts.splice(index + 1, 0, {
      id: `prompt_${Date.now()}`,
      title: '新提示',
      content: '',
      enabled: true,
      order: index + 2,
    });
    newPrompts.forEach((p, i) => p.order = i + 1);
    form.setFieldsValue({ prompts: newPrompts });
  };

  const handleOk = async () => {
    try {
      await form.validateFields();
      onSave(form.getFieldValue('prompts'));
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Modal
      title="编辑报名表填写提示"
      open={visible}
      onCancel={onCancel}
      onOk={handleOk}
      width={900}
      okText="保存配置"
      cancelText="取消"
    >
      <Form form={form} layout="vertical" name="promptForm">
        {(form.getFieldValue('prompts') || []).map((prompt, index) => (
          <Card
            key={prompt.id || index}
            size="small"
            style={{ marginBottom: 16 }}
            title={<Form.Item name={['prompts', index, 'title']} noStyle><Text strong>{prompt.title}</Text></Form.Item>}
            extra={
              <Space>
                <Form.Item name={['prompts', index, 'enabled']} valuePropName="checked" noStyle>
                  <Switch checkedChildren="启用" unCheckedChildren="停用" size="small" />
                </Form.Item>
                <Button type="primary" size="small" onClick={() => handleInsertAfter(index)}>＋</Button>
                <Button danger size="small" onClick={() => handleDeletePrompt(index)}>删除</Button>
              </Space>
            }
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name={['prompts', index, 'title']} label="提示标题" rules={[{ required: true, message: '请输入提示标题' }]}>
                  <Input placeholder="例如：隐私保护、照片等" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name={['prompts', index, 'order']} label="显示顺序" rules={[{ required: true, message: '请输入显示顺序' }]}>
                  <Input type="number" min={1} placeholder="请输入数字" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name={['prompts', index, 'content']} label="提示内容" rules={[{ required: true, message: '请输入提示内容' }]}>
              <TextArea rows={4} placeholder="请输入详细提示内容，支持换行" />
            </Form.Item>
          </Card>
        ))}
        <Button type="primary" block onClick={handleAddPrompt}>+ 添加提示</Button>
      </Form>
    </Modal>
  );
};

export default PromptModal;
