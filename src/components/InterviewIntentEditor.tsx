import React, { useEffect, useState } from 'react';
import { Alert, Input, Modal, Radio, Select, Space, Typography, message } from 'antd';
import { request } from '@/utils';
import {
  MyPreference, PreferenceTimeSlot,
  getMyPreference, listOpenTimeSlots, submitPreference, updateAttendance,
} from '@/api/interviewPreference';
import { getValidDept } from '@/api/manage/deptManage';

const { Text } = Typography;

interface Props {
  open: boolean;
  cycleId: number;
  /** 简历ID：用于把志愿部门同步写回简历的「期望部门」字段 */
  resumeId?: number | null;
  onClose: () => void;
  onSaved?: () => void;
}

/**
 * 面试意向编辑器：提交简历后无需进入简历编辑，即可单独修改志愿部门与时间窗。
 * 保存时：1) 覆盖提交面试志愿（后端支持重复提交）
 *        2) 同步更新简历的 expected_departments 字段，保持两处一致
 */
const InterviewIntentEditor: React.FC<Props> = ({ open, cycleId, resumeId, onClose, onSaved }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [depts, setDepts] = useState<{ deptId: number; deptName: string }[]>([]);
  const [slots, setSlots] = useState<PreferenceTimeSlot[]>([]);
  const [firstDept, setFirstDept] = useState<number | undefined>();
  const [secondDept, setSecondDept] = useState<number | undefined>();
  const [slotIds, setSlotIds] = useState<number[]>([]);
  // 「能否到线下参加」。这个选择原本只能在简历表单里改，简历一锁学生就被
  // 卡死在线上/线下名单里（Publish 页还承诺过「情况有变可随时改回」）。
  // 这里成为锁定后的唯一调整入口，保存走独立接口，不受简历锁与投递期限制。
  const [canAttendOffline, setCanAttendOffline] = useState<boolean>(true);
  const [customTime, setCustomTime] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [d, s, mine, defs, vals]: any[] = await Promise.all([
          getValidDept().catch(() => null),
          listOpenTimeSlots(cycleId).catch(() => null),
          getMyPreference(cycleId).catch(() => null),
          request({ url: `/api/resumes/fields/${cycleId}`, method: 'get' }).catch(() => null),
          request({ url: `/api/resumes/cycle/${cycleId}/field-values`, method: 'get' }).catch(() => null),
        ]);
        if (cancelled) return;
        setDepts(d?.data ?? []);
        const openSlots: PreferenceTimeSlot[] = s?.data ?? [];
        setSlots(openSlots);
        const p: MyPreference | null = mine?.data ?? null;
        setFirstDept(p?.firstDeptId ?? undefined);
        setSecondDept(p?.secondDeptId ?? undefined);
        // 预填要和当前开放的时间窗求交集。「我的志愿」接口原样返回上次勾的
        // 时间窗，其中可能有管理员后来关闭的——列表里不渲染它的复选框，
        // 学生看不到也取消不掉，提交必被后端 3611 拒绝，卡死在这一步。
        const openIds = new Set(openSlots.map((x) => x.timeSlotId));
        setSlotIds((p?.acceptedTimeSlots ?? [])
          .map((x) => x.timeSlotId)
          .filter((id) => openIds.has(id)));
        // 回显线上/线下选择：从简历字段 expected_interview_time 的 JSON 里读
        try {
          const timeDef = (defs?.data ?? []).find((f: any) => f.fieldKey === 'expected_interview_time');
          const raw = timeDef
            ? (vals?.data ?? []).find((v: any) => v.fieldId === timeDef.fieldId)?.fieldValue
            : null;
          if (raw) {
            const parsed = JSON.parse(String(raw));
            setCanAttendOffline(parsed?.canAttend !== 'no');
            setCustomTime(typeof parsed?.customTime === 'string' ? parsed.customTime : '');
          } else {
            setCanAttendOffline(true);
            setCustomTime('');
          }
        } catch {
          setCanAttendOffline(true);
          setCustomTime('');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, cycleId]);

  const handleSave = async () => {
    // 选了「不能线下」：只保存出席方式与说明，不动志愿与时间窗
    // （线上同学不进自动分配，时间窗对他没有意义；后端也会拒绝空时间窗）
    if (!canAttendOffline) {
      setSaving(true);
      try {
        await updateAttendance({ cycleId, canAttendOffline: false, customTime });
        message.success('已登记为线上面试，管理员会与你另约时间');
        onClose();
        onSaved?.();
      } catch (e: any) {
        message.error(e?.message || '保存失败');
      } finally {
        setSaving(false);
      }
      return;
    }
    if (!firstDept) { message.warning('请选择第一志愿部门'); return; }
    if (slotIds.length === 0) { message.warning('请至少勾选一个可面试时间'); return; }
    if (secondDept && secondDept === firstDept) { message.warning('第二志愿不能与第一志愿相同'); return; }
    setSaving(true);
    try {
      // 先登记「能到线下」（会顺带清掉旧的线上说明），再提交志愿。
      // 两个接口的锁定规则一致：已排上场次都会拒绝。
      await updateAttendance({ cycleId, canAttendOffline: true });
      await submitPreference({ cycleId, firstDeptId: firstDept, secondDeptId: secondDept, timeSlotIds: slotIds });

      // 同步简历的期望部门字段，保持简历与志愿一致
      if (resumeId) {
        try {
          const defsRes: any = await request({ url: `/api/resumes/fields/${cycleId}`, method: 'get' });
          const deptDef = (defsRes?.data ?? []).find((f: any) => f.fieldKey === 'expected_departments');
          if (deptDef) {
            const names = [firstDept, secondDept]
              .filter(Boolean)
              .map((id) => depts.find((d) => d.deptId === id)?.deptName)
              .filter(Boolean);
            await request({
              url: `/api/resumes/cycle/${cycleId}/field-values`,
              method: 'post',
              data: [{ fieldId: deptDef.fieldId, fieldValue: JSON.stringify(names), resumeId }],
            });
          }
        } catch (e) {
          console.warn('简历期望部门同步失败（志愿已保存）', e);
        }
      }

      message.success('面试意向已更新');
      onClose();
      onSaved?.();
    } catch (e: any) {
      if (e?.code === 3611) {
        // 表单开着的时候管理员正好关了某个时间窗。刷新列表、剔除失效勾选，
        // 让学生确认后能直接重交，而不是对着一条看不懂的报错干瞪眼
        try {
          const s: any = await listOpenTimeSlots(cycleId);
          const fresh: PreferenceTimeSlot[] = s?.data ?? [];
          setSlots(fresh);
          const openIds = new Set(fresh.map((x) => x.timeSlotId));
          setSlotIds((prev) => prev.filter((id) => openIds.has(id)));
        } catch { /* 刷新失败就保持原样，至少报错还在 */ }
        message.error('可选的面试时间刚有调整，已为你刷新，请确认勾选后重新提交');
      } else {
        message.error(e?.message || '保存失败');
      }
    } finally {
      setSaving(false);
    }
  };

  const deptOptions = depts.map((d) => ({ value: d.deptId, label: d.deptName }));

  return (
    <Modal
      title="修改面试意向"
      open={open}
      onOk={handleSave}
      confirmLoading={saving}
      onCancel={onClose}
      destroyOnClose
    >
      {loading ? (
        <Text type="secondary">加载中…</Text>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Alert
            type="info"
            showIcon
            message="修改会同步更新简历中的「期望部门」；已安排面试后如需换时间请走「申请改期」。"
          />
          <div>
            <Text type="secondary">能否到线下参加面试</Text>
            <div style={{ marginTop: 6 }}>
              <Radio.Group
                value={canAttendOffline}
                onChange={(e) => setCanAttendOffline(e.target.value)}
                options={[
                  { label: '能到线下参加', value: true },
                  { label: '不能，转线上面试', value: false },
                ]}
              />
            </div>
          </div>
          {!canAttendOffline && (
            <div>
              <Text type="secondary">情况说明（管理员会看到，方便安排线上面试）</Text>
              <Input.TextArea
                rows={2}
                maxLength={200}
                showCount
                style={{ marginTop: 4 }}
                placeholder="说明一下情况，方便我们安排（如：在外地实习，工作日晚上或周末线上都可以）"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
              />
            </div>
          )}
          {canAttendOffline && (<>
          <div>
            <Text type="secondary">第一志愿部门</Text>
            <Select
              style={{ width: '100%', marginTop: 4 }}
              placeholder="选择第一志愿"
              value={firstDept}
              onChange={setFirstDept}
              options={deptOptions}
            />
          </div>
          <div>
            <Text type="secondary">第二志愿部门（可选）</Text>
            <Select
              style={{ width: '100%', marginTop: 4 }}
              placeholder="选择第二志愿"
              allowClear
              value={secondDept}
              onChange={setSecondDept}
              options={deptOptions.filter((o) => o.value !== firstDept)}
            />
          </div>
          <div>
            <Text type="secondary">可面试时间（多选，选得越多越容易安排）</Text>
            <Space direction="vertical" size={4} style={{ marginTop: 6 }}>
              {slots.length === 0 && <Text type="secondary">面试时间尚未开放</Text>}
              {slots.map((s) => (
                <label key={s.timeSlotId} style={{ cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={slotIds.includes(s.timeSlotId)}
                    onChange={(e) => setSlotIds((prev) =>
                      e.target.checked ? [...prev, s.timeSlotId] : prev.filter((id) => id !== s.timeSlotId))}
                  />
                  <span>{s.slotName}（{s.interviewDate} {String(s.startTime).slice(0, 5)}-{String(s.endTime).slice(0, 5)}）</span>
                </label>
              ))}
            </Space>
          </div>
          </>)}
        </Space>
      )}
    </Modal>
  );
};

export default InterviewIntentEditor;
