const {
  assertRequiredEnv,
  assertRequiredString,
  assertTranslatedText,
  fetchTextOrThrow,
  normalizeSourceLang,
  parseJsonTextSafe,
  truncateDetail,
} = require("./tools_shared");

/**
 * 小牛翻译 NiuTrans Server API：POST 查询参数携带 apikey 与 src_text。
 * LANGUAGE_MAP 覆盖常见语种；响应可能是 tgt_text 或 translation 字段。
 *
 * 文档：https://niutrans.com/documents/contents/trans_text
 */
const LANGUAGE_MAP = {
  auto: "auto",
  zh: "zh",
  "zh-TW": "cht",
  en: "en",
  ja: "ja",
  ko: "ko",
  fr: "fr",
  es: "es",
  ru: "ru",
  de: "de",
  it: "it",
  pt: "pt",
  ar: "ar",
  th: "th",
  vi: "vi",
  id: "id",
  tr: "tr",
  pl: "pl",
  nl: "nl",
  sv: "sv",
  da: "da",
  fi: "fi",
  no: "no",
  cs: "cs",
  sk: "sk",
  hu: "hu",
  ro: "ro",
  bg: "bg",
  el: "el",
  he: "he",
  hi: "hi",
  uk: "uk",
  ms: "ms",
  tl: "tl",
  sw: "sw",
  af: "af",
  sq: "sq",
  am: "am",
  az: "az",
  be: "be",
  bn: "bn",
  bs: "bs",
  ca: "ca",
  ceb: "ceb",
  co: "co",
  cy: "cy",
  eo: "eo",
  et: "et",
  eu: "eu",
  fa: "fa",
  fy: "fy",
  ga: "ga",
  gd: "gd",
  gl: "gl",
  gu: "gu",
  ha: "ha",
  haw: "haw",
  hr: "hr",
  ht: "ht",
  hy: "hy",
  ig: "ig",
  is: "is",
  jw: "jw",
  ka: "ka",
  kk: "kk",
  km: "km",
  kn: "kn",
  ku: "ku",
  ky: "ky",
  la: "la",
  lb: "lb",
  lo: "lo",
  lt: "lt",
  lv: "lv",
  mg: "mg",
  mi: "mi",
  mk: "mk",
  ml: "ml",
  mn: "mn",
  mr: "mr",
  mt: "mt",
  my: "my",
  ne: "ne",
  ny: "ny",
  pa: "pa",
  ps: "ps",
  sd: "sd",
  si: "si",
  sl: "sl",
  sm: "sm",
  sn: "sn",
  so: "so",
  sr: "sr",
  st: "st",
  su: "su",
  ta: "ta",
  te: "te",
  tg: "tg",
  ur: "ur",
  uz: "uz",
  xh: "xh",
  yi: "yi",
  yo: "yo",
  zu: "zu",
};

module.exports = {
  id: "niutrans",
  version: "1.0.0",
  name: "小牛翻译",
  description: "需 API Key：https://niutrans.com/",
  requiredEnv: ["NIUTRANS_API_KEY"],
  fallbackProviders: ["edge", "baidu"],
  languageMap: LANGUAGE_MAP,
  async translate({ text, sourceLang, targetLang }, { signal, env }) {
    assertRequiredString("text", text, "小牛翻译");
    assertRequiredString("targetLang", targetLang, "小牛翻译");
    assertRequiredEnv(env, ["NIUTRANS_API_KEY"], "小牛翻译");
    const apikey = env.NIUTRANS_API_KEY.trim();

    const normalizedSource = normalizeSourceLang(sourceLang, "auto");
    const from = normalizedSource === "auto" ? "auto" : LANGUAGE_MAP[normalizedSource] ?? normalizedSource;
    const to = LANGUAGE_MAP[targetLang] ?? targetLang;

    const url = new URL("https://api.niutrans.com/NiuTransServer/translation");
    url.searchParams.set("from", from);
    url.searchParams.set("to", to);
    url.searchParams.set("apikey", apikey);
    url.searchParams.set("src_text", text);

    const raw = await fetchTextOrThrow(url, { method: "POST", signal }, "小牛翻译");
    const data = parseJsonTextSafe(raw);
    if (!data) {
      throw new Error(`小牛翻译响应非 JSON: ${truncateDetail(raw, 200)}`);
    }

    if (data.error_code || data.code) {
      const code = data.error_code ?? data.code;
      const msg = data.error_msg ?? data.message ?? "";
      throw new Error(`小牛翻译错误 ${code}: ${msg}`);
    }
    const out = data.tgt_text ?? data.translation;
    return assertTranslatedText(out, "小牛翻译", data);
  },
};
