/**
 * 仿 lex-app：从 edge.microsoft.com/translate/auth 获取短期 Bearer，再调 api-edge Cognitive Translator。
 * 无需用户密钥；依赖微软对公开 token 接口的可用性。LANGUAGE_MAP 将应用 code 转为 Translator 的 BCP-47。
 *
 * 参考：https://github.com/gvenusleo/lex-app
 */
const EDGE_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36 Edg/113.0.1774.42";
const {
  assertTranslatedText,
  assertRequiredString,
  fetchJsonOrThrow,
  fetchTextOrThrow,
  mapLanguage,
  normalizeSourceLang,
  truncateDetail,
} = require("./tools_shared");

const LANGUAGE_MAP = {
  auto: "",
  zh: "zh-Hans",
  "zh-TW": "zh-Hant",
  yue: "yue",
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
  mn: "mn-Cyrl",
  km: "km",
};

module.exports = {
  id: "lex-bing",
  version: "1.0.0",
  name: "Bing (免密钥)",
  description: "lex-app 同款：edge.microsoft.com 取 Bearer，再调 Cognitive Translator",
  maxChars: 10000,
  fallbackProviders: ["edge"],
  languageMap: LANGUAGE_MAP,
  async translate({ text, sourceLang, targetLang }, { signal }) {
    assertRequiredString("text", text, "Bing");
    assertRequiredString("targetLang", targetLang, "Bing");
    const normalizedSource = normalizeSourceLang(sourceLang, "auto");
    const from = normalizedSource === "auto"
      ? ""
      : mapLanguage(normalizedSource, LANGUAGE_MAP, {
          providerName: "Bing",
          fieldName: "源语言",
          allowAuto: false,
        });
    const to = mapLanguage(targetLang, LANGUAGE_MAP, {
      providerName: "Bing",
      fieldName: "目标语言",
      allowAuto: false,
    });

    const token = (
      await fetchTextOrThrow(
        "https://edge.microsoft.com/translate/auth",
        {
          method: "GET",
          headers: { "User-Agent": EDGE_UA },
          signal,
        },
        "Bing token"
      )
    ).trim();
    if (!token) {
      throw new Error("Bing token 为空");
    }

    const url = new URL("https://api-edge.cognitive.microsofttranslator.com/translate");
    if (from) {
      url.searchParams.set("from", from);
    }
    url.searchParams.set("to", to);
    url.searchParams.set("api-version", "3.0");
    url.searchParams.set("includeSentenceLength", "true");

    const data = await fetchJsonOrThrow(
      url,
      {
        method: "POST",
        headers: {
          accept: "*/*",
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          "User-Agent": EDGE_UA,
        },
        body: JSON.stringify([{ Text: text }]),
        signal,
      },
      "Bing translate"
    );
    const translated = data?.[0]?.translations?.[0]?.text;
    return assertTranslatedText(
      translated,
      "Bing",
      truncateDetail(JSON.stringify(data), 200)
    );
  },
};
