const {
  assertRequiredString,
  buildUrl,
  fetchAnyJsonOrThrow,
  normalizeSourceLang,
} = require("./tools_shared");

/**
 * 备用 Google 端点（clients5 + client=dict-chrome-ex），响应形状与 gtx 不同需单独解析。
 * 可能返回 403，适合作为并发候选中的次要路径。
 */
module.exports = {
  id: "google-clients5",
  version: "1.0.0",
  name: "Google (免密钥)",
  description: "免 key（备用 Google 端点，可能偶发 403）",
  async translate({ text, sourceLang, targetLang }, { signal }) {
    assertRequiredString("text", text, "clients5");
    assertRequiredString("targetLang", targetLang, "clients5");
    const sl = normalizeSourceLang(sourceLang, "auto");
    const tl = targetLang === "zh" ? "zh-CN" : targetLang;
    const url = buildUrl("https://clients5.google.com/translate_a/t", {
      client: "dict-chrome-ex",
      sl,
      tl,
      q: text,
    });
    const data = await fetchAnyJsonOrThrow(
      url,
      { method: "GET", signal },
      "clients5"
    );
    const translated =
      (Array.isArray(data) && typeof data[0] === "string" && data[0]) ||
      (Array.isArray(data) && Array.isArray(data[0]) && data[0][0]) ||
      undefined;
    if (!translated || typeof translated !== "string") {
      throw new Error("clients5 响应结构异常");
    }
    return translated;
  },
};
