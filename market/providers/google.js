const {
  assertRequiredString,
  buildUrl,
  fetchAnyJsonOrThrow,
  normalizeSourceLang,
} = require("./tools_shared");

/**
 * Google 免费网页翻译接口（translate_a/single + client=gtx），无需密钥。
 * 非官方 Cloud Translation API；可能受地区或限流影响。
 *
 * 注意：当前实现为 GET，全文放在 URL 查询参数 q 中；单块过长会导致 HTTP 400。
 * maxChars 必须保守（约 800），分段翻译由主进程 smartSplit 按段落/句子切开。
 */
module.exports = {
  id: "google",
  version: "1.0.0",
  name: "Google (免密钥)",
  description: "无需密钥，适合快速使用",
  maxChars: 800,
  async translate({ text, sourceLang, targetLang }, { signal }) {
    assertRequiredString("text", text, "Google");
    assertRequiredString("targetLang", targetLang, "Google");
    const sl = normalizeSourceLang(sourceLang, "auto");
    const tl = targetLang;
    const url = buildUrl("https://translate.googleapis.com/translate_a/single", {
      client: "gtx",
      dt: "t",
      sl,
      tl,
      q: text,
    });

    const data = await fetchAnyJsonOrThrow(url, { method: "GET", signal }, "Google");
    if (!Array.isArray(data) || !Array.isArray(data[0])) {
      throw new Error("Google 响应结构异常");
    }

    return data[0].map((item) => item[0]).join("");
  },
};
