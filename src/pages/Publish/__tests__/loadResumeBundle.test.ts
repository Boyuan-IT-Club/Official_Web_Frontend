import { loadResumeBundle } from '../loadResumeBundle';

/** 用一个假后端复现真实时序：字段值接口在简历存在之前一律 404。 */
function fakeBackend(opts: { resumeExists: boolean; readOnly?: boolean }) {
  const calls: string[] = [];
  let resumeExists = opts.resumeExists;

  return {
    calls,
    loaders: {
      loadConfig: async () => { calls.push('config'); return { ok: true }; },
      loadFields: async () => { calls.push('fields'); return [{ fieldKey: 'name' }]; },
      loadOrCreateResume: async () => {
        calls.push('resume:get');
        // 真实实现是两次 HTTP 往返：先 GET 拿 404，再 POST 建。
        // 这个 await 不能省 —— 少了它「建简历」会在同一个事件循环里同步做完，
        // 抢在字段值请求发出之前，竞态就被掩盖，并行版本也能通过。
        await new Promise((r) => setTimeout(r, 0));
        if (!resumeExists) {
          if (opts.readOnly) return null;      // 社员只读：没有就是没有，不创建
          calls.push('resume:create');
          await new Promise((r) => setTimeout(r, 0));
          resumeExists = true;                 // 建好之后字段值接口才不会 404
        }
        return { resumeId: 7 };
      },
      loadFieldValues: async () => {
        calls.push('fieldValues');
        // 后端真实行为：没有简历就抛 RESUME_NOT_FOUND
        if (!resumeExists) throw new Error('RESUME_NOT_FOUND');
        return [{ fieldId: 1, fieldValue: '张三' }];
      },
    },
  };
}

describe('投递页的初始化取数顺序', () => {
  it('首次进入新周期不再报错：字段值等简历建好之后才取', async () => {
    const { loaders, calls } = fakeBackend({ resumeExists: false });

    const bundle = await loadResumeBundle(loaders);

    // 关键：取字段值必须排在建简历之后，否则必然 404
    expect(calls.indexOf('fieldValues')).toBeGreaterThan(calls.indexOf('resume:create'));
    expect(bundle.fieldValues).toHaveLength(1);
  });

  it('简历已存在时照常取到字段值', async () => {
    const { loaders } = fakeBackend({ resumeExists: true });
    const bundle = await loadResumeBundle(loaders);
    expect(bundle.fieldValues).toHaveLength(1);
    expect(bundle.resume).toEqual({ resumeId: 7 });
  });

  it('社员只读打开从没投过的周期：字段值为空，不判失败', async () => {
    // 这条以前也会弹「加载简历信息失败」——没有简历不是错误，就是没填过
    const { loaders, calls } = fakeBackend({ resumeExists: false, readOnly: true });

    const bundle = await loadResumeBundle(loaders);

    expect(bundle.resume).toBeNull();
    expect(bundle.fieldValues).toEqual([]);
    expect(calls).not.toContain('fieldValues');   // 明知会 404 就不该发
    expect(calls).not.toContain('resume:create'); // 只读不该建出空简历
  });

  it('字段配置失败不影响其余部分', async () => {
    const { loaders } = fakeBackend({ resumeExists: true });
    const bundle = await loadResumeBundle({
      ...loaders,
      loadConfig: async () => null,
    });
    expect(bundle.config).toBeNull();
    expect(bundle.fields).toHaveLength(1);
    expect(bundle.fieldValues).toHaveLength(1);
  });

  it('三个独立请求仍是并行发出的，没退化成串行', async () => {
    const started: string[] = [];
    const gate = (name: string) => async () => {
      started.push(name);
      await new Promise((r) => setTimeout(r, 0));
      return [] as any;
    };
    await loadResumeBundle({
      loadConfig: gate('config'),
      loadFields: gate('fields'),
      loadOrCreateResume: async () => { started.push('resume'); return { resumeId: 1 }; },
      loadFieldValues: async () => { started.push('fieldValues'); return []; },
    });
    // 三个独立请求都要在字段值之前就已发出（并行），而不是一个等一个
    expect(started.slice(0, 3).sort()).toEqual(['config', 'fields', 'resume']);
  });
});
