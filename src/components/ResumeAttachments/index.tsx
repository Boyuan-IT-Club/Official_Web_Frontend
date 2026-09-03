// 简历附件：学生上传任意格式资料，面试官预览或下载。
//
// 学生端与管理端共用这一个组件，差别只有 canEdit：
// 学生能传能删，面试官只看。两边把「能预览的直接看、不能预览的下载」
// 这套交互统一在这里，免得两处各写一遍再慢慢长歪。

import React, { useCallback, useEffect, useState } from 'react';
import { Button, List, Modal, Popconfirm, Spin, Tooltip, Typography, Upload, message } from 'antd';
import {
  DeleteOutlined, DownloadOutlined, EyeOutlined, FileOutlined, UploadOutlined,
} from '@ant-design/icons';
import {
  ResumeAttachment, deleteAttachment, fetchAttachmentBlob, formatSize,
  listAttachments, uploadAttachment,
} from '@/api/resumeAttachment';
import './index.scss';

const { Text } = Typography;

export interface ResumeAttachmentsProps {
  resumeId?: number | null;
  /** 学生在可投递的周期里为 true；管理端一律 false（只看不改） */
  canEdit?: boolean;
  /** 标题旁的说明文案；不传则用默认 */
  hint?: React.ReactNode;
}

const ResumeAttachments: React.FC<ResumeAttachmentsProps> = ({ resumeId, canEdit = false, hint }) => {
  const [items, setItems] = useState<ResumeAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ att: ResumeAttachment; url: string } | null>(null);

  const load = useCallback(async () => {
    if (!resumeId) { setItems([]); return; }
    setLoading(true);
    try {
      const res: any = await listAttachments(resumeId);
      setItems(res?.data ?? []);
    } catch {
      // 附件列不出来不该让整页报错，静默留空
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [resumeId]);

  useEffect(() => { void load(); }, [load]);

  // 预览用的 blob: URL 必须显式释放，否则每开一次就漏一份文件大小的内存
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);

  const handleUpload = async (file: File): Promise<boolean> => {
    if (!resumeId) { message.warning('简历还没创建，请先保存一次草稿'); return false; }
    setBusy(true);
    try {
      await uploadAttachment(resumeId, file);
      message.success(`已上传 ${file.name}`);
      await load();
    } catch (e: any) {
      message.error(e?.message || '上传失败');
    } finally {
      setBusy(false);
    }
    return false;   // 阻止 antd 自己再发一次请求
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteAttachment(id);
      message.success('已删除');
      await load();
    } catch (e: any) {
      message.error(e?.message || '删除失败');
    }
  };

  /** 取 blob 后交给回调。预览与下载都要带鉴权，不能直接用 URL。 */
  const withBlob = async (att: ResumeAttachment, inline: boolean, use: (url: string) => void) => {
    try {
      const blob = await fetchAttachmentBlob(att.id, inline);
      use(URL.createObjectURL(blob));
    } catch (e: any) {
      message.error(e?.message || '读取附件失败');
    }
  };

  const handlePreview = (att: ResumeAttachment) =>
    withBlob(att, true, (url) => setPreview({ att, url }));

  const handleDownload = (att: ResumeAttachment) =>
    withBlob(att, false, (url) => {
      const a = document.createElement('a');
      a.href = url;
      a.download = att.fileName;
      a.click();
      // 触发下载后就能释放；浏览器已经拿走了数据
      setTimeout(() => URL.revokeObjectURL(url), 0);
    });

  const closePreview = () => {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  return (
    <div className="resume-attachments">
      <div className="resume-attachments__head">
        <span className="resume-attachments__title"><FileOutlined /> 其它附件</span>
        <Text type="secondary" className="resume-attachments__hint">
          {hint ?? (canEdit
            ? '作品集、成绩单、获奖证明等，任意格式，单个不超过 20MB、最多 10 个'
            : '候选人上传的补充材料')}
        </Text>
      </div>

      {loading ? (
        <div className="resume-attachments__loading"><Spin size="small" /></div>
      ) : items.length === 0 ? (
        /*
          空态只用一行字，不用 antd Empty —— 它自带一张插画和上下留白，
          整块高度立刻翻倍。附件本来就是选填的次要项，
          没传的时候不该比填好的表单字段还占地方。
          可编辑时连这行都省掉：下面的上传按钮已经把「这里可以传附件」说清楚了。
        */
        canEdit ? null : (
          <div className="resume-attachments__none">候选人没有上传附件</div>
        )
      ) : (
        <List
          className="resume-attachments__list"
          dataSource={items}
          renderItem={(att) => (
            <List.Item
              actions={[
                att.previewable ? (
                  <Button key="p" type="link" size="small" icon={<EyeOutlined />}
                          onClick={() => handlePreview(att)}>预览</Button>
                ) : (
                  // 说清为什么没有预览按钮，否则会被当成坏了
                  <Tooltip key="p" title="这种格式浏览器无法直接打开，请下载后查看">
                    <Button type="link" size="small" disabled icon={<EyeOutlined />}>预览</Button>
                  </Tooltip>
                ),
                <Button key="d" type="link" size="small" icon={<DownloadOutlined />}
                        onClick={() => handleDownload(att)}>下载</Button>,
                ...(canEdit ? [(
                  <Popconfirm key="x" title="删除这个附件？" okText="删除" cancelText="取消"
                              okButtonProps={{ danger: true }}
                              onConfirm={() => handleDelete(att.id)}>
                    <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
                  </Popconfirm>
                )] : []),
              ]}
            >
              <List.Item.Meta
                avatar={<FileOutlined className="resume-attachments__icon" />}
                title={<span className="resume-attachments__name">{att.fileName}</span>}
                description={<Text type="secondary">{formatSize(att.sizeBytes)}</Text>}
              />
            </List.Item>
          )}
        />
      )}

      {canEdit && (
        <div className="resume-attachments__actions">
          <Upload beforeUpload={handleUpload} showUploadList={false} multiple>
            <Button size="small" icon={<UploadOutlined />} loading={busy}>上传附件</Button>
          </Upload>
          <Text type="secondary" className="resume-attachments__count">
            {items.length > 0 ? `已上传 ${items.length}/10` : '选填'}
          </Text>
        </div>
      )}

      <Modal
        open={!!preview}
        onCancel={closePreview}
        title={preview?.att.fileName}
        width="80%"
        footer={[
          <Button key="d" icon={<DownloadOutlined />}
                  onClick={() => preview && handleDownload(preview.att)}>下载</Button>,
          <Button key="c" type="primary" onClick={closePreview}>关闭</Button>,
        ]}
      >
        {preview && <PreviewBody att={preview.att} url={preview.url} />}
      </Modal>
    </div>
  );
};

/**
 * 预览主体。按类型选渲染方式：图片用 img、音视频用对应标签、
 * 其余（PDF、纯文本）交给 iframe —— 浏览器自带的查看器比自己实现的强。
 *
 * iframe 加 sandbox：服务端已经只对安全类型放行内联，这里再加一道，
 * 万一将来白名单被放宽也不至于直接变成 XSS。
 */
const PreviewBody: React.FC<{ att: ResumeAttachment; url: string }> = ({ att, url }) => {
  const type = (att.contentType || '').split(';')[0].trim().toLowerCase();

  if (type.startsWith('image/')) {
    return <img className="resume-attachments__preview-img" src={url} alt={att.fileName} />;
  }
  if (type.startsWith('video/')) {
    return <video className="resume-attachments__preview-media" src={url} controls />;
  }
  if (type.startsWith('audio/')) {
    return <audio className="resume-attachments__preview-audio" src={url} controls />;
  }
  return (
    <iframe
      className="resume-attachments__preview-frame"
      src={url}
      title={att.fileName}
      sandbox=""
    />
  );
};

export default ResumeAttachments;
