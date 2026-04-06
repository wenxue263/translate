const {
  assertRequiredString,
  fetchJsonOrThrow,
  normalizeSourceLang,
  truncateDetail,
} = require("./tools_shared");

/**
 * MyMemory 免费翻译 API（mymemory.translated.net），免密钥。
 * 支持 500 词/天免费额度（按 IP 计），超出后仍可有限使用。
 * 语言码使用 ISO 639-1（en, zh, ja, ko, fr, de 等）。
 */
const LANGUAGE_MAP = {
  auto: "auto",
  zh: "zh-CN",
  "zh-TW": "zh-TW",
  en: "en",
  ja: "ja",
  ko: "ko",
  fr: "fr",
  de: "de",
  ru: "ru",
  es: "es",
  it: "it",
  pt: "pt",
  nl: "nl",
  pl: "pl",
  tr: "tr",
  ar: "ar",
  hi: "hi",
  th: "th",
  vi: "vi",
  id: "id",
  ms: "ms",
  uk: "uk",
  cs: "cs",
  sv: "sv",
  da: "da",
  fi: "fi",
  no: "no",
  ro: "ro",
  el: "el",
  he: "he",
  hu: "hu",
  bg: "bg",
};

module.exports = {
  id: "mymemory",
  version: "1.0.0",
  name: "MyMemory (免密钥)",
  description: "mymemory.translated.net 免费接口，每日 500 词限额",
  maxChars: 500,
  fallbackProviders: ["edge", "google"],
  languageMap: LANGUAGE_MAP,
  async translate({ text, sourceLang, targetLang }, { signal }) {
    assertRequiredString("text", text, "MyMemory");
    assertRequiredString("targetLang", targetLang, "MyMemory");

    const sl = normalizeSourceLang(sourceLang, "auto");
    const fromLang = sl === "auto" ? "auto" : mapLang(sl, "MyMemory");
    const toLang = mapLang(targetLang, "MyMemory");

    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(fromLang)}|${encodeURIComponent(toLang)}`;

    const data = await fetchJsonOrThrow(url, { method: "GET", signal }, "MyMemory");
    const translated = data?.responseData?.translatedText;
    if (!translated || typeof translated !== "string") {
      throw new Error(`MyMemory 响应异常: ${truncateDetail(JSON.stringify(data), 220)}`);
    }
    return translated;
  },
};

function mapLang(code, providerName) {
  const mapped = LANGUAGE_MAP[code];
  if (!mapped) {
    throw new Error(`${providerName} 不支持的语言码: ${code}`);
  }
  return mapped;
}
