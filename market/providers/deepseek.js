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
 * DeepSeek 官方 Chat Completions（固定 https://api.deepseek.com/chat/completions）。
 * 用 system 提示词约束「只输出译文」。非专用翻译 API，注意 token 与计费。
 */
module.exports = {
  id: "deepseek",
  version: "1.0.0",
  name: "DeepSeek",
  description: "官方 Chat Completions：https://api.deepseek.com （需 DEEPSEEK_API_KEY，可选 DEEPSEEK_MODEL）",
  requiredEnv: ["DEEPSEEK_API_KEY"],
  optionalEnv: ["DEEPSEEK_MODEL"],
  async translate({ text, sourceLang, targetLang }, { signal, env }) {
    assertRequiredString("text", text, "DeepSeek");
    assertRequiredString("targetLang", targetLang, "DeepSeek");
    assertRequiredEnv(env, ["DEEPSEEK_API_KEY"], "DeepSeek");
    const apiKey = env.DEEPSEEK_API_KEY;

    const baseUrl = "https://api.deepseek.com";
    const model = env.DEEPSEEK_MODEL || "deepseek-chat";
    const endpoint = `${baseUrl}/chat/completions`;

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
      "DeepSeek"
    );

    const data = parseJsonTextSafe(raw);
    if (!data) {
      throw new Error(`DeepSeek 响应非 JSON: ${truncateDetail(raw, 220)}`);
    }
    const translated = data?.choices?.[0]?.message?.content?.trim();
    return assertTranslatedText(translated, "DeepSeek", data);
  },
};
