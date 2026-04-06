const {
  assertTranslatedText,
  assertRequiredString,
  fetchJsonOrThrow,
  fetchTextOrThrow,
  mapLanguage,
  normalizeSourceLang,
  truncateDetail,
} = require("./tools_shared");

const EDGE_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36 Edg/113.0.1774.42";

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
  id: "edge",
  version: "1.0.0",
  name: "Edge (免密钥)",
  description: "微软 Edge 内置翻译，免密钥，质量稳定",
  maxChars: 10000,
  async translate({ text, sourceLang, targetLang }, { signal }) {
    assertRequiredString("text", text, "Edge");
    assertRequiredString("targetLang", targetLang, "Edge");
    const normalizedSource = normalizeSourceLang(sourceLang, "auto");
    const from = normalizedSource === "auto"
      ? ""
      : mapLanguage(normalizedSource, LANGUAGE_MAP, {
          providerName: "Edge",
          fieldName: "源语言",
          allowAuto: false,
        });
    const to = mapLanguage(targetLang, LANGUAGE_MAP, {
      providerName: "Edge",
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
        "Edge token"
      )
    ).trim();
    if (!token) {
      throw new Error("Edge token 为空");
    }

    const url = new URL("https://api-edge.cognitive.microsofttranslator.com/translate");
    if (from) {
      url.searchParams.set("from", from);
    }
    url.searchParams.set("to", to);
    url.searchParams.set("api-version", "3.0");

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
      "Edge translate"
    );
    const translated = data?.[0]?.translations?.[0]?.text;
    return assertTranslatedText(
      translated,
      "Edge",
      truncateDetail(JSON.stringify(data), 200)
    );
  },
};
