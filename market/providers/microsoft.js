const { assertRequiredString, fetchJsonOrThrow } = require("./tools_shared");

/**
 * Azure AI Translator（认知服务）REST v3.0，需区域与订阅密钥。
 * hidden：默认不在设置列表显示，需 SHOW_HIDDEN_PROVIDERS=1 或改元数据后可见。
 */
module.exports = {
  id: "microsoft",
  version: "1.0.0",
  name: "Microsoft Translator",
  description:
    "需要密钥（隐藏）。设置 MICROSOFT_TRANSLATOR_KEY / MICROSOFT_TRANSLATOR_REGION 后可用",
  hidden: true,
  requiredEnv: ["MICROSOFT_TRANSLATOR_KEY", "MICROSOFT_TRANSLATOR_REGION"],
  async translate({ text, sourceLang, targetLang }, { signal, env }) {
    assertRequiredString("text", text, "Microsoft");
    assertRequiredString("targetLang", targetLang, "Microsoft");
    const key = env.MICROSOFT_TRANSLATOR_KEY;
    const region = env.MICROSOFT_TRANSLATOR_REGION;
    if (!key || !region) {
      throw new Error("未配置 MICROSOFT_TRANSLATOR_KEY 或 MICROSOFT_TRANSLATOR_REGION");
    }

    const params = new URLSearchParams({
      "api-version": "3.0",
      to: targetLang,
    });
    if (sourceLang && sourceLang !== "auto") {
      params.set("from", sourceLang);
    }

    const data = await fetchJsonOrThrow(
      `https://api.cognitive.microsofttranslator.com/translate?${params.toString()}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Ocp-Apim-Subscription-Key": key,
          "Ocp-Apim-Subscription-Region": region,
        },
        body: JSON.stringify([{ text }]),
        signal,
      },
      "Microsoft"
    );
    const translated = data?.[0]?.translations?.[0]?.text;
    if (!translated) {
      throw new Error("Microsoft 响应结构异常");
    }
    return translated;
  },
};
