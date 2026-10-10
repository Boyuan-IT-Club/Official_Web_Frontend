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

/** 一次取够：能进后台的人是几十个量级，不值得做分页加载 */
const USER_PAGE_SIZE = 1000;

/** 徽标只取最高那个角色：不少人同时挂着 社员/管理员/超级管理员，全列出来每行都很吵 */
const ROLE_RANK: { code: string; label: string }[] = [
  { code: 'SUPER_ADMIN', label: '超级管理员' },
  { code: 'ADMIN', label: '管理员' },
  { code: 'INTERVIEWER', label: '面试官' },
  { code: 'MEMBER', label: '社员' },
];

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
      // roleGroup=console：只列能进管理后台的人（后端按 console:access 权限判定）。
      // 没有这张门票的人进不了后台、也就填不了评价表，绑上去等于白绑；
      // 而全量名单里绝大多数是正在应聘的候选人，绑错一个他就能翻看同场所有人的简历。
      //
      // 参数名必须是 size：写 pageSize 会被后端忽略并回落到默认 10 条 ——
      // 原先就是这样，一百多号人只列得出 10 个，想绑的人根本搜不到。
      // （用户管理页踩过同一个坑，见 Management/index.tsx 的注释。）
      getAllUsers({ page: '0', size: String(USER_PAGE_SIZE), roleGroup: 'console' }) as any,
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
   * 候选名单限定在「能进管理后台」的人（roleGroup=console，后端按 console:access 判定）。
   *
   * 这不是收紧，而是本来就该如此：没有这张门票的人进不了后台、填不了评价表，
   * 绑上去等于白绑；而不筛的话名单里 152/182 是还没授角色的注册者 ——
   * 正在应聘的候选人就在其中，而绑定会连带授予「本场候选人的简历查看权限」，
   * 手滑绑上一位，他就能翻看同场所有人的简历与附件。
   *
   * 想绑的人不在列表里，正确做法是先去「用户与角色」授「面试官」角色。
   */
  const options = useMemo(() => {
    const listed = users.map((user) => {
      const codes = new Set((user.roles ?? []).map((r) => r.roleCode).filter(Boolean) as string[]);
      const badge = ROLE_RANK.find((r) => codes.has(r.code))?.label ?? '可进后台';
      const display = user.name || user.username || `#${user.userId}`;
      return {
        value: user.userId,
        // 只显示人名。角色与部门曾经写在这里，是为了在全量名单里认出「报名的候选人」；
        // 现在名单只剩能进后台的二十来人（且无重名），那层提示没必要了，
        // 反倒让每个标签都拖着一长串，下拉和已选区都很吵。
        label: display,
        display,
        // 标签之外留一份检索文本：占位符写的是「搜索姓名或账号」，
        // 而账号是一长串学号、角色部门也不该挤进标签，但它们都得能搜到
        search: `${user.name ?? ''} ${user.username ?? ''} ${user.dept ?? ''} ${badge}`.toLowerCase(),
      };
    });

    // 已绑定却不在名单里的人（后来被收走权限、或被冻结）不能凭空消失 ——
    // 否则一保存就把他从这一场删掉了，而操作的人根本没看见发生了什么
    const known = new Set(listed.map((o) => o.value));
    const orphans = selected.filter((id) => !known.has(id)).map((id) => ({
      value: id,
      label: `#${id}（已绑定 · 当前无后台权限）`,
      display: `#${id}`,
      search: String(id),
    }));

    return [...listed, ...orphans].sort((a, b) => a.display.localeCompare(b.display, 'zh-CN'));
  }, [users, selected]);

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
      <PageHint style={{ marginBottom: 16 }} title="绑定后这些人才能在评价表里评分">每人一列评分互不覆盖，并获得本场候选人的简历查看权限。只列出能进管理后台的人；找不到想绑的人，先去「用户与角色」给他授「面试官」角色。</PageHint>
      <Spin spinning={loading}>
        <Select
          mode="multiple"
          /*
           * 不要 allowClear：它在输入框右端放一枚清空按钮，位置正好压着下拉箭头，
           * 点开列表时很容易误触，而它一下清掉整场已绑的面试官 ——
           * 保存就等于把这一场的人全删了。要去掉某个人，点他自己的 × 就行。
           */
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
