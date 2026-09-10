// 老社员认领审批（管理端）。
//
// 通过即写回 is_member 与部门——比让管理员去用户列表里翻人、逐个改标记可靠：
// 申请里带着姓名、届别、证明说明，核对名册时该看的都在一行里。
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, Button, Input, Modal, Select, Space, Table, Tag, Typography, message,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import {
  CLAIM_STATUS, MemberClaim, approveMemberClaim, listMemberClaims, rejectMemberClaim,
} from '@/api/manage/memberClaim';
import { getValidDept } from '@/api/manage/deptManage';

const { Text, Paragraph } = Typography;

const STATUS_TAG: Record<number, { color: string; text: string }> = {
  0: { color: 'processing', text: '待审核' },
  1: { color: 'success', text: '已通过' },
  2: { color: 'default', text: '已驳回' },
};

const MemberClaimReview: React.FC = () => {
  // 部门列表自取：本页原本没有这份数据，从父组件层层传反而多一处耦合
  const [depts, setDepts] = useState<Array<{ deptId: number; deptName: string }>>([]);
  useEffect(() => {
    getValidDept().then((r: any) => setDepts(r?.data ?? [])).catch(() => undefined);
  }, []);

  const [rows, setRows] = useState<MemberClaim[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<number | undefined>(CLAIM_STATUS.PENDING);
  // 审批弹窗：通过时可纠正部门，驳回时必须说明理由
  const [acting, setActing] = useState<{ claim: MemberClaim; approve: boolean } | null>(null);
  const [actDept, setActDept] = useState<number | undefined>();
  const [actNote, setActNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await listMemberClaims({ status: statusFilter, page: 1, size: 200 });
      setRows(res?.data?.records ?? []);
    } catch (e: any) {
      message.error(e?.message || '加载认领申请失败');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openAct = (claim: MemberClaim, approve: boolean) => {
    setActing({ claim, approve });
    setActDept(claim.deptId ?? undefined);
    setActNote('');
  };

  const doAct = async () => {
    if (!acting) return;
    if (!acting.approve && !actNote.trim()) {
      message.warning('请填写驳回理由——申请人要据此补充材料');
      return;
    }
    setSaving(true);
    try {
      if (acting.approve) {
        await approveMemberClaim(acting.claim.claimId, { deptId: actDept, note: actNote.trim() || undefined });
        message.success(`${acting.claim.realName} 已认定为社员`);
      } else {
        await rejectMemberClaim(acting.claim.claimId, { note: actNote.trim() });
        message.success('已驳回，申请人可补充材料后重新提交');
      }
      setActing(null);
      load();
    } catch (e: any) {
      message.error(e?.message || '操作失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Space wrap style={{ marginBottom: 12 }}>
        <Select
          allowClear
          style={{ width: 140 }}
          placeholder="全部状态"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: CLAIM_STATUS.PENDING, label: '待审核' },
            { value: CLAIM_STATUS.APPROVED, label: '已通过' },
            { value: CLAIM_STATUS.REJECTED, label: '已驳回' },
          ]}
        />
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>刷新</Button>
        <Text type="secondary">通过后账号立即成为社员并归入部门</Text>
      </Space>

      <Table
        rowKey="claimId"
        size="middle"
        loading={loading}
        dataSource={rows}
        pagination={false}
        locale={{ emptyText: statusFilter === CLAIM_STATUS.PENDING ? '没有待审核的认领申请' : '暂无记录' }}
        columns={[
          { title: '姓名', dataIndex: 'realName', width: 110 },
          { title: '学号 / 登录名', width: 150,
            render: (_: unknown, r: MemberClaim) => r.studentId || r.username || '-' },
          { title: '届别', dataIndex: 'joinYear', width: 100, render: (v: string) => v || '-' },
          { title: '申报部门', dataIndex: 'deptName', width: 110, render: (v: string) => v || '-' },
          { title: '证明说明', dataIndex: 'evidence',
            render: (v: string) => (v
              ? <Paragraph style={{ margin: 0, maxWidth: 380 }} ellipsis={{ rows: 2, expandable: true, symbol: '展开' }}>{v}</Paragraph>
              : <Text type="secondary">未填写</Text>) },
          { title: '状态', dataIndex: 'status', width: 96,
            render: (v: number, r: MemberClaim) => {
              const t = STATUS_TAG[v] ?? { color: 'default', text: String(v) };
              return (
                <Space direction="vertical" size={0}>
                  <Tag color={t.color}>{t.text}</Tag>
                  {r.reviewedByName && <Text type="secondary" style={{ fontSize: 11 }}>{r.reviewedByName}</Text>}
                </Space>
              );
            } },
          { title: '操作', width: 140,
            render: (_: unknown, r: MemberClaim) => (r.status === CLAIM_STATUS.PENDING ? (
              <>
                <Button type="link" size="small" onClick={() => openAct(r, true)}>通过</Button>
                <Button type="link" size="small" danger onClick={() => openAct(r, false)}>驳回</Button>
              </>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>{r.reviewNote || '已处理'}</Text>
            )) },
        ] as any}
      />

      <Modal
        title={acting ? `${acting.approve ? '通过' : '驳回'}认领：${acting.claim.realName}` : ''}
        open={!!acting}
        onOk={doAct}
        okText={acting?.approve ? '确认通过' : '确认驳回'}
        okButtonProps={{ danger: !acting?.approve }}
        confirmLoading={saving}
        onCancel={() => setActing(null)}
        destroyOnClose
      >
        {acting?.approve ? (
          <>
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
              message="请先与社团名册核对无误。通过后该账号立即成为社员，能看到社员视图。"
            />
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary">归入部门（可纠正申请人填的）</Text>
              <Select
                allowClear
                style={{ width: '100%', marginTop: 4 }}
                placeholder="不选则不改部门"
                value={actDept}
                onChange={setActDept}
                options={depts.map((d) => ({ value: d.deptId, label: d.deptName }))}
              />
            </div>
          </>
        ) : (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message="驳回理由会展示给申请人，他可以补充材料后重新提交。"
          />
        )}
        <Input.TextArea
          rows={3}
          maxLength={255}
          value={actNote}
          onChange={(e) => setActNote(e.target.value)}
          placeholder={acting?.approve ? '备注（可选）' : '驳回理由（必填），如：名册中查无此人，请补充可作证的社员'}
        />
      </Modal>
    </>
  );
};

export default MemberClaimReview;
