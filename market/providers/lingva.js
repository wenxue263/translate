const {
  assertRequiredString,
  normalizeSourceLang,
  fetchJsonOrThrow,
} = require("./tools_shared");

/**
 * Lingva 开源翻译前端（可对接 Google），使用公开实例或自建。
 * 通过 LINGVA_URL 可切换实例根地址；请求走 REST GET，无密钥要求。
 */
module.exports = {
  id: "lingva",
  version: "1.0.0",
  name: "Lingva Translate (免密钥)",
  description:
    "免密钥（公开实例/自建）。可通过 LINGVA_URL 指定实例地址（如 https://lingva.ml）",
  optionalEnv: ["LINGVA_URL"],
  async translate({ text, sourceLang, targetLang }, { signal, env }) {
    assertRequiredString("text", text, "Lingva");
    assertRequiredString("targetLang", targetLang, "Lingva");
    const baseUrl = (env.LINGVA_URL || "https://lingva.ml").replace(/\/+$/, "");
    const sl = normalizeSourceLang(sourceLang, "auto");
    const tl = targetLang;

    const url = `${baseUrl}/api/v1/${encodeURIComponent(sl)}/${encodeURIComponent(
      tl
    )}/${encodeURIComponent(text)}`;
    const data = await fetchJsonOrThrow(url, { method: "GET", signal }, "Lingva");
    if (data?.error) {
      throw new Error(`Lingva error: ${data.error}`);
    }
    if (!data?.translation) {
      throw new Error("Lingva 响应结构异常");
    }
    return data.translation;
  },
};
