// src/api/interview.ts

import { request } from '@/utils/request';

/** 意向部门 */
export type Department = '综合部' | '媒体部' | '技术部' | '项目部';

export const DEPARTMENTS: Department[] = ['综合部', '媒体部', '技术部', '项目部'];

/** 面试时间段信息（与后端 GET /apply/interview/slots 返回一致） */
export interface InterviewTimeSlot {
  slotId: number;
  cycleId: number;
  department: Department;
  timeLabel: string;
  startTime: string;
  endTime: string;
  quota: number;
  registeredCount: number;
  sortOrder: number;
  isActive: boolean;
  createTime?: string;
  updateTime?: string;
}

/** GET /apply/interview/slots 响应体 */
interface SlotsResponse {
  code: number;
  message: string;
  data: InterviewTimeSlot[];
}

/**
 * 获取面试时间段列表（含已预约人数/名额）
 * GET /apply/interview/slots?cycleId=2&department=技术部
 */
export const getInterviewTimeSlots = async (
  cycleId: number,
  department?: Department,
): Promise<InterviewTimeSlot[]> => {
  const res = await request({
    url: '/apply/interview/slots',
    method: 'get',
    params: { cycleId, ...(department ? { department } : {}) },
  }) as SlotsResponse;

  if (res.code !== 200) {
    throw new Error(res.message || '获取面试时间段失败');
  }
  return res.data ?? [];
};

/**
 * 确认预约某个面试时间段
 * POST /apply/interview/confirm
 */
export const confirmInterviewSlot = async (
  slotId: number,
  cycleId: number,
  department: Department,
): Promise<void> => {
  const res = await request({
    url: '/apply/interview/confirm',
    method: 'post',
    data: { slotId, cycleId, department },
  }) as { code: number; message: string };

  if (res.code !== 200) {
    throw new Error(res.message || '预约面试时间失败');
  }
};

/**
 * 取消预约
 * POST /apply/interview/cancel
 */
export const cancelInterviewSlot = async (
  slotId: number,
  cycleId: number,
): Promise<void> => {
  const res = await request({
    url: '/apply/interview/cancel',
    method: 'post',
    data: { slotId, cycleId },
  }) as { code: number; message: string };

  if (res.code !== 200) {
    throw new Error(res.message || '取消预约失败');
  }
};
