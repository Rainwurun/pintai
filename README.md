# GameDock

一个适合部署到 GitHub Pages 的网页小游戏管理平台。

## 平台信息

- 制作人：吴润
- 平台版本：v1.1.0
- 背景音乐：`Dock Pulse`
- 音乐授权：CC0 / WebAudio original

制作人、版本号和音乐署名都在 `app.js` 的 `PLATFORM` 配置里，改那里即可同步到页面。

## 使用方式

直接打开 `index.html`，或把整个目录部署到 GitHub Pages。

## 添加新游戏

最稳定的方式是把真实游戏写进 `games.json`，然后提交到 GitHub。

添加游戏功能默认不会展示给普通使用者。维护时打开：

```text
http://localhost:8080/?dev=1
```

部署到 GitHub Pages 后也一样，在你的平台网址后面加 `?dev=1` 即可进入开发者模式。退出时点击页面右上角“退出开发者”。

### 步骤

1. 先把小游戏部署到 GitHub Pages。
2. 打开部署后的游戏，确认游玩链接可以访问。
3. 在平台页面点击“添加游戏”，填写名称、分类、链接、封面和标签。
4. 点击“添加到本地”可以先在当前浏览器预览效果。
5. 点击右上角导出按钮，下载新的 `games.json`。
6. 用导出的内容替换仓库里的 `games.json`。
7. 提交并推送到 GitHub，平台刷新后就会正式显示新游戏。

也可以直接手动编辑 `games.json`，在 `games` 数组里追加一项：

```json
{
  "id": "my-game",
  "title": "我的小游戏",
  "description": "一句话介绍玩法。",
  "category": "休闲",
  "tags": ["单人", "计时"],
  "url": "https://yourname.github.io/my-game/",
  "repo": "https://github.com/yourname/my-game",
  "cover": "https://yourname.github.io/my-game/cover.png",
  "featured": true,
  "updatedAt": "2026-06-22"
}
```

页面里的“添加游戏”会先保存到浏览器本地，也可以导出新的 `games.json`，再提交到 GitHub。

### 封面图建议

- 推荐使用 16:9 图片，比如 `cover.png`。
- 可以把封面放在你的游戏仓库里，再填入完整 URL。
- 不填 `cover` 也可以，平台会自动显示默认纹理背景。

## 字段说明

- `id`：唯一标识，建议英文和短横线。
- `title`：游戏名称。
- `description`：游戏简介。
- `category`：分类。
- `tags`：标签数组。
- `url`：GitHub Pages 游玩地址。
- `repo`：源码仓库地址，可留空。
- `cover`：封面图地址，可留空。
- `featured`：是否展示在推荐视图。
- `updatedAt`：更新时间，格式为 `YYYY-MM-DD`。
