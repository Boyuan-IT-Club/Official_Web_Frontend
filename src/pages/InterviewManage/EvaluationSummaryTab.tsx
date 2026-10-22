// 评价汇总：一位候选人一行，署上本场共同参与的面试官，供「结果与通知」录入录取决定时参考。
// 读的是物化后的 interview_evaluation，比协同文档滞后一个物化周期（默认 30 秒）。
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PageHint from '@/components/PageHint';
import {
  Button,
  Empty,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { ONLINE_LOCATION } from '../EvaluationBoard/collab';
import {
  listPreAdmission, listAllResults, removePreAdmission, savePreAdmission,
} from '@/api/manage/interviewAdmin';
import PreAdmitPicker from './PreAdmitPicker';
import { isDecided } from './resultBatch';
import {
  CandidateSummary, EVALUATION_STATUS, EvaluationSummary, RECOMMENDATION_OPTIONS, getEvaluationSummary,
} from '@/api/manage/interviewEvaluation';

const { Text, Paragraph } = Typography;

const fmtDateTime = (v?: string | null) => (v ? String(v).replace('T', ' ').slice(0, 16) : '—');

const RECOMMENDATION_COLOR: Record<number, string> = { 1: 'green', 2: 'orange', 3: 'red' };

const recommendationLabel = (value?: number | null) =>
  RECOMMENDATION_OPTIONS.find((o) => o.value === value)?.label ?? '—';

/** 一行候选人对应的预录取引用：resultId 是操作句柄，部门是当前草稿状态 */
interface PreAdmitRef {
  resultId: number;
  deptId: number | null;
  /** 当前正式结果：已录取/未通过的人不能再预录取 */
  decision?: number;
}

/**
 * 下拉选项取自当前数据本身，不用再从外面传部门表进来。
 *
 * 写成模块级纯函数而不是组件内闭包：放在组件里每次渲染都是新函数，
 * 挂进 useMemo 的依赖就永远不等，等于白缓存（eslint 也会一直报）。
 */
const optionsOf = (
  candidates: CandidateSummary[] | undefined,
  pick: (c: CandidateSummary) => (string | undefined)[],
) => {
  const names = new Set<string>();
  (candidates ?? []).forEach((c) => pick(c).forEach((n) => { if (n) names.add(n); }));
  return Array.from(names)
    .sort((a, b) => {
      // 线上面试不是教室，固定排最后（与评价表页同一规则）
      if (a === ONLINE_LOCATION) return 1;
      if (b === ONLINE_LOCATION) return -1;
      return a.localeCompare(b, 'zh-CN');
    })
    .map((n) => ({ value: n, label: n }));
};

const EvaluationSummaryTab: React.FC<{
  cycleId: number;
  depts?: Array<{ deptId: number; deptName: string }>;
  /** 切回本页签时重新拉：antd Tabs 保留已挂载的面板，不加这个看到的是切走时的旧数据 */
  refreshToken?: number;
}> = ({ cycleId, depts = [], refreshToken }) => {
  const [summary, setSummary] = useState<EvaluationSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [deptFilter, setDeptFilter] = useState<string | undefined>();
  const [locationFilter, setLocationFilter] = useState<string | undefined>();
  /** 志愿部门：按「第一或第二志愿命中」筛，录取时两档都要看 */
  const [choiceFilter, setChoiceFilter] = useState<string | undefined>();
  const [recommendFilter, setRecommendFilter] = useState<number | undefined>();
  /*
   * 预录取就地操作：看完评语当场把人放进部门，不用切到「预录取」tab 再搜一遍名字。
   *
   * 汇总接口给的是 scheduleId，而预录取按 resultId 操作 —— 两者的对应关系只有
   * 面试结果列表知道，所以额外拉一次，按 scheduleId 建索引。
   */
  const [preBySchedule, setPreBySchedule] = useState<Map<number, PreAdmitRef>>(new Map());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getEvaluationSummary(cycleId);
      setSummary(res?.data ?? null);
    } catch (e: any) {
      setSummary(null);
      setError(e?.message || '加载评价汇总失败');
    } finally {
      setLoading(false);
    }
  }, [cycleId]);

  const loadPreAdmit = useCallback(async () => {
    try {
      const [res, pre]: any[] = await Promise.all([
        listAllResults(cycleId),
        listPreAdmission({ cycleId, page: 1, size: 500 }),
      ]);
      const deptByResult = new Map<number, number | null>();
      (pre?.data?.candidates ?? []).forEach((d: any) => {
        deptByResult.set(Number(d.resultId), d.assignedDeptId ?? null);
      });
      const next = new Map<number, PreAdmitRef>();
      (res?.data?.interviewResults ?? []).forEach((r: any) => {
        if (r.scheduleId == null) return;
        next.set(Number(r.scheduleId), {
          resultId: Number(r.resultId),
          deptId: deptByResult.get(Number(r.resultId)) ?? null,
          decision: r.decision,
        });
      });
      setPreBySchedule(next);
    } catch {
      // 拉不到就不显示这一列，评语与分数照常看 —— 不值得为它挡住整页
      setPreBySchedule(new Map());
    }
  }, [cycleId]);

  useEffect(() => { load(); }, [load, refreshToken]);
  useEffect(() => { void loadPreAdmit(); }, [loadPreAdmit, refreshToken]);

  const assignPre = useCallback(async (scheduleId: number, deptId: number) => {
    const ref = preBySchedule.get(scheduleId);
    if (!ref) return;
    try {
      const res: any = await savePreAdmission({ cycleId, resultIds: [ref.resultId], assignedDeptId: deptId });
      if ((res?.data?.skipped?.length ?? 0) > 0) {
        // 服务端只收还没决定的人：列表加载之后，这个人可能已经被定了结果
        message.warning('这位同学已有正式结果，不能预录取；如需改动请到「录取结果」更正');
        void loadPreAdmit();
        return;
      }
      // 先就地更新，再静默对账，免得整表闪一下
      setPreBySchedule((prev) => new Map(prev).set(scheduleId, { ...ref, deptId }));
      message.success(`已预录取到${depts.find((d) => d.deptId === deptId)?.deptName ?? '该部门'}`);
      void loadPreAdmit();
    } catch (e: any) {
      message.error(e?.message || '预录取失败');
    }
  }, [cycleId, depts, preBySchedule, loadPreAdmit]);

  const removePre = useCallback(async (scheduleId: number) => {
    const ref = preBySchedule.get(scheduleId);
    if (!ref) return;
    try {
      await removePreAdmission({ cycleId, resultIds: [ref.resultId] });
      setPreBySchedule((prev) => new Map(prev).set(scheduleId, { ...ref, deptId: null }));
      message.success('已移出预录取名单');
      void loadPreAdmit();
    } catch (e: any) {
      message.error(e?.message || '移出失败');
    }
  }, [cycleId, preBySchedule, loadPreAdmit]);

  const dimensions = summary?.dimensions ?? [];

  const rows = useMemo(() => {
    let list = summary?.candidates ?? [];
    if (deptFilter) list = list.filter((c) => c.deptName === deptFilter);
    if (locationFilter) {
      list = list.filter((c) => (c.location ?? ONLINE_LOCATION) === locationFilter);
    }
    // 第一或第二志愿命中都算：录取时常常是「这个部门报了的人都看一遍」
    if (choiceFilter) {
      list = list.filter((c) => c.firstDeptName === choiceFilter || c.secondDeptName === choiceFilter);
    }
    if (recommendFilter != null) list = list.filter((c) => c.recommendation === recommendFilter);
    const text = keyword.trim().toLowerCase();
    if (text) list = list.filter((c) => `${c.candidateName}${c.deptName ?? ''}`.toLowerCase().includes(text));
    return list;
  }, [summary, keyword, deptFilter, locationFilter, choiceFilter, recommendFilter]);

  const candidates = summary?.candidates;
  const deptOptions = useMemo(() => optionsOf(candidates, (c) => [c.deptName]), [candidates]);
  // 线上面试没有场次、也就没有地点，归进「线上面试」这一组
  const locationOptions = useMemo(
    () => optionsOf(candidates, (c) => [c.location ?? ONLINE_LOCATION]), [candidates]);
  const choiceOptions = useMemo(
    () => optionsOf(candidates, (c) => [c.firstDeptName, c.secondDeptName]), [candidates]);

  const columns: any[] = [
    {
      title: '候选人',
      dataIndex: 'candidateName',
      fixed: 'left',
      width: 160,
      render: (name: string, row: CandidateSummary) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 500 }}>{name || `#${row.scheduleId}`}</span>
          <Text type="secondary" style={{ fontSize: 12 }}>{row.deptName || '—'}</Text>
        </Space>
      ),
    },
    {
      title: '面试时间',
      dataIndex: 'interviewTime',
      width: 140,
      render: (v: string) => <Text style={{ fontSize: 12 }}>{fmtDateTime(v)}</Text>,
    },
    ...dimensions.map((dimension) => ({
      title: (
        <Tooltip title={`满分 ${dimension.maxScore}，权重 ${dimension.weight}`}>
          <span>{dimension.name}</span>
        </Tooltip>
      ),
      key: `dim-${dimension.dimensionId}`,
      width: 100,
      align: 'center' as const,
      sorter: (a: CandidateSummary, b: CandidateSummary) =>
        (a.scores?.[dimension.dimensionId] ?? -1) - (b.scores?.[dimension.dimensionId] ?? -1),
      render: (_v: unknown, row: CandidateSummary) => {
        const value = row.scores?.[dimension.dimensionId];
        return value === undefined || value === null
          ? <Text type="secondary">—</Text>
          : <span>{value}</span>;
      },
    })),
    {
      title: '加权总分',
      dataIndex: 'totalScore',
      width: 120,
      align: 'center' as const,
      // 录取是从高分往下看的，进来直接按总分降序排好
      defaultSortOrder: 'descend' as const,
      sorter: (a: CandidateSummary, b: CandidateSummary) => (a.totalScore ?? -1) - (b.totalScore ?? -1),
      render: (value: number | null) => (value === null || value === undefined
        ? <Text type="secondary">—</Text>
        : <Text strong>{value}</Text>),
    },
    {
      title: '推荐意见',
      dataIndex: 'recommendation',
      width: 120,
      render: (value: number) => (value
        ? <Tag color={RECOMMENDATION_COLOR[value]}>{recommendationLabel(value)}</Tag>
        : <Text type="secondary">—</Text>),
    },
    {
      title: '参与面试官',
      key: 'contributors',
      width: 200,
      render: (_v: unknown, row: CandidateSummary) => {
        const contributors = row.contributors ?? [];
        if (contributors.length === 0) return <Text type="secondary">还没有人填写</Text>;
        return (
          <Tooltip title={`本场共绑定 ${row.assignedInterviewerCount} 位面试官`}>
            <Space size={4} wrap>
              {contributors.map((c) => (
                <Tag key={c.userId}>{c.name || `#${c.userId}`}</Tag>
              ))}
            </Space>
          </Tooltip>
        );
      },
    },
    {
      title: '状态',
      key: 'status',
      width: 150,
      align: 'center' as const,
      sorter: (a: CandidateSummary, b: CandidateSummary) => (a.status ?? 0) - (b.status ?? 0),
      render: (_v: unknown, row: CandidateSummary) => {
        if (row.status === EVALUATION_STATUS.SUBMITTED) {
          return (
            <Tooltip title={`${row.submittedByName || `#${row.submittedBy}`} 于 ${fmtDateTime(row.submittedAt)} 定稿`}>
              <Tag color="blue">已定稿</Tag>
            </Tooltip>
          );
        }
        if (row.status === EVALUATION_STATUS.DRAFT) {
          return (
            <Tooltip title={row.lastEditedBy ? `最近由 ${row.lastEditedByName || `#${row.lastEditedBy}`} 修改` : undefined}>
              <Tag>进行中</Tag>
            </Tooltip>
          );
        }
        return <Text type="secondary">未开始</Text>;
      },
    },
    {
      // 看完评语当场把人放进部门，不用切到「预录取」tab 再搜一遍名字
      title: '预录取',
      key: 'preAdmit',
      width: 124,
      fixed: 'right' as const,
      render: (_v: unknown, row: CandidateSummary) => {
        const ref = preBySchedule.get(row.scheduleId);
        return (
          <PreAdmitPicker
            deptId={ref?.deptId ?? null}
            depts={depts}
            onAssign={(deptId) => assignPre(row.scheduleId, deptId)}
            onRemove={() => removePre(row.scheduleId)}
            disabled={!ref || isDecided(ref.decision)}
            disabledReason={!ref
              ? '这个人还没有面试结果记录，无法预录取'
              : '已有正式结果，不能预录取；如需改动请到「录取结果」更正'}
          />
        );
      },
    },
  ];

  // 展开行 = 完整面试记录。评价按维度拆分后，主要内容在 dimensionNotes 里，
  // comment 只是可选的总评——原先只渲染 comment，导致明明写了评价却显示「没有面试记录」
  const expanded = (row: CandidateSummary) => {
    const notes = dimensions
      .map((dimension) => ({
        dimension,
        note: row.dimensionNotes?.[dimension.dimensionId]?.trim(),
        writer: row.dimensionWriters?.[dimension.dimensionId]?.name,
      }))
      .filter((item) => item.note);

    if (notes.length === 0 && !row.comment?.trim()) {
      return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="本场还没有填写面试记录" />;
    }
    return (
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        {notes.map(({ dimension, note, writer }) => (
          <div key={dimension.dimensionId}>
            <Space size={8}>
              <Text strong style={{ fontSize: 13 }}>{dimension.name}</Text>
              {writer && <Text type="secondary" style={{ fontSize: 12 }}>{writer} 记录</Text>}
            </Space>
            <Paragraph style={{ margin: '2px 0 0', whiteSpace: 'pre-wrap' }}>{note}</Paragraph>
          </div>
        ))}
        {row.comment?.trim() && (
          <div>
            <Text strong style={{ fontSize: 13 }}>总体结论</Text>
            <Paragraph style={{ margin: '2px 0 0', whiteSpace: 'pre-wrap' }}>{row.comment}</Paragraph>
          </div>
        )}
      </Space>
    );
  };

  if (error) {
    return (
      <PageHint title="暂时看不到评价汇总" extra={<Button size="small" onClick={load}>重试</Button>}>{`${error}。评价表开启并有面试官填写评价后，这里才会有数据。`}</PageHint>
    );
  }

  return (
    <>
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          allowClear
          placeholder="搜索姓名 / 部门"
          style={{ width: 240 }}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <Select
          allowClear
          placeholder="按面试部门筛选"
          style={{ width: 150 }}
          value={deptFilter}
          onChange={setDeptFilter}
          options={deptOptions}
        />
        <Select
          allowClear
          placeholder="按面试地点筛选"
          style={{ width: 170 }}
          value={locationFilter}
          onChange={setLocationFilter}
          options={locationOptions}
        />
        <Select
          allowClear
          placeholder="按志愿部门筛选"
          style={{ width: 150 }}
          value={choiceFilter}
          onChange={setChoiceFilter}
          options={choiceOptions}
        />
        <Select
          allowClear
          placeholder="按结论筛选"
          style={{ width: 130 }}
          value={recommendFilter}
          onChange={setRecommendFilter}
          options={[...RECOMMENDATION_OPTIONS]}
        />
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>刷新</Button>
        <Text type="secondary">评价由协同服务定期回写，最新改动可能有几十秒延迟</Text>
      </Space>

      <Table
        rowKey="scheduleId"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={rows}
        scroll={{ x: 'max-content' }}
        expandable={{ expandedRowRender: expanded }}
        pagination={{ defaultPageSize: 20, showSizeChanger: true, showTotal: (t) => `共 ${t} 人` }}
      />
    </>
  );
};

export default EvaluationSummaryTab;
