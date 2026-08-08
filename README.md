# ExportDou Agent Tools

ExportDou（https://exportdou.cn）的官方 CLI 与 Agent Skill，用于稳定、可恢复地导出公开抖音视频评论。

## CLI

~~~bash
npx exportdou login
npx exportdou export "https://www.douyin.com/video/..." --limit 1000
npx exportdou status "<task-id>" --json
npx exportdou preview "<task-id>" --limit 20 --json
npx exportdou download "<task-id>" --output comments.csv
~~~

CLI 不会索要抖音 Cookie。它只把用户提供的公开视频链接提交给 ExportDou，立即返回任务 ID，并让任务在云端继续运行。

## Agent Skill

通过 skills.sh 安装：

~~~bash
npx skills add wegoft/exportdou-agent-tools --skill exportdou
~~~

通过 ClawHub 安装：

~~~bash
clawhub install exportdou
~~~

通过 SkillHub.space 安装：

~~~bash
shsc install kennyshawchn/exportdou
~~~

SkillHub.club 完成平台安全审核后，可安装到 Codex：

~~~bash
npx @skill-hub/cli install a8e6eca6/exportdou --agent codex
~~~

该 Skill 会指导兼容的 Agent：每个导出任务只提交一次、保存任务 ID、按建议间隔查询状态、只读取少量 JSON 评论用于分析，并在需要时下载完整 CSV/XLSX 文件。

## 相关链接

- 官网: https://exportdou.cn
- API 文档: https://exportdou.cn/developers
- Skill 原文: https://exportdou.cn/SKILL.md
- npm: https://www.npmjs.com/package/exportdou
- skills.sh: https://www.skills.sh/wegoft/exportdou-agent-tools/exportdou
- ClawHub: https://clawhub.ai/kenny-shaw/skills/exportdou
- SkillHub.space: https://skillhub.space/skills/kennyshawchn/exportdou
- SkillHub.club: https://www.skillhub.club/skills/a8e6eca6-exportdou
