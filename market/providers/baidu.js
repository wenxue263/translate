/**
 * 百度翻译开放平台「通用翻译API」：
 * 签名 md5(appid+q+salt+密钥)（UTF-8），q 拼接时不做 URL 编码；与官方示例可对照校验。
 * 短文本用 GET（与文档示例一致），过长时用 POST 表单，避免 URL 超长。
 * 文档：https://api.fanyi.baidu.com/product/113 / https://api.fanyi.baidu.com/doc/21
 */
const crypto = require("crypto");
const {
  assertRequiredEnv,
  assertRequiredString,
  normalizeSourceLang,
  parseJsonSafe,
  truncateDetail,
} = require("./tools_shared");

/** 计算百度要求的 sign 用 MD5 十六进制串 */
function md5(s) {
  return crypto.createHash("md5").update(s, "utf8").digest("hex");
}

/** 去掉复制粘贴常见的 BOM、零宽字符、换行与首尾引号（官方示例：appid 为数字串，密钥为连续字符） */
function normalizeBaiduAppId(raw) {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

function normalizeBaiduSecret(raw) {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\u00A0\u3000]/g, "")
    .replace(/\r\n|\r|\n/g, "")
    .trim();
}

/** 过长时用 POST，以下用 GET（与官方 curl/文档一致） */
const MAX_Q_CHARS_FOR_GET = 3500;

/** 常见 error_code 补充说明（完整列表见官方文档） */
const BAIDU_ERROR_HINT = {
  52003: "请核对 BAIDU_APP_ID 是否为控制台「APP ID」",
  54001:
    "签名错误：密钥须来自 fanyi-api 翻译开放平台「通用翻译API」应用详情里的「密钥」；勿用百度智能云 AK/SK；勿把 AppID 与密钥填反；可删后手打重填排除复制进来的不可见字符",
  54003: "访问频率受限，请稍后再试",
  54004: "账户余额不足或免费额度用尽，请在开放平台充值/领取额度",
  54005: "长文本请求过于频繁",
  58003: "IP 不在白名单：请在控制台「开发者信息」中关闭 IP 限制或加入当前出口 IP",
  58001: "Referer 或授权校验失败（多出现在错误的服务类型或配置）",
  20003: "请求内容存在安全风险已被拦截",
  90107: "认证未通过或未开通对应服务",
};

/** 与百度翻译开放平台文档一致的语言码子集，未列出的语种请查官方文档后自行扩展 languageMap */
const LANGUAGE_MAP = {
  auto: "auto",
  zh: "zh",
  "zh-TW": "cht",
  en: "en",
  ja: "jp",
  ko: "kor",
  fr: "fra",
  es: "spa",
  th: "th",
  ar: "ara",
  ru: "ru",
  pt: "pt",
  de: "de",
  it: "it",
  el: "el",
  nl: "nl",
  pl: "pl",
  bg: "bul",
  et: "est",
  da: "dan",
  fi: "fin",
  cs: "cs",
  ro: "rom",
  sl: "slo",
  sv: "swe",
  hu: "hu",
  vi: "vie",
  yue: "yue",
  wyw: "wyw",
};

module.exports = {
  id: "baidu",
  version: "1.0.0",
  name: "百度翻译（官方 API）",
  description:
    "BAIDU_APP_ID=翻译开放平台应用 APP ID；BAIDU_APP_KEY=同一页「密钥」（勿用智能云 AK/SK）。文档：https://api.fanyi.baidu.com/doc/21",
  requiredEnv: ["BAIDU_APP_ID", "BAIDU_APP_KEY"],
  fallbackProviders: ["edge"],
  languageMap: LANGUAGE_MAP,
  async translate({ text, sourceLang, targetLang }, { signal, env }) {
    assertRequiredString("text", text, "百度翻译");
    assertRequiredString("targetLang", targetLang, "百度翻译");
    assertRequiredEnv(env, ["BAIDU_APP_ID", "BAIDU_APP_KEY"], "百度翻译");
    const appId = normalizeBaiduAppId(env.BAIDU_APP_ID);
    const appKey = normalizeBaiduSecret(env.BAIDU_APP_KEY);
    if (!appId) {
      throw new Error("百度翻译：BAIDU_APP_ID 无效（请填写控制台中的 APP ID）");
    }
    if (!appKey) {
      throw new Error("百度翻译：BAIDU_APP_KEY 无效（请填写控制台中的「密钥」）");
    }

    const normalizedSource = normalizeSourceLang(sourceLang, "auto");
    const from = normalizedSource === "auto" ? "auto" : LANGUAGE_MAP[normalizedSource] ?? normalizedSource;
    const to = LANGUAGE_MAP[targetLang] ?? targetLang;
    // salt：官方为随机数（数字或字母）；纯数字即可
    const salt = String(Math.floor(Math.random() * 1e10));
    // 签名用「未 URL 编码」的原文 q 拼接：appid + q + salt + 密钥（小写 MD5）
    const sign = md5(appId + text + salt + appKey);

    const endpoint = "https://fanyi-api.baidu.com/api/trans/vip/translate";

    let response;
    if (text.length <= MAX_Q_CHARS_FOR_GET) {
      const url = new URL(endpoint);
      url.searchParams.set("q", text);
      url.searchParams.set("from", from);
      url.searchParams.set("to", to);
      url.searchParams.set("appid", appId);
      url.searchParams.set("salt", salt);
      url.searchParams.set("sign", sign);
      response = await fetch(url, { method: "GET", signal });
    } else {
      const body = new URLSearchParams();
      body.set("q", text);
      body.set("from", from);
      body.set("to", to);
      body.set("appid", appId);
      body.set("salt", salt);
      body.set("sign", sign);
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: body.toString(),
        signal,
      });
    }
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      throw new Error(`百度翻译 HTTP ${response.status}${data ? `: ${truncateDetail(JSON.stringify(data))}` : ""}`);
    }

    if (data.error_code != null && data.error_code !== "") {
      const code = String(data.error_code);
      const msg = data.error_msg || "";
      const hint = BAIDU_ERROR_HINT[code] || BAIDU_ERROR_HINT[Number(code)];
      throw new Error(
        `百度翻译错误 ${code}: ${msg}${hint ? `（${hint}）` : ""}`
      );
    }
    const list = data.trans_result;
    if (!Array.isArray(list) || list.length === 0) {
      throw new Error("百度翻译响应结构异常");
    }
    return list.map((item) => item.dst).join("");
  },
};
