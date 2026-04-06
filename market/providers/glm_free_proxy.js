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
 * 实验性：对接第三方「GLM 免费代理」部署（OpenAI 兼容 /v1/chat/completions）。
 * hidden：默认不展示；需自行评估合规与稳定性。Token/模型可通过可选环境变量覆盖。
 */
module.exports = {
  id: "glm-free-proxy",
  version: "1.0.0",
  name: "GLM Free Proxy (experimental)",
  description:
    "实验接口：需配置代理地址，通常还需要 refresh_token/token。稳定性/合规性风险较高",
  hidden: true,
  requiredEnv: ["GLM_FREE_PROXY_URL"],
  optionalEnv: ["GLM_FREE_PROXY_TOKEN", "GLM_FREE_PROXY_MODEL"],
  async translate({ text, sourceLang, targetLang }, { signal, env }) {
    assertRequiredString("text", text, "GLM Free Proxy");
    assertRequiredString("targetLang", targetLang, "GLM Free Proxy");
    assertRequiredEnv(env, ["GLM_FREE_PROXY_URL"], "GLM Free Proxy");
    const baseUrl = env.GLM_FREE_PROXY_URL.replace(/\/+$/, "");

    const model = env.GLM_FREE_PROXY_MODEL || "glm-4-flash";
    const endpoint = `${baseUrl}/v1/chat/completions`;
    const token = env.GLM_FREE_PROXY_TOKEN;

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
      "GLM Free Proxy"
    );

    const data = parseJsonTextSafe(raw);
    if (!data) {
      throw new Error(`GLM Free Proxy 响应非 JSON: ${truncateDetail(raw, 220)}`);
    }
    const translated = data?.choices?.[0]?.message?.content?.trim();
    return assertTranslatedText(translated, "GLM Free Proxy", data);
  },
};
