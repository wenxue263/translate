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
 * ModernMT 云端翻译 API：固定 api.modernmt.com，MMT-ApiKey 头鉴权。
 */
module.exports = {
  id: "modernmt",
  version: "1.0.0",
  name: "ModernMT",
  description: "需要 MODERNMT_API_KEY",
  requiredEnv: ["MODERNMT_API_KEY"],
  async translate({ text, sourceLang, targetLang }, { signal, env }) {
    assertRequiredString("text", text, "ModernMT");
    assertRequiredString("targetLang", targetLang, "ModernMT");
    assertRequiredEnv(env, ["MODERNMT_API_KEY"], "ModernMT");
    const apiKey = env.MODERNMT_API_KEY;

    const url = "https://api.modernmt.com/translate";
    const body = {
      q: text,
      target: targetLang,
    };
    const normalizedSource = normalizeSourceLang(sourceLang, "auto");
    if (normalizedSource && normalizedSource !== "auto") {
      body.source = normalizedSource;
    }

    const raw = await fetchTextOrThrow(
      url,
      {
        method: "POST",
        headers: {
          "MMT-ApiKey": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal,
      },
      "ModernMT"
    );
    const data = parseJsonTextSafe(raw);
    if (!data) {
      throw new Error(`ModernMT 响应非 JSON: ${truncateDetail(raw, 220)}`);
    }
    const translated =
      data?.data?.translation ||
      data?.translation ||
      data?.translatedText;
    return assertTranslatedText(translated, "ModernMT", data);
  },
};
