const { postSubmit, netlifyHandler, jsonResponse } = require('./lib/captcha-enforce');

const handler = netlifyHandler(async (req) => postSubmit(req));

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }
  return handler(event);
};
