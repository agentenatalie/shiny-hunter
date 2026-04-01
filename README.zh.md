# shiny-hunter

[![npm version](https://img.shields.io/npm/v/shiny-hunter)](https://www.npmjs.com/package/shiny-hunter)
[![node](https://img.shields.io/node/v/shiny-hunter)](https://nodejs.org)
[![license](https://img.shields.io/github/license/agentenatalie/shiny-hunter)](./LICENSE)
[![zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)]()

[English](./README.md)

找到你心仪的 Claude Code 伙伴。

> Claude Code 会根据用户 ID 的哈希值，为每位用户随机生成一个伙伴生物。物种、稀有度、帽子、眼睛和属性值都由此哈希决定。**shiny-hunter** 通过暴力搜索，找到一个能生成你理想伙伴的用户 ID，并将其写入 `~/.claude.json`。

## 快速开始

npx shiny-hunter
npx shiny-hunter --restore   # 重新应用已保存的伙伴
npx shiny-hunter --help

或者克隆后直接运行：

git clone https://github.com/agentenatalie/shiny-hunter.git
node shiny-hunter/hunt.mjs

搜索完成后，重启 Claude Code 并输入 /buddy 即可见到你的伙伴。

## 可选属性

| 属性 | 选项 |
|------|------|
| **Species** (18 种) | duck, goose, blob, cat, dragon, octopus, owl, penguin, turtle, snail, ghost, axolotl, capybara, cactus, robot, rabbit, mushroom, chonk |
| **Rarity** | common (60%), uncommon (25%), rare (10%), epic (4%), legendary (1%) |
| **Shiny** | yes / no / any (每次投掷 1% 概率) |
| **Hat** | none, crown, tophat, propeller, halo, wizard, beanie, tinyduck |
| **Eyes** | · ✦ × ◉ @ ° |
| **Peak stat** | DEBUGGING, PATIENCE, CHAOS, WISDOM, SNARK |
| **Name** | 自由输入 (与生成的候选名称进行匹配) |

你可以锁定任意数量的属性，也可以全部留空。限制条件越少，搜索越快。

## 工作原理

Claude Code 通过以 userID 为种子的伪随机数生成器来决定伙伴属性。本工具的流程如下：

1. 询问你想要的属性 (species, rarity, shiny, hat, eyes, peak stat, name)。
2. 随机生成用户 ID，逐一通过相同的推导逻辑进行检验。
3. 找到匹配后停止搜索，将该 ID 写入 ~/.claude.json，并保存结果以便日后恢复。

## 平台支持

| 平台 | 状态 | 备注 |
|------|------|------|
| macOS | 完整支持 | 包含 Keychain OAuth 令牌检测 |
| Linux | 完整支持 | 无需 Keychain |
| Windows | 完整支持 | 无需 Keychain |

## 保留你的伙伴 (OAuth 用户)

本工具会自动检测你使用的是 OAuth 还是 API key。

如果 Claude Code 在下次启动时覆盖了你的伙伴：

1. 快速修复 -- 运行 npx shiny-hunter --restore 重新注入已保存的伙伴。
2. 永久修复 (macOS) -- 使用附带的 claude-buddy 包装脚本，它会从 Keychain 提取 OAuth 令牌并通过环境变量传递，从而阻止 Claude 覆盖 userID：
   cp claude-buddy ~/.local/bin/claude-buddy
   chmod 700 ~/.local/bin/claude-buddy
   之后用 claude-buddy 代替 claude 启动即可。
3. 手动方式 -- 在启动 Claude 之前，在 shell 环境中设置 CLAUDE_CODE_OAUTH_TOKEN。

## 搜索难度参考

| 锁定条件 | 大约尝试次数 | 预计耗时 |
|----------|-------------|---------|
| 仅选 species | ~18 | 瞬间完成 |
| Species + rarity | ~45 (common) 到 ~1,800 (legendary) | 不到 1 秒 |
| Species + rarity + hat | ~360 (common) 到 ~14,400 (legendary) | 数秒 |
| Species + rarity + hat + eyes | ~2,160 到 ~86,400 | 数秒到数分钟 |
| 以上全部 + shiny | ~216,000 到 ~8,640,000 | 数分钟到数小时 |

以上为粗略预估，实际耗时取决于 CPU 性能和运气。

## 安全性

- 零依赖 -- 仅使用 Node.js 内置模块
- 无网络请求 -- 一切在本地运行
- 31 项自动化安全测试 -- 运行 node security-test.mjs 自行验证
- 详见 SECURITY.md 了解完整安全声明

## 环境要求

- Node.js 18+
- 已安装 Claude Code

## 许可证

MIT
