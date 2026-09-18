# ExportDou Agent Tools

抖评岛（ExportDou，https://exportdou.cn）的官方 CLI 与 Agent Skill。粘贴抖音视频链接，导出评论和回复为 CSV 或 Excel，也可先预览少量评论再分析用户反馈。

## CLI

~~~bash
npx exportdou@1.0.3 login
npx exportdou@1.0.3 export "https://www.douyin.com/video/..." --limit 1000
npx exportdou@1.0.3 status "<task-id>" --json
npx exportdou@1.0.3 resume "<task-id>" --json
npx exportdou@1.0.3 preview "<task-id>" --limit 20 --json
npx exportdou@1.0.3 download "<task-id>" --output comments.csv
~~~

CLI 不会索要抖音 Cookie。它只把用户提供的公开视频链接提交给 ExportDou，立即返回任务 ID，并让任务在云端继续运行。

## Agent Skill

通过 skills.sh 安装：

~~~bash
npx skills add wegoft/exportdou-agent-tools --skill exportdou
~~~

通过 ClawHub 安装：

~~~bash
clawhub install @kenny-shaw/exportdou
~~~

通过 SkillHub.space 安装：

~~~bash
shsc install kennyshawchn/exportdou
~~~

SkillHub.club 完成平台安全审核后，可安装到 Codex：

~~~bash
npx @skill-hub/cli install a8e6eca6/exportdou --agent codex
~~~

腾讯 SkillHub 条目：[抖音评论导出 · 抖评岛](https://skillhub.cn/skills/user_661dc82b/exportdou)。该条目需要在 SkillHub 后台单独更新，推送 GitHub 或发布 ClawHub 不代表它已同步。

2026-09-18 已发布中文版 Skill `1.0.3`：ClawHub、腾讯 SkillHub 下载包和官网 `/SKILL.md` 均已核对为本仓库版本。ClawHub 安全检查通过；腾讯 SkillHub 的安全扫描状态以平台页面为准。CLI 继续使用已发布的 `exportdou@1.0.3`，此次未重复发布 npm 包。

如果 ClawHub 工作流报 `Invalid publish output: 'pending-publication'`，先查看平台版本和审核状态。上游工作流尚未识别这一“等待发布审核”的状态，不能据此判断上传失败。审核通过且内容核对一致后，重跑该工作流复核，不要重复提交或盲目增加版本号。

Skill 的中文名称是「抖音评论导出 · 抖评岛」，安装标识仍为 `exportdou`。正文为中文，Agent 按用户的语言回复。需要抖评岛账号和可用积分，默认 API 为 `https://api.exportdou.cn/v1`。

`skills/exportdou/SKILL.md` 包含完整操作说明；根目录副本和官网 `/SKILL.md` 与它保持一致。原来分散在两个参考文件里的参数和异常处理已合并到正文，单独下载 `SKILL.md` 也能使用。`agents/openai.yaml` 只负责兼容客户端的名称、短简介和示例提问，不替代 SkillHub 后台的展示资料。

## 相关链接

- 官网: https://exportdou.cn
- API 文档: https://exportdou.cn/developers
- Skill 原文: https://exportdou.cn/SKILL.md
- npm: https://www.npmjs.com/package/exportdou
- skills.sh: https://www.skills.sh/wegoft/exportdou-agent-tools/exportdou
- ClawHub: https://clawhub.ai/kenny-shaw/skills/exportdou
- SkillHub.space: https://skillhub.space/skills/kennyshawchn/exportdou
- SkillHub.club: https://www.skillhub.club/skills/a8e6eca6-exportdou
