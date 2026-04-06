const {
  assertRequiredEnv,
  assertRequiredString,
  normalizeSourceLang,
  fetchJsonOrThrow,
} = require("./tools_shared");

/**
 * 彩云小译 HTTP API：trans_type 为「源2目标」拼接，仅支持有限语言组合。
 * CAIYUN_LANG 同时用于校验与映射；不支持的语言在 assertCaiyunLang 中抛错。
 *
 * 官方文档：https://docs.caiyunapp.com/lingocloud-api/index.html
 */
const CAIYUN_LANG = {
  auto: "auto",
  zh: "zh",
  "zh-TW": "zh",
  en: "en",
  ja: "ja",
};

/**
 * @param {string} code - 应用内语言 code
 * @param {string} label - 用于错误提示「源语言/目标语言」
 */
function assertCaiyunLang(code, label) {
  const v = CAIYUN_LANG[code];
  if (!v) {
    throw new Error(`彩云小译仅支持 自动/简繁中文/英语/日语，当前${label}: ${code}`);
  }
  return v;
}

module.exports = {
  id: "caiyun",
  version: "1.0.0",
  name: "彩云小译",
  description: "需 Token：https://docs.caiyunapp.com/lingocloud-api/index.html （trans_type 仅中英日等）",
  requiredEnv: ["CAIYUN_TOKEN"],
  fallbackProviders: ["edge", "baidu"],
  languageMap: CAIYUN_LANG,
  async translate({ text, sourceLang, targetLang }, { signal, env }) {
    assertRequiredString("text", text, "彩云小译");
    assertRequiredString("targetLang", targetLang, "彩云小译");
    assertRequiredEnv(env, ["CAIYUN_TOKEN"], "彩云小译");
    const token = env.CAIYUN_TOKEN.trim();

    const from = assertCaiyunLang(normalizeSourceLang(sourceLang, "auto"), "源语言");
    const to = assertCaiyunLang(targetLang, "目标语言");
    const trans_type = `${from}2${to}`;

    const data = await fetchJsonOrThrow(
      "https://api.interpreter.caiyunai.com/v1/translator",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Authorization": `token ${token}`,
        },
        body: JSON.stringify({
          source: text,
          trans_type,
          request_id: "electron-translator",
          detect: "true",
        }),
        signal,
      },
      "彩云小译"
    );
    const target = data?.target;
    if (typeof target !== "string") {
      throw new Error("彩云小译响应结构异常");
    }
    return target;
  },
};
