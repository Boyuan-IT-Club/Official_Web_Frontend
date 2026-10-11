import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ResumeQuickView from './index';

// 用普通变量而不是 jest.fn：CRA 的 jest 配置带 resetMocks，mock 实现会在每个用例前被清空
let mockPhotoUrl: string | null = null;
jest.mock('@/hooks/useResumePhoto', () => ({ useResumePhoto: () => mockPhotoUrl }));

afterEach(() => { mockPhotoUrl = null; });

const f = (fieldId: number, fieldKey: string, fieldLabel: string, fieldValue: string) =>
  ({ fieldId, fieldKey, fieldLabel, fieldValue });

describe('简历速览', () => {
  it('不把「存储位」字段原样打出来 —— 它们存的是机器读的 JSON', () => {
    render(<ResumeQuickView resume={{ resumeId: 1, simpleFields: [
      f(1, 'name', '姓名', '李明'),
      f(2, 'major', '专业', '计算机科学与技术'),
      // 面试意向、能否线下都塞在这个字段的 JSON 里；照原样显示就是一段乱码
      f(3, 'expected_interview_time', '第一面试时间',
        '{"first":"","second":"","canAttend":"yes","customTime":""}'),
      f(4, 'can_attend_offline_interview', '能否参加线下面试', 'yes'),
    ] }} />);

    expect(screen.getByText('李明')).toBeInTheDocument();
    expect(screen.getByText('计算机科学与技术')).toBeInTheDocument();
    expect(screen.queryByText('第一面试时间')).not.toBeInTheDocument();
    expect(screen.queryByText(/canAttend/)).not.toBeInTheDocument();
    expect(screen.queryByText('能否参加线下面试')).not.toBeInTheDocument();
  });

  it('管理员自建的字段没有 spec，照常显示', () => {
    render(<ResumeQuickView resume={{ resumeId: 1, simpleFields: [
      f(1, 'name', '姓名', '李明'),
      f(9, 'club_experience', '社团经历', '学生会宣传部'),
    ] }} />);
    expect(screen.getByText('社团经历')).toBeInTheDocument();
    expect(screen.getByText('学生会宣传部')).toBeInTheDocument();
  });
});

describe('证件照点开看大图', () => {
  const withPhoto = () => {
    mockPhotoUrl = 'data:image/png;base64,AAAA';
    return render(<ResumeQuickView resume={{ resumeId: 1, simpleFields: [
      f(1, 'name', '姓名', '付岚勋'),
      f(2, 'personal_photo', '个人照片', 'resume/1/photo.jpg'),
    ] }} />);
  };
  const previewOpen = () => {
    const wrap = document.querySelector('.ant-image-preview-wrap') as HTMLElement | null;
    return Boolean(wrap && wrap.style.display !== 'none');
  };

  it('点照片打开大图预览', () => {
    const { container } = withPhoto();
    expect(previewOpen()).toBe(false);
    fireEvent.click(container.querySelector('img.rv-photo')!);
    expect(previewOpen()).toBe(true);
  });

  it('按 Esc 只关大图，不传到评价舞台（否则会连舞台一起退出）', () => {
    // 模拟舞台：比预览更早在 window 上注册的 keydown 监听（Esc 退出舞台）
    const stageKeys = jest.fn();
    window.addEventListener('keydown', stageKeys);
    try {
      const { container } = withPhoto();
      fireEvent.click(container.querySelector('img.rv-photo')!);

      fireEvent.keyDown(document.body, { key: 'Escape' });

      expect(previewOpen()).toBe(false);
      expect(stageKeys).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('keydown', stageKeys);
    }
  });

  it('大图开着时 Ctrl+→ 不会在底下悄悄换人', () => {
    const stageKeys = jest.fn();
    window.addEventListener('keydown', stageKeys);
    try {
      const { container } = withPhoto();
      fireEvent.click(container.querySelector('img.rv-photo')!);
      fireEvent.keyDown(document.body, { key: 'ArrowRight', ctrlKey: true });
      expect(stageKeys).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('keydown', stageKeys);
    }
  });

  it('大图关掉后，舞台的快捷键照常生效', () => {
    const stageKeys = jest.fn();
    window.addEventListener('keydown', stageKeys);
    try {
      const { container } = withPhoto();
      fireEvent.click(container.querySelector('img.rv-photo')!);
      fireEvent.keyDown(document.body, { key: 'Escape' });   // 关大图

      fireEvent.keyDown(document.body, { key: 'Escape' });   // 这一下该轮到舞台
      expect(stageKeys).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener('keydown', stageKeys);
    }
  });

  it('没有照片时不渲染图片', () => {
    const { container } = render(<ResumeQuickView resume={{ resumeId: 1, simpleFields: [
      f(1, 'name', '姓名', '付岚勋'),
    ] }} />);
    expect(container.querySelector('img.rv-photo')).toBeNull();
  });
});
