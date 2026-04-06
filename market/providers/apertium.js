const {
  assertRequiredString,
  fetchJsonOrThrow,
  normalizeSourceLang,
  parseJsonSafe,
  truncateDetail,
} = require("./tools_shared");

/**
 * Apertium APy 公共实例：先 listPairs 再 translate；auto 源语言时调用 identifyLang。
 * 应用内 ISO 639-1 码经 languageMap 转为 Apertium 三字母码；目标语言必须可映射（如 zh→zho）。
 * 若某语言对未在实例中安装，仍会报错，可换用 fallbackProviders。
 */
const languageMap = {
  en: "eng",
  es: "spa",
  zh: "zho",
  "zh-TW": "zho",
  fr: "fra",
  de: "deu",
  ru: "rus",
  it: "ita",
  pt: "por",
  nl: "nld",
  ca: "cat",
  gl: "glg",
  eo: "epo",
  oc: "oci",
  uk: "ukr",
  tr: "tur",
  sw: "swa",
  hi: "hin",
  ko: "kor",
  ja: "jpn",
  da: "dan",
  sv: "swe",
  no: "nob",
  nb: "nob",
  nn: "nno",
  fi: "fin",
  pl: "pol",
  cs: "ces",
  sk: "slk",
  ro: "ron",
  bg: "bul",
  el: "ell",
  hu: "hun",
  id: "ind",
  cy: "cym",
  eu: "eus",
  is: "isl",
  ga: "gle",
  fa: "pes",
  ar: "arb",
  he: "heb",
};

/**
 * @param {string} code
 * @param {string} label
 */
function mapToApertiumCode(code, label) {
  const c = String(code || "").trim();
  if (!c) throw new Error(`Apertium ${label}不能为空`);
  const mapped = languageMap[c];
  if (mapped) return mapped;
  if (/^[a-zA-Z]{3}$/.test(c)) return c.toLowerCase();
  throw new Error(
    `Apertium 缺少语言「${c}」的 ISO 639-3 映射（${label}）。请在 providers/apertium.js 的 languageMap 中补充，或换用其它引擎。语言对列表：https://wiki.apertium.org/wiki/List_of_language_pairs`
  );
}

module.exports = {
  id: "apertium",
  version: "1.0.0",
  name: "Apertium APy (免密钥)",
  description:
    "免密钥（公共实例 https://apertium.org/apy/ ）。语言对受实例已安装 pairs 限制",
  fallbackProviders: ["google"],
  languageMap,
  async translate({ text, sourceLang, targetLang }, { signal }) {
    assertRequiredString("text", text, "Apertium");
    assertRequiredString("targetLang", targetLang, "Apertium");
    let from = normalizeSourceLang(sourceLang, "auto");
    const mappedTo = mapToApertiumCode(targetLang, "目标语言");

    const pairsJson = await fetchJsonOrThrow(
      "https://apertium.org/apy/listPairs",
      { method: "GET", signal },
      "Apertium listPairs"
    );
    const pairs = pairsJson?.responseData;
    if (!pairs || typeof pairs !== "object") {
      throw new Error("Apertium listPairs 响应结构异常");
    }

    if (from === "auto") {
      const detectRes = await fetch(
        `https://apertium.org/apy/identifyLang?q=${encodeURIComponent(text)}`,
        { method: "GET", signal }
      );
      if (!detectRes.ok) {
        throw new Error(`Apertium identifyLang HTTP ${detectRes.status}`);
      }
      const detectData = await parseJsonSafe(detectRes);
      const best =
        detectData && typeof detectData === "object"
          ? Object.entries(detectData).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0]
          : null;
      if (!best) throw new Error("Apertium 自动识别源语言失败");
      from = mapToApertiumCode(best, "源语言(自动识别)");
    } else {
      from = mapToApertiumCode(from, "源语言");
    }

    if (from === mappedTo) return text;
    const langpair = `${from}|${mappedTo}`;
    const supported = Object.values(pairs).some(
      (p) => `${p?.sourceLanguage}|${p?.targetLanguage}` === langpair
    );
    if (!supported) {
      throw new Error(
        `Apertium 公共实例未提供语言对「${langpair}」。丹麦语与中文等组合常不可用，请换用其它引擎或见 https://wiki.apertium.org/wiki/List_of_language_pairs`
      );
    }

    const url = `https://apertium.org/apy/translate?q=${encodeURIComponent(
      text
    )}&langpair=${encodeURIComponent(langpair)}`;
    const data = await fetchJsonOrThrow(url, { method: "GET", signal }, "Apertium");
    const translated = data?.responseData?.translatedText;
    if (!translated)
      throw new Error(`Apertium 响应结构异常: ${truncateDetail(JSON.stringify(data), 220)}`);
    return translated;
  },
};
