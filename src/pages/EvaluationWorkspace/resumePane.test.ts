import fs from 'fs';
import path from 'path';

const workspace = fs.readFileSync(path.join(__dirname, 'index.tsx'), 'utf8');

/**
 * 面试时要看的候选人材料，必须在工作台这一页里就能看全。
 *
 * 这两样原先都存在、都能用，只是没接到这一页上：题库只挂在评审页与候选人抽屉，
 * 附件只在简历详情里。面试官面试时开的是工作台，于是「AI 出好的题」与
 * 「候选人传的作品集」两样都够不着。
 */
describe('评价工作台的简历面板', () => {
  test('提供 AI 预设题库入口，并把选题记到这场面试上', () => {
    expect(workspace).toContain('<EvaluationQbankDrawer');
    expect(workspace).toContain('预设题库');
    // 不带 scheduleId 的话，勾选只记到简历，分不清是哪一场面试选的题
    expect(workspace).toMatch(/<EvaluationQbankDrawer[\s\S]*?scheduleId=\{scheduleId\}/);
  });

  test('简历面板带附件，作品集与成绩单不靠简历字段呈现', () => {
    expect(workspace).toContain('<ResumeAttachments');
    // 面试官只看不改
    expect(workspace).toMatch(/<ResumeAttachments[\s\S]*?canEdit=\{false\}/);
  });
});
