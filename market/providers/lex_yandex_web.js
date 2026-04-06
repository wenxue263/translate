/**
 * Yandex 旧版公开 tr.json 接口（srv=android），与需要云 IAM 的 yandex.js 不同，免密钥。
 * sid 使用无横线 UUID 模拟客户端会话 id。
 *
 * 参考：https://github.com/gvenusleo/lex-app
 */
const { randomUUID } = require("crypto");
const {
  assertTranslatedText,
  assertRequiredString,
  fetchJsonOrThrow,
  mapLanguage,
  normalizeSourceLang,
} = require("./tools_shared");

const LANGUAGE_MAP = {
  auto: "",
  zh: "zh",
  en: "en",
  ja: "ja",
  ko: "ko",
  fr: "fr",
  es: "es",
  ru: "ru",
  de: "de",
  it: "it",
  tr: "tr",
  pt: "pt",
  vi: "vi",
  id: "id",
  th: "th",
  ms: "ms",
  ar: "ar",
  hi: "hi",
};

/** 将对象序列化为 application/x-www-form-urlencoded 体 */
function buildForm(params) {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

module.exports = {
  id: "lex-yandex-web",
  version: "1.0.0",
  name: "Yandex Web (免密钥)",
  description: "translate.yandex.net/api/v1/tr.json（已停用，建议改用其他接口）",
  hidden: true,
  maxChars: 5000,
  fallbackProviders: ["edge", "lex-bing"],
  languageMap: LANGUAGE_MAP,
  async translate({ text, sourceLang, targetLang }, { signal }) {
    assertRequiredString("text", text, "Yandex Web");
    const normalizedSource = normalizeSourceLang(sourceLang, "auto");
    const source_lang = normalizedSource === "auto"
      ? ""
      : mapLanguage(normalizedSource, LANGUAGE_MAP, {
          providerName: "Yandex Web",
          fieldName: "源语言",
          allowAuto: false,
        });
    const target_lang = mapLanguage(targetLang, LANGUAGE_MAP, {
      providerName: "Yandex Web",
      fieldName: "目标语言",
      allowAuto: false,
    });

    const sid = `${randomUUID().replace(/-/g, "")}-0-0`;
    const url = new URL("https://translate.yandex.net/api/v1/tr.json/translate");
    url.searchParams.set("id", sid);
    url.searchParams.set("srv", "android");

    const body = buildForm({
      source_lang,
      target_lang,
      text,
    });

    const data = await fetchJsonOrThrow(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
        signal,
      },
      "Yandex Web"
    );
    const parts = data?.text;
    if (!Array.isArray(parts)) {
      throw new Error("Yandex Web 响应结构异常");
    }
    return assertTranslatedText(parts.join(""), "Yandex Web", data);
  },
};
