const { assertRequiredString, fetchJsonOrThrow } = require("./tools_shared");

/**
 * DeepL 官方 API v2（表单 POST）。DEEPL_PRO 切换 api-free.deepl.com 与 api.deepl.com。
 * hidden：默认隐藏，需环境变量或文档说明后由用户开启显示。
 */
module.exports = {
  id: "deepl",
  version: "1.0.0",
  name: "DeepL",
  description:
    "需要密钥（隐藏）。设置 DEEPL_AUTH_KEY；可选 DEEPL_PRO=true 使用 pro 端点",
  hidden: true,
  requiredEnv: ["DEEPL_AUTH_KEY"],
  optionalEnv: ["DEEPL_PRO"],
  async translate({ text, sourceLang, targetLang }, { signal, env }) {
    assertRequiredString("text", text, "DeepL");
    assertRequiredString("targetLang", targetLang, "DeepL");
    const authKey = env.DEEPL_AUTH_KEY;
    if (!authKey) {
      throw new Error("未配置 DEEPL_AUTH_KEY");
    }

    const isPro = env.DEEPL_PRO === "1" || env.DEEPL_PRO === "true";
    const baseUrl = isPro ? "https://api.deepl.com" : "https://api-free.deepl.com";

    const body = new URLSearchParams({
      text,
      target_lang: targetLang.toUpperCase(),
    });
    if (sourceLang && sourceLang !== "auto") {
      body.set("source_lang", sourceLang.toUpperCase());
    }

    const data = await fetchJsonOrThrow(
      `${baseUrl}/v2/translate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `DeepL-Auth-Key ${authKey}`,
        },
        body: body.toString(),
        signal,
      },
      "DeepL"
    );
    const translated = data?.translations?.[0]?.text;
    if (!translated) {
      throw new Error("DeepL 响应结构异常");
    }
    return translated;
  },
};
