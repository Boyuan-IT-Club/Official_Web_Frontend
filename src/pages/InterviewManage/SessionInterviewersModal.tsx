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
  /** 后端会填充 user_role 关联出的角色（见 AdminController#getUsers） */
  roles?: { roleName?: string; roleCode?: string }[];
}

/** 一次取够：社团总人数这个量级（百级）不值得做分页加载 */
const USER_PAGE_SIZE = 1000;

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
      // 参数名必须是 size：写 pageSize 会被后端忽略并回落到默认 10 条 ——
      // 原先就是这样，一百多号人只列得出 10 个，想绑的人根本搜不到。
      // （用户管理页踩过同一个坑，见 Management/index.tsx 的注释。）
      getAllUsers({ page: '0', size: String(USER_PAGE_SIZE) }) as any,
      listSessionInterviewers(sessionId),
    ])
      .then(([userRes, boundRes]: any[]) => {
        setUsers(userRes?.data?.content ?? []);
        setSelected((boundRes?.data ?? []).map(Number));
      })
      .catch((e: any) => message.error(e?.message || '加载面试官候选名单失败'))
      .finally(() => setLoading(false));
  }, [open, sessionId]);

  /*
   * 名单里绝大多数是还没有任何角色的注册者 —— 本届 182 个用户里有 152 个
   * （正在应聘的候选人就在其中）。绑定面试官会连带授予「本场候选人的简历查看权限」，
   * 手滑绑上一位候选人，他就能翻看同场所有人的简历与附件。
   *
   * 不做硬过滤：新面试官可能还没来得及授角色，滤掉就绑不上了。
   * 改为把角色写进选项、按「谁该来面试」排序，谁是候选人一眼看得见。
   */
  const options = useMemo(() => {
    const ranked = users.map((user) => {
      const codes = new Set((user.roles ?? []).map((r) => r.roleCode).filter(Boolean) as string[]);
      const roleNames = (user.roles ?? []).map((r) => r.roleName).filter(Boolean) as string[];

      // 能面试的那几类排前面：面试官 > 超管/管理员 > 社员 > 其它 > 没角色
      const tier = codes.has('INTERVIEWER') ? 0
        : (codes.has('SUPER_ADMIN') || codes.has('ADMIN')) ? 1
          : codes.has('MEMBER') ? 2
            : codes.size > 0 ? 3
              : 4;

      const display = user.name || user.username || `#${user.userId}`;
      // 角色直接写进选项：光看姓名分不出谁是来面试的、谁是来应聘的
      const badge = roleNames.length > 0
        ? roleNames.join('/')
        : '未授角色 · 可能是报名的候选人';
      const parts = [badge, user.dept].filter(Boolean);

      return {
        value: user.userId,
        label: `${display}（${parts.join(' · ')}）`,
        tier,
        display,
        // 标签之外再留一份检索文本：占位符写的是「搜索姓名或账号」，
        // 而账号是一长串学号、放进标签每行都很吵，但它得能搜到
        search: `${user.name ?? ''} ${user.username ?? ''} ${user.dept ?? ''} ${roleNames.join(' ')}`.toLowerCase(),
      };
    });

    return ranked.sort((a, b) => a.tier - b.tier || a.display.localeCompare(b.display, 'zh-CN'));
  }, [users]);

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
          filterOption={(input, option) =>
            (option?.search ?? '').includes(input.trim().toLowerCase())}
          maxTagCount="responsive"
        />
      </Spin>
    </Modal>
  );
};

export default SessionInterviewersModal;
