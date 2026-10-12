// 预录取部门选择器：就地把一个人放进某个部门，或移出名单。
//
// 原先只有终审舞台能改部门（部门按钮 + 数字键），总览矩阵与评价汇总都只能看。
// 可实际用法是先在表里按分数/志愿扫一遍，看到合适的就想当场放进去 ——
// 为此专门双击进舞台、改完再退出来，一个人要四次操作。
import React, { useState } from 'react';
import { Select, Tooltip } from 'antd';

export interface PreAdmitPickerProps {
  deptId?: number | null;
  depts: Array<{ deptId: number; deptName: string }>;
  onAssign: (deptId: number) => Promise<void> | void;
  onRemove: () => Promise<void> | void;
  /** 没有面试结果的人不能预录取（没面试就没有 resultId） */
  disabled?: boolean;
  disabledReason?: string;
}

/** 移出名单用一个固定值表示，避免与部门 id 撞上 */
const REMOVE = -1;

const PreAdmitPicker: React.FC<PreAdmitPickerProps> = ({
  deptId, depts, onAssign, onRemove, disabled, disabledReason,
}) => {
  const [busy, setBusy] = useState(false);

  const handle = async (value: number | undefined) => {
    setBusy(true);
    try {
      if (value === REMOVE || value == null) await onRemove();
      else await onAssign(value);
    } finally {
      setBusy(false);
    }
  };

  const select = (
    <Select<number>
      size="small"
      style={{ width: 104 }}
      placeholder="—"
      value={deptId ?? undefined}
      loading={busy}
      disabled={disabled || busy}
      onChange={handle}
      // 表格里行多，列表跟着表格滚会错位
      getPopupContainer={() => document.body}
      options={[
        ...depts.map((d) => ({ value: d.deptId, label: d.deptName })),
        // 已经在名单里才给「移出」，否则这一项对多数行都是噪音
        ...(deptId != null ? [{ value: REMOVE, label: '移出名单' }] : []),
      ]}
    />
  );

  return disabled && disabledReason
    ? <Tooltip title={disabledReason}>{select}</Tooltip>
    : select;
};

export default PreAdmitPicker;
