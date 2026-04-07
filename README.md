# translate

此仓库用于托管翻译应用的远程资源，配合 jsDelivr 进行分发。

## 目录说明

- `market/providers.json`：接口市场索引（应用内“市场”读取此文件）
- `market/providers/*.js`：可下载的 provider 脚本
- `updates/translate.json`：应用更新信息（版本、下载地址、说明）

## jsDelivr 地址

- 市场索引：
  - `https://cdn.jsdelivr.net/gh/wenxue263/translate@main/market/providers.json`
- 单个 provider（示例）：
  - `https://cdn.jsdelivr.net/gh/wenxue263/translate@main/market/providers/youdao.js`
- 更新信息：
  - `https://cdn.jsdelivr.net/gh/wenxue263/translate@main/updates/translate.json`

## 维护建议

- 修改 `market/providers/*.js` 后，同步更新 `market/providers.json` 中对应条目
- 发布新版本时，更新 `updates/translate.json` 的 `version`、`download`、`content`
- 如需避免 CDN 缓存延迟，可将 `@main` 改为固定 tag/commit

