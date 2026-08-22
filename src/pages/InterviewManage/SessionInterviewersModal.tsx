// 绑定场次面试官：决定评价表里谁拥有自己的评分列，以及谁能看到该场次候选人的简历。
import React, { useEffect, useMemo, useState } from 'react';
import PageHint from '@/components/PageHint';
import { Modal, Select, Spin, message } from 'antd';
import { getAllUsers } from '@/api/manage/userApis';
import { bindSessionInterviewers, listSessionInterviewers } from '@/api/manage/interviewEvaluation';

interface PickableUser {
  userId: number;
  name?: string;
  username?: string;
  dept?: string;
}

export interface SessionInterviewersModalProps {
  open: boolean;
  sessionId?: number;
  sessionLabel?: string;
  onClose: () => void;
}

const SessionInterviewersModal: React.FC<SessionInterviewersModalProps> = ({
  open, sessionId, sessionLabel, onClose,
}) => {
  const [users, setUsers] = useState<PickableUser[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !sessionId) return;
    setLoading(true);
    Promise.all([
      getAllUsers({ page: '0', pageSize: '500' }) as any,
      listSessionInterviewers(sessionId),
    ])
      .then(([userRes, boundRes]: any[]) => {
        setUsers(userRes?.data?.content ?? []);
        setSelected((boundRes?.data ?? []).map(Number));
      })
      .catch((e: any) => message.error(e?.message || '加载面试官候选名单失败'))
      .finally(() => setLoading(false));
  }, [open, sessionId]);

  const options = useMemo(
    () => users.map((user) => ({
      value: user.userId,
      label: `${user.name || user.username || `#${user.userId}`}${user.dept ? `（${user.dept}）` : ''}`,
    })),
    [users],
  );

  const handleSave = async () => {
    if (!sessionId) return;
    setSaving(true);
    try {
      await bindSessionInterviewers(sessionId, selected);
      message.success('面试官已更新');
      onClose();
    } catch (e: any) {
      message.error(e?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={`绑定面试官${sessionLabel ? ` · ${sessionLabel}` : ''}`}
      onCancel={onClose}
      onOk={handleSave}
      confirmLoading={saving}
      okText="保存"
      destroyOnClose
    >
      <PageHint style={{ marginBottom: 16 }} title="绑定后这些人才能在评价表里评分">每人一列评分互不覆盖，并获得本场候选人的简历查看权限。</PageHint>
      <Spin spinning={loading}>
        <Select
          mode="multiple"
          allowClear
          style={{ width: '100%' }}
          placeholder="搜索姓名或账号后选择"
          value={selected}
          onChange={setSelected}
          options={options}
          optionFilterProp="label"
          maxTagCount="responsive"
        />
      </Spin>
    </Modal>
  );
};

export default SessionInterviewersModal;
