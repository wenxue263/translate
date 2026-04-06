/**
 * 火山引擎机器翻译 OpenAPI：TranslateText，使用官方 HMAC-SHA256 签名（与 demo/sign.js 一致）。
 * 查询串含 Action/Version，正文 JSON 的哈希参与 canonical request。
 *
 * 参考：https://github.com/volcengine/volc-openapi-demos
 */
const crypto = require("crypto");
const {
  assertRequiredEnv,
  assertRequiredString,
  assertTranslatedText,
  fetchTextOrThrow,
  normalizeSourceLang,
  parseJsonTextSafe,
  truncateDetail,
} = require("./tools_shared");

function hmac(secret, s) {
  return crypto.createHmac("sha256", secret).update(s, "utf8").digest();
}

function hash(s) {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

function uriEscape(str) {
  return encodeURIComponent(str)
    .replace(/[^A-Za-z0-9_.~\-%]+/g, escape)
    .replace(/[*]/g, (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`);
}

function queryParamsToString(params) {
  return Object.keys(params)
    .sort()
    .map((key) => {
      const val = params[key];
      if (typeof val === "undefined" || val === null) return undefined;
      const escapedKey = uriEscape(key);
      if (!escapedKey) return undefined;
      if (Array.isArray(val)) {
        return `${escapedKey}=${val.map(uriEscape).sort().join(`&${escapedKey}=`)}`;
      }
      return `${escapedKey}=${uriEscape(val)}`;
    })
    .filter(Boolean)
    .join("&");
}

function getSignHeaders(originHeaders) {
  const HEADER_KEYS_TO_IGNORE = new Set([
    "authorization",
    "content-type",
    "content-length",
    "user-agent",
    "presigned-expires",
    "expect",
  ]);

  const keys = Object.keys(originHeaders).filter(
    (k) => !HEADER_KEYS_TO_IGNORE.has(k.toLowerCase())
  );

  const signedHeaderKeys = keys
    .slice()
    .map((k) => k.toLowerCase())
    .sort()
    .join(";");

  const canonicalHeaders = keys
    .sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : 1))
    .map((k) => `${k.toLowerCase()}:${String(originHeaders[k]).trim().replace(/\s+/g, " ")}`)
    .join("\n");

  return [signedHeaderKeys, canonicalHeaders];
}

/** 头 X-Date 所需格式：YYYYMMDDTHHmmssZ（无分隔符） */
function getDateTimeNow() {
  return new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
}

/**
 * 火山签名 v4 风格：canonical request + string to sign + HMAC 链得到 Authorization 头值。
 */
function signVolc({ headers, query, region, serviceName, method, pathName, accessKeyId, secretKey, bodySha }) {
  const datetime = headers["X-Date"];
  const date = datetime.substring(0, 8); // YYYYMMDD
  const [signedHeaders, canonicalHeaders] = getSignHeaders(headers);

  const canonicalRequest = [
    method.toUpperCase(),
    pathName,
    queryParamsToString(query) || "",
    `${canonicalHeaders}\n`,
    signedHeaders,
    bodySha || hash(""),
  ].join("\n");

  const credentialScope = [date, region, serviceName, "request"].join("/");
  const stringToSign = ["HMAC-SHA256", datetime, credentialScope, hash(canonicalRequest)].join("\n");

  const kDate = hmac(secretKey, date);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, serviceName);
  const kSigning = hmac(kService, "request");
  const signature = hmac(kSigning, stringToSign).toString("hex");

  return [
    "HMAC-SHA256",
    `Credential=${accessKeyId}/${credentialScope},`,
    `SignedHeaders=${signedHeaders},`,
    `Signature=${signature}`,
  ].join(" ");
}

module.exports = {
  id: "volcengine",
  version: "1.0.0",
  name: "Volcengine Translate",
  description: "需要 AK/SK（火山引擎 OpenAPI 签名）",
  requiredEnv: ["VOLC_ACCESS_KEY_ID", "VOLC_SECRET_KEY"],
  optionalEnv: ["VOLC_REGION", "VOLC_HOST"],
  async translate({ text, sourceLang, targetLang }, { signal, env }) {
    assertRequiredString("text", text, "Volcengine");
    assertRequiredString("targetLang", targetLang, "Volcengine");
    assertRequiredEnv(env, ["VOLC_ACCESS_KEY_ID", "VOLC_SECRET_KEY"], "Volcengine");
    const accessKeyId = env.VOLC_ACCESS_KEY_ID;
    const secretKey = env.VOLC_SECRET_KEY;

    const host = env.VOLC_HOST || "open.volcengineapi.com";
    const region = env.VOLC_REGION || "cn-north-1";
    const serviceName = "translate";

    const query = {
      Action: "TranslateText",
      Version: "2020-06-01",
    };

    const payload = JSON.stringify({
      SourceLanguage: normalizeSourceLang(sourceLang, "auto"),
      TargetLanguage: targetLang,
      TextList: [text],
    });

    const headers = {
      Host: host,
      "Content-Type": "application/json",
      "X-Date": getDateTimeNow(),
    };

    const authorization = signVolc({
      headers,
      query,
      region,
      serviceName,
      method: "POST",
      pathName: "/",
      accessKeyId,
      secretKey,
      bodySha: hash(payload),
    });

    const url = `https://${host}/?${queryParamsToString(query)}`;
    const bodyText = await fetchTextOrThrow(
      url,
      {
        method: "POST",
        headers: { ...headers, Authorization: authorization },
        body: payload,
        signal,
      },
      "Volcengine"
    );

    const data = parseJsonTextSafe(bodyText);
    if (!data) {
      throw new Error(`Volcengine 响应非 JSON: ${truncateDetail(bodyText, 220)}`);
    }
    const translated = data?.TranslationList?.[0]?.Translation;
    return assertTranslatedText(translated, "Volcengine", data);
  },
};

