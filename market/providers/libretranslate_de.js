const {
  assertRequiredString,
  fetchJsonOrThrow,
  normalizeSourceLang,
  truncateDetail,
} = require("./tools_shared");

/**
 * 固定使用德国公共实例 https://libretranslate.de（与可改地址的 libretranslate.js 区分）。
 * 若站点启用限流可配置 LIBRETRANSLATE_DE_API_KEY；无内置 Google 回退，依赖 fallbackProviders。
 */
const BASE = "https://libretranslate.de";

module.exports = {
  id: "libretranslate-de",
  version: "1.0.0",
  name: "LibreTranslate.de",
  description:
    "固定 libretranslate.de；若站点要求密钥可设置 LIBRETRANSLATE_DE_API_KEY（与可改地址的 libretranslate 不同，本项无内置 Google 回退）",
  hidden: true,
  optionalEnv: ["LIBRETRANSLATE_DE_API_KEY"],
  fallbackProviders: ["edge"],
  async translate({ text, sourceLang, targetLang }, { signal, env }) {
    assertRequiredString("text", text, "LibreTranslate.de");
    assertRequiredString("targetLang", targetLang, "LibreTranslate.de");
    const from = normalizeSourceLang(sourceLang, "auto");
    const to = targetLang === "zh-TW" ? "zh" : targetLang;
    const apiKey = env.LIBRETRANSLATE_DE_API_KEY?.trim();

    const body = {
      q: text,
      source: from,
      target: to,
      format: "text",
    };
    if (apiKey) {
      body.api_key = apiKey;
    }

    const data = await fetchJsonOrThrow(
      `${BASE}/translate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      },
      "LibreTranslate.de"
    );
    const translated = data?.translatedText;
    if (!translated) {
      throw new Error(`LibreTranslate.de 响应结构异常${truncateDetail(JSON.stringify(data)) ? `: ${truncateDetail(JSON.stringify(data))}` : ""}`);
    }
    return translated;
  },
};
