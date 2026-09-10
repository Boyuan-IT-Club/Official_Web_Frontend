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

  test('面试评价表仍提供 AI 预设题库', () => {
    const drawer = source('..', 'EvaluationBoard', 'CandidateDrawer.tsx');
    expect(drawer).toContain('<EvaluationQbankDrawer');
    expect(drawer).toContain('AI 预设题库');
  });

  test('不改变既有人工批量初筛和打分舞台', () => {
    const list = source('ResumeList.tsx');
    expect(list).toContain('全选本页');
    expect(list).toContain('const [picked, setPicked]');
    expect(list).toContain('打分舞台');
  });
});
