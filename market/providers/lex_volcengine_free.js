const {
  assertTranslatedText,
  assertRequiredString,
  fetchJsonOrThrow,
  mapLanguage,
  normalizeSourceLang,
} = require("./tools_shared");

/**
 * 火山翻译浏览器扩展用 CRX 接口（translate.volcengine.com/crx），免密钥，与 lex-app / pot 插件同源思路。
 * LANGUAGE_MAP 将应用内语言码映射为接口要求的 source_language / target_language 字符串。
 *
 * 参考：https://github.com/gvenusleo/lex-app
 */
const LANGUAGE_MAP = {
  auto: "",
  zh: "zh",
  "zh-TW": "zh-Hant",
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
  mn: "mn",
  km: "km",
  nl: "nl",
  pl: "pl",
  uk: "uk",
  cs: "cs",
  da: "da",
  fi: "fi",
  sv: "sv",
  no: "no",
  el: "el",
  he: "he",
  hu: "hu",
  ro: "ro",
  bg: "bg",
  hr: "hr",
  sk: "sk",
  sl: "sl",
  et: "et",
  lv: "lv",
  lt: "lt",
};

module.exports = {
  id: "lex-volcengine-free",
  version: "1.0.0",
  name: "火山翻译 (免密钥)",
  description: "translate.volcengine.com/crx（lex-app 同款）",
  maxChars: 5000,
  fallbackProviders: ["edge", "lex-bing"],
  languageMap: LANGUAGE_MAP,
  async translate({ text, sourceLang, targetLang }, { signal }) {
    assertRequiredString("text", text, "火山 Free");
    assertRequiredString("targetLang", targetLang, "火山 Free");
    const normalizedSource = normalizeSourceLang(sourceLang, "auto");
    const source_language = normalizedSource === "auto"
      ? ""
      : mapLanguage(normalizedSource, LANGUAGE_MAP, {
          providerName: "火山 Free",
          fieldName: "源语言",
          allowAuto: false,
        });
    const target_language = mapLanguage(targetLang, LANGUAGE_MAP, {
      providerName: "火山 Free",
      fieldName: "目标语言",
      allowAuto: false,
    });

    const data = await fetchJsonOrThrow(
      "https://translate.volcengine.com/crx/translate/v1/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_language,
          target_language,
          text,
        }),
        signal,
      },
      "火山 Free"
    );
    const translated = data?.translation;
    return assertTranslatedText(translated, "火山 Free", data);
  },
};
