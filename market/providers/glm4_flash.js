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
 * 智谱开放平台 GLM-4：固定官方 chat/completions 端点（与文档一致）。
 */
module.exports = {
  id: "glm-4-flash",
  version: "1.0.0",
  name: "GLM-4 Flash",
  description: "需要 BIGMODEL_API_KEY（可选 BIGMODEL_MODEL）https://open.bigmodel.cn/dev/api",
  requiredEnv: ["BIGMODEL_API_KEY"],
  optionalEnv: ["BIGMODEL_MODEL"],
  async translate({ text, sourceLang, targetLang }, { signal, env }) {
    assertRequiredString("text", text, "GLM");
    assertRequiredString("targetLang", targetLang, "GLM");
    assertRequiredEnv(env, ["BIGMODEL_API_KEY"], "GLM");
    const apiKey = env.BIGMODEL_API_KEY;

    const endpoint = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
    const model = env.BIGMODEL_MODEL || "glm-4-flash";

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

    const raw = await fetchTextOrThrow(
      endpoint,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal,
      },
      "GLM"
    );

    const data = parseJsonTextSafe(raw);
    if (!data) {
      throw new Error(`GLM 响应非 JSON: ${truncateDetail(raw, 220)}`);
    }
    const translated = data?.choices?.[0]?.message?.content?.trim();
    return assertTranslatedText(translated, "GLM", data);
  },
};
