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
 * DeepLX 类自建代理：向用户提供的 DEEPLX_URL 发送 JSON，兼容多种路径与响应字段。
 * 不同部署可能使用 /translate 或 /api/translate，故顺序尝试并聚合错误信息。
 */
module.exports = {
  id: "deeplx",
  version: "1.0.0",
  name: "DeepLX (proxy/serverless)",
  description:
    "免 key（需自建实例）。设置 DEEPLX_URL；部署说明见仓库 providers/DEEPLX.md 或 https://github.com/OwO-Network/DeepLX",
  hidden: true,
  requiredEnv: ["DEEPLX_URL"],
  async translate({ text, sourceLang, targetLang }, { signal, env }) {
    assertRequiredString("text", text, "DeepLX");
    assertRequiredString("targetLang", targetLang, "DeepLX");
    assertRequiredEnv(env, ["DEEPLX_URL"], "DeepLX");
    const base = env.DEEPLX_URL.replace(/\/+$/, "");
    const candidates = [`${base}/translate`, `${base}/api/translate`];

    const payload = {
      text,
      source_lang: normalizeSourceLang(sourceLang, "auto"),
      target_lang: targetLang,
    };

    const errors = [];
    for (const url of candidates) {
      try {
        const raw = await fetchTextOrThrow(
          url,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal,
          },
          "DeepLX"
        );
        const data = parseJsonTextSafe(raw);
        if (!data) {
          throw new Error(`响应非 JSON: ${truncateDetail(raw, 200)}`);
        }
        const translated = data?.data || data?.translation || data?.text;
        return assertTranslatedText(translated, "DeepLX", data);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${url}: ${truncateDetail(msg, 220)}`);
      }
    }
    throw new Error(`DeepLX 不可用: ${errors.join("; ")}`);
  },
};
