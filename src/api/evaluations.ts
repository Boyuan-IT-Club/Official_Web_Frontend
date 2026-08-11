import { request } from '@/utils';

/** 用户端评测中心(对应后端 /api/evaluations) */
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

export interface Report {
  author: string;
  timestamp: string;
  tasks: Record<string, TaskResult>;
  total_score: number;
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

export interface TrendPoint {
  evaluatedAt: string;
  totalScore: number;
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

export function fetchMySubmissions(page = 0, size = 10) {
  return request({ url: '/api/evaluations/me', method: 'get', params: { page, size } });
}

export function fetchLatestSubmission() {
  return request({ url: '/api/evaluations/me/latest', method: 'get' });
}

export function fetchTrend() {
  return request({ url: '/api/evaluations/me/trend', method: 'get' });
}