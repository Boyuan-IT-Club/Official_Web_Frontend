// 报名表「能否参加线下面试 / 面试时间」的存储格式与落库规则。
//
// 单独成文件是为了能直接测：这块的 bug 不在界面上，而在「保存时漏没漏」。

export type InterviewTimesState = {
  first: string;
  second: string;
  canAttend: 'yes' | 'no';
  customTime: string;
};

/** expected_interview_time 字段的存储格式（管理端、自动分配、线上名单都按它读） */
export const serializeInterviewTimes = (t: InterviewTimesState): string => JSON.stringify({
  first: t.canAttend === 'yes' && t.first !== '无' ? t.first : '',
  second: t.canAttend === 'yes' && t.second !== '无' ? t.second : '',
  canAttend: t.canAttend,
  customTime: t.customTime,
});

export type FieldValuePayload = {
  fieldId: number;
  fieldValue: any;
  valueId?: number;
  resumeId: any;
};

/**
 * 保证保存载荷里带着「能否参加线下面试」的回答，哪怕学生没动过它。
 *
 * 单选默认停在「能参加」，而字段值只在 onChange 里写——没改过默认值的人
 * 什么都没存（2026 届 #14 周期 122 份里 110 份为空）。管理端只能把「没存」
 * 显示成「未填写」，分不清是本人确认过还是根本没回答。
 *
 * 载荷里已经有这个字段（学生改过）时原样保留，不覆盖。
 */
export const ensureInterviewTimesInPayload = (
  payload: FieldValuePayload[],
  opts: {
    fieldId?: number;
    disabled: boolean;
    times: InterviewTimesState;
    existingValueId?: number;
    resumeId: any;
  },
): FieldValuePayload[] => {
  const { fieldId, disabled, times, existingValueId, resumeId } = opts;
  if (!fieldId || disabled || payload.some((p) => p.fieldId === fieldId)) {
    return payload;
  }
  return [...payload, {
    fieldId,
    fieldValue: serializeInterviewTimes(times),
    valueId: existingValueId,
    resumeId,
  }];
};
