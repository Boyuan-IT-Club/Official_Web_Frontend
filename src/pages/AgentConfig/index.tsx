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
import { ReloadOutlined, SaveOutlined } from "@ant-design/icons";
import {
  AgentConfig,
  AgentSecretValue,
  getAgentConfig,
  updateAgentConfig,
} from "@/api/manage/agentApis";

const { Text, Paragraph } = Typography;

/** 低敏可热载键的中文说明(其余 string 键同样可改,白名单校验在 Agent 侧) */
const HOT_KEY_LABELS: Record<string, { label: string; helper: string }> = {
  model_strong: { label: "主力模型", helper: "对话与摘要的默认模型名" },
  model_light: { label: "轻量模型", helper: "轻量任务预留;留空走主力模型" },
  llm_provider: { label: "模型供应商", helper: "anthropic 或 openai-compatible" },
  llm_base_url: {
    label: "OpenAI 兼容端点",
    helper: "仅允许 https 且 host 在白名单内(防 API Key 外泄)",
  },
};

/** 高敏键中文说明(只读掩码回显,决策 #101:凭证只存 .env 永不落库) */
const SECRET_KEY_LABELS: Record<string, string> = {
  llm_api_key: "LLM API Key",
  anthropic_api_key: "Anthropic API Key",
  backend_service_username: "后端服务账号用户名",
  backend_service_password: "后端服务账号密码",
  feishu_app_id: "飞书 App ID",
  feishu_app_secret: "飞书 App Secret",
  feishu_verification_token: "飞书验证令牌",
  feishu_encrypt_key: "飞书 Encrypt Key",
  postgres_url: "数据库连接串",
  langfuse_host: "Langfuse 地址",
  langfuse_public_key: "Langfuse Public Key",
  langfuse_secret_key: "Langfuse Secret Key",
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
    <div>
      <Card
        title={
          <span>
            可热载配置{" "}
            <Tag color="processing" style={{ marginLeft: 8 }}>
              保存后即时生效
            </Tag>
          </span>
        }
        extra={
          <Button size="small" icon={<ReloadOutlined />} onClick={load}>
            重新加载
          </Button>
        }
        style={{ borderRadius: 12 }}
        loading={loading}
      >
        <Paragraph type="secondary" style={{ marginTop: 0 }}>
          低敏项存入 agent_config 表,保存后进程内重建生效,无需重启;改动即时作用于下一轮对话。
        </Paragraph>
        <Form form={form} layout="vertical" style={{ maxWidth: 560 }}>
          {Object.entries(HOT_KEY_LABELS).map(([k, meta]) =>
            !isSecret(config[k]) && config[k] !== undefined ? (
              <Form.Item
                key={k}
                name={k}
                label={meta.label}
                extra={meta.helper}
                rules={[{ required: true, message: "不能为空" }]}
                style={{ marginBottom: 16 }}
              >
                <Input />
              </Form.Item>
            ) : null
          )}
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>
            保存并热生效
          </Button>
        </Form>
      </Card>

      <Card
        title={
          <span>
            敏感项{" "}
            <Tag style={{ marginLeft: 8 }}>只读 · 掩码回显</Tag>
          </span>
        }
        style={{ marginTop: 16, borderRadius: 12 }}
      >
        <Paragraph type="secondary" style={{ marginTop: 0 }}>
          高敏项只存 .env(决策 #101),此处仅确认「是否已配置」与末 4 位掩码,不暴露明文。
        </Paragraph>
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
              width: 160,
              render: (v: string) => (v ? <Text code>{v}</Text> : <Text type="secondary">-</Text>),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default AgentConfigPage;
