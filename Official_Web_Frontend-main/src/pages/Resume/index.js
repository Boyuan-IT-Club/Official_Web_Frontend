// src/pages/Resume/index.js
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { resumeActions } from '@/store/modules/resume';
import ResumeList from './ResumeList';
import ResumeDetail from './ResumeDetail';
// import './index.scss'; // 样式已在 List/Detail 中导入

const Resume = () => {
  const dispatch = useDispatch();
  const [selectedResume, setSelectedResume] = useState(null); // 存储选中的完整简历对象

  // 修改：接收整个简历对象
  const handleShowDetail = (resumeObject) => {
    console.log("Selected resume object for detail view:", resumeObject); // 调试日志
    // 直接将完整的简历对象设置为 selectedResume，触发视图切换
    setSelectedResume(resumeObject);
  };

  const handleBackToList = () => {
    setSelectedResume(null);
  };

  const handleApprove = (resumeId) => {
    // 调用 Redux action 更新简历状态为 4 (已录取)
    dispatch(resumeActions.updateResumeStatus({ resumeId, status: 4 }))
      .unwrap()
      .then(() => {
        // 更新本地 selectedResume 状态以反映新状态 (如果当前详情页是这个简历)
        if (selectedResume && selectedResume.resumeId === resumeId) {
          setSelectedResume(prev => ({ ...prev, status: 4 }));
        }
        // 可选：刷新列表 (如果需要立即在列表中看到状态变化)
        // dispatch(resumeActions.fetchResumes({ status: '2,3,4,5' })); // 根据你的 fetchResumes 实现调整
        console.log(`简历 ID ${resumeId} 已通过`);
      })
      .catch((error) => {
        console.error("通过简历失败:", error);
        // 可以在这里添加 message.error 提示
      });
  };

  const handleReject = (resumeId) => {
     // 调用 Redux action 更新简历状态为 5 (已拒绝)
    dispatch(resumeActions.updateResumeStatus({ resumeId, status: 5 }))
      .unwrap()
      .then(() => {
         // 更新本地 selectedResume 状态以反映新状态 (如果当前详情页是这个简历)
        if (selectedResume && selectedResume.resumeId === resumeId) {
          setSelectedResume(prev => ({ ...prev, status: 5 }));
        }
        // 可选：刷新列表 (如果需要立即在列表中看到状态变化)
        // dispatch(resumeActions.fetchResumes({ status: '2,3,4,5' })); // 根据你的 fetchResumes 实现调整
        console.log(`简历 ID ${resumeId} 已拒绝`);
      })
      .catch((error) => {
        console.error("拒绝简历失败:", error);
        // 可以在这里添加 message.error 提示
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
        // 可以在这里添加 message.error 提示
      });
  };

  return (
    <div className="resume-page">
      {/* 条件渲染 */}
      {selectedResume ? (
        <ResumeDetail
          resume={selectedResume} // 传递完整的简历对象
          onBack={handleBackToList}
          onApprove={handleApprove}
          onReject={handleReject}
          onDownload={handleDownload}
        />
      ) : (
        <ResumeList
          onShowDetail={handleShowDetail} // 传递修改后的处理函数
          onApprove={handleApprove}
          onReject={handleReject}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
};

export default Resume;