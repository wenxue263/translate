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
 * SYSTRAN Translate API：Authorization: Key <apikey>，JSON 体含 source/target/input。
 * 响应字段因版本可能为 outputs、translations 或 translatedText，故做多路径读取。
 */
module.exports = {
  id: "systran",
  version: "1.0.0",
  name: "SYSTRAN Translate API",
  description: "需要 SYSTRAN_API_KEY",
  requiredEnv: ["SYSTRAN_API_KEY"],
  async translate({ text, sourceLang, targetLang }, { signal, env }) {
    assertRequiredString("text", text, "SYSTRAN");
    assertRequiredString("targetLang", targetLang, "SYSTRAN");
    assertRequiredEnv(env, ["SYSTRAN_API_KEY"], "SYSTRAN");
    const apiKey = env.SYSTRAN_API_KEY;

    const url = "https://api-translate.systran.net/translation/text/translate";
    const body = {
      source: normalizeSourceLang(sourceLang, "auto"),
      target: targetLang,
      input: text,
    };

    const raw = await fetchTextOrThrow(
      url,
      {
        method: "POST",
        headers: {
          Authorization: `Key ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal,
      },
      "SYSTRAN"
    );
    const data = parseJsonTextSafe(raw);
    if (!data) {
      throw new Error(`SYSTRAN 响应非 JSON: ${truncateDetail(raw, 220)}`);
    }
    const translated =
      data?.outputs?.[0]?.output ||
      data?.translations?.[0]?.text ||
      data?.translatedText;
    return assertTranslatedText(translated, "SYSTRAN", data);
  },
};
