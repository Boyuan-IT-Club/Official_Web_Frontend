// 门面页 Hero 的版式变体。
//
// 皮肤的「版式」维度落在这里：classic 用页面原有横幅（本组件不渲染），
// split / bento / editorial 各自一套结构。约定：
//   1) 变体只吃 props，不碰 store、不发请求——数据与跳转都由页面传入，
//      加一个版式 = 加一个纯展示组件，业务代码零改动；
//   2) 颜色一律用 var(--skin-*)：变体只在非默认皮肤下出现，变量必然已下发。
import React from 'react';
import './index.scss';

const CTA = ({ onApply, onExplore }) => (
  <div className="sh-cta">
    <button type="button" className="sh-btn sh-btn--pri" onClick={onApply}>投递简历</button>
    <button type="button" className="sh-btn sh-btn--ghost" onClick={onExplore}>了解社团</button>
  </div>
);

/** 分栏工作台：左标语右「终端」，技术社身份写在脸上 */
const HeroSplit = ({ onApply, onExplore }) => (
  <div className="sh sh--split">
    <div className="sh-copy">
      <h1>探索技术，<em>连接未来。</em></h1>
      <p>华东师范大学博远信息技术社 · 卓越技术 · 绝佳创意 · 实践平台</p>
      <CTA onApply={onApply} onExplore={onExplore} />
    </div>
    <div className="sh-term" aria-hidden="true">
      <span className="sh-dot" /><span className="sh-dot" /><span className="sh-dot" />
      <pre>
        <span className="g">boyuan@ecnu</span>:~$ join --club boyuan{'\n'}
        <span className="b">✓</span> 4 departments · <span className="y">tech</span> · media · pm · ops{'\n'}
        <span className="b">✓</span> resume portal <span className="g">open</span>{'\n'}
        <span className="g">boyuan@ecnu</span>:~$ <span className="cursor">▌</span>
      </pre>
    </div>
  </div>
);

/** Bento 格栅：标题块 + 数字块，一屏各就各位 */
const HeroBento = ({ stats = [], onApply, onExplore }) => (
  <div className="sh sh--bento">
    <div className="sh-tile sh-tile--main">
      <h1>探索技术，<em>连接未来</em></h1>
      <p>华东师范大学博远信息技术社，欢迎每一个对技术有热情的你。</p>
      <CTA onApply={onApply} onExplore={onExplore} />
    </div>
    {stats.slice(0, 4).map((s) => (
      <div className="sh-tile sh-tile--stat" key={s.title}>
        <b>{s.count}</b>
        <span>{s.title}</span>
      </div>
    ))}
  </div>
);

/** 杂志：特大衬线标题 + 眉题，招新季海报感 */
const HeroEditorial = ({ onApply, onExplore }) => (
  <div className="sh sh--editorial">
    <p className="sh-eyebrow">BOYUAN IT CLUB · 秋季招新</p>
    <h1>探索技术，<em>连接未来。</em></h1>
    <p className="sh-sub">华东师范大学博远信息技术社，四个部门，六十余位同行者，欢迎每一个对技术有热情的你。</p>
    <CTA onApply={onApply} onExplore={onExplore} />
  </div>
);

const VARIANTS = { split: HeroSplit, bento: HeroBento, editorial: HeroEditorial };

/** 未知/classic 版式返回 null，由页面渲染原有横幅 */
const SkinHero = ({ layout, ...rest }) => {
  const Variant = VARIANTS[layout];
  return Variant ? <Variant {...rest} /> : null;
};

export default SkinHero;
