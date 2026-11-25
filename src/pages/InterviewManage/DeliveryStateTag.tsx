import React from 'react';
import { Tag, Tooltip } from 'antd';

const labels: Record<string, [string, string]> = {
  UNSENT: ['未发送', 'default'], PENDING: ['已受理', 'blue'], SENDING: ['发送中', 'blue'],
  SENT: ['已发送', 'green'], UNKNOWN: ['待核实', 'gold'], FAILED: ['发送失败', 'red'], SKIPPED: ['已跳过', 'default'],
};

export function canQueue(state: string) {
  return ['UNSENT', 'FAILED', 'SKIPPED'].includes(state);
}

export function DeliveryStateTag({ state, at }: { state: string; at?: string | null }) {
  const [text, color] = labels[state] ?? labels.UNKNOWN;
  const tag = <Tag color={color}>{text}</Tag>;
  return state === 'SENT' && at ? <Tooltip title={String(at).replace('T', ' ')}>{tag}</Tooltip> : tag;
}
