# shiny-hunter ✨

帮你找到心仪的 Claude Code 宠物，一行命令搞定。

```
╔════════════════════════════════╗
║     ✨  shiny-hunter  ✨       ║
║  find your perfect Claude buddy ║
╚════════════════════════════════╝
```

## 使用方法

克隆后运行：

```bash
git clone https://github.com/agentenatalie/shiny-hunter
node shiny-hunter/hunt.mjs
```

## 它会问你什么

七个问题，每个都可以按 Enter 跳过（随机）：

1. **物种** — duck / rabbit / dragon / axolotl 等 18 种
2. **稀有度** — common / uncommon / rare / epic / legendary
3. **闪光** — 是 / 否 / 无所谓
4. **帽子** — none / crown / tophat / wizard 等
5. **眼睛** — · ✦ × ◉ @ °
6. **最强天赋** — DEBUGGING / PATIENCE / CHAOS / WISDOM / SNARK
7. **名字** — 给你的宠物起个名字（可跳过）

回答完后开始搜索，找到后预览，确认即写入。

## 原理

Claude Code 的宠物系统根据 `~/.claude.json` 里的 `userID` 字段哈希出宠物属性。本工具暴力搜索一个能哈希出你想要属性的 `userID`，然后写入配置文件。

重启 Claude，输入 `/buddy` 即可见到新宠物。

**macOS 注意：** 用 OAuth 登录时，Claude 会写入 `accountUuid` 覆盖 `userID`。工具会自动处理，但建议用附带的 `claude-buddy` 脚本启动 Claude，避免每次重置。

## claude-buddy 启动脚本（macOS）

保持 `accountUuid` 永远不回来：

```bash
cp claude-buddy ~/.local/bin/claude-buddy
chmod 700 ~/.local/bin/claude-buddy
```

之后用 `claude-buddy` 代替 `claude` 启动即可。

## 搜索难度参考

| 条件组合 | 大概要试多少次 |
|---------|-------------|
| 只选物种 | ~18 次 |
| 物种 + 稀有度(legendary) | ~1,800 次 |
| 物种 + legendary + 闪光 | ~180,000 次 |
| 物种 + legendary + 闪光 + 指定帽子 + 指定眼睛 | ~800 万次，需要几分钟 |

## 安全性

运行 `node security-test.mjs` 可自行验证，28 项测试全部通过。

详见 [SECURITY.md](./SECURITY.md)。

## 环境要求

- Node.js 18+
- Claude Code
- macOS（OAuth 绕过方案专用；Linux 用户通常不需要）
