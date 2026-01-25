// src/pages/Resume/index.tsx
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
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

type ResumeItem = {
  resumeId: string | number;
  status: number;
  submittedAt?: string | number | Date | null;
  simpleFields?: SimpleField[];
  // 不修改后端返回结构：放行其他字段
  [key: string]: any;
};

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

  const handleApprove = (resumeId: string | number): void => {
    dispatch(resumeActions.updateResumeStatus({ resumeId, status: 4 }))
      .unwrap()
      .then(() => {
        if (selectedResume && selectedResume.resumeId === resumeId) {
          setSelectedResume((prev) => (prev ? { ...prev, status: 4 } : prev));
        }
        // eslint-disable-next-line no-console
        console.log(`简历 ID ${resumeId} 已通过`);
      })
      .catch((error: unknown) => {
        // eslint-disable-next-line no-console
        console.error('通过简历失败:', error);
      });
  };

  const handleReject = (resumeId: string | number): void => {
    dispatch(resumeActions.updateResumeStatus({ resumeId, status: 5 }))
      .unwrap()
      .then(() => {
        if (selectedResume && selectedResume.resumeId === resumeId) {
          setSelectedResume((prev) => (prev ? { ...prev, status: 5 } : prev));
        }
        // eslint-disable-next-line no-console
        console.log(`简历 ID ${resumeId} 已拒绝`);
      })
      .catch((error: unknown) => {
        // eslint-disable-next-line no-console
        console.error('拒绝简历失败:', error);
      });
  };

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
          onApprove={handleApprove}
          onReject={handleReject}
          onDownload={handleDownload}
        />
      ) : (
        <ResumeList
          onShowDetail={handleShowDetail}
          onApprove={handleApprove}
          onReject={handleReject}
          onDownload={handleDownload}
          currentPage={currentPage}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
};

export default Resume;
