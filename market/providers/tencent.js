/**
 * 腾讯云机器翻译 TMT：TextTranslate 接口，请求体 JSON + 头里带 TC3-HMAC-SHA256 签名。
 * signTc3 实现与官方签名流程示例一致；endpoint/region/project 可通过环境变量覆盖。
 *
 * 参考：https://github.com/TencentCloud/signature-process-demo
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

/** HMAC-SHA256，用于 TC3 派生签名密钥链 */
function sha256Hmac(message, secret, encoding) {
  return crypto.createHmac("sha256", secret).update(message).digest(encoding);
}

function sha256(message, encoding = "hex") {
  return crypto.createHash("sha256").update(message).digest(encoding);
}

/** 将 Unix 秒时间戳格式化为签名用的 UTC 日期 YYYY-MM-DD */
function utcDate(timestampSec) {
  const d = new Date(timestampSec * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * 腾讯云 API 3.0 签名：拼 canonical request → string to sign → 四层 HMAC 派生得到 Authorization。
 */
function signTc3({
  secretId,
  secretKey,
  service,
  host,
  region,
  action,
  version,
  payload,
  timestamp,
}) {
  const date = utcDate(timestamp);
  const httpRequestMethod = "POST";
  const canonicalUri = "/";
  const canonicalQueryString = "";
  const contentType = "application/json; charset=utf-8";

  const canonicalHeaders =
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-tc-action:${action.toLowerCase()}\n`;
  const signedHeaders = "content-type;host;x-tc-action";
  const hashedRequestPayload = sha256(payload);
  const canonicalRequest =
    `${httpRequestMethod}\n` +
    `${canonicalUri}\n` +
    `${canonicalQueryString}\n` +
    `${canonicalHeaders}\n` +
    `${signedHeaders}\n` +
    `${hashedRequestPayload}`;

  const algorithm = "TC3-HMAC-SHA256";
  const credentialScope = `${date}/${service}/tc3_request`;
  const stringToSign =
    `${algorithm}\n` +
    `${timestamp}\n` +
    `${credentialScope}\n` +
    `${sha256(canonicalRequest)}`;

  const kDate = sha256Hmac(date, `TC3${secretKey}`);
  const kService = sha256Hmac(service, kDate);
  const kSigning = sha256Hmac("tc3_request", kService);
  const signature = sha256Hmac(stringToSign, kSigning, "hex");

  const authorization =
    `${algorithm} ` +
    `Credential=${secretId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, ` +
    `Signature=${signature}`;

  return {
    authorization,
    timestamp,
    region,
    version,
    action,
    contentType,
  };
}

/** 导出 provider：主进程按 id 注册并调用 translate */
module.exports = {
  id: "tencent",
  version: "1.0.0",
  name: "Tencent Cloud TMT",
  description:
    "需要 SecretId/SecretKey。按 TC3-HMAC-SHA256 签名请求 TextTranslate",
  requiredEnv: ["TENCENTCLOUD_SECRET_ID", "TENCENTCLOUD_SECRET_KEY"],
  optionalEnv: ["TENCENTCLOUD_REGION", "TENCENTCLOUD_ENDPOINT", "TENCENTCLOUD_PROJECT_ID"],
  async translate({ text, sourceLang, targetLang }, { signal, env }) {
    assertRequiredString("text", text, "Tencent");
    assertRequiredString("targetLang", targetLang, "Tencent");
    assertRequiredEnv(
      env,
      ["TENCENTCLOUD_SECRET_ID", "TENCENTCLOUD_SECRET_KEY"],
      "Tencent"
    );
    const secretId = env.TENCENTCLOUD_SECRET_ID;
    const secretKey = env.TENCENTCLOUD_SECRET_KEY;

    const endpoint = env.TENCENTCLOUD_ENDPOINT || "tmt.tencentcloudapi.com";
    const region = env.TENCENTCLOUD_REGION || "ap-guangzhou";
    const action = "TextTranslate";
    const version = "2018-03-21";
    const service = "tmt";
    const timestamp = Math.floor(Date.now() / 1000);

    const payloadObj = {
      SourceText: text,
      Source: normalizeSourceLang(sourceLang, "auto"),
      Target: targetLang,
      ProjectId: Number(env.TENCENTCLOUD_PROJECT_ID || 0),
    };
    const payload = JSON.stringify(payloadObj);

    const sig = signTc3({
      secretId,
      secretKey,
      service,
      host: endpoint,
      region,
      action,
      version,
      payload,
      timestamp,
    });

    const textBody = await fetchTextOrThrow(
      `https://${endpoint}`,
      {
        method: "POST",
        headers: {
          Authorization: sig.authorization,
          "Content-Type": sig.contentType,
          Host: endpoint,
          "X-TC-Action": action,
          "X-TC-Timestamp": String(timestamp),
          "X-TC-Version": version,
          "X-TC-Region": region,
        },
        body: payload,
        signal,
      },
      "Tencent"
    );

    const data = parseJsonTextSafe(textBody);
    if (!data) {
      throw new Error(`Tencent 响应不是合法 JSON: ${truncateDetail(textBody)}`);
    }
    const translated = data?.Response?.TargetText;
    return assertTranslatedText(translated, "Tencent", data);
  },
};

