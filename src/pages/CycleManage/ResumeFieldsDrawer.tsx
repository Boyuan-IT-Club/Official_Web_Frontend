// 某个招募周期的简历字段配置。
//
// 为什么从「用户与角色 → 简历设置」搬到这里：
//   1. 归属不对：简历字段是按周期定义的（resume_field_definition.cycle_id），
//      跟用户和角色没有关系，放在那个页面里找不到也讲不通
//   2. 更要紧的是原来那里写死了 cycleId = RESUME_CYCLE_ID（一个常量），
//      意味着新建招募周期后根本没法给它配字段——搬到周期列表里，
//      配置天然绑定到你点开的那个周期，这个限制自然消失
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Drawer, Space, Spin, Tag, message } from 'antd';
import {
  DEFAULT_RESUME_FIELDS,
  getResumeFields,
  initResumeFields,
  fromBackendFields,
  saveResumeFields,
  type ResumeFieldUI,
} from '@/api/manage/resumeEntry';
import ResumeFieldPanel from '@/pages/Management/components/ResumeFieldPanel';

const FIELD_TYPE_OPTIONS = [
  { value: 'text', label: '单行文本' },
  { value: 'textarea', label: '多行文本' },
  { value: 'select', label: '下拉选择' },
  { value: 'radio', label: '单选' },
  { value: 'checkbox', label: '多选' },
  { value: 'file', label: '文件上传' },
];

export interface ResumeFieldsDrawerProps {
  open: boolean;
  cycleId: number | null;
  cycleName?: string;
  onClose: () => void;
}

const ResumeFieldsDrawer: React.FC<ResumeFieldsDrawerProps> = ({
  open, cycleId, cycleName, onClose,
}) => {
  const [fields, setFields] = useState<ResumeFieldUI[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!cycleId) return;
    setLoading(true);
    try {
      const list = await getResumeFields(cycleId);
      setFields(fromBackendFields(list));
    } catch (e: any) {
      message.error(e?.message || '加载简历字段失败');
      setFields([]);
    } finally {
      setLoading(false);
    }
  }, [cycleId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const handleSave = async (next: ResumeFieldUI[]) => {
    if (!cycleId) return;
    // 显式带上当前周期：新增的字段没有 cycleId，saveResumeFields 的兜底值是那个
    // 硬编码常量，不指定就会把字段存到错误的周期上
    await saveResumeFields(next.map((f) => ({ ...f, cycleId })));
    message.success('简历字段已保存');
    await load();
  };

  const handleResetToDefault = async () => {
    if (!cycleId) return;
    try {
      await initResumeFields(cycleId);
      await load();
      message.success('已为本周期加载默认字段');
    } catch (e) {
      setFields(DEFAULT_RESUME_FIELDS.map((f) => ({ ...f, cycleId })));
      message.warning('后端初始化失败，已载入本地默认配置，保存后生效');
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={880}
      destroyOnClose
      title={
        <Space wrap>
          <span>简历字段</span>
          {cycleName && <Tag color="processing">{cycleName}</Tag>}
          <Tag>#{cycleId}</Tag>
        </Space>
      }
      extra={<Button onClick={load} loading={loading}>重新加载</Button>}
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message="字段按周期独立配置：改这里只影响本周期的投递表单，往届简历的展示不受影响。"
      />
      {loading && fields.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}><Spin /></div>
      ) : (
        <ResumeFieldPanel
          cycleId={cycleId ?? 0}
          fields={fields}
          onSave={handleSave}
          onFieldsChange={setFields}
          onResetToDefault={handleResetToDefault}
          loading={loading}
          fieldTypeOptions={FIELD_TYPE_OPTIONS}
        />
      )}
    </Drawer>
  );
};

export default ResumeFieldsDrawer;
