import { extractGithubRepos, githubFieldLink } from './githubRepo';

/**
 * 识别规则锁两类坑：伪站名（mygithub.com 不能当 github.com）与
 * 占位地址（种子数据里的 example-user/xxx，点开不是候选人的仓库）。
 */
describe('从简历文本识别 GitHub 仓库', () => {
  it('识别 https 与裸域名两种写法', () => {
    const repos = extractGithubRepos('仓库在 https://github.com/alice/notes 和 github.com/bob/blog 里');
    expect(repos.map((r) => r.label)).toEqual(['alice/notes', 'bob/blog']);
  });

  it('同一仓多次出现只留一次（不区分大小写）', () => {
    const repos = extractGithubRepos('github.com/alice/notes …… 又提到 GitHub.com/Alice/Notes');
    expect(repos).toHaveLength(1);
    expect(repos[0].label).toBe('alice/notes');
  });

  it('mygithub.com、api.github.com 这类伪站名不识别', () => {
    expect(extractGithubRepos('见 mygithub.com/alice/notes')).toEqual([]);
    expect(extractGithubRepos('见 api.github.com/alice/notes')).toEqual([]);
  });

  it('占位地址不识别', () => {
    expect(extractGithubRepos('github.com/example-user/demo-repo')).toEqual([]);
    expect(extractGithubRepos('github.com/your-username/xxx')).toEqual([]);
    expect(extractGithubRepos('github.com/alice/xxx')).toEqual([]);
  });

  it('「暂无」等非链接文本返回空', () => {
    expect(extractGithubRepos('暂无')).toEqual([]);
    expect(extractGithubRepos('')).toEqual([]);
    expect(extractGithubRepos(undefined)).toEqual([]);
  });

  it('仓库名后的句读、.git 后缀、深层路径都剥掉', () => {
    expect(extractGithubRepos('github.com/alice/notes。')[0].repo).toBe('notes');
    expect(extractGithubRepos('github.com/alice/notes.git')[0].repo).toBe('notes');
    expect(extractGithubRepos('github.com/alice/notes/tree/main')[0].repo).toBe('notes');
  });

  it('仓库链接统一指向仓库主页', () => {
    expect(extractGithubRepos('https://github.com/alice/notes/tree/main')[0].url)
      .toBe('https://github.com/alice/notes');
  });
});

describe('GitHub 字段值转可点链接', () => {
  it('填的是仓库地址时链到仓库', () => {
    expect(githubFieldLink('https://github.com/alice/notes'))
      .toEqual({ url: 'https://github.com/alice/notes', label: 'alice/notes' });
  });

  it('只填主页时链到主页', () => {
    expect(githubFieldLink('github.com/alice'))
      .toEqual({ url: 'https://github.com/alice', label: 'alice' });
  });

  it('空值与占位地址返回 null，调用方按纯文本兜底', () => {
    expect(githubFieldLink('暂无')).toBeNull();
    expect(githubFieldLink('')).toBeNull();
    expect(githubFieldLink(undefined)).toBeNull();
    expect(githubFieldLink('github.com/example-user/demo')).toBeNull();
  });
});
