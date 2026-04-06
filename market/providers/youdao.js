/**
 * 有道智云文本翻译（openapi.youdao.com/api）：v3 签名 SHA256(appKey+truncate(q)+salt+curtime+密钥)。
 * YOUDAO_CODES 为服务端支持的语言集合；languageMap 供主进程把 zh/zh-TW/sr 等映射为 API 码。
 */
const crypto = require("crypto");
const {
  assertRequiredEnv,
  assertRequiredString,
  normalizeSourceLang,
  parseJsonSafe,
  truncateDetail,
} = require("./tools_shared");

/** 有道文本翻译 API 语言码（与官方文档一致） */
const YOUDAO_CODES = new Set([
  "auto",
  "ar",
  "de",
  "en",
  "es",
  "fr",
  "hi",
  "id",
  "it",
  "ja",
  "ko",
  "nl",
  "pt",
  "ru",
  "th",
  "vi",
  "zh-CHS",
  "zh-CHT",
  "af",
  "am",
  "az",
  "be",
  "bg",
  "bn",
  "bs",
  "ca",
  "ceb",
  "co",
  "cs",
  "cy",
  "da",
  "el",
  "eo",
  "et",
  "eu",
  "fa",
  "fi",
  "fj",
  "fy",
  "ga",
  "gd",
  "gl",
  "gu",
  "ha",
  "haw",
  "he",
  "hr",
  "ht",
  "hu",
  "hy",
  "ig",
  "is",
  "jw",
  "ka",
  "kk",
  "km",
  "kn",
  "ku",
  "ky",
  "la",
  "lb",
  "lo",
  "lt",
  "lv",
  "mg",
  "mi",
  "mk",
  "ml",
  "mn",
  "mr",
  "ms",
  "mt",
  "mww",
  "my",
  "ne",
  "no",
  "ny",
  "otq",
  "pa",
  "pl",
  "ps",
  "ro",
  "sd",
  "si",
  "sk",
  "sl",
  "sm",
  "sn",
  "so",
  "sq",
  "sr-Cyrl",
  "sr-Latn",
  "st",
  "su",
  "sv",
  "sw",
  "ta",
  "te",
  "tg",
  "tl",
  "tlh",
  "to",
  "tr",
  "ty",
  "uk",
  "ur",
  "uz",
  "xh",
  "yi",
  "yo",
  "yua",
  "yue",
  "zu",
]);

/** 应用内 code → 有道 API from/to；不在集合内则抛错提示用户 */
function toYoudaoApiLang(code) {
  if (code === "zh") return "zh-CHS";
  if (code === "zh-TW") return "zh-CHT";
  if (code === "sr") return "sr-Latn";
  if (!YOUDAO_CODES.has(code)) {
    throw new Error(`有道翻译不支持语言代码: ${code}（如奥里亚语 or、苗语 hmn 等）`);
  }
  return code;
}

/** v3 签名规则：过长文本只取首尾各 10 字 + 长度，减少签名字符串体积 */
function truncateForSign(q) {
  if (q.length <= 20) return q;
  return q.slice(0, 10) + String(q.length) + q.slice(-10);
}

/** 计算 signType=v3 所需的 sign 字段（小写 hex SHA256） */
function signV3(appId, appSecret, q, salt, curtime) {
  const str = appId + truncateForSign(q) + salt + curtime + appSecret;
  return crypto.createHash("sha256").update(str, "utf8").digest("hex");
}

/** 供主进程 resolveProviderLanguage：除特殊项外多数 code 与有道一致，直接 1:1 */
const languageMap = {};
for (const c of YOUDAO_CODES) {
  if (c !== "zh-CHS" && c !== "zh-CHT" && c !== "sr-Latn" && c !== "sr-Cyrl") {
    languageMap[c] = c;
  }
}
languageMap.zh = "zh-CHS";
languageMap["zh-TW"] = "zh-CHT";
languageMap.sr = "sr-Latn";

module.exports = {
  id: "youdao",
  version: "1.0.0",
  name: "有道翻译",
  description: "需应用 ID + 应用密钥（v3 签名）：https://ai.youdao.com/",
  requiredEnv: ["YOUDAO_APP_ID", "YOUDAO_APP_SECRET"],
  fallbackProviders: ["edge", "baidu"],
  languageMap,
  async translate({ text, sourceLang, targetLang }, { signal, env }) {
    assertRequiredString("text", text, "有道翻译");
    assertRequiredString("targetLang", targetLang, "有道翻译");
    assertRequiredEnv(env, ["YOUDAO_APP_ID", "YOUDAO_APP_SECRET"], "有道翻译");
    const appId = env.YOUDAO_APP_ID.trim();
    const appSecret = env.YOUDAO_APP_SECRET.trim();

    const from = toYoudaoApiLang(normalizeSourceLang(sourceLang, "auto"));
    const to = toYoudaoApiLang(targetLang);

    const salt = String(Date.now());
    const curtime = String(Math.floor(Date.now() / 1000));
    const sign = signV3(appId, appSecret, text, salt, curtime);

    const url = new URL("https://openapi.youdao.com/api");
    url.searchParams.set("q", text);
    url.searchParams.set("from", from);
    url.searchParams.set("to", to);
    url.searchParams.set("appKey", appId);
    url.searchParams.set("salt", salt);
    url.searchParams.set("sign", sign);
    url.searchParams.set("signType", "v3");
    url.searchParams.set("curtime", curtime);

    const response = await fetch(url, { method: "POST", signal });
    const data = await parseJsonSafe(response);

    if (!response.ok) {
      const detail =
        typeof data === "object" && data ? truncateDetail(JSON.stringify(data), 240) : "";
      throw new Error(`有道翻译 HTTP ${response.status}${detail ? `: ${detail}` : ""}`);
    }

    const errCode = data.errorCode;
    if (errCode != null && errCode !== "0" && errCode !== 0) {
      throw new Error(`有道翻译错误 ${errCode}: ${data.msg || ""}`);
    }
    const parts = data.translation;
    if (!Array.isArray(parts) || parts.length === 0) {
      throw new Error("有道翻译响应结构异常");
    }
    return parts.join("");
  },
};
