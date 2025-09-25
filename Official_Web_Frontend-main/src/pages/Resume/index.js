// src/pages/Resume/index.js
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { resumeActions } from '@/store/modules/resume';
import ResumeList from './ResumeList';
import ResumeDetail from './ResumeDetail';
// import './index.scss'; // 样式已在 List/Detail 中导入

const Resume = () => {
  const dispatch = useDispatch();
  const [selectedResume, setSelectedResume] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // 查看简历详情
  const handleShowDetail = (resumeObject, page) => {
    console.log("显示简历详情，传递的页码:", page, "简历ID:", resumeObject?.resumeId);
    
    // 保存传递的页码，如果没有传递则使用当前页码
    if (page) {
      setCurrentPage(page);
    }
    setSelectedResume(resumeObject);
  };

  const handleBackToList = () => {
    console.log("返回列表，当前保存的页码:", currentPage);
    setSelectedResume(null);
  };

  // 处理页码变化
  const handlePageChange = (page) => {
    console.log("页码变化回调:", page);
    setCurrentPage(page);
  };

  const handleApprove = (resumeId) => {
    dispatch(resumeActions.updateResumeStatus({ resumeId, status: 4 }))
      .unwrap()
      .then(() => {
        if (selectedResume && selectedResume.resumeId === resumeId) {
          setSelectedResume(prev => ({ ...prev, status: 4 }));
        }
        console.log(`简历 ID ${resumeId} 已通过`);
      })
      .catch((error) => {
        console.error("通过简历失败:", error);
      });
  };

  const handleReject = (resumeId) => {
    dispatch(resumeActions.updateResumeStatus({ resumeId, status: 5 }))
      .unwrap()
      .then(() => {
        if (selectedResume && selectedResume.resumeId === resumeId) {
          setSelectedResume(prev => ({ ...prev, status: 5 }));
        }
        console.log(`简历 ID ${resumeId} 已拒绝`);
      })
      .catch((error) => {
        console.error("拒绝简历失败:", error);
      });
  };

  const handleDownload = (resumeId) => {
    dispatch(resumeActions.downloadResumePDF(resumeId))
      .unwrap()
      .then(() => {
        console.log(`简历 ID ${resumeId} PDF 下载已触发`);
      })
      .catch((error) => {
        console.error("下载简历失败:", error);
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