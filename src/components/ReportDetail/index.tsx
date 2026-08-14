import React, { useMemo } from 'react';
import { Collapse, Progress, Typography, Empty } from 'antd';
import type { Report, Submission } from '@/api/manage/evaluationAdmin';
import './index.scss';

const { Text } = Typography;

interface Props {
  submission: Submission;
  /** 是否显示总分 Progress(管理端详情 Drawer 需要;用户端展开行不需要) */
  showTotal?: boolean;
  /** task 显示名(默认 task1/task2/…;用户端传中文标签) */
  taskLabels?: Record<string, string>;
}

/** 单份报告明细:总分(可选)+ 5 task 折叠检查项。管理端/用户端共用(review F1) */
const ReportDetail: React.FC<Props> = ({ submission, showTotal = true, taskLabels }) => {
  const report = useMemo<Report | null>(() => {
    try {
      return JSON.parse(submission.reportJson) as Report;
    } catch {
      return null;
    }
  }, [submission.reportJson]);

  if (!report) {
    return <Empty description="报告解析失败" />;
  }

  const taskIds = ['task1', 'task2', 'task3', 'task4', 'task5'];
  const maxTotal = taskIds.reduce((sum, id) => sum + (report.tasks?.[id]?.max_score ?? 0), 0) || 500;

  return (
    <div className="report-detail">
      {showTotal && (
        <div className="report-total">
          <Text strong>总分</Text>
          <Progress
            percent={Math.round(((report.total_score || 0) / maxTotal) * 100)}
            format={() => `${report.total_score || 0} / ${maxTotal}`}
          />
        </div>
      )}
      <Collapse
        size="small"
        className="report-tasks"
        items={taskIds.map((id) => {
          const t = report.tasks?.[id];
          return {
            key: id,
            label: `${taskLabels?.[id] ?? id} · ${t ? `${t.score}/${t.max_score}` : '—'}`,
            children: t ? (
              <ul className="check-list">
                {(t.test_results || []).map((r, i) => (
                  <li key={i}>
                    <span className={r.passed ? 'check-pass' : 'check-fail'}>{r.passed ? '✅' : '❌'}</span>
                    <span className="check-name">{r.name}</span>
                    <span className="check-points">{r.points} 分</span>
                  </li>
                ))}
                {(t.test_results || []).length === 0 && <li className="check-empty">无检查项明细</li>}
              </ul>
            ) : (
              '无数据'
            ),
          };
        })}
      />
    </div>
  );
};

export default ReportDetail;