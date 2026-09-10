// 老社员认领入口（用户端）。
//
// 往届社员注册后账号只是普通申请者身份，看到的是招新进度。
// 这张卡让他自报家门，管理员核对名册后一键置为社员。
//
// 显示时机：非社员才显示；已提交过的显示审批进度而不是表单——
// 否则会重复提交，管理员那边多出一堆一样的申请。
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Input, Modal, Select, Space, Tag, Typography, message } from 'antd';
import { IdcardOutlined } from '@ant-design/icons';
import {
  CLAIM_STATUS, MemberClaim, getMyMemberClaim, submitMemberClaim,
} from '@/api/manage/memberClaim';
import { getValidDept } from '@/api/manage/deptManage';

const { Text } = Typography;

const MemberClaimCard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [claim, setClaim] = useState<MemberClaim | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [depts, setDepts] = useState<Array<{ deptId: number; deptName: string }>>([]);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    try {
      const res: any = await getMyMemberClaim();
      setIsMember(Boolean(res?.data?.isMember));
      setClaim(res?.data?.claim ?? null);
    } catch {
      // 拿不到认领状态不该影响首页其余部分，静默按「不显示」处理
      setIsMember(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!open) return;
    getValidDept().then((r: any) => setDepts(r?.data ?? [])).catch(() => undefined);
  }, [open]);

  const submit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      await submitMemberClaim(values);
      message.success('已提交，请等待管理员核对社团名册');
      setOpen(false);
      form.resetFields();
      load();
    } catch (e: any) {
      message.error(e?.message || '提交失败');
    } finally {
      setSaving(false);
    }
  };

  // 已是社员、还在加载、或申请已通过：这张卡没有存在的必要
  if (loading || isMember || claim?.status === CLAIM_STATUS.APPROVED) return null;

  const pending = claim?.status === CLAIM_STATUS.PENDING;
  const rejected = claim?.status === CLAIM_STATUS.REJECTED;

  return (
    <>
      <Card size="small" title={<><IdcardOutlined /> 我是往届社员</>}>
        {pending ? (
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Tag color="processing">审核中</Tag>
            <Text type="secondary">
              已提交认领申请（{claim?.realName}
              {claim?.joinYear ? ` · ${claim.joinYear}` : ''}），管理员核对名册后会置为社员身份。
            </Text>
          </Space>
        ) : (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {rejected && (
              <Alert
                type="warning"
                showIcon
                message="上次申请未通过"
                description={claim?.reviewNote || '请补充更明确的证明信息后重新提交。'}
              />
            )}
            <Text type="secondary">
              往届社员但没在官网注册过？提交一份认领申请，管理员核对后会恢复你的社员身份与部门。
            </Text>
            <Button type="primary" size="small" onClick={() => setOpen(true)}>
              {rejected ? '重新提交申请' : '申请认领社员身份'}
            </Button>
          </Space>
        )}
      </Card>

      <Modal
        title="老社员身份认领"
        open={open}
        onOk={submit}
        okText="提交申请"
        confirmLoading={saving}
        onCancel={() => setOpen(false)}
        destroyOnClose
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="管理员会拿这些信息与社团名册核对，请填写真实内容。"
        />
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="realName"
            label="真实姓名"
            rules={[{ required: true, message: '请填写真实姓名' }]}
          >
            <Input placeholder="与社团名册一致的姓名" maxLength={50} />
          </Form.Item>
          <Form.Item name="studentId" label="学号">
            <Input placeholder="选填" maxLength={32} />
          </Form.Item>
          <Form.Item name="joinYear" label="入社年份 / 届别">
            <Input placeholder="如 2024 或 2024级" maxLength={32} />
          </Form.Item>
          <Form.Item name="deptId" label="所属部门">
            <Select
              allowClear
              placeholder="选填，审批时管理员可修正"
              options={depts.map((d) => ({ value: d.deptId, label: d.deptName }))}
            />
          </Form.Item>
          <Form.Item name="evidence" label="证明说明">
            <Input.TextArea
              rows={3}
              maxLength={500}
              showCount
              placeholder="担任过的职务、参与过的项目、能证明你身份的社员等，越具体越好核对"
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default MemberClaimCard;
