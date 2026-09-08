// 预录取名单：录取决策的草稿层。
//
// 分工：挑人在「结果与通知」（那里有简历分/面试分/结论/志愿和筛选，
// 勾选后批量加入名单）；本页管名单本身——按部门看人数与成员、
// 移出、以及最后的「按名单最终录取」。转正只写决定不发邮件，
// 发通知仍回「结果与通知」显式操作，保持录取与通知分离的动线。
import React, { useCallback, useEffect, useState } from 'react';
import { Button, Empty, Modal, Popconfirm, Space, Table, Tag, Typography, message } from 'antd';
import { ReloadOutlined, RocketOutlined } from '@ant-design/icons';
import {
  PreAdmissionDeptStat, PreAdmissionDraftItem, PreAdmissionList,
  finalizePreAdmission, listPreAdmission, removePreAdmission,
} from '@/api/manage/interviewAdmin';

const { Text } = Typography;

const PreAdmitTab: React.FC<{ cycleId: number; refreshToken?: number }> = ({ cycleId, refreshToken }) => {
  const [data, setData] = useState<PreAdmissionList | null>(null);
  const [loading, setLoading] = useState(false);
  const [deptFilter, setDeptFilter] = useState<string | undefined>();
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await listPreAdmission({ cycleId, page: 1, size: 500 });
      setData(res?.data ?? null);
    } catch (e: any) {
      message.error(e?.message || '加载预录取名单失败');
    } finally {
      setLoading(false);
    }
  }, [cycleId]);

  useEffect(() => { load(); }, [load, refreshToken]);

  const stats: PreAdmissionDeptStat[] = data?.departmentStats ?? [];
  const rows = (data?.candidates ?? []).filter(
    (c) => !deptFilter || c.departmentName === deptFilter,
  );

  const handleRemove = async (r: PreAdmissionDraftItem) => {
    try {
      await removePreAdmission({ cycleId, resultIds: [r.resultId] });
      message.success(`已把 ${r.userName ?? '该同学'} 移出名单`);
      load();
    } catch (e: any) {
      message.error(e?.message || '移出失败');
    }
  };

  const doFinalize = async () => {
    setFinalizing(true);
    try {
      const res: any = await finalizePreAdmission({ cycleId });
      message.success(`已正式录取 ${res?.data?.published ?? 0} 人，去「结果与通知」发送录取邮件`);
      setFinalizeOpen(false);
      load();
    } catch (e: any) {
      // 常见失败：名单里有人已被别处定稿 —— 后端整批回滚，这里保留弹窗让人刷新后重试
      message.error(e?.message || '转正失败');
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <>
      <Space wrap style={{ marginBottom: 12 }}>
        {/* 部门胶囊：点击即按该部门过滤 */}
        {stats.map((s) => (
          <Tag.CheckableTag
            key={s.deptId}
            checked={deptFilter === s.departmentName}
            onChange={(on) => setDeptFilter(on ? s.departmentName : undefined)}
            style={{ border: '1px solid #d9d9d9', padding: '2px 10px' }}
          >
            {s.departmentName} · {s.candidateCount}
          </Tag.CheckableTag>
        ))}
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>刷新</Button>
        <Button
          type="primary"
          icon={<RocketOutlined />}
          disabled={!data?.total}
          loading={finalizing}
          onClick={() => setFinalizeOpen(true)}
        >
          按名单最终录取（{data?.total ?? 0} 人）
        </Button>
      </Space>

      <Table
        rowKey="draftId"
        size="middle"
        loading={loading}
        dataSource={rows}
        pagination={false}
        locale={{
          emptyText: (
            <Empty description={
              <span>名单还是空的 —— 去「结果与通知」按分数与结论挑人，勾选后点「预录取（已选 n）」加入</span>
            } />
          ),
        }}
        columns={[
          { title: '姓名', dataIndex: 'userName', width: 140,
            render: (v: string, r: PreAdmissionDraftItem) => v || `用户#${r.userId ?? r.resultId}` },
          { title: '拟录取部门', dataIndex: 'departmentName', width: 140,
            render: (v: string) => <Tag color="blue">{v}</Tag> },
          { title: '最近调整', dataIndex: 'updatedAt', width: 170,
            render: (v: string) => (v ? String(v).replace('T', ' ').slice(0, 16) : '-') },
          { title: '操作', width: 100,
            render: (_: unknown, r: PreAdmissionDraftItem) => (
              <Popconfirm title="移出预录取名单？" okText="移出" cancelText="取消" onConfirm={() => handleRemove(r)}>
                <Button type="link" size="small" danger>移出</Button>
              </Popconfirm>
            ) },
        ] as any}
      />
      <Modal
        title="按名单最终录取？"
        open={finalizeOpen}
        confirmLoading={finalizing}
        okText="确认录取"
        onOk={doFinalize}
        onCancel={() => setFinalizeOpen(false)}
      >
        <p style={{ marginBottom: 8 }}>
          将把名单里的 {data?.total ?? 0} 人正式录取到各自部门（写入结果，不发邮件）：
        </p>
        {stats.map((s) => (
          <div key={s.deptId}>{s.departmentName} · {s.candidateCount} 人</div>
        ))}
        <p style={{ marginTop: 8, color: '#999' }}>
          录取邮件仍需到「结果与通知」勾选发送。若名单中有人已被别处定稿，本次会整批失败，刷新后重试。
        </p>
      </Modal>

      <Text type="secondary" style={{ display: 'block', marginTop: 12 }}>
        名单只是草稿，学生端完全不可见；「最终录取」会一次性写入正式结果，之后到「结果与通知」发送邮件。
      </Text>
    </>
  );
};

export default PreAdmitTab;
