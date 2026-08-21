// 管理端全局搜索（⌘K / Ctrl+K）。
//
// 三类结果：
//   页面 —— 静态清单，按侧栏权限过滤；打「面试」直接跳面试管理，省得找菜单
//   用户 —— 走 /api/search/global（按姓名/学号/邮箱/手机模糊匹配）
//   周期 —— 周期总数只有个位数，取全量在前端过滤，不值得为它加接口
//
// 用户结果跳「用户与角色」并把关键词带过去（?q=），落地即是筛好的列表 ——
// 否则跳过去还要再搜一遍。
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Input, Spin, Empty } from 'antd';
import {
  SearchOutlined, UserOutlined, CalendarOutlined, AppstoreOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { globalSearch } from '@/api/manage/userApis';
import { getAllCycles, RecruitmentCycle } from '@/api/manage/cycleApis';
import './index.scss';

export interface SearchablePage {
  key: string;
  label: string;
}

interface Hit {
  id: string;
  group: '页面' | '用户' | '招募周期';
  icon: React.ReactNode;
  title: string;
  desc?: string;
  to: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** 当前账号可见的页面（由外层按权限过滤后传入） */
  pages: SearchablePage[];
}

const GlobalSearch: React.FC<Props> = ({ open, onClose, pages }) => {
  const navigate = useNavigate();
  const [kw, setKw] = useState('');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [cycles, setCycles] = useState<RecruitmentCycle[]>([]);
  const [active, setActive] = useState(0);
  const reqSeq = useRef(0);

  // 周期清单只在首次打开时取一次
  useEffect(() => {
    if (!open || cycles.length > 0) return;
    getAllCycles()
      .then((res: any) => setCycles(res?.data ?? []))
      .catch(() => { /* 取不到就只搜页面和用户 */ });
  }, [open, cycles.length]);

  useEffect(() => {
    if (!open) { setKw(''); setUsers([]); setActive(0); }
  }, [open]);

  // 用户搜索防抖。seq 用于丢弃过期响应 —— 快速输入时后发的请求可能先回，
  // 不比对序号会让旧结果覆盖新结果。
  useEffect(() => {
    const q = kw.trim();
    if (!open || q.length < 1) { setUsers([]); return undefined; }
    const seq = ++reqSeq.current;
    setLoading(true);
    const timer = window.setTimeout(() => {
      globalSearch({ keyword: q })
        .then((res: any) => {
          if (seq !== reqSeq.current) return;
          setUsers(res?.data?.users ?? res?.users ?? []);
        })
        .catch(() => { if (seq === reqSeq.current) setUsers([]); })
        .finally(() => { if (seq === reqSeq.current) setLoading(false); });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [kw, open]);

  const hits = useMemo<Hit[]>(() => {
    const q = kw.trim().toLowerCase();
    const out: Hit[] = [];

    pages
      .filter((p) => !q || p.label.toLowerCase().includes(q))
      .forEach((p) => out.push({
        id: `page:${p.key}`, group: '页面', icon: <AppstoreOutlined />,
        title: p.label, to: p.key,
      }));

    if (q) {
      users.slice(0, 8).forEach((u: any) => out.push({
        id: `user:${u.userId}`, group: '用户', icon: <UserOutlined />,
        title: u.name || u.username || `用户 #${u.userId}`,
        desc: [u.username, u.email].filter(Boolean).join(' · '),
        to: `/manage?q=${encodeURIComponent(u.username || u.name || '')}`,
      }));

      cycles
        .filter((c) => (c.cycleName || '').toLowerCase().includes(q))
        .slice(0, 5)
        .forEach((c) => out.push({
          id: `cycle:${c.cycleId}`, group: '招募周期', icon: <CalendarOutlined />,
          title: c.cycleName, desc: c.academicYear, to: '/cycles',
        }));
    }
    return out;
  }, [pages, users, cycles, kw]);

  useEffect(() => { setActive(0); }, [hits.length]);

  const go = useCallback((hit?: Hit) => {
    const target = hit ?? hits[active];
    if (!target) return;
    onClose();
    navigate(target.to);
  }, [hits, active, navigate, onClose]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((v) => Math.min(v + 1, hits.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((v) => Math.max(v - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(); }
  };

  let lastGroup = '';

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      closable={false}
      width={560}
      styles={{ body: { padding: 0 } }}
      destroyOnClose
    >
      <Input
        autoFocus
        size="large"
        variant="borderless"
        prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
        placeholder="搜索页面、用户（姓名/学号）、招募周期"
        value={kw}
        onChange={(e) => setKw(e.target.value)}
        onKeyDown={onKeyDown}
        suffix={loading ? <Spin size="small" /> : null}
      />
      <div className="global-search__list">
        {hits.length === 0 ? (
          <Empty
            image={null}
            style={{ padding: '18px 0' }}
            description={kw.trim() ? '没有匹配的结果' : '输入关键词开始搜索'}
          />
        ) : hits.map((hit, i) => {
          const head = hit.group !== lastGroup ? hit.group : null;
          lastGroup = hit.group;
          return (
            <React.Fragment key={hit.id}>
              {head && <div className="global-search__group">{head}</div>}
              <button
                type="button"
                className={`global-search__item${i === active ? ' is-active' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(hit)}
              >
                <span className="global-search__icon">{hit.icon}</span>
                <span className="global-search__title">{hit.title}</span>
                {hit.desc && <span className="global-search__desc">{hit.desc}</span>}
              </button>
            </React.Fragment>
          );
        })}
      </div>
      <div className="global-search__foot">↑↓ 选择 · Enter 打开 · Esc 关闭</div>
    </Modal>
  );
};

export default GlobalSearch;
