// 从简历文本里识别 GitHub 链接。
//
// 评审想看候选人的代码，得从项目经验里挑出地址、复制、粘到浏览器——
// 这里把 github.com/<owner>/<repo>（以及 <owner> 主页）识别出来，
// 交给页面渲染成可点链接。
//
// 两类不能当真链接给出：
//   伪站名 —— mygithub.com、api.github.com 这类，github.com 前面紧贴
//             字母或点的一律不认；
//   占位地址 —— example-user/xxx、your-username/repo 这类种子/示例数据，
//             点开也不是候选人的仓库。

export interface GithubRepoLink {
  owner: string;
  repo: string;
  url: string;
  /** 展示标签：owner/repo */
  label: string;
  /** 去重键：小写 owner/repo */
  key: string;
}

export interface GithubProfileLink {
  owner: string;
  url: string;
  label: string;
}

// github.com 前不能是字母数字或点：挡掉 mygithub.com、xgithub.com、api.github.com。
const GITHUB_TOKEN_RE =
  /(?:^|[^\w.])(?<token>(?:https?:\/\/)?(?:www\.)?github\.com\/[^\s"'`<>（）【】「」『』，。；：！？、(){}[\]]+)/gi;

// GitHub 登录名：字母数字与连字符，最长 39。
const OWNER_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
// 仓库名：字母数字、点、连字符、下划线。
const REPO_RE = /^[A-Za-z0-9_.-]+$/;

const PLACEHOLDER_OWNERS = new Set([
  'example', 'example-user', 'exampleuser', 'your-username', 'yourusername',
  'username', 'user', 'yourname', 'your-name', 'myusername',
]);
const PLACEHOLDER_REPOS = new Set([
  'repo', 'repository', 'your-repo', 'your-repository', 'project', 'username', 'owner',
]);

function isPlaceholder(owner: string, repo: string): boolean {
  return PLACEHOLDER_OWNERS.has(owner.toLowerCase())
    || PLACEHOLDER_REPOS.has(repo.toLowerCase())
    || /^x{2,}$/i.test(repo); // xxx / xxxxx 之类的占位仓
}

/** 解析一段 github.com 路径；识别不出返回 null */
function parseGithubPath(rawToken: string): { owner: string; repo: string | null } | null {
  const path = rawToken.replace(/^(?:https?:\/\/)?(?:www\.)?github\.com\//i, '');
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  const owner = segments[0];
  if (!OWNER_RE.test(owner)) return null;

  // 只填了 github.com/<owner>：当主页处理
  if (segments.length === 1) {
    return PLACEHOLDER_OWNERS.has(owner.toLowerCase()) ? null : { owner, repo: null };
  }

  // 多余的路径（tree/main、issues、#锚点、?query）不属于仓库本身，剥掉再校验
  let repo = segments[1].split(/[?#]/)[0]
    .replace(/\.git$/i, '')
    .replace(/[.,;:!?)…]+$/, '');
  if (!repo || !REPO_RE.test(repo)) return null;
  if (isPlaceholder(owner, repo)) return null;
  return { owner, repo };
}

/** 从一段文本里识别所有仓库链接；同一仓（不区分大小写）只留第一次出现的 */
export function extractGithubRepos(text?: string | null): GithubRepoLink[] {
  if (!text) return [];
  const seen = new Set<string>();
  const repos: GithubRepoLink[] = [];
  for (const match of text.matchAll(GITHUB_TOKEN_RE)) {
    const parsed = parseGithubPath(match.groups?.token ?? '');
    if (!parsed?.repo) continue;
    const key = `${parsed.owner}/${parsed.repo}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    repos.push({
      owner: parsed.owner,
      repo: parsed.repo,
      url: `https://github.com/${parsed.owner}/${parsed.repo}`,
      label: `${parsed.owner}/${parsed.repo}`,
      key,
    });
  }
  return repos;
}

/**
 * GitHub 字段值 → 一条可点链接（仓库优先，其次主页）。
 * 空值、「暂无」、乱写的地址都返回 null，调用方按纯文本兜底。
 */
export function githubFieldLink(
  value?: string | null,
): { url: string; label: string } | null {
  if (!value) return null;
  const trimmed = value.trim();
  for (const match of trimmed.matchAll(GITHUB_TOKEN_RE)) {
    const parsed = parseGithubPath(match.groups?.token ?? '');
    if (!parsed) continue;
    if (parsed.repo) {
      return {
        url: `https://github.com/${parsed.owner}/${parsed.repo}`,
        label: `${parsed.owner}/${parsed.repo}`,
      };
    }
    return { url: `https://github.com/${parsed.owner}`, label: parsed.owner };
  }
  return null;
}
