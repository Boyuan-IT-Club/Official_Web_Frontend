import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { message } from 'antd';
import ResumeAttachments from '../index';

jest.mock('@/api/resumeAttachment', () => ({
  // 上限取真实常量：在 mock 里再写一个数字，常量改了测试照样通过
  MAX_ATTACHMENT_BYTES: jest.requireActual('@/api/resumeAttachment').MAX_ATTACHMENT_BYTES,
  listAttachments: jest.fn(),
  uploadAttachment: jest.fn(),
  deleteAttachment: jest.fn(),
  fetchAttachmentBlob: jest.fn(),
  formatSize: (n: number) => `${n}B`,
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const api = require('@/api/resumeAttachment');

const PDF = { id: 1, resumeId: 9, fileName: '作品集.pdf', contentType: 'application/pdf', sizeBytes: 100, previewable: true };
const DOC = { id: 2, resumeId: 9, fileName: '成绩单.docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', sizeBytes: 200, previewable: false };

const MAX = api.MAX_ATTACHMENT_BYTES;

/** 只声明体积，不真塞 20MB 进内存。 */
function makeFile(name: string, size: number): File {
  const file = new File(['x'], name, { type: 'application/pdf' });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

/** 走 antd Upload 内部那个隐藏 input，等价于用户选文件。 */
function pickFile(file: File): void {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: [file] });
  fireEvent.change(input);
}

// CRA 的 jest 配置带 resetMocks: true，实现必须放在 beforeEach
beforeEach(() => {
  api.listAttachments.mockResolvedValue({ data: [PDF, DOC] });
  api.fetchAttachmentBlob.mockResolvedValue(new Blob(['x']));
  api.deleteAttachment.mockResolvedValue({});
  api.uploadAttachment.mockResolvedValue({});
  (global.URL as any).createObjectURL = jest.fn(() => 'blob:fake');
  (global.URL as any).revokeObjectURL = jest.fn();
});

describe('简历附件', () => {
  it('列出附件，能预览的才给预览按钮', async () => {
    render(<ResumeAttachments resumeId={9} />);
    await waitFor(() => expect(screen.getByText('作品集.pdf')).toBeInTheDocument());
    expect(screen.getByText('成绩单.docx')).toBeInTheDocument();

    // Word 这类浏览器打不开的，预览按钮要禁用而不是给个点了没反应的按钮
    const previews = screen.getAllByRole('button', { name: /预览/ });
    expect(previews[0]).not.toBeDisabled();
    expect(previews[1]).toBeDisabled();
  });

  it('面试官视角只读：没有上传与删除入口', async () => {
    render(<ResumeAttachments resumeId={9} />);
    await waitFor(() => expect(screen.getByText('作品集.pdf')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /上传附件/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /删除/ })).not.toBeInTheDocument();
  });

  it('学生视角可编辑：有上传与删除入口', async () => {
    render(<ResumeAttachments resumeId={9} canEdit />);
    await waitFor(() => expect(screen.getByText('作品集.pdf')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /上传附件/ })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /删除/ }).length).toBe(2);
  });

  it('预览走带鉴权的 blob，不直接用 URL', async () => {
    // 直接把接口地址塞进 iframe/img 的 src，发出的请求不带 Authorization，
    // 一律 401 —— 必须先取回 blob 再渲染
    render(<ResumeAttachments resumeId={9} />);
    await waitFor(() => expect(screen.getByText('作品集.pdf')).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole('button', { name: /预览/ })[0]);
    await waitFor(() => expect(api.fetchAttachmentBlob).toHaveBeenCalledWith(1, true));
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('关闭预览时释放 blob URL，不漏内存', async () => {
    render(<ResumeAttachments resumeId={9} />);
    await waitFor(() => expect(screen.getByText('作品集.pdf')).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole('button', { name: /预览/ })[0]);
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled());

    // antd 会给纯中文两字按钮插一个空格（渲染成「关 闭」），按正则匹配
    fireEvent.click(screen.getByRole('button', { name: /关\s*闭/ }));
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake'));
  });

  it('下载用 inline=false，服务端据此强制 attachment', async () => {
    render(<ResumeAttachments resumeId={9} />);
    await waitFor(() => expect(screen.getByText('作品集.pdf')).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole('button', { name: /下载/ })[0]);
    await waitFor(() => expect(api.fetchAttachmentBlob).toHaveBeenCalledWith(1, false));
  });

  it('没有简历 id 时不请求接口', async () => {
    // 新周期里简历还没创建，此时列附件必然失败。
    // 断言「没发请求」本身，而不是空态文案——空态在可编辑时刻意不渲染文字
    // （上传按钮已经把「这里能传附件」说清楚了），拿文案当锚点会跟着样式一起碎。
    render(<ResumeAttachments resumeId={null} canEdit />);
    await waitFor(() => expect(screen.getByRole('button', { name: /上传附件/ })).toBeInTheDocument());
    expect(api.listAttachments).not.toHaveBeenCalled();
  });

  it('接口出错时留空而不是整块报错', async () => {
    api.listAttachments.mockRejectedValue(new Error('boom'));
    render(<ResumeAttachments resumeId={9} />);
    // 只读视角下空态仍给一行说明，让面试官知道是「没传」而不是「没加载出来」
    await waitFor(() => expect(screen.getByText(/候选人没有上传附件/)).toBeInTheDocument());
  });

  it('超过上限的文件本地就拦下，不发请求，并说明上限', async () => {
    // 放出去的话，用户要等整个上传跑完才被告知失败，20MB 的请求体也白占一次带宽
    const error = jest.spyOn(message, 'error').mockImplementation(() => undefined as never);
    render(<ResumeAttachments resumeId={9} canEdit />);
    await waitFor(() => expect(screen.getByText('作品集.pdf')).toBeInTheDocument());

    pickFile(makeFile('作品集.pdf', MAX + 1));

    await waitFor(() => expect(error).toHaveBeenCalled());
    expect(String(error.mock.calls[0][0])).toContain('20MB');
    expect(api.uploadAttachment).not.toHaveBeenCalled();
  });

  it('上限以内的文件照常上传', async () => {
    render(<ResumeAttachments resumeId={9} canEdit />);
    await waitFor(() => expect(screen.getByText('作品集.pdf')).toBeInTheDocument());

    pickFile(makeFile('作品集.pdf', MAX));

    await waitFor(() => expect(api.uploadAttachment).toHaveBeenCalledWith(9, expect.anything()));
  });
});
