const {
  assertRequiredEnv,
  assertRequiredString,
  assertTranslatedText,
  fetchJsonOrThrow,
  fetchTextOrThrow,
  normalizeSourceLang,
  parseJsonTextSafe,
  truncateDetail,
} = require("./tools_shared");

/**
 * IBM Watson Language Translator：先用 API Key 换 IAM access_token，再调用户实例 URL。
 * IBM_WATSON_URL 为控制台提供的带区域的服务根地址（如 https://api.us-south.language-translator.watson.cloud.ibm.com）。
 */
module.exports = {
  id: "ibm-watson",
  version: "1.0.0",
  name: "IBM Watson Language Translator",
  description: "需要 IBM_WATSON_APIKEY / IBM_WATSON_URL",
  requiredEnv: ["IBM_WATSON_APIKEY", "IBM_WATSON_URL"],
  async translate({ text, sourceLang, targetLang }, { signal, env }) {
    assertRequiredString("text", text, "IBM Watson");
    assertRequiredString("targetLang", targetLang, "IBM Watson");
    assertRequiredEnv(env, ["IBM_WATSON_APIKEY", "IBM_WATSON_URL"], "IBM Watson");
    const apiKey = env.IBM_WATSON_APIKEY;
    const serviceUrl = env.IBM_WATSON_URL;

    const tokenRaw = await fetchTextOrThrow(
      "https://iam.cloud.ibm.com/identity/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "urn:ibm:params:oauth:grant-type:apikey",
          apikey: apiKey,
        }).toString(),
        signal,
      },
      "IBM IAM"
    );
    const tokenJson = parseJsonTextSafe(tokenRaw);
    if (!tokenJson) {
      throw new Error(`IBM IAM 响应非 JSON: ${truncateDetail(tokenRaw, 200)}`);
    }
    const accessToken = tokenJson?.access_token;
    if (!accessToken) throw new Error("IBM IAM token 获取失败");

    const base = serviceUrl.replace(/\/+$/, "");
    const url = `${base}/v3/translate?version=2018-05-01`;
    const body = {
      text: [text],
      target: targetLang,
    };
    const normalizedSource = normalizeSourceLang(sourceLang, "auto");
    if (normalizedSource && normalizedSource !== "auto") {
      body.source = normalizedSource;
    }

    const data = await fetchJsonOrThrow(
      url,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal,
      },
      "IBM Watson"
    );
    const translated = data?.translations?.[0]?.translation;
    return assertTranslatedText(translated, "IBM Watson", data);
  },
};
