// 简历模板预览（只读）。
//
// 周期没开始时表单不可填，但同学想提前知道要准备什么——个人简介、项目经验
// 这类题现场憋出来很吃亏。这里把已配好的字段原样列出来，只看不填，
// 并且能导出成 Word 或 PDF 拿去线下打草稿。
import React, { useEffect, useState } from 'react';
import { Alert, Button, Empty, Modal, Space, Spin, Tag, message } from 'antd';
import { FileWordOutlined, FilePdfOutlined } from '@ant-design/icons';
import { getResumeFields } from '@/api/resume';
import {
  TemplateField, downloadTemplateWord, fieldTypeHint, normalizeTemplateFields, printTemplateAsPdf,
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
  const [loading, setLoading] = useState(false);
  const title = cycleName || '本届招新';

  useEffect(() => {
    if (!open || !cycleId) return;
    let alive = true;
    setLoading(true);
    getResumeFields(Number(cycleId))
      .then((res: any) => { if (alive) setFields(normalizeTemplateFields(res?.data)); })
      .catch((e: any) => { if (alive) message.error(e?.message || '模板加载失败'); })
      .finally(() => { if (alive) setLoading(false); });
    // eslint-disable-next-line consistent-return
    return () => { alive = false; };
  }, [open, cycleId]);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={`${title} · 报名表模板`}
      width={720}
      className="resume-template-modal"
      footer={(
        <Space>
          <Button icon={<FileWordOutlined />} disabled={fields.length === 0}
                  onClick={() => downloadTemplateWord(title, fields)}>
            导出 Word
          </Button>
          <Button icon={<FilePdfOutlined />} disabled={fields.length === 0}
                  onClick={() => {
                    if (!printTemplateAsPdf(title, fields)) {
                      message.warning('浏览器拦截了新窗口，请允许弹窗后重试');
                    }
                  }}>
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

      {/* 导出 PDF 走的是浏览器打印，说清楚免得以为按钮坏了 */}
      {fields.length > 0 && (
        <p className="tpl-foot">
          导出 PDF 会打开打印窗口，在「目标打印机」里选「另存为 PDF」即可保存。
        </p>
      )}
    </Modal>
  );
};

export default ResumeTemplateModal;
