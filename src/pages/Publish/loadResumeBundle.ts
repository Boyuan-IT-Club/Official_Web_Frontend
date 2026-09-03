// 投递页的初始化取数顺序。
//
// 单独抽出来是因为这里有一条真实的数据依赖，而它曾经被写成并行：
// 后端 GET /cycle/{id}/field-values 在用户还没有简历时抛 RESUME_NOT_FOUND，
// 而首次进入一个新周期时「取简历」要先 404 再 POST 建简历。两者并行发，
// 字段值必然赶在简历建好之前失败——一个 reject 把整批请求拖垮，
// 页面弹「加载简历信息失败」。第二次进来简历已存在就正常了，
// 正是用户报的「第一次点简历投递报错」。

/*
 * 载荷一律用 any：这几个接口的返回体没有类型，且同一个字段值接口有时裹一层
 * data、有时是裸数组——归一化由调用方就地做（它本来就在做）。
 * 本函数只负责「谁先谁后」，不趟类型的浑水。
 */
export interface ResumeBundleLoaders {
  /** 字段启停配置。失败不致命，返回 null 继续 */
  loadConfig: () => Promise<any>;
  /** 字段定义 */
  loadFields: () => Promise<any>;
  /** 取简历；不存在时按需创建（社员只读则返回 null） */
  loadOrCreateResume: () => Promise<any>;
  /** 取本人已填的字段值。要求简历已存在 */
  loadFieldValues: () => Promise<any>;
}

export interface ResumeBundle {
  config: any;
  fields: any;
  resume: any;
  fieldValues: any;
}

/** 简历响应可能是裸对象，也可能包一层 data */
function hasResume(r: unknown): boolean {
  if (r == null) return false;
  const inner = (r as { data?: unknown }).data;
  return inner != null || typeof r === 'object';
}

export async function loadResumeBundle(
  loaders: ResumeBundleLoaders,
): Promise<ResumeBundle> {
  // 彼此独立的三个并行发，减少首屏加载时间
  const [config, fields, resume] = await Promise.all([
    loaders.loadConfig(),
    loaders.loadFields(),
    loaders.loadOrCreateResume(),
  ]);

  // 字段值等简历存在之后再取。简历确实不存在的情形也有：
  // 社员只读打开一个自己从没投过的周期——那时字段值本来就是空的，
  // 返回空数组，而不是把整页判成加载失败。
  const fieldValues = hasResume(resume) ? await loaders.loadFieldValues() : [];

  return { config, fields, resume, fieldValues };
}
