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
 * Naver Papago 官方 N2MT：固定 openapi.naver.com，表单 POST。
 */
module.exports = {
  id: "papago",
  version: "1.0.0",
  name: "Naver Papago (official)",
  description: "需要 PAPAGO_CLIENT_ID / PAPAGO_CLIENT_SECRET",
  requiredEnv: ["PAPAGO_CLIENT_ID", "PAPAGO_CLIENT_SECRET"],
  async translate({ text, sourceLang, targetLang }, { signal, env }) {
    assertRequiredString("text", text, "Papago");
    assertRequiredString("targetLang", targetLang, "Papago");
    assertRequiredEnv(env, ["PAPAGO_CLIENT_ID", "PAPAGO_CLIENT_SECRET"], "Papago");
    const clientId = env.PAPAGO_CLIENT_ID;
    const clientSecret = env.PAPAGO_CLIENT_SECRET;

    const url = "https://openapi.naver.com/v1/papago/n2mt";
    const params = new URLSearchParams({
      source: normalizeSourceLang(sourceLang, "auto"),
      target: targetLang,
      text,
    });

    const raw = await fetchTextOrThrow(
      url,
      {
        method: "POST",
        headers: {
          "X-Naver-Client-Id": clientId,
          "X-Naver-Client-Secret": clientSecret,
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        body: params.toString(),
        signal,
      },
      "Papago"
    );
    const data = parseJsonTextSafe(raw);
    if (!data) {
      throw new Error(`Papago 响应非 JSON: ${truncateDetail(raw, 200)}`);
    }
    const translated = data?.message?.result?.translatedText;
    return assertTranslatedText(translated, "Papago", data);
  },
};
