const {
  assertRequiredString,
  assertTranslatedText,
  fetchJsonOrThrow,
  mapLanguage,
  normalizeSourceLang,
  truncateDetail,
} = require("./tools_shared");

/**
 * DeepL 网页 jsonrpc（www2.deepl.com），请求体字段与 lex-app 对齐；可能随前端改版失效。
 * getICount/getTimeStamp/getRandom 用于模拟浏览器侧的 id 与时间戳规则。
 *
 * 参考：https://github.com/gvenusleo/lex-app
 */
const LANGUAGE_MAP = {
  auto: "auto",
  zh: "ZH",
  "zh-TW": "ZH",
  en: "EN",
  ja: "JP",
  ko: "KO",
  fr: "FR",
  de: "DE",
  ru: "RU",
  pt: "PT",
  bg: "BG",
  cs: "CS",
  da: "DA",
  el: "EL",
  es: "ES",
  et: "ET",
  fi: "FI",
  hu: "HU",
  id: "ID",
  it: "IT",
  lt: "LT",
  lv: "LV",
  nb: "NB",
  nl: "NL",
  pl: "PL",
  ro: "RO",
  sk: "SK",
  sl: "SL",
  sv: "SV",
  tr: "TR",
  uk: "UK",
};

/** 用于 timestamp 计算：与 DeepL 前端类似的「i 出现次数」启发 */
function getICount(s) {
  return (s.match(/i/g) || []).length;
}

/** jsonrpc id：较大随机整数 */
function getRandom() {
  return (Math.floor(Math.random() * 99999) + 100000) * 1000;
}

/** 根据 i 出现次数微调时间戳，降低被简单规则识别的概率 */
function getTimeStamp(iCount) {
  const ts = Date.now();
  if (iCount !== 0) {
    const n = iCount + 1;
    return ts - (ts % n) + n;
  }
  return ts;
}

module.exports = {
  id: "lex-deepl-free",
  version: "1.0.0",
  name: "DeepL Free (免密钥)",
  description: "www2.deepl.com/jsonrpc（lex-app 同款，不稳定）",
  maxChars: 1000,
  fallbackProviders: ["edge", "lex-bing"],
  languageMap: LANGUAGE_MAP,
  async translate({ text, sourceLang, targetLang }, { signal }) {
    assertRequiredString("text", text, "DeepL Free");
    assertRequiredString("targetLang", targetLang, "DeepL Free");
    const normalizedSource = normalizeSourceLang(sourceLang, "auto");
    const from = mapLanguage(normalizedSource, LANGUAGE_MAP, {
      providerName: "DeepL Free",
      fieldName: "源语言",
      allowAuto: true,
    });
    const to = mapLanguage(targetLang, LANGUAGE_MAP, {
      providerName: "DeepL Free",
      fieldName: "目标语言",
      allowAuto: false,
    });

    const rand = getRandom();
    const payload = {
      jsonrpc: "2.0",
      method: "LMT_handle_texts",
      params: {
        splitting: "newlines",
        lang: {
          source_lang_user_selected: from,
          target_lang: to,
        },
        texts: [{ text, requestAlternatives: 0 }],
        timestamp: getTimeStamp(getICount(text)),
      },
      id: rand,
    };

    let dataStr = JSON.stringify(payload);
    if ((rand + 5) % 29 === 0 || (rand + 3) % 13 === 0) {
      dataStr = dataStr.replaceAll('"method":"', '"method" : "');
    } else {
      dataStr = dataStr.replaceAll('"method":"', '"method": "');
    }

    const data = await fetchJsonOrThrow(
      "https://www2.deepl.com/jsonrpc",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: dataStr,
        signal,
      },
      "DeepL Free"
    );
    const translated = data?.result?.texts?.[0]?.text;
    return assertTranslatedText(
      translated,
      "DeepL Free",
      truncateDetail(JSON.stringify(data), 200)
    );
  },
};
