const {
  assertRequiredEnv,
  assertRequiredString,
  assertTranslatedText,
  buildPlainTranslationPrompt,
  fetchTextOrThrow,
  normalizeSourceLang,
  parseJsonTextSafe,
  truncateDetail,
} = require("./tools_shared");

/**
 * 实验性：对接第三方 DeepSeek 兼容代理（/v1/chat/completions），与 deepseek.js 官方直连接口分离。
 * hidden；需自建或可信代理地址，并自行承担账号与合规风险。
 */
module.exports = {
  id: "deepseek-free-proxy",
  version: "1.0.0",
  name: "DeepSeek Free Proxy (experimental)",
  description:
    "实验接口：需配置代理地址，通常还需要用户 token。稳定性/合规性风险较高",
  hidden: true,
  requiredEnv: ["DEEPSEEK_FREE_PROXY_URL"],
  optionalEnv: ["DEEPSEEK_FREE_PROXY_TOKEN", "DEEPSEEK_FREE_PROXY_MODEL"],
  async translate({ text, sourceLang, targetLang }, { signal, env }) {
    assertRequiredString("text", text, "DeepSeek Free Proxy");
    assertRequiredString("targetLang", targetLang, "DeepSeek Free Proxy");
    assertRequiredEnv(env, ["DEEPSEEK_FREE_PROXY_URL"], "DeepSeek Free Proxy");
    const baseUrl = env.DEEPSEEK_FREE_PROXY_URL.replace(/\/+$/, "");

    const model = env.DEEPSEEK_FREE_PROXY_MODEL || "deepseek-chat";
    const endpoint = `${baseUrl}/v1/chat/completions`;
    const token = env.DEEPSEEK_FREE_PROXY_TOKEN;

    const prompt = buildPlainTranslationPrompt(
      normalizeSourceLang(sourceLang, "auto"),
      targetLang
    );
    const payload = {
      model,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: text },
      ],
      temperature: 0.2,
    };

    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const raw = await fetchTextOrThrow(
      endpoint,
      {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal,
      },
      "DeepSeek Free Proxy"
    );

    const data = parseJsonTextSafe(raw);
    if (!data) {
      throw new Error(`DeepSeek Free Proxy 响应非 JSON: ${truncateDetail(raw, 220)}`);
    }
    const translated = data?.choices?.[0]?.message?.content?.trim();
    return assertTranslatedText(translated, "DeepSeek Free Proxy", data);
  },
};
