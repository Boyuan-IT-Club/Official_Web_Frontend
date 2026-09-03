// 填写提示。
//
// 原先是个「点击展开/收起」的折叠卡：第一次进来默认收起，很多人根本不知道
// 有这么个东西，那些注意事项也就白写了；而展开后它又长长地插在表单顶上，
// 把真正要填的内容推下去。
//
// 现在改成弹窗：第一次填简历时自动弹一次（看过就记住，不再自动弹），
// 之后随时可以点右上角的「填写提示」按钮重新打开——和「使用指引」一个用法。

import React from 'react';
import { Modal, Button } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import './tipsModal.scss';

export interface TipItem { title: string; content: string }

export interface TipsModalProps {
  open: boolean;
  onClose: () => void;
  tips: TipItem[];
}

const TipsModal: React.FC<TipsModalProps> = ({ open, onClose, tips }) => (
  <Modal
    open={open}
    onCancel={onClose}
    title={null}
    footer={null}
    width={640}
    className="tips-modal"
    // 提示是次要信息，读完就关；不需要遮罩点击穿透之类的复杂交互
    maskClosable
  >
    <div className="tips-modal__head">
      <span className="tips-modal__icon"><QuestionCircleOutlined /></span>
      <div>
        <div className="tips-modal__title">填写提示</div>
        <div className="tips-modal__sub">花一分钟看完，能少改好几遍</div>
      </div>
    </div>

    <ol className="tips-modal__list">
      {tips.map((tip, i) => (
        <li className="tips-modal__item" key={tip.title}>
          {/* 序号用伪元素画不了自增以外的样式，这里显式渲染，
              好让它和标题在同一条基线上 */}
          <span className="tips-modal__num">{i + 1}</span>
          <div className="tips-modal__body">
            <div className="tips-modal__item-title">{tip.title}</div>
            <div className="tips-modal__item-desc">{tip.content}</div>
          </div>
        </li>
      ))}
    </ol>

    <div className="tips-modal__foot">
      <Button type="primary" onClick={onClose}>知道了，开始填写</Button>
    </div>
  </Modal>
);

export default TipsModal;
