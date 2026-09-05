import React, { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { SaveOutlined } from "@ant-design/icons";
import {
  AgentConfig,
  AgentSecretValue,
  getAgentConfig,
  updateAgentConfig,
} from "@/api/manage/agentApis";

const { Text } = Typography;

/** 低敏可热载键的中文说明(其余 string 键同样可改,白名单校验在 Agent 侧) */
const HOT_KEY_LABELS: Record<string, string> = {
  model_strong: "主力模型",
  model_light: "轻量模型",
  llm_provider: "模型供应商",
  llm_base_url: "OpenAI 兼容端点",
};

/** 高敏键中文说明(只读掩码回显,决策 #101:凭证只存 .env 永不落库) */
const SECRET_KEY_LABELS: Record<string, string> = {
  llm_api_key: "LLM API Key",
  anthropic_api_key: "Anthropic API Key",
  backend_service_password: "后端服务账号密码",
  feishu_app_secret: "飞书 App Secret",
  postgres_url: "数据库连接串",
  feishu_encrypt_key: "飞书 Encrypt Key",
};

const isSecret = (v: string | AgentSecretValue): v is AgentSecretValue =>
  typeof v === "object" && v !== null;

/** 配置管理:高敏只读掩码回显 + 低敏改后热生效(M6 #115;权限 agent:monitor) */
const AgentConfigPage: React.FC = () => {
  const [config, setConfig] = useState<AgentConfig>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await getAgentConfig();
      const data: AgentConfig = res?.data ?? {};
      setConfig(data);
      // 低敏键回填表单
      const fields: Record<string, string> = {};
      Object.entries(data).forEach(([k, v]) => {
        if (!isSecret(v)) fields[k] = v;
      });
      form.setFieldsValue(fields);
    } catch (e: any) {
      message.error(e?.message || "加载配置失败");
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    try {
      const values = await form.validateFields();
      // 只提交有值的键;空值交给 Agent 侧 400 提示(白名单键不可为空)
      const payload: Record<string, string> = {};
      Object.entries(values).forEach(([k, v]) => {
        if (v != null && String(v).trim() !== "" && String(v) !== (config[k] as string)) {
          payload[k] = String(v).trim();
        }
      });
      if (!Object.keys(payload).length) {
        message.info("没有需要保存的修改");
        return;
      }
      setSaving(true);
      const res: any = await updateAgentConfig(payload);
      message.success(`已保存并热生效:${(res?.data?.updated ?? []).join(", ")}`);
      load();
    } catch (e: any) {
      if (e?.errorFields) return; // 表单校验错误,antd 已提示
      message.error(e?.message || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const secretRows = Object.entries(config)
    .filter(([, v]) => isSecret(v))
    .map(([k, v]) => ({ key: k, ...(v as AgentSecretValue) }));

  return (
    <Card title="Agent 配置管理" loading={loading}>
      <Typography.Paragraph type="secondary">
        低敏项保存后进程内热生效(无需重启);高敏项只存 .env,此处仅掩码回显(末 4 位)。
      </Typography.Paragraph>

      <Form form={form} layout="vertical" style={{ maxWidth: 560 }}>
        {Object.keys(HOT_KEY_LABELS).map((k) =>
          !isSecret(config[k]) && config[k] !== undefined ? (
            <Form.Item
              key={k}
              name={k}
              label={`${HOT_KEY_LABELS[k]}(${k})`}
              rules={[{ required: true, message: "不能为空" }]}
            >
              <Input />
            </Form.Item>
          ) : null
        )}
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>
          保存并热生效
        </Button>
      </Form>

      <Typography.Title level={5} style={{ marginTop: 32 }}>
        高敏项(只读)
      </Typography.Title>
      <Table
        rowKey="key"
        size="small"
        pagination={false}
        dataSource={secretRows}
        columns={[
          {
            title: "配置项",
            dataIndex: "key",
            render: (k: string) => `${SECRET_KEY_LABELS[k] ?? k}(${k})`,
          },
          {
            title: "状态",
            dataIndex: "configured",
            width: 120,
            render: (ok: boolean) =>
              ok ? <Tag color="success">已配置</Tag> : <Tag color="default">未配置</Tag>,
          },
          {
            title: "掩码",
            dataIndex: "masked",
            render: (v: string) => (v ? <Text code>{v}</Text> : <Text type="secondary">-</Text>),
          },
        ]}
      />
    </Card>
  );
};

export default AgentConfigPage;
