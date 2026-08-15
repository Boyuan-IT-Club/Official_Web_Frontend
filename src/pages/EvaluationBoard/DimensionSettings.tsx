// 评分维度配置（管理员）：整表覆盖保存，删掉的维度连同其历史得分一并失去意义，故删除前给出提示。
import React, { useEffect, useState } from 'react';
import { Alert, Button, Input, InputNumber, Modal, Space, Table, Typography, message } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  EvaluationDimension, EvaluationDimensionInput, listDimensions, saveDimensions,
} from '@/api/manage/interviewEvaluation';

const { Text } = Typography;

export interface DimensionSettingsProps {
  open: boolean;
  cycleId: number;
  onClose: () => void;
  onSaved: () => void;
}

const DimensionSettings: React.FC<DimensionSettingsProps> = ({ open, cycleId, onClose, onSaved }) => {
  const [rows, setRows] = useState<EvaluationDimensionInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listDimensions(cycleId)
      .then((res) => {
        const list: EvaluationDimension[] = res?.data ?? [];
        setRows(list.map((d) => ({
          dimensionId: d.dimensionId,
          name: d.name,
          maxScore: d.maxScore,
          weight: Number(d.weight),
          sortOrder: d.sortOrder,
        })));
      })
      .catch((e: any) => message.error(e?.message || '加载评分维度失败'))
      .finally(() => setLoading(false));
  }, [open, cycleId]);

  const patch = (index: number, changes: Partial<EvaluationDimensionInput>) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...changes } : row)));
  };

  const handleSave = async () => {
    if (rows.length === 0) {
      message.warning('至少保留一个评分维度');
      return;
    }
    if (rows.some((row) => !row.name?.trim())) {
      message.warning('维度名称不能为空');
      return;
    }
    setSaving(true);
    try {
      await saveDimensions(cycleId, rows.map((row, index) => ({ ...row, sortOrder: index + 1 })));
      message.success('评分维度已保存');
      onSaved();
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
      title="评分维度"
      width={720}
      onCancel={onClose}
      onOk={handleSave}
      okText="保存"
      confirmLoading={saving}
    >
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message="改动会立刻影响正在进行的评价表"
        description="删除维度会同时让该列已填的分数失去意义，加权总分也会随之变化。建议在开始面试前定稿。"
      />
      <Table
        rowKey={(_, index) => String(index)}
        loading={loading}
        pagination={false}
        dataSource={rows}
        columns={[
          {
            title: '维度名称',
            dataIndex: 'name',
            render: (value: string, _row, index: number) => (
              <Input value={value} maxLength={50} onChange={(e) => patch(index, { name: e.target.value })} />
            ),
          },
          {
            title: '满分',
            dataIndex: 'maxScore',
            width: 120,
            render: (value: number, _row, index: number) => (
              <InputNumber min={1} max={100} value={value} onChange={(v) => patch(index, { maxScore: Number(v) || 1 })} />
            ),
          },
          {
            title: '权重',
            dataIndex: 'weight',
            width: 140,
            render: (value: number, _row, index: number) => (
              <InputNumber min={0.01} step={0.1} value={value} onChange={(v) => patch(index, { weight: Number(v) || 0.01 })} />
            ),
          },
          {
            title: '',
            width: 60,
            render: (_v, _row, index: number) => (
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => setRows((prev) => prev.filter((__, i) => i !== index))}
              />
            ),
          },
        ]}
        footer={() => (
          <Space>
            <Button
              icon={<PlusOutlined />}
              onClick={() => setRows((prev) => [...prev, { name: '', maxScore: 10, weight: 1 }])}
            >
              添加维度
            </Button>
            <Text type="secondary">加权总分 = Σ(维度得分 × 权重)</Text>
          </Space>
        )}
      />
    </Modal>
  );
};

export default DimensionSettings;
