const net = require('net');

const HUMAN_APP_ID = process.env.HUMAN_APP_ID;
const HUMAN_IFRAME_ORIGIN =
  process.env.HUMAN_IFRAME_ORIGIN || 'https://iframe.hsprotect.net';
const ENFORCER_AUTH_TOKEN = process.env.ENFORCER_AUTH_TOKEN;
const ENFORCE_URL = HUMAN_APP_ID
  ? `https://sapi-${HUMAN_APP_ID}.perimeterx.net/api/v1/enforce/risk`
  : null;
const ENFORCE_STRICT_CGP = process.env.ENFORCE_STRICT_CGP === '1';
const ENFORCE_API_ON_SUBMIT = process.env.ENFORCE_API_ON_SUBMIT !== '0';

const MAC_PATTERN = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;

const DEFAULT_TRUSTED_IP_HEADERS = [
  'x-forwarded-for',
  'x-real-ip',
  'cf-connecting-ip',
  'true-client-ip',
  'x-client-ip',
  'x-nf-client-connection-ip',
  'client-ip',
];

const TRUSTED_IP_HEADERS = (process.env.TRUSTED_IP_HEADERS || '')
  .split(',')
  .map((header) => header.trim().toLowerCase())
  .filter(Boolean);

const IP_HEADER_NAMES =
  TRUSTED_IP_HEADERS.length > 0 ? TRUSTED_IP_HEADERS : DEFAULT_TRUSTED_IP_HEADERS;

const FALLBACK_CLIENT_IP = '1.2.3.4';
const COOKIE_NAME_ORDER = ['pxcts', '_pxcts', '_pxvid', '_pxff_tm', '_px3'];

function normalizeIp(raw) {
  if (raw == null) return null;

  let ip = String(raw).trim();
  if (!ip) return null;

  if (ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }

  if (ip.startsWith('::ffff:')) {
    ip = ip.slice(7);
  }

  if (ip.startsWith('[') && ip.endsWith(']')) {
    ip = ip.slice(1, -1);
  }

  return ip;
}

function isBogusClientIp(ip) {
  if (!ip || net.isIP(ip) === 0) return true;

  if (net.isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 0) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    return false;
  }

  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::' || lower === '0:0:0:0:0:0:0:1') return true;
  if (lower.startsWith('fe80:')) return true;
  return false;
}

function headerClientIp(headers, name) {
  const value = headers[name];
  if (typeof value !== 'string' || !value.trim()) return null;
  return normalizeIp(value);
}

function clientIpFromRequest(req) {
  const headers = req.headers || {};
  const candidates = [];

  if (req.ip) {
    candidates.push(req.ip);
  }

  for (const name of IP_HEADER_NAMES) {
    const ip = headerClientIp(headers, name);
    if (ip) candidates.push(ip);
  }

  if (req.socket?.remoteAddress) {
    candidates.push(req.socket.remoteAddress);
  }

  for (const raw of candidates) {
    const ip = normalizeIp(raw);
    if (ip && !isBogusClientIp(ip)) {
      return ip;
    }
  }

  return FALLBACK_CLIENT_IP;
}

function isFallbackClientIp(ip) {
  return ip === FALLBACK_CLIENT_IP;
}

function normalizePageUrl(url) {
  if (!url || typeof url !== 'string') return url;
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    return parsed.href;
  } catch {
    return url.split('#')[0];
  }
}

function parseCookieString(header, jar = {}) {
  if (!header || typeof header !== 'string') return jar;

  for (const part of header.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const name = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1);
    try {
      jar[name] = decodeURIComponent(value);
    } catch {
      jar[name] = value;
    }
  }

  return jar;
}

function parseRequestCookies(req) {
  const headers = req.headers || {};
  const body = req.body || {};
  const jar = parseCookieString(headers.cookie, {});

  if (body && typeof body.humanCookies === 'object' && body.humanCookies !== null) {
    for (const [name, value] of Object.entries(body.humanCookies)) {
      if (typeof value === 'string' && value) {
        jar[name] = value;
      }
    }
  }

  if (typeof body.cookieHeader === 'string' && body.cookieHeader) {
    parseCookieString(body.cookieHeader, jar);
  }

  for (const [field, cookieName] of [
    ['px3', '_px3'],
    ['pxvid', '_pxvid'],
    ['pxcts', '_pxcts'],
  ]) {
    if (typeof body[field] === 'string' && body[field]) {
      jar[cookieName] = body[field];
      if (field === 'pxcts') {
        jar.pxcts = body[field];
      }
    }
  }

  if (typeof body.vid === 'string' && body.vid) {
    jar._pxvid = jar._pxvid || body.vid;
  }

  return jar;
}

function hasClearanceCookie(cookies) {
  return Boolean(cookies._px3 || cookies.px3);
}

function buildAdditional(cookies) {
  const additional = {};

  const px3 = cookies._px3 || cookies.px3;
  const pxvid = cookies._pxvid || cookies.pxvid;
  const pxcts = cookies._pxcts || cookies.pxcts;

  if (px3) additional.px3 = px3;
  if (pxvid) additional.pxvid = pxvid;
  if (pxcts) additional.pxcts = pxcts;

  const requestCookieNames = [];
  for (const name of COOKIE_NAME_ORDER) {
    if (cookies[name]) {
      requestCookieNames.push(name);
    }
  }
  for (const name of Object.keys(cookies)) {
    if (
      (name.startsWith('_px') || name.startsWith('px')) &&
      !requestCookieNames.includes(name)
    ) {
      requestCookieNames.push(name);
    }
  }
  if (requestCookieNames.length > 0) {
    additional.request_cookie_names = requestCookieNames;
  }

  additional.http_version = '1.1';

  return additional;
}

function buildEnforcePayload({ url, clientIp: ip, userAgent, cookies, method }) {
  const normalizedIp = normalizeIp(ip);
  if (!normalizedIp || isBogusClientIp(normalizedIp)) {
    throw new Error('client_ip must be a valid, non-loopback IP address');
  }

  const headers = [{ name: 'User-Agent', value: userAgent }];
  if (method === 'POST') {
    headers.push({ name: 'Content-Type', value: 'application/json' });
  }

  return {
    request: {
      url,
      client_ip: normalizedIp,
      method,
      headers,
    },
    additional: buildAdditional(cookies),
  };
}

async function callEnforceRisk(payload) {
  const response = await fetch(ENFORCE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ENFORCER_AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  return { ok: response.ok, status: response.status, body };
}

function enforceSnapshot(body) {
  if (!body || typeof body !== 'object') {
    return null;
  }
  const enrichment = body.data_enrichment;
  let cgp;
  if (enrichment == null) {
    cgp = null;
  } else if (Object.prototype.hasOwnProperty.call(enrichment, 'cgp')) {
    cgp = enrichment.cgp;
  } else {
    cgp = null;
  }
  return {
    action: body.action,
    score: body.score,
    uuid: body.uuid,
    vid: body.vid,
    status: body.status,
    pxhd: body.pxhd,
    cgp,
    data_enrichment: enrichment ?? null,
  };
}

function enforceHttpStatusToClient(status) {
  if (status === 401) return 401;
  if (status === 400) return 400;
  if (status === 415) return 415;
  return 502;
}

async function validateWithEnforce({ challengeRequestUrl, ip, userAgent, cookies }) {
  let payload;
  try {
    payload = buildEnforcePayload({
      url: challengeRequestUrl,
      clientIp: ip,
      userAgent,
      cookies,
      method: 'GET',
    });
  } catch (err) {
    return {
      ok: false,
      clientStatus: 400,
      error: err.message,
      clientIp: normalizeIp(ip),
      sapiRequest: null,
    };
  }

  const sapiRequest = payload.request;
  const clientIpResolved = sapiRequest.client_ip;

  let result;
  try {
    result = await callEnforceRisk(payload);
  } catch (err) {
    console.error('Enforce API error:', err);
    return {
      ok: false,
      clientStatus: 502,
      error: 'Unable to reach Enforcer API.',
      clientIp: clientIpResolved,
      sapiRequest,
    };
  }

  const enforce = enforceSnapshot(result.body);

  if (!result.ok) {
    return {
      ok: false,
      clientStatus: enforceHttpStatusToClient(result.status),
      error: 'Enforcer API request failed.',
      enforce,
      detail: `Enforce API HTTP ${result.status}`,
      clientIp: clientIpResolved,
      sapiRequest,
    };
  }

  if (result.body.status !== 0) {
    return {
      ok: false,
      clientStatus: 403,
      error: 'Enforcer API returned an unsuccessful status.',
      enforce,
      clientIp: clientIpResolved,
      sapiRequest,
    };
  }

  if (ENFORCE_STRICT_CGP && result.body.data_enrichment?.cgp != 1) {
    return {
      ok: false,
      clientStatus: 403,
      error: 'Captcha verification failed (cgp is not 1).',
      enforce,
      clientIp: clientIpResolved,
      sapiRequest,
    };
  }

  return {
    ok: true,
    verificationMode: ENFORCE_STRICT_CGP ? 'cgp' : 'enforce-api',
    enforce,
    clientIp: clientIpResolved,
    sapiRequest,
  };
}

function challengeRequestUrlFromReq(req) {
  const headers = req.headers || {};
  const query = req.query || {};
  const body = req.body || {};
  const host = headers.host || 'localhost';
  const protocol = req.protocol || 'https';
  const pageUrl =
    (typeof query.pageUrl === 'string' && query.pageUrl) ||
    (typeof body.challengeRequestUrl === 'string' && body.challengeRequestUrl) ||
    (typeof body.pageUrl === 'string' && body.pageUrl) ||
    `${protocol}://${host}/captcha-on/`;
  return normalizePageUrl(pageUrl);
}

function enforceDebugInfo(req, { challengeRequestUrl, cookies } = {}) {
  const ip = clientIpFromRequest(req);
  const url = challengeRequestUrl || challengeRequestUrlFromReq(req);
  const headers = req.headers || {};
  const userAgent = headers['user-agent'] || 'Mozilla/5.0';
  const jar = cookies ?? parseRequestCookies(req);

  try {
    const payload = buildEnforcePayload({
      url,
      clientIp: ip,
      userAgent,
      cookies: jar,
      method: 'GET',
    });
    return {
      clientIp: payload.request.client_ip,
      fallback: isFallbackClientIp(payload.request.client_ip),
      sapiRequest: payload.request,
    };
  } catch (err) {
    return {
      clientIp: ip,
      fallback: isFallbackClientIp(ip),
      sapiRequest: null,
      error: err.message,
    };
  }
}

function getConfig() {
  if (!HUMAN_APP_ID) {
    return { status: 503, body: { error: 'Server missing HUMAN_APP_ID in .env' } };
  }
  return {
    status: 200,
    body: {
      humanAppId: HUMAN_APP_ID,
      humanIframeOrigin: HUMAN_IFRAME_ORIGIN,
    },
  };
}

function getClientIp(req) {
  const ip = clientIpFromRequest(req);
  return {
    status: 200,
    body: {
      clientIp: ip,
      resolved: ip !== FALLBACK_CLIENT_IP,
      fallback: ip === FALLBACK_CLIENT_IP,
    },
  };
}

function getEnforceDebug(req) {
  return {
    status: 200,
    body: enforceDebugInfo(req, {
      challengeRequestUrl: challengeRequestUrlFromReq(req),
    }),
  };
}

async function postSubmit(req) {
  const body = req.body || {};
  const macAddress = typeof body.macAddress === 'string' ? body.macAddress.trim() : '';
  if (!MAC_PATTERN.test(macAddress)) {
    return { status: 400, body: { error: 'Invalid MAC address format.' } };
  }

  const cookies = parseRequestCookies(req);
  const captchaPassed = Boolean(body.captchaPassed);

  if (!captchaPassed) {
    return {
      status: 403,
      body: { error: 'Complete the verification challenge before submitting.' },
    };
  }

  if (!hasClearanceCookie(cookies)) {
    return {
      status: 400,
      body: { error: 'Missing _px3 clearance cookie. Complete the challenge and try again.' },
    };
  }

  const challengeRequestUrl = challengeRequestUrlFromReq(req);

  if (!ENFORCE_API_ON_SUBMIT) {
    return {
      status: 503,
      body: { error: 'Enforce API validation is disabled (ENFORCE_API_ON_SUBMIT=0).' },
    };
  }

  if (!ENFORCER_AUTH_TOKEN) {
    return {
      status: 503,
      body: { error: 'Server is not configured. Set ENFORCER_AUTH_TOKEN in .env.' },
    };
  }

  const headers = req.headers || {};
  const userAgent = headers['user-agent'] || 'Mozilla/5.0';
  const ip = clientIpFromRequest(req);
  const fallback = isFallbackClientIp(ip);

  const validation = await validateWithEnforce({
    challengeRequestUrl,
    ip,
    userAgent,
    cookies,
  });

  if (!validation.ok) {
    return {
      status: validation.clientStatus,
      body: {
        error: validation.error,
        enforce: validation.enforce,
        clientIp: validation.clientIp ?? ip,
        sapiRequest: validation.sapiRequest ?? null,
        fallback: isFallbackClientIp(validation.clientIp ?? ip),
        ...(validation.detail && { detail: validation.detail }),
      },
    };
  }

  return {
    status: 200,
    body: {
      ok: true,
      message: `MAC address ${macAddress} accepted.`,
      verificationMode: validation.verificationMode,
      enforce: validation.enforce,
      clientIp: validation.clientIp,
      sapiRequest: validation.sapiRequest,
      fallback,
    },
  };
}

function netlifyHeaders(event) {
  const headers = {};
  for (const [key, value] of Object.entries(event.headers || {})) {
    headers[key.toLowerCase()] = value;
  }
  return headers;
}

function netlifyRequestFromEvent(event) {
  const headers = netlifyHeaders(event);
  let body = event.body || '';
  if (body && event.isBase64Encoded) {
    body = Buffer.from(body, 'base64').toString();
  }
  if (body && typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  return {
    headers,
    query: event.queryStringParameters || {},
    body,
    protocol: 'https',
    ip: headers['x-nf-client-connection-ip'] || headers['client-ip'],
  };
}

function jsonResponse(status, body) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function netlifyHandler(handler) {
  return async (event) => {
    const req = netlifyRequestFromEvent(event);
    const result = await handler(req);
    return jsonResponse(result.status, result.body);
  };
}

module.exports = {
  getConfig,
  getClientIp,
  getEnforceDebug,
  postSubmit,
  netlifyHandler,
  jsonResponse,
};
