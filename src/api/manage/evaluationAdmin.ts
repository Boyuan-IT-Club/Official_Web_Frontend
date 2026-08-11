import { request } from '@/utils';

/** 评测提交管理(对应后端 /api/admin/evaluations,需 evaluation:view) */
export interface TestResult {
  name: string;
  passed: boolean;
  points: number;
}

export interface TaskResult {
  score: number;
  max_score: number;
  test_results: TestResult[];
}

/** 报告单明文(工具仓 types.ts Report) */
export interface Report {
  author: string;
  timestamp: string;
  tasks: Record<string, TaskResult>;
  total_score: number;
}

/** 候选人聚合行(总览/榜单共用) */
export interface CandidateRow {
  githubUsername: string;
  userId?: number | null;
  userName?: string | null;
  deptName?: string | null;
  latestTotalScore?: number | null;
  maxTotalScore?: number | null;
  submissionCount?: number | null;
  lastEvaluatedAt?: string | null;
  claimed?: boolean;
}

export interface Submission {
  id: number;
  githubUsername: string;
  userId?: number | null;
  cycleId?: number | null;
  reportSha: string;
  author: string;
  evaluatedAt: string;
  totalScore: number;
  maxScore: number;
  task1Score?: number | null;
  task2Score?: number | null;
  task3Score?: number | null;
  task4Score?: number | null;
  reportJson: string;
  repository?: string | null;
  commitSha?: string | null;
  createdAt: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  first: boolean;
  last: boolean;
}

export function getCandidates(params: {
  cycleId?: number;
  deptId?: number;
  minScore?: number;
  maxScore?: number;
  claimed?: string;
  sortBy?: string;
  page?: number;
  size?: number;
}) {
  return request({ url: '/api/admin/evaluations/candidates', method: 'get', params });
}

/** key = userId 数字或 github_username */
export function getSubmissions(key: string | number) {
  return request({ url: `/api/admin/evaluations/candidates/${key}/submissions`, method: 'get' });
}

export function getSubmissionDetail(id: number) {
  return request({ url: `/api/admin/evaluations/submissions/${id}`, method: 'get' });
}

export function claimSubmission(id: number, userId: number) {
  return request({ url: `/api/admin/evaluations/submissions/${id}/claim`, method: 'put', data: { userId } });
}