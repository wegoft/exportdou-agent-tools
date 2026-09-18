# 国内 Agent 分发记录

核对日期：2026-09-18。

## Qoder 投稿回执

- [我的发布](https://qoder.cn/account/apphub-publications)，发布账号 `xiaokunonly`。
- 显示名：**抖音评论导出 · 抖评岛**；署名：Kenny Shaw；分类：市场营销。
- 安装标识保持 `exportdou`。
- 上传 `dist/releases/exportdou-skill-1.0.3.zip`，包含 canonical `SKILL.md` 和 `agents/openai.yaml`。
- ZIP SHA-256：`9bf4bf8136fbf3151df611901fbc792dd0ca3d05c537c17d7319fa0ddb1dd75d`。
- 图标使用官网现有 `icon-512.png`；联系方式使用本仓库公开 GitHub 地址。
- 主要适配端：Qoder APP、Qoder IDE、Qoder CLI。未勾选 QoderWake 和 Cloud Agent；平台提示其他端仍可能展示该扩展。
- 提交后的后台状态：**待审核 / 未上架**。不能把投稿成功当作审核通过或目标客户端实际导出验证。

实际提交的描述：

> 粘贴抖音视频链接，导出公开评论和楼中楼回复，保存为 CSV 或 Excel。也可先看少量评论，分析用户反馈、产品问题和选题。中断后可继续原任务。需要 Node.js、抖评岛（ExportDou）账号和可用积分；回复和 Excel 功能以账号套餐权限为准。

此次复用已发布的 `1.0.3` 安装包，没有修改 CLI 或 Skill 执行逻辑。以后更新现有条目，避免重复创建。

## MiniMax Agent：公开搜索已验证

已上传 canonical `skills/exportdou/SKILL.md`，并点击「发布到社区」。在[技能市场](https://agent.minimaxi.com/skills)的公共搜索框搜索 `exportdou`，可看到发布者「肖坤」的条目和完整中文简介。标题沿用 `exportdou`，尚未改为自定义中文标题。上传的 Skill 固定 CLI `exportdou@1.0.3`，没有更换 API 或认证方式。

这确认了市场公开展示；尚未在 MiniMax 云端执行需要用户授权的实际导出。

## 其他渠道与使用条件

扣子已建立[抖音评论技能项目](https://code.coze.cn/p/7686759073458520099)，从官网标准 `SKILL.md` 导入；构建版本 `30967af0ff`，平台打包面板显示「打包成功」。「我的技能」已显示该条目，标记「我创建的 / v1.1 / 扣子」并有中文简介；平台 v1.1 不改变 CLI 1.0.3。

与视频说一起准备了同账号的上架资质申请草稿，已填写技能说明并附安装包和公开作品证明，还缺联系手机号、虾评发布经历，尚未提交。当前未公开上架，未完成真实导出验收。生成的用途介绍预览不作为实际使用案例。后续继续处理该项目，避免重复创建。

完整官方入口和限制见[国内渠道核对表](https://github.com/xwchris/videosays-agent-tools/blob/main/docs/china-agent-channels.md)。MiniMax 有用户投稿入口；扣子需要验证云端执行并满足上架资质和案例要求。豆包工作、TRAE 的个人导入不等于公开市场上架；千问办公当前不开放个人公共投稿，千问 App 的 Skill 接入仍标为即将开放。

支持 GitHub Skill 安装的客户端可使用：

```bash
npx skills add wegoft/exportdou-agent-tools --skill exportdou
```

标准 ZIP 保持根目录 `SKILL.md`，需要时带上 `agents/openai.yaml`。不要把平台后台填的中文简介误当作一个会被所有客户端自动读取的配置文件。

接入新客户端时验证 Node.js/npx、网页授权、余额、少量评论任务、沿用任务 ID 查询及下载 CSV。回复和 Excel 需要验证对应套餐权限。云端环境需单独确认授权和凭证保存；不能把 API Key 放进上传包或公开案例。未执行这些步骤时，只能标记“包已导入”或“已投稿”。
