// 简历页顶部那条状态提示，说什么、什么语气。
//
// 抽出来是因为这些信息原先散在六个框里：顶部三条（未开始 / 已停止投递 / 简历状态），
// 底部又三条（评审中 / 已通过 / 未通过）。同一份简历会同时出现两三个框，
// 反复说「不可修改」——顶部刚说完「评审中（不可修改）」，
// 往下翻还有一个黄框再说一遍「已进入审核阶段，暂时无法修改」。
//
// 现在合成一条，「显示哪段文字」由这里判定。放在单独文件里是为了能直接测：
// 组合有十来种（周期三态 × 简历五状态），塞在 JSX 的三元里没法验，
// 也没人看得出漏了哪种。

import { CyclePhase } from './cyclePhase';

/** 简历状态：1草稿 2已提交 3评审中 4通过 5未通过 */
export type ResumeStatus = 1 | 2 | 3 | 4 | 5 | null | undefined;

export type NoticeTone = 'info' | 'warning' | 'success' | 'muted';

export interface ResumeNotice {
  tone: NoticeTone;
  title: string;
  /** 等宽 chip 里的状态值；为空时不渲染 chip */
  badge?: string;
  description: string;
}

/** 状态标签。「可不可以改」不写死在这里，由 canEdit 决定，见下。 */
const STATUS_LABEL: Record<number, string> = {
  1: '草稿',
  2: '已提交',
  3: '评审中',
  4: '通过',
  5: '未通过',
};

export function statusLabelOf(status: ResumeStatus): string {
  return STATUS_LABEL[Number(status)] ?? '草稿';
}

/**
 * 判定顺序有讲究：**周期状态优先于简历状态**。
 *
 * 周期没开放时，简历是评审中还是已通过都不影响「现在动不了」这个结论，
 * 而原因是周期而不是简历——说「已进入审核阶段所以不能改」是错的归因。
 * 只有周期开着，才轮到简历自身的状态决定能不能改。
 */
export function resolveResumeNotice(args: {
  cyclePhase: CyclePhase;
  status: ResumeStatus;
  canEdit: boolean;
}): ResumeNotice {
  const { cyclePhase, status, canEdit } = args;
  const badge = `${statusLabelOf(status)}（${canEdit ? '可修改' : '不可修改'}）`;

  if (cyclePhase === 'upcoming') {
    return {
      tone: 'muted',
      title: '本周期尚未开始',
      badge,
      description: '管理员调整了开放时间，本轮招募还未开始，简历暂时不可修改或提交，以下内容仅供查看。',
    };
  }

  if (cyclePhase === 'ended') {
    return {
      tone: 'warning',
      title: '本周期已停止投递',
      badge,
      description: '招募周期已结束，简历不可再修改或提交，以下内容仅供查看。',
    };
  }

  // 周期开着，看简历自己走到哪一步
  switch (Number(status)) {
    case 3:
      return {
        tone: 'warning',
        title: '简历正在评审',
        badge,
        description: '简历已进入评审阶段，暂时无法修改。有需要请联系管理员。',
      };
    case 4:
      return {
        tone: 'success',
        title: '简历已通过',
        badge,
        description: '恭喜！简历已通过评审，进入后续流程后不可再修改。',
      };
    case 5:
      return {
        tone: 'muted',
        title: '简历未通过',
        badge,
        description: '很遗憾，简历未通过评审。感谢你的参与，欢迎下一届再来。',
      };
    case 2:
      return {
        tone: 'info',
        title: '简历已提交',
        badge,
        description: '在评审开始前你可以继续修改简历。',
      };
    default:
      // 草稿（含 status 为空的新建简历）
      return {
        tone: 'info',
        title: '简历尚未提交',
        badge,
        description: '当前是草稿，填写完成后记得点「提交简历」，否则不会进入评审。',
      };
  }
}
