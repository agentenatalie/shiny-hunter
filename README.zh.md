# shiny-hunter

[![npm version](https://img.shields.io/npm/v/shiny-hunter)](https://www.npmjs.com/package/shiny-hunter)
[![node](https://img.shields.io/node/v/shiny-hunter)](https://nodejs.org)
[![license](https://img.shields.io/github/license/agentenatalie/shiny-hunter)](./LICENSE)
[![zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)]()

[English](./README.md)

Claude Code 的伙伴是根据你的用户 ID 哈希决定的。你没得选。**直到现在。**

```
  ┌──────────────────────────────────┐
  │       ✨  shiny-hunter  ✨        │
  │   find your perfect Claude buddy  │
  └──────────────────────────────────┘
```

就像宝可梦里反复软重启刷闪光御三家一样 -- 只不过这次不用你亲自按键，CPU 替你按。选好梦想中的物种、稀有度、帽子、眼睛和属性，剩下的交给暴力搜索。

## 快速开始

```bash
npx shiny-hunter
```

回答 7 个问题，等一会儿，认识你的新伙伴。就这么简单。

```bash
npx shiny-hunter --restore   # 伙伴被覆盖了？一条命令找回来
npx shiny-hunter --help      # 给谨慎的朋友们准备的
```

想先看完每一行代码再用？尊重：

```bash
git clone https://github.com/agentenatalie/shiny-hunter.git
node shiny-hunter/hunt.mjs
```

搜索完成后，重启 Claude Code，输入 `/buddy` 即可。

## 菜单

| 属性 | 选项 | 备注 |
|------|------|------|
| **Species** | duck, goose, blob, cat, dragon, octopus, owl, penguin, turtle, snail, ghost, axolotl, capybara, cactus, robot, rabbit, mushroom, chonk | 18 种生物。没错，chonk 也是一个物种。 |
| **Rarity** | common, uncommon, rare, epic, legendary | legendary 只有 1%，别说没提醒你。 |
| **Shiny** | yes / no / any | 1% 概率。闪光的才是最顶的。 |
| **Hat** | none, crown, tophat, propeller, halo, wizard, beanie, tinyduck | 一只 duck 戴着 tinyduck 帽子。细品。 |
| **Eyes** | `·` `✦` `×` `◉` `@` `°` | `◉` 能看穿你的灵魂。 |
| **Peak stat** | DEBUGGING, PATIENCE, CHAOS, WISDOM, SNARK | SNARK 拉满才是正确答案。 |
| **Name** | 随便起 | 用你家猫的名字也行，我们不评价。 |

任何问题都可以按 Enter 跳过，交给命运。条件越少，搜索越快。

## 工作原理

Claude Code 的伙伴系统把你的 `userID` 喂进一个确定性伪随机数生成器，掷出物种、稀有度、帽子、眼睛、闪光和属性。同一个 ID，永远同一个伙伴。

本工具做了三件事：
1. 问你想要什么。
2. 疯狂生成随机用户 ID，逐个用相同逻辑检验。
3. 找到匹配的，写入 `~/.claude.json`，顺便存个备份给 `--restore` 用。

这就像挖矿，只不过挖到的不是比特币，而是一只戴巫师帽的卡通幽灵。

## 平台支持

| 平台 | 状态 | 备注 |
|------|------|------|
| macOS | 完整支持 | 自动通过 Keychain 检测 OAuth |
| Linux | 完整支持 | 无需 Keychain |
| Windows | 完整支持 | 无需 Keychain |

## 保留你的伙伴（OAuth 用户）

工具会自动检测你用的是 OAuth 还是 API key。但 OAuth 用户有个小问题：Claude 重启时可能覆盖你的自定义 `userID`。三种解法，选一个：

1. **最省事** -- 被覆盖了就跑一下 `npx shiny-hunter --restore`，1 秒搞定。
2. **一劳永逸 (macOS)** -- 用附带的 `claude-buddy` 启动脚本：
   ```bash
   cp claude-buddy ~/.local/bin/claude-buddy
   chmod 700 ~/.local/bin/claude-buddy
   ```
   以后用 `claude-buddy` 代替 `claude` 启动，它会帮你处理一切。
3. **手动挡** -- 启动 Claude 之前设置环境变量 `CLAUDE_CODE_OAUTH_TOKEN`。

API key 用户：不用操心，你的伙伴永远在。去喝杯茶吧。

## 要多久？

| 你的要求 | 大约次数 | 体感时间 |
|----------|---------|---------|
| 只选物种 | ~18 | 眨个眼就完了 |
| 物种 + legendary | ~1,800 | 还是很快 |
| 物种 + legendary + wizard 帽 | ~14,400 | 几秒钟 |
| 以上全部 + 指定眼睛 | ~86,400 | 去倒杯水 |
| 以上全部 + 闪光 | ~8,640,000 | 出门散个步，回来差不多了 |

取决于 CPU 速度和运气。进度条会陪着你。

## 安全性

这个工具只写一个文件（`~/.claude.json`），可选读一个文件（macOS Keychain）。没了。没有网络，没有依赖，没有惊喜。

- **零依赖** -- 只用 Node.js 内置模块。`node_modules` 永远是空的。
- **无网络请求** -- 连 DNS 都不查。飞行模式友好。
- **31 项安全测试** -- 跑一下 `node security-test.mjs` 眼见为实。
- 完整分析见 [SECURITY.md](./SECURITY.md)。

## 环境要求

- Node.js 18+
- 已安装 Claude Code
- 耐心（可选，但刷闪光 legendary 时强烈建议）

## 参考

- [Claude Code Buddy 机制解析](https://linux.do/t/topic/1871870)
- [Shiny Hunter 讨论帖](https://linux.do/t/topic/1873901/13)

## 许可证

[MIT](./LICENSE) -- 想怎么用就怎么用。
