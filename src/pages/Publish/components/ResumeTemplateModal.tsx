// 简历模板预览（只读）。
//
// 周期没开始时表单不可填，但同学想提前知道要准备什么——个人简介、项目经验
// 这类题现场憋出来很吃亏。这里把已配好的字段原样列出来，只看不填，
// 并且能导出成 Word 或 PDF 拿去线下打草稿。
import React, { useEffect, useState } from 'react';
import { Alert, Button, Empty, Modal, Space, Spin, Tag, message } from 'antd';
import { FileWordOutlined, FilePdfOutlined } from '@ant-design/icons';
import { getResumeFields } from '@/api/resume';
import { request } from '@/utils';
import { exportResumeAsDOCX } from '@/utils/exportResume';
import {
  TemplateField, emptyExportData, exportMetaOf, fieldTypeHint, normalizeTemplateFields,
} from '../resumeTemplate';
import './resumeTemplateModal.scss';

export interface ResumeTemplateModalProps {
  open: boolean;
  onClose: () => void;
  cycleId?: number | null;
  cycleName?: string;
}

const ResumeTemplateModal: React.FC<ResumeTemplateModalProps> = ({
  open, onClose, cycleId, cycleName,
}) => {
  const [fields, setFields] = useState<TemplateField[]>([]);
  // 原始字段定义：导出 Word 要用它推标签与启停，展示用的 fields 已经丢掉了 fieldKey 以外的东西
  const [raw, setRaw] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const title = cycleName || '本届招新';

  useEffect(() => {
    if (!open || !cycleId) return;
    let alive = true;
    setLoading(true);
    getResumeFields(Number(cycleId))
      .then((res: any) => {
        if (!alive) return;
        setRaw(res?.data ?? []);
        setFields(normalizeTemplateFields(res?.data));
      })
      .catch((e: any) => { if (alive) message.error(e?.message || '模板加载失败'); })
      .finally(() => { if (alive) setLoading(false); });
    // eslint-disable-next-line consistent-return
    return () => { alive = false; };
  }, [open, cycleId]);

  const exportWord = async () => {
    setExporting(true);
    try {
      await exportResumeAsDOCX(emptyExportData(), [], exportMetaOf(raw));
    } finally {
      setExporting(false);
    }
  };

  const exportPdf = async () => {
    if (!cycleId) return;
    setExporting(true);
    try {
      const res: any = await request({
        url: `/api/resumes/fields/${cycleId}/template.pdf`,
        method: 'get',
        responseType: 'blob',
      });
      const blob: Blob = res?.data instanceof Blob ? res.data : res;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}报名表模板.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      message.success('模板已导出');
    } catch (e: any) {
      message.error(e?.message || 'PDF 导出失败');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={`${title} · 报名表模板`}
      width={720}
      className="resume-template-modal"
      footer={(
        <Space>
          {/* Word 走简历导出那条路：同一版式，且填完能在投递页导入自动回填 */}
          <Button icon={<FileWordOutlined />} disabled={fields.length === 0} loading={exporting}
                  onClick={exportWord}>
            导出 Word
          </Button>
          {/* PDF 由后端渲染（与简历导出同一套字体与版式） */}
          <Button icon={<FilePdfOutlined />} disabled={fields.length === 0} loading={exporting}
                  onClick={exportPdf}>
            导出 PDF
          </Button>
          <Button type="primary" onClick={onClose}>关闭</Button>
        </Space>
      )}
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="这里只能看，不能填"
        description="招募开放后回到本页在线填写提交。可以先导出一份，把要想一会儿的内容提前写好。"
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
      ) : fields.length === 0 ? (
        <Empty description="报名表单还在准备中" />
      ) : (
        <ol className="tpl-list">
          {fields.map((f) => (
            <li className="tpl-item" key={f.key || f.label}>
              <div className="tpl-item__head">
                <span className="tpl-item__label">{f.label}</span>
                {f.required
                  ? <Tag color="red">必填</Tag>
                  : <Tag>选填</Tag>}
                <span className="tpl-item__type">{fieldTypeHint(f.type, f.options)}</span>
              </div>
              {f.placeholder && <div className="tpl-item__hint">{f.placeholder}</div>}
              {/* 空白框：让人一眼看出这是要写字的地方，而不是已经填过 */}
              <div className="tpl-item__blank" aria-hidden />
            </li>
          ))}
        </ol>
      )}

      {fields.length > 0 && (
        <p className="tpl-foot">
          导出的 Word 就是投递页那份可回填模板：填好后等招募开放，在投递页点「导入」即可自动回填。
        </p>
      )}
    </Modal>
  );
};

export default ResumeTemplateModal;
