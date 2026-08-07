import React, { useEffect, useState } from 'react';
import { Alert, Modal, Select, Space, Typography, message } from 'antd';
import { request } from '@/utils';
import {
  MyPreference, PreferenceTimeSlot,
  getMyPreference, listOpenTimeSlots, submitPreference,
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

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [d, s, mine]: any[] = await Promise.all([
          getValidDept().catch(() => null),
          listOpenTimeSlots(cycleId).catch(() => null),
          getMyPreference(cycleId).catch(() => null),
        ]);
        if (cancelled) return;
        setDepts(d?.data ?? []);
        setSlots(s?.data ?? []);
        const p: MyPreference | null = mine?.data ?? null;
        setFirstDept(p?.firstDeptId ?? undefined);
        setSecondDept(p?.secondDeptId ?? undefined);
        setSlotIds((p?.acceptedTimeSlots ?? []).map((x) => x.timeSlotId));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, cycleId]);

  const handleSave = async () => {
    if (!firstDept) { message.warning('请选择第一志愿部门'); return; }
    if (slotIds.length === 0) { message.warning('请至少勾选一个可面试时间'); return; }
    if (secondDept && secondDept === firstDept) { message.warning('第二志愿不能与第一志愿相同'); return; }
    setSaving(true);
    try {
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
      message.error(e?.message || '保存失败');
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
        </Space>
      )}
    </Modal>
  );
};

export default InterviewIntentEditor;
