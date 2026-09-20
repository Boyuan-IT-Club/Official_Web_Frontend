// src/pages/Resume/index.tsx
import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { message } from 'antd';
import ScoringStage from './stage/ScoringStage';
import { resumeActions } from '@/store/modules/resume';
import ResumeList from './ResumeList';
import ResumeDetail from './ResumeDetail';
// import './index.scss'; // 样式已在 List/Detail 中导入

type SimpleField = {
  fieldId?: number;
  fieldLabel?: string;
  fieldKey?: string;
  fieldValue?: string;
};

export type ResumeItem = {
  resumeId: string | number;
  status: number;
  submittedAt?: string | number | Date | null;
  simpleFields?: SimpleField[];
  // 不修改后端返回结构：放行其他字段
  [key: string]: any;
};

/**
 * 本页找不到下一位时，接下来要按什么顺序去翻哪几页。
 *
 * - 顺序浏览（wrap=false）：只往后翻，翻到最后一页就结束。
 *   原来是在本页内回绕，表现为用户报的「同一页无限循环」。
 * - 下一位未打分（wrap=true）：往后翻完还没有，再从第 1 页扫回来 ——
 *   打分时常跳过一些人，走到末尾时前面往往还有没打的。
 */
export function pagesToScan(current: number, totalPages: number, wrap: boolean): number[] {
  const after: number[] = [];
  for (let p = current + 1; p <= totalPages; p += 1) after.push(p);
  if (!wrap) return after;
  const before: number[] = [];
  for (let p = 1; p <= current; p += 1) before.push(p);
  return [...after, ...before];
}

/** 未打分：resumeScore 为 null/undefined。0 分算打过分 */
export const isUngraded = (r: ResumeItem): boolean => (r as any).resumeScore == null;

/**
 * 本页内当前这位之后、第一个符合条件的人。
 *
 * 只往后找，**不回绕**。原来这两个函数是在本页内回绕的，于是翻到页尾
 * 会跳回本页第一个人，看起来就是「同一页无限循环」（线上实测：26 份简历
 * 分 3 页，在第 1 页最后一位点「下一位」回到了第 1 页第一位）。
 * 回绕与翻页现在都由组件负责 —— 它才知道总页数，也才能去取下一页。
 *
 * 当前这位不在本页时（换了筛选、或刚跨页过来）从头找。
 * 无论如何排除自己：刚打完分时 store 里那条已被 patch 成有分数，
 * 不排除的话会原地打转。
 */
export function findNextInPage(
  resumes: ResumeItem[],
  current: ResumeItem | null,
  match: (r: ResumeItem) => boolean = () => true,
): ResumeItem | null {
  if (!current || !resumes || resumes.length === 0) return null;
  const at = resumes.findIndex((r) => String(r.resumeId) === String(current.resumeId));
  const after = at < 0 ? resumes : resumes.slice(at + 1);
  return after.find(
    (r) => match(r) && String(r.resumeId) !== String(current.resumeId),
  ) ?? null;
}

/** 本页内下一位未打分的人（不回绕，见 findNextInPage） */
export function findNextUngraded(
  resumes: ResumeItem[],
  current: ResumeItem | null,
): ResumeItem | null {
  return findNextInPage(resumes, current, isUngraded);
}

/**
 * 本页内顺序的下一位——不管打没打过分（不回绕，见 findNextInPage）。
 *
 * 打分动线用「下一位未打分」跳过已完成的；复查/对比时恰恰要看已打过分的人。
 */
export function findNextSequential(
  resumes: ResumeItem[],
  current: ResumeItem | null,
): ResumeItem | null {
  return findNextInPage(resumes, current);
}

const Resume: React.FC = () => {
  const dispatch = useDispatch<any>();
  const [searchParams, setSearchParams] = useSearchParams();
  const myUserId = useSelector((state: any) => state.user?.userInfo?.userId);
  // 舞台态放 URL（与评价舞台同一约定）：链接可分享、刷新不丢位置
  const stageOn = searchParams.get('stage') === '1';
  const [selectedResume, setSelectedResume] = useState<ResumeItem | null>(null);
  const [selectedCycleId, setSelectedCycleId] = useState<number | undefined>();
  const [currentPage, setCurrentPage] = useState<number>(1);

  // 查看简历详情
  const handleShowDetail = (resumeObject: ResumeItem, page?: number, cycleId?: number): void => {
    // eslint-disable-next-line no-console
    console.log('显示简历详情，传递的页码:', page, '简历ID:', resumeObject?.resumeId);

    // 保存传递的页码，如果没有传递则使用当前页码
    if (page) {
      setCurrentPage(page);
    }
    setSelectedResume(resumeObject);
    setSelectedCycleId(cycleId);
  };

  // 当前列表（ResumeList 已经把它放进 store，这里直接复用，
  // 免得为了「下一位」再拉一次接口、还可能和列表的筛选条件不一致）
  const resumes = useSelector((state: any) => state.resume?.resumes ?? []) as ResumeItem[];
  // 翻页要用的分页信息与「上一次列表查询的参数」，都由列表拉取时写进 store
  const pagination = useSelector(
    (state: any) => state.resume?.pagination ?? { current: 1, pageSize: 9, total: 0 },
  );
  const lastQuery = useSelector((state: any) => state.resume?.lastQuery ?? {});
  const totalPages = Math.max(
    1,
    Math.ceil((pagination.total || 0) / (pagination.pageSize || 9)),
  );
  // 跨页取下一位时按钮转圈：这一步要发请求，没有反馈会被当成点了没反应
  const [nextLoading, setNextLoading] = useState(false);

  /**
   * 本页内下一位「未打分」同学，只用来预先显示按钮上的名字。
   * 本页没有不代表没有下一位 —— 回绕与翻页在 goNext 里按整个结果集做。
   */
  const nextUngraded = useMemo<ResumeItem | null>(
    () => findNextUngraded(resumes, selectedResume),
    [resumes, selectedResume],
  );

  // 本页内顺序的下一位（含已打分的），同样只用于按钮文案
  const nextSequential = useMemo<ResumeItem | null>(
    () => findNextSequential(resumes, selectedResume),
    [resumes, selectedResume],
  );

  /**
   * 翻到某一页并返回该页内容。
   *
   * 用 lastQuery 原样重发列表查询：筛选条件必须和列表完全一致，
   * 否则「下一位」翻出来的是另一批人。顺带把 store 里的列表也换成这一页，
   * 于是点返回时看到的就是自己停下的那一页。
   */
  const fetchPage = useCallback(async (page: number): Promise<ResumeItem[]> => {
    const res: any = await dispatch(
      resumeActions.fetchResumes({ ...lastQuery, page: page - 1 }),
    ).unwrap();
    return (res?.data ?? []) as ResumeItem[];
  }, [dispatch, lastQuery]);

  /**
   * 跳到下一位：先在本页找，本页没有就往后翻页找。
   *
   * ungradedOnly 时翻到最后一页还没有，就从第 1 页再扫一遍 —— 打分动线
   * 经常跳过一些人，走到末尾时前面往往还有没打的（这条回绕是刻意保留的）。
   * 顺序浏览不回绕：翻到整个结果集的最后一位就该停下，
   * 原来那种「回到本页第一个」正是用户报的「同一页无限循环」。
   */
  const goNext = useCallback(async (ungradedOnly: boolean): Promise<void> => {
    const match = ungradedOnly ? isUngraded : () => true;
    const inPage = findNextInPage(resumes, selectedResume, match);
    if (inPage) {
      setSelectedResume(inPage);
      return;
    }

    setNextLoading(true);
    try {
      for (const p of pagesToScan(currentPage, totalPages, ungradedOnly)) {
        // eslint-disable-next-line no-await-in-loop
        const list = await fetchPage(p);
        const hit = list.find(
          (r) => match(r) && String(r.resumeId) !== String(selectedResume?.resumeId),
        );
        if (hit) {
          setCurrentPage(p);
          setSelectedResume(hit);
          return;
        }
      }
      message.info(ungradedOnly ? '所有简历都打过分了' : '已经是最后一位了');
      // 扫了一圈没结果时 store 里停在最后翻到的那一页，把页码对上，
      // 免得点返回时列表和页码对不上
      setCurrentPage(pagination.current ?? currentPage);
    } catch {
      message.error('取下一页失败，请重试');
    } finally {
      setNextLoading(false);
    }
  }, [resumes, selectedResume, currentPage, totalPages, fetchPage, pagination.current]);

  const handleNextUngraded = useCallback((): void => { void goNext(true); }, [goNext]);
  const handleNextSequential = useCallback((): void => { void goNext(false); }, [goNext]);

  /** 顺序浏览还有没有下一位：本页之后还有页就算有 */
  const hasNextPage = currentPage < totalPages;
  /** 未打分动线会回绕，所以只要不止一页，哪一页都可能还有没打分的 */
  const hasMorePages = totalPages > 1;

  const nameOf = (r: ResumeItem | null): string | null => (
    r
      ? (r as any).simpleFields?.find((f: SimpleField) => f.fieldKey === 'name')?.fieldValue
        ?? `简历 #${r.resumeId}`
      : null
  );

  /** 进入/退出舞台。带上当前这位，退出后回到列表原位 */
  const openStage = useCallback((resume: ResumeItem): void => {
    setSelectedResume(resume);
    const next = new URLSearchParams(searchParams);
    next.set('stage', '1');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const closeStage = useCallback((): void => {
    const next = new URLSearchParams(searchParams);
    next.delete('stage');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  /** 舞台里打完分回写列表 store，退出后列表分数已是新值 */
  const handleScored = useCallback((resumeId: number, avg: number, entries: any[]): void => {
    dispatch(resumeActions.patchResumeScore({
      resumeId: resumeId as any, resumeScore: avg, scoreEntries: entries,
    }));
  }, [dispatch]);

  const handleBackToList = (): void => {
    // eslint-disable-next-line no-console
    console.log('返回列表，当前保存的页码:', currentPage);
    setSelectedResume(null);
  };

  // 处理页码变化
  const handlePageChange = (page: number): void => {
    // eslint-disable-next-line no-console
    console.log('页码变化回调:', page);
    setCurrentPage(page);
  };

  // 简历状态三态化后不再有审核动作：评审结论由「面试管理 → 结果与通知」承载

  const handleDownload = (resumeId: string | number): void => {
    dispatch(resumeActions.downloadResumePDF(resumeId))
      .unwrap()
      .then(() => {
        // eslint-disable-next-line no-console
        console.log(`简历 ID ${resumeId} PDF 下载已触发`);
      })
      .catch((error: unknown) => {
        // eslint-disable-next-line no-console
        console.error('下载简历失败:', error);
      });
  };

  // 带 ?stage=1 直接进来（分享链接、刷新）时没有选中项：
  // 自动落到第一位未打分的，都打完了就落第一份——否则页面会退回列表，
  // 用户看到的是「链接没生效」
  if (stageOn && !selectedResume && resumes.length > 0) {
    const fallback = resumes.find((r: any) => r.resumeScore == null) ?? resumes[0];
    if (fallback) setTimeout(() => setSelectedResume(fallback), 0);
  }

  if (stageOn && selectedResume) {
    return (
      <ScoringStage
        resumes={resumes}
        initialResumeId={Number(selectedResume.resumeId)}
        myUserId={myUserId}
        onExit={closeStage}
        onScored={handleScored}
      />
    );
  }

  return (
    <div className="resume-page">
      {selectedResume ? (
        <ResumeDetail
          resume={selectedResume}
          cycleId={selectedCycleId}
          onBack={handleBackToList}
          onDownload={handleDownload}
          /*
            名字只在「下一位就在本页」时能预先知道。跨页的那一位要发请求才拿得到，
            为一个按钮文案去预取会把 store 里的列表换成下一页（返回时就错页了），
            所以跨页时按钮只写「下一位」，点了再去取。
          */
          nextUngradedName={nameOf(nextUngraded)}
          onNextUngraded={nextUngraded || hasMorePages ? handleNextUngraded : undefined}
          nextName={nameOf(nextSequential)}
          onNext={nextSequential || hasNextPage ? handleNextSequential : undefined}
          nextLoading={nextLoading}
          onEnterStage={() => openStage(selectedResume)}
        />
      ) : (
        <ResumeList
          onEnterStage={(r: ResumeItem) => openStage(r)}
          onShowDetail={handleShowDetail}
          onDownload={handleDownload}
          currentPage={currentPage}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
};

export default Resume;
