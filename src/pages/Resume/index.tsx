// src/pages/Resume/index.tsx
import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
 * 顺序里的下一位「未打分」同学。
 *
 * 从当前这位往后找，找不到就从头绕一圈 —— 打到列表末尾时通常还有前面
 * 跳过的人没打，不回绕就得手动返回列表再翻。
 * 刻意排除当前这位本人：刚打完分时 store 里那条已被 patch 成有分数，
 * 但如果调用方顺序不同（比如先跳转后同步），不排除会绕回同一个人。
 *
 * @returns 下一位未打分的人；全部打完或列表为空时返回 null
 */
export function findNextUngraded(
  resumes: ResumeItem[],
  current: ResumeItem | null,
): ResumeItem | null {
  if (!current || !resumes || resumes.length === 0) return null;
  const at = resumes.findIndex((r) => String(r.resumeId) === String(current.resumeId));
  const ordered = at < 0
    ? resumes
    : [...resumes.slice(at + 1), ...resumes.slice(0, at)];
  return ordered.find(
    (r) => (r as any).resumeScore == null
      && String(r.resumeId) !== String(current.resumeId),
  ) ?? null;
}

const Resume: React.FC = () => {
  const dispatch = useDispatch<any>();
  const [selectedResume, setSelectedResume] = useState<ResumeItem | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // 查看简历详情
  const handleShowDetail = (resumeObject: ResumeItem, page?: number): void => {
    // eslint-disable-next-line no-console
    console.log('显示简历详情，传递的页码:', page, '简历ID:', resumeObject?.resumeId);

    // 保存传递的页码，如果没有传递则使用当前页码
    if (page) {
      setCurrentPage(page);
    }
    setSelectedResume(resumeObject);
  };

  // 当前列表（ResumeList 已经把它放进 store，这里直接复用，
  // 免得为了「下一位」再拉一次接口、还可能和列表的筛选条件不一致）
  const resumes = useSelector((state: any) => state.resume?.resumes ?? []) as ResumeItem[];

  /**
   * 顺序里的下一位「未打分」同学。
   *
   * 从当前这位往后找，找不到就从头找一遍（回绕）—— 打到列表末尾时通常还有
   * 前面跳过的人没打，不回绕的话就得手动返回列表再翻。
   * 返回 null 表示全部打完了。
   */
  const nextUngraded = useMemo<ResumeItem | null>(
    () => findNextUngraded(resumes, selectedResume),
    [resumes, selectedResume],
  );

  const handleNextUngraded = useCallback((): void => {
    if (nextUngraded) setSelectedResume(nextUngraded);
  }, [nextUngraded]);

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

  return (
    <div className="resume-page">
      {selectedResume ? (
        <ResumeDetail
          resume={selectedResume}
          onBack={handleBackToList}
          onDownload={handleDownload}
          nextUngradedName={
            nextUngraded
              ? (nextUngraded as any).simpleFields?.find(
                (f: SimpleField) => f.fieldKey === 'name',
              )?.fieldValue ?? `简历 #${nextUngraded.resumeId}`
              : null
          }
          onNextUngraded={nextUngraded ? handleNextUngraded : undefined}
        />
      ) : (
        <ResumeList
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
