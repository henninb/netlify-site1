const { getEnforceDebug, netlifyHandler, jsonResponse } = require('./lib/captcha-enforce');

const handler = netlifyHandler(async (req) => getEnforceDebug(req));

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }
  return handler(event);
};
