// 某个招募周期的二维码配置：部门群（每部门一张）、社团大群、招新答疑群。
//
// 为什么按周期配：群每一届都会换。挂全局要年年手改，而且历史周期发出去的
// 录取通知里是哪个群，事后无从追溯。
import React, { useCallback, useEffect, useState } from 'react';
import { Drawer, Upload, Button, Spin, message, Popconfirm, Input, Image } from 'antd';
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import PageHint from '@/components/PageHint';
import {
  listQrCodes, uploadQrCode, deleteQrCode, type RecruitmentQrCode,
} from '@/api/manage/cycleApis';
import { getValidDept } from '@/api/manage/deptManage';
import './qrcodes.scss';

export interface QrCodesDrawerProps {
  open: boolean;
  cycleId: number | null;
  cycleName?: string;
  onClose: () => void;
}

interface Slot {
  key: string;
  qrType: 'DEPT' | 'MAIN_GROUP' | 'QA_GROUP';
  deptId?: number;
  title: string;
  hint: string;
}

const QrCodesDrawer: React.FC<QrCodesDrawerProps> = ({ open, cycleId, cycleName, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [codes, setCodes] = useState<RecruitmentQrCode[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!cycleId) return;
    setLoading(true);
    try {
      const [qrRes, deptRes]: any[] = await Promise.all([
        listQrCodes(cycleId),
        getValidDept().catch(() => null),
      ]);
      setCodes(qrRes?.data ?? []);

      const depts = (deptRes?.data ?? []) as Array<{ deptId: number; deptName: string }>;
      setSlots([
        {
          key: 'MAIN_GROUP', qrType: 'MAIN_GROUP',
          title: '社团大群', hint: '所有被录取的同学都会收到这张',
        },
        {
          key: 'QA_GROUP', qrType: 'QA_GROUP',
          title: '招新答疑群', hint: '显示在简历填写页，供还在犹豫的同学提问',
        },
        ...depts.map((d) => ({
          key: `DEPT_${d.deptId}`,
          qrType: 'DEPT' as const,
          deptId: d.deptId,
          title: `${d.deptName}群`,
          hint: `录取到${d.deptName}的同学会收到这张`,
        })),
      ]);
    } catch (e: any) {
      message.error(e?.message || '加载二维码失败');
    } finally {
      setLoading(false);
    }
  }, [cycleId]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const findCode = (slot: Slot) => codes.find(
    (c) => c.qrType === slot.qrType && (slot.qrType !== 'DEPT' || c.deptId === slot.deptId),
  );

  const handleUpload = async (slot: Slot, file: File) => {
    if (!cycleId) return false;
    setBusyKey(slot.key);
    try {
      await uploadQrCode({
        cycleId,
        qrType: slot.qrType,
        deptId: slot.deptId,
        remark: remarks[slot.key]?.trim() || slot.title,
        file,
      });
      message.success(`${slot.title}的二维码已保存`);
      await load();
    } catch (e: any) {
      message.error(e?.message || '上传失败');
    } finally {
      setBusyKey(null);
    }
    return false;   // 阻止 antd 自己发请求，上面已经传过了
  };

  const handleDelete = async (id: number, title: string) => {
    try {
      await deleteQrCode(id);
      message.success(`已删除${title}的二维码`);
      await load();
    } catch (e: any) {
      message.error(e?.message || '删除失败');
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={720}
      title={`二维码配置${cycleName ? ` · ${cycleName}` : ''}`}
      destroyOnClose
    >
      <PageHint>
        录取通知会附上「本人部门群 + 社团大群」两张；答疑群显示在简历填写页。同一位置重新上传即替换。
      </PageHint>

      <Spin spinning={loading}>
        <div className="qr-grid">
          {slots.map((slot) => {
            const code = findCode(slot);
            return (
              <div className="qr-slot" key={slot.key}>
                <div className="qr-slot__head">
                  <span className="qr-slot__title">{slot.title}</span>
                  {code && (
                    <Popconfirm
                      title={`删除${slot.title}的二维码？`}
                      description="删除后录取通知里就不会附这张了，可以随时重新上传。"
                      onConfirm={() => handleDelete(code.id, slot.title)}
                      okText="删除"
                      okButtonProps={{ danger: true }}
                    >
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  )}
                </div>

                <div className="qr-slot__body">
                  {code ? (
                    /* 同学生端：用 antd Image 才点得开、放得大。
                       管理员上传后要核对「扫出来是不是这个群」，
                       缩略图那么小根本核对不了 */
                    <Image
                      className="qr-slot__img"
                      src={code.imageUrl}
                      alt={slot.title}
                      preview={{ mask: <span className="qr-slot__mask">点击放大</span> }}
                    />
                  ) : (
                    <div className="qr-slot__empty">未上传</div>
                  )}
                </div>

                <div className="qr-slot__hint">{slot.hint}</div>

                <Input
                  size="small"
                  placeholder={`备注（默认「${slot.title}」，会显示在邮件的图下）`}
                  value={remarks[slot.key] ?? code?.remark ?? ''}
                  onChange={(e) => setRemarks((prev) => ({ ...prev, [slot.key]: e.target.value }))}
                  style={{ marginBottom: 8 }}
                />

                <Upload
                  accept="image/*"
                  showUploadList={false}
                  beforeUpload={(file) => handleUpload(slot, file as File)}
                >
                  <Button
                    size="small"
                    icon={<UploadOutlined />}
                    loading={busyKey === slot.key}
                    block
                  >
                    {code ? '替换' : '上传'}
                  </Button>
                </Upload>
              </div>
            );
          })}
        </div>
      </Spin>
    </Drawer>
  );
};

export default QrCodesDrawer;
