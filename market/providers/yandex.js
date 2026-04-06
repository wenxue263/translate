const { assertRequiredString, fetchJsonOrThrow } = require("./tools_shared");

/**
 * Yandex Cloud Translate v2：需 folderId，鉴权为 Api-Key 或 IAM Bearer 二选一。
 * requiredEnvAnyOf 与 requiredEnv 组合由主进程 isProviderConfigured 校验。
 */
module.exports = {
  id: "yandex",
  version: "1.0.0",
  name: "Yandex Translate",
  description:
    "需要密钥/IAM（隐藏）。设置 YANDEX_API_KEY 或 YANDEX_IAM_TOKEN，并设置 YANDEX_FOLDER_ID",
  hidden: true,
  requiredEnvAnyOf: [["YANDEX_API_KEY", "YANDEX_IAM_TOKEN"]],
  requiredEnv: ["YANDEX_FOLDER_ID"],
  optionalEnv: ["YANDEX_API_KEY", "YANDEX_IAM_TOKEN"],
  async translate({ text, sourceLang, targetLang }, { signal, env }) {
    assertRequiredString("text", text, "Yandex");
    assertRequiredString("targetLang", targetLang, "Yandex");
    const folderId = env.YANDEX_FOLDER_ID;
    const apiKey = env.YANDEX_API_KEY;
    const iamToken = env.YANDEX_IAM_TOKEN;
    if (!folderId || (!apiKey && !iamToken)) {
      throw new Error(
        "未配置 YANDEX_FOLDER_ID，或未配置 YANDEX_API_KEY / YANDEX_IAM_TOKEN"
      );
    }

    const headers = { "Content-Type": "application/json" };
    if (iamToken) {
      headers.Authorization = `Bearer ${iamToken}`;
    } else {
      headers.Authorization = `Api-Key ${apiKey}`;
    }

    const body = {
      folderId,
      texts: [text],
      targetLanguageCode: targetLang,
    };
    if (sourceLang && sourceLang !== "auto") {
      body.sourceLanguageCode = sourceLang;
    }

    const data = await fetchJsonOrThrow(
      "https://translate.api.cloud.yandex.net/translate/v2/translate",
      {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal,
      },
      "Yandex"
    );
    const translated = data?.translations?.[0]?.text;
    if (!translated) {
      throw new Error("Yandex 响应结构异常");
    }
    return translated;
  },
};
