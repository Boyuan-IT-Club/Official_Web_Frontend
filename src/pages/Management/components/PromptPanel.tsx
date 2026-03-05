import React, { useEffect } from 'react';
import { Form, Card, Row, Col, Input, Switch, Button, Space } from 'antd';
const { TextArea } = Input;

export interface FormPrompt {
  id: string;
  title: string;
  content: string;
  enabled: boolean;
  order: number;
}

interface PromptPanelProps {
  prompts: FormPrompt[];
  onSave: (prompts: FormPrompt[]) => void;
}

const PromptPanel: React.FC<PromptPanelProps> = ({ prompts, onSave }) => {
  const [form] = Form.useForm<{ prompts: FormPrompt[] }>();

  useEffect(() => {
    form.setFieldsValue({ prompts });
  }, [prompts, form]);

  const addPrompt = () => {
    const newPrompt = {
      id: `prompt_${Date.now()}`,
      title: '新提示',
      content: '',
      enabled: true,
      order: 1,
    };
    const oldPrompts = form.getFieldValue('prompts') || [];
    const newPrompts = [newPrompt, ...oldPrompts.map((p, i) => ({ ...p, order: i + 2 }))];
    form.setFieldsValue({ prompts: newPrompts });
  };

  const deletePrompt = (index: number) => {
    const newPrompts = [...(form.getFieldValue('prompts') || [])];
    newPrompts.splice(index, 1);
    newPrompts.forEach((p, i) => p.order = i + 1);
    form.setFieldsValue({ prompts: newPrompts });
  };

  const handleSave = async () => {
    try {
      await form.validateFields();
      onSave(form.getFieldValue('prompts'));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Form form={form} layout="vertical">
      <Button type="primary" block onClick={handleSave} style={{ marginBottom: 16 }}>保存配置</Button>
      <Button type="primary" block onClick={addPrompt} style={{ marginBottom: 16 }}>
        + 新增提示
      </Button>
      {(form.getFieldValue('prompts') || []).map((prompt, index) => (
        <Card
          key={prompt.id}
          size="small"
          style={{ marginBottom: 16 }}
          title={prompt.title || '新提示'}
          extra={
            <Space>
              <Form.Item name={['prompts', index, 'enabled']} valuePropName="checked" noStyle>
                <Switch checkedChildren="启用" unCheckedChildren="停用" size="small" />
              </Form.Item>
              <Button danger size="small" onClick={() => deletePrompt(index)}>删除</Button>
            </Space>
          }
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name={['prompts', index, 'title']}
                label="提示标题"
                rules={[{ required: true, message: '请输入标题' }]}
              >
                <Input placeholder="提示标题" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name={['prompts', index, 'order']}
                label="显示顺序"
                rules={[{ required: true, message: '请输入顺序' }]}
              >
                <Input type="number" min={1} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name={['prompts', index, 'content']}
            label="提示内容"
            rules={[{ required: true, message: '请输入内容' }]}
          >
            <TextArea rows={4} placeholder="详细提示内容" />
          </Form.Item>
        </Card>
      ))}
    </Form>
  );
};

export default PromptPanel;
