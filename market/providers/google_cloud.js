const {
  assertRequiredEnv,
  assertRequiredString,
  assertTranslatedText,
  fetchTextOrThrow,
  normalizeSourceLang,
  parseJsonTextSafe,
  truncateDetail,
} = require("./tools_shared");

/**
 * Google Cloud Translation API v2（REST + API Key 查询参数）。
 * 与 google.js 的免费 gtx 端点不同，属计费/配额管理的官方接口。
 */
module.exports = {
  id: "google-cloud",
  version: "1.0.0",
  name: "Google Cloud Translation",
  description: "需要 GOOGLE_CLOUD_API_KEY（v2 REST）",
  requiredEnv: ["GOOGLE_CLOUD_API_KEY"],
  async translate({ text, sourceLang, targetLang }, { signal, env }) {
    assertRequiredString("text", text, "Google Cloud");
    assertRequiredString("targetLang", targetLang, "Google Cloud");
    assertRequiredEnv(env, ["GOOGLE_CLOUD_API_KEY"], "Google Cloud");
    const apiKey = env.GOOGLE_CLOUD_API_KEY;

    const params = new URLSearchParams({
      q: text,
      target: targetLang,
      format: "text",
      key: apiKey,
    });
    const normalizedSource = normalizeSourceLang(sourceLang, "auto");
    if (normalizedSource && normalizedSource !== "auto") {
      params.set("source", normalizedSource);
    }
    const url = `https://translation.googleapis.com/language/translate/v2?${params.toString()}`;
    const raw = await fetchTextOrThrow(url, { method: "GET", signal }, "Google Cloud");
    const data = parseJsonTextSafe(raw);
    if (!data) {
      throw new Error(`Google Cloud 响应非 JSON: ${truncateDetail(raw, 220)}`);
    }
    const translated = data?.data?.translations?.[0]?.translatedText;
    return assertTranslatedText(translated, "Google Cloud", data);
  },
};
