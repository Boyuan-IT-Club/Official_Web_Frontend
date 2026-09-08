// 简历照片工具的纯函数部分：字段值形态判定与 dataURL/Blob 互转。
// 网络部分（上传/取图）走鉴权 request，行为由后端契约与集成环境保证。
import { blobToDataUrl, dataUrlToBlob, isPhotoObjectKey } from './resumePhoto';

describe('isPhotoObjectKey', () => {
  it('只认 resume-photos/ 前缀 —— 这是读取侧的安全边界，别放宽', () => {
    expect(isPhotoObjectKey('resume-photos/abc.jpg')).toBe(true);
    // 历史 base64 不是 key
    expect(isPhotoObjectKey('data:image/jpeg;base64,xxx')).toBe(false);
    // 别的前缀的 key 不能借照片通道读
    expect(isPhotoObjectKey('attachments/abc.pdf')).toBe(false);
    expect(isPhotoObjectKey('avatars/x.png')).toBe(false);
    expect(isPhotoObjectKey('')).toBe(false);
    expect(isPhotoObjectKey(null)).toBe(false);
    expect(isPhotoObjectKey(undefined)).toBe(false);
  });
});

describe('dataURL 与 Blob 互转', () => {
  it('dataUrlToBlob 还原 MIME 类型与体积', () => {
    const raw = Uint8Array.from([0xff, 0xd8, 0x00, 0x11, 0x22]);
    const base64 = btoa(String.fromCharCode(...raw));
    const blob = dataUrlToBlob(`data:image/jpeg;base64,${base64}`);

    expect(blob.type).toBe('image/jpeg');
    expect(blob.size).toBe(raw.length);
  });

  it('blobToDataUrl 与 dataUrlToBlob 互为逆运算', async () => {
    const dataUrl = `data:image/png;base64,${btoa('hello-photo')}`;
    const roundTripped = await blobToDataUrl(dataUrlToBlob(dataUrl));
    expect(roundTripped).toBe(dataUrl);
  });
});
