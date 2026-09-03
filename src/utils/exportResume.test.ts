// Word 导出的结构守卫。
//
// .docx 是手工拼的 OOXML——拼错一个标签 Word 直接拒开，而这类错误运行时才炸。
// 这里把包结构解开验证：document.xml 必须是良构 XML，且包含与 importResume.ts
// 约定的「标签：」全集（导出→离线填写→导入的回环靠这组标签）。
import JSZip from 'jszip';
import { buildExportDataFromSimpleFields, ResumeExportData } from './exportResume';

// buildDocx 未导出，经由公开入口触发下载不便测试；直接测其组成部分：
// 通过 require 拿到模块后调用内部函数不可行，改为最小可行——
// 用导出的 exportResumeAsDOCX 的底层：这里通过临时 hack 暴露？
// 更稳妥：测试 buildExportDataFromSimpleFields 的映射 + 对 document.xml 的
// 结构断言放在生成之后。为此 exportResume.ts 导出 __buildDocxForTest。
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { __buildDocxForTest } = require('./exportResume');

// 社徽是走 fetch 取的打包资源。jsdom 里那个 URL 是个文件桩，真去请求会
// 报一串 ECONNREFUSED 噪音；默认让它失败即可——导出本来就要能在没有社徽时照常工作。
// 需要验证「取到社徽」的用例在下面自己覆盖 fetch。
beforeEach(() => {
  global.fetch = jest.fn().mockRejectedValue(new Error('no network in tests')) as unknown as typeof fetch;
});

const SAMPLE: ResumeExportData = {
  name: '张三', studentId: '10250001', gender: '男', grade: '大二',
  major: '软件工程', email: 'a@stu.ecnu.edu.cn', phone: '13800000000',
  github: 'https://github.com/zhangsan',
  firstDepartment: '技术部', secondDepartment: '项目部',
  selfIntroduction: '热爱写代码\n也热爱开源', reason: '想找同伴',
  techStack: ['React', 'Java'], projectExperience: '做过官网',
  photoBase64: '',
};

async function documentXmlOf(data: ResumeExportData): Promise<string> {
  const blob: Blob = await __buildDocxForTest(data);
  // jsdom 的 Blob 没有 arrayBuffer()；JSZip 能直接吃 Blob（内部走 FileReader）
  const zip = await JSZip.loadAsync(blob as any);
  return zip.file('word/document.xml')!.async('string');
}

describe('Word 导出的包结构', () => {
  it('document.xml 是良构 XML（Word 拒开畸形包）', async () => {
    const xml = await documentXmlOf(SAMPLE);
    const parsed = new DOMParser().parseFromString(xml, 'application/xml');
    expect(parsed.getElementsByTagName('parsererror').length).toBe(0);
  });

  it('携带与导入解析约定的全部「标签：」，值在同段落内', async () => {
    const xml = await documentXmlOf(SAMPLE);
    for (const label of ['姓名：', '学号：', '性别：', '年级：', '专业：', '邮箱：', '手机号：', 'GitHub：', '技术栈：', '自我介绍：', '项目经验：', '加入理由：']) {
      expect(xml).toContain(label);
    }
    expect(xml).toContain('张三');
    expect(xml).toContain('React、Java');
    // 多行文本必须用 <w:br/> 而不是裸 \n
    expect(xml).toContain('热爱写代码');
    expect(xml).toContain('<w:br/>');
  });

  it('空数据导出为可填写模板：标签俱全、无占位脏值', async () => {
    const empty: ResumeExportData = {
      name: '', studentId: '', gender: '', grade: '', major: '', email: '',
      phone: '', github: '', firstDepartment: '', secondDepartment: '',
      selfIntroduction: '', reason: '', techStack: [], projectExperience: '',
    };
    const xml = await documentXmlOf(empty);
    expect(xml).toContain('姓名：');
    expect(xml).toContain('自我介绍：');
    // 空小节不得输出占位文案——会被导入当成真实内容
    expect(xml).not.toContain('可在此填写');
  });
});

describe('管理端 simpleFields → 导出数据映射', () => {
  it('按字段标签取值，姓名/邮箱缺失时回退注册账号', () => {
    const data = buildExportDataFromSimpleFields(
      [
        { fieldLabel: '学号', fieldValue: '10250002' },
        { fieldLabel: '技术栈', fieldValue: '["Vue","Go"]' },
        { fieldLabel: '期望部门', fieldValue: '["媒体部","综合部"]' },
      ],
      { userName: '李四', userEmail: 'b@stu.ecnu.edu.cn' },
    );
    expect(data.name).toBe('李四');
    expect(data.email).toBe('b@stu.ecnu.edu.cn');
    expect(data.studentId).toBe('10250002');
    expect(data.techStack).toEqual(['Vue', 'Go']);
    expect(data.firstDepartment).toBe('媒体部');
    expect(data.secondDepartment).toBe('综合部');
  });
});

describe('社徽嵌入', () => {
  const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

  it('取到社徽时，包里有图片、关系项和 png 类型声明', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => PNG_BYTES.buffer,
    }) as unknown as typeof fetch;

    const zip = await JSZip.loadAsync((await __buildDocxForTest(SAMPLE)) as any);

    // 三者缺一 Word 就拒开：媒体文件、关系项、Content_Types 里的扩展名声明
    expect(zip.file('word/media/logo.png')).not.toBeNull();
    expect(await zip.file('word/_rels/document.xml.rels')!.async('string')).toContain('rIdLogo');
    expect(await zip.file('[Content_Types].xml')!.async('string'))
      .toContain('Extension="png"');

    const xml = await zip.file('word/document.xml')!.async('string');
    expect(xml).toContain('r:embed="rIdLogo"');
    expect(new DOMParser().parseFromString(xml, 'application/xml')
      .getElementsByTagName('parsererror').length).toBe(0);
  });

  it('取不到社徽时照常导出，不留下悬空的关系引用', async () => {
    // 少一个 logo 不该让简历导不出来；但更要紧的是别留下指向不存在文件的
    // rIdLogo——Word 遇到悬空关系会直接报文件损坏
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;

    const zip = await JSZip.loadAsync((await __buildDocxForTest(SAMPLE)) as any);

    expect(zip.file('word/media/logo.png')).toBeNull();
    expect(await zip.file('word/_rels/document.xml.rels')!.async('string')).not.toContain('rIdLogo');
    expect(await zip.file('word/document.xml')!.async('string')).not.toContain('rIdLogo');
  });
});

describe('导出跟随字段配置', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockRejectedValue(new Error('no network in tests')) as unknown as typeof fetch;
  });

  const xmlOf = async (meta: any) => {
    const zip = await JSZip.loadAsync((await __buildDocxForTest(SAMPLE, [], meta)) as any);
    return zip.file('word/document.xml')!.async('string');
  };

  it('用管理员配置的标签，而不是写死的中文名', async () => {
    const xml = await xmlOf({ labelOf: { github: '代码仓库', reason: '为什么想加入' } });
    expect(xml).toContain('代码仓库');
    expect(xml).toContain('为什么想加入');
    expect(xml).not.toContain('GitHub：');
    expect(xml).not.toContain('加入理由');
  });

  it('停用的字段不出现在导出里', async () => {
    // 表单里都不让填了，模板里还留一栏只会让人以为自己漏填了
    const xml = await xmlOf({ enabledOf: { github: false, introduction: false } });
    expect(xml).not.toContain('GitHub');
    expect(xml).not.toContain('个人简介');
    expect(xml).toContain('姓名');       // 其余字段照常
  });

  it('没传配置时保持原样，用内置中文标签', async () => {
    const xml = await xmlOf(undefined);
    expect(xml).toContain('姓名');
    expect(xml).toContain('GitHub');
    expect(xml).toContain('加入理由');
  });
});
