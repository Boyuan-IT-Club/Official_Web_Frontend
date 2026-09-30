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
  MAX_ATTACHMENT_BYTES, ResumeAttachment, deleteAttachment, fetchAttachmentBlob, fetchAttachmentUrl, formatSize,
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
  /*
    url 为 null 表示弹窗已开、还在取链接 —— 点「预览」立刻弹窗，而不是干等。
    isBlob 标记这是不是我们自己创建的 blob: URL（只有它需要 revoke；
    COS 直链是普通地址，revoke 它没有意义）。
  */
  const [preview, setPreview] = useState<{ att: ResumeAttachment; url: string | null; isBlob: boolean } | null>(null);

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

  // 退回旧路径时创建的 blob: URL 必须显式释放，否则每开一次就漏一份文件大小的内存
  useEffect(() => () => {
    if (preview?.isBlob && preview.url) URL.revokeObjectURL(preview.url);
  }, [preview]);

  const handleUpload = async (file: File): Promise<boolean> => {
    if (!resumeId) { message.warning('简历还没创建，请先保存一次草稿'); return false; }
    // 先在本地挡一道：上传 20MB 才被拒，用户等的是整个上传过程，还只拿到一句「失败」
    if (file.size > MAX_ATTACHMENT_BYTES) {
      message.error(`「${file.name}」${formatSize(file.size)}，超过单个附件 ${MAX_ATTACHMENT_BYTES / 1024 / 1024}MB 的上限`);
      return false;
    }
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

  /**
   * 拿到能直接用的地址：优先 COS 直链（不占服务器带宽），
   * 拿不到（COS 未启用 / 签名接口出错）再退回旧的「经服务器取 blob」。
   */
  const resolveUrl = async (att: ResumeAttachment, inline: boolean): Promise<{ url: string; isBlob: boolean }> => {
    try {
      const direct = await fetchAttachmentUrl(att.id, inline);
      if (direct) return { url: direct, isBlob: false };
    } catch (e: any) {
      // 403 是真的没权限，退回旧路径也一样会被拒，没必要再试一次
      if (e?.status === 403) throw e;
    }
    const blob = await fetchAttachmentBlob(att.id, inline);
    return { url: URL.createObjectURL(blob), isBlob: true };
  };

  const handlePreview = async (att: ResumeAttachment) => {
    // 先弹窗再取链接：以前要等整个文件下完才弹，点了之后好几秒毫无反应
    setPreview({ att, url: null, isBlob: false });
    try {
      const { url, isBlob } = await resolveUrl(att, true);
      // 取链接期间用户可能已经关掉弹窗或换了一份：只认还开着的那一份
      setPreview((cur) => {
        if (cur && cur.att.id === att.id && cur.url === null) return { att, url, isBlob };
        if (isBlob) URL.revokeObjectURL(url);
        return cur;
      });
    } catch (e: any) {
      setPreview((cur) => (cur && cur.att.id === att.id ? null : cur));
      message.error(e?.message || '读取附件失败');
    }
  };

  const handleDownload = async (att: ResumeAttachment) => {
    try {
      const { url, isBlob } = await resolveUrl(att, false);
      const a = document.createElement('a');
      a.href = url;
      // 直链是跨域的，download 属性会被浏览器忽略；靠签名里带的
      // Content-Disposition: attachment 触发下载，文件名也由它带上
      if (isBlob) a.download = att.fileName;
      a.rel = 'noopener';
      a.click();
      // 触发下载后就能释放；浏览器已经拿走了数据
      if (isBlob) setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (e: any) {
      message.error(e?.message || '读取附件失败');
    }
  };

  const closePreview = () => {
    if (preview?.isBlob && preview.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  return (
    <div className="resume-attachments">
      <div className="resume-attachments__head">
        <span className="resume-attachments__title"><FileOutlined /> 其它附件</span>
        <Text type="secondary" className="resume-attachments__hint">
          {hint ?? (canEdit
            ? `作品集、成绩单、获奖证明等，任意格式，单个不超过 ${MAX_ATTACHMENT_BYTES / 1024 / 1024}MB、最多 10 个`
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
          {/*
            不写「选填」：表单里不带红星就是选填，重复说一遍反而像在强调
            这栏有什么特殊。只在真的传了东西时报个数，让人知道离上限还有多少。
          */}
          {items.length > 0 && (
            <Text type="secondary" className="resume-attachments__count">
              已上传 {items.length}/10
            </Text>
          )}
        </div>
      )}

      <Modal
        open={!!preview}
        onCancel={closePreview}
        // 关掉就拆掉内容：预览现在是 COS 直链，不拆的话隐藏着的 <object> 会继续往下拉 PDF
        destroyOnHidden
        title={preview?.att.fileName}
        width="80%"
        footer={[
          <Button key="d" icon={<DownloadOutlined />}
                  onClick={() => preview && handleDownload(preview.att)}>下载</Button>,
          <Button key="c" type="primary" onClick={closePreview}>关闭</Button>,
        ]}
      >
        {preview && (preview.url
          ? <PreviewBody att={preview.att} url={preview.url} />
          // 文字单独写：antd 5 的 Spin 独立使用时 tip 不渲染（只在包裹子元素时生效）
          : (
            <div className="resume-attachments__preview-loading">
              <Spin />
              <span>正在打开…</span>
            </div>
          ))}
      </Modal>
    </div>
  );
};

/**
 * 预览主体。按类型选渲染方式：图片用 img、音视频用对应标签、
 * PDF 用 object、纯文本交给沙箱 iframe。
 *
 * 为什么 PDF 不能跟纯文本一样用 `iframe sandbox=""`：
 * sandbox 空串是「打开全部限制」，其中包含禁用插件，而浏览器内置的 PDF
 * 阅读器正是这样一个组件 —— 被关掉之后它不报错，就是画一片空白。
 * 实测过四种容器（同一个 blob、同一页）：sandbox iframe 空白，
 * 裸 iframe / embed / object 都能渲染。
 *
 * 选 object 而不是 embed：它在浏览器渲染不了时会自动显示子元素，
 * 手机浏览器多半不支持内嵌 PDF，那时正好把「新标签打开 / 下载」递上去。
 * 渲染成功时子元素不显示（实测量过 getBoundingClientRect，不是肉眼判断）。
 *
 * 纯文本仍然留在沙箱里：服务端已经只对安全类型放行内联，这是第二道闸，
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
  if (type === 'application/pdf') {
    return (
      <object
        className="resume-attachments__preview-pdf"
        data={url}
        type="application/pdf"
        aria-label={att.fileName}
      >
        {/* 渲染不了才会显示到这里 —— 手机浏览器基本都走这一支 */}
        <div className="resume-attachments__preview-fallback">
          <p>这个浏览器不支持在页面里直接看 PDF。</p>
          <a href={url} target="_blank" rel="noreferrer">在新标签页打开</a>
          <span> 或用下方的「下载」按钮。</span>
        </div>
      </object>
    );
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
