// src/api/interviewMock.ts
// 前端演示数据 — 后端不可用时自动使用

import type { InterviewTimeSlot, Department } from './interview';

/**
 * 按部门组织的面试时间段演示数据
 * key：意向部门名称
 */
export const MOCK_INTERVIEW_SLOTS: Record<Department, InterviewTimeSlot[]> = {
  综合部: [
    { slotId: 101, cycleId: 2, department: '综合部', timeLabel: 'Day 1 上午', startTime: '09:00', endTime: '12:00', quota: 30, registeredCount: 12, sortOrder: 1, isActive: true },
    { slotId: 102, cycleId: 2, department: '综合部', timeLabel: 'Day 1 下午', startTime: '14:00', endTime: '17:00', quota: 30, registeredCount: 25, sortOrder: 2, isActive: true },
    { slotId: 103, cycleId: 2, department: '综合部', timeLabel: 'Day 2 上午', startTime: '09:00', endTime: '12:00', quota: 25, registeredCount: 3, sortOrder: 4, isActive: true },
    { slotId: 104, cycleId: 2, department: '综合部', timeLabel: 'Day 2 下午', startTime: '14:00', endTime: '17:00', quota: 25, registeredCount: 0, sortOrder: 5, isActive: true },
  ],
  媒体部: [
    { slotId: 201, cycleId: 2, department: '媒体部', timeLabel: 'Day 1 上午', startTime: '09:00', endTime: '12:00', quota: 20, registeredCount: 8, sortOrder: 1, isActive: true },
    { slotId: 202, cycleId: 2, department: '媒体部', timeLabel: 'Day 1 下午', startTime: '14:00', endTime: '17:00', quota: 20, registeredCount: 15, sortOrder: 2, isActive: true },
    { slotId: 203, cycleId: 2, department: '媒体部', timeLabel: 'Day 2 上午', startTime: '09:00', endTime: '12:00', quota: 15, registeredCount: 2, sortOrder: 4, isActive: true },
    { slotId: 204, cycleId: 2, department: '媒体部', timeLabel: 'Day 2 下午', startTime: '14:00', endTime: '17:00', quota: 15, registeredCount: 0, sortOrder: 5, isActive: true },
  ],
  技术部: [
    { slotId: 301, cycleId: 2, department: '技术部', timeLabel: 'Day 1 上午', startTime: '09:00', endTime: '12:00', quota: 35, registeredCount: 20, sortOrder: 1, isActive: true },
    { slotId: 302, cycleId: 2, department: '技术部', timeLabel: 'Day 1 下午', startTime: '14:00', endTime: '17:00', quota: 35, registeredCount: 30, sortOrder: 2, isActive: true },
    { slotId: 303, cycleId: 2, department: '技术部', timeLabel: 'Day 1 晚上', startTime: '18:30', endTime: '21:00', quota: 20, registeredCount: 10, sortOrder: 3, isActive: true },
    { slotId: 304, cycleId: 2, department: '技术部', timeLabel: 'Day 2 上午', startTime: '09:00', endTime: '12:00', quota: 30, registeredCount: 5, sortOrder: 4, isActive: true },
    { slotId: 305, cycleId: 2, department: '技术部', timeLabel: 'Day 2 下午', startTime: '14:00', endTime: '17:00', quota: 30, registeredCount: 0, sortOrder: 5, isActive: true },
  ],
  项目部: [
    { slotId: 401, cycleId: 2, department: '项目部', timeLabel: 'Day 1 上午', startTime: '09:00', endTime: '12:00', quota: 25, registeredCount: 10, sortOrder: 1, isActive: true },
    { slotId: 402, cycleId: 2, department: '项目部', timeLabel: 'Day 1 下午', startTime: '14:00', endTime: '17:00', quota: 25, registeredCount: 20, sortOrder: 2, isActive: true },
    { slotId: 403, cycleId: 2, department: '项目部', timeLabel: 'Day 2 上午', startTime: '09:00', endTime: '12:00', quota: 20, registeredCount: 5, sortOrder: 4, isActive: true },
    { slotId: 404, cycleId: 2, department: '项目部', timeLabel: 'Day 2 下午', startTime: '14:00', endTime: '17:00', quota: 20, registeredCount: 0, sortOrder: 5, isActive: true },
  ],
};
