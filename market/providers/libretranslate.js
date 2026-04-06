const {
  assertRequiredString,
  buildUrl,
  fetchAnyJsonOrThrow,
  fetchJsonOrThrow,
  normalizeSourceLang,
} = require("./tools_shared");

/**
 * LibreTranslate 自托管或公共实例翻译（POST /translate）。
 * 主路径失败时回退到 Google translate_a/single，提高可用性。
 */
module.exports = {
  id: "libretranslate",
  version: "1.0.0",
  name: "LibreTranslate (免密钥)",
  description:
    "免密钥（可用公共实例或自建）。可通过 LIBRETRANSLATE_URL 指定服务地址",
  optionalEnv: ["LIBRETRANSLATE_URL"],
  async translate({ text, sourceLang, targetLang }, { signal, env }) {
    assertRequiredString("text", text, "LibreTranslate");
    assertRequiredString("targetLang", targetLang, "LibreTranslate");
    const baseUrl = (env.LIBRETRANSLATE_URL || "https://libretranslate.de").replace(
      /\/+$/,
      ""
    );
    const from = normalizeSourceLang(sourceLang, "auto");
    const to = targetLang === "zh-TW" ? "zh" : targetLang;

    try {
      const data = await fetchJsonOrThrow(
        `${baseUrl}/translate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            q: text,
            source: from,
            target: to,
            format: "text",
          }),
          signal,
        },
        "LibreTranslate"
      );
      const translated = data?.translatedText;
      if (!translated) {
        throw new Error("LibreTranslate 响应结构异常");
      }
      return translated;
    } catch {
      // 主实例不可用时使用 Google 公共端点作为后备
      const url = buildUrl("https://translate.googleapis.com/translate_a/single", {
        client: "gtx",
        dt: "t",
        sl: from,
        tl: to,
        q: text,
      });
      const data = await fetchAnyJsonOrThrow(
        url,
        { method: "GET", signal },
        "LibreTranslate 不可用且 Google"
      );
      if (!Array.isArray(data) || !Array.isArray(data[0])) {
        throw new Error("LibreTranslate 不可用且 Google 响应结构异常");
      }
      return data[0].map((item) => item[0]).join("");
    }
  },
};
