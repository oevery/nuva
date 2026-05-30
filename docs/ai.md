# AI 增强

本文记录模板内置的 AI 辅助开发能力。当前先提供 skills 管理说明，后续可继续补充 agent、命令、代码生成等方案。

## Skills

如果使用模板推荐的 skills，可在安装依赖后同步：

```bash
pnpx skills experimental_install
```

更新 skills：

```bash
pnpx skills update
```

## 提交约定

- 提交 `skills.json` 和 `skills-lock.json`。
- 不提交 `.agents/`，它是本地安装产物。
- 如需离线模板或强冻结 skills，再考虑提交 `.agents/`。

## template 使用

通过 gigit 单独下载 `template` 后，先安装依赖，再同步 skills：

```bash
pnpm install
pnpm skills:install
```
