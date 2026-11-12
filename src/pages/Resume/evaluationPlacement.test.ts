import fs from 'fs';
import path from 'path';

const source = (...parts: string[]) =>
  fs.readFileSync(path.join(__dirname, ...parts), 'utf8');

describe('AI 简历评估入口布局', () => {
  test('评估结果位于简历详情，不提供第三个独立入口', () => {
    expect(source('ResumeDetail.tsx')).toContain('<ResumeAiSummary');
    expect(source('..', 'AdminLayout', 'index.tsx')).not.toContain(
      'key: "/evaluation-review"',
    );
    expect(source('..', '..', 'router', 'admin.tsx')).not.toContain(
      'path: "evaluation-review"',
    );
  });

  test('AI 状态筛选真的收窄列表，而不是只改一个计数', () => {
    // 「置信度低」这类队列就是靠这个筛选实现的：列表若仍渲染全部简历，队列等于没有。
    // 提交历史里出过一次：#203 临时停用 AI 初筛时把数据源改成了全量，恢复后没改回来。
    const list = source('ResumeList.tsx');
    expect(list).toContain('dataSource={visibleResumes}');
    expect(list).not.toContain('dataSource={resumes}');
  });

  test('面试评价表仍提供 AI 预设题库', () => {
    const drawer = source('..', 'EvaluationBoard', 'CandidateDrawer.tsx');
    expect(drawer).toContain('<EvaluationQbankDrawer');
    expect(drawer).toContain('AI 预设题库');
  });
});
