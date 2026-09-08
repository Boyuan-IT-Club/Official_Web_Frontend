# Agent Skills（前端）

第三方技能的本地安装，供 Claude Code 等 agent 在本仓库工作时使用。
**升级方式是从上游重新拷贝**，不要在本目录直接改内容——改动会在下次升级时丢失。

| 技能 | 用途 | 来源（安装时 commit） |
|---|---|---|
| frontend-design | 新页面/改版时的视觉设计方法论 | anthropics/skills @41bbe19 |
| improve-ui | 觉得页面丑但说不出哪丑时的整改流程 | ibelick/ui-skills @f5dd1de |
| fixing-accessibility | 可访问性排查与修复 | ibelick/ui-skills @f5dd1de |
| refactoring-ui | 《Refactoring UI》的间距/字号/颜色/阴影具体规则（与 src/styles/_tokens.scss 的刻度思路同源） | s0xDk/refactoring-ui-skill @4887214 |
| web-quality-audit | Lighthouse 维度的整站体检（入口，会按需调下面两个） | addyosmani/web-quality-skills @afa8da9 |
| core-web-vitals | LCP/CLS/INP 指标优化 | 同上 |
| performance | 加载性能优化 | 同上 |

各技能目录内保留了上游 LICENSE。
