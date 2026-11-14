/**
 * Verify that unconfigured Alimtalk template IDs are blocked before Solapi calls.
 * SMS and friendtalk are not currently in use and are outside this check's scope.
 *
 * Run with: node scripts/verify-kakao-template-guard.js
 */
const assert = require('assert');
const express = require('express');
const createKakaoRouter = require('../routes/kakao');
const { ALIMTALK_TPL_IDS } = require('../lib/alimtalk-template-ids');

function createHarness() {
  const calls = { alimtalk: [], db: [] };
  const db = {
    run(...args) {
      calls.db.push(args);
    },
  };
  const solapi = {
    async sendAlimtalk(params) {
      calls.alimtalk.push(params);
      return { messageId: 'message-id', groupId: 'group-id', status: 'PENDING' };
    },
  };
  const router = createKakaoRouter(db, solapi);
  const sendRoute = router.stack.find(layer => layer.route?.path === '/send');
  assert(sendRoute, 'POST /send route must be registered');
  const handler = sendRoute.route.stack.find(layer => layer.method === 'post').handle;

  return {
    calls,
    async send(body) {
      const response = {
        statusCode: 200,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(value) {
          this.body = value;
          return this;
        },
      };
      await handler({ body }, response);
      return response;
    },
  };
}

async function main() {
  const harness = createHarness();

  for (const templateKey of ['CONSENT', 'SEVERANCE']) {
    assert.strictEqual(
      String(ALIMTALK_TPL_IDS[templateKey]).trim().toUpperCase(),
      'N/A',
      `${templateKey} must be configured as N/A for this verification`
    );
    const response = await harness.send({ to: '01093362454', templateKey });
    assert.strictEqual(response.statusCode, 400);
    assert.strictEqual(response.body.code, 'TEMPLATE_NOT_CONFIGURED');
  }

  const directIdResponse = await harness.send({
    to: '01093362454',
    templateId: '  n/a ',
  });
  assert.strictEqual(directIdResponse.statusCode, 400);
  assert.strictEqual(directIdResponse.body.code, 'TEMPLATE_NOT_CONFIGURED');
  assert.strictEqual(harness.calls.alimtalk.length, 0);
  assert.strictEqual(harness.calls.db.length, 0);

  const validTemplateResponse = await harness.send({
    to: '01093362454',
    templateKey: 'CONTRACT',
  });
  assert.strictEqual(validTemplateResponse.statusCode, 200);
  assert.strictEqual(harness.calls.alimtalk.length, 1);
  assert.strictEqual(harness.calls.alimtalk[0].templateId, ALIMTALK_TPL_IDS.CONTRACT);

  console.log('PASS: N/A Alimtalk templates are blocked; valid Alimtalk templates remain available.');
}

main().catch((error) => {
  console.error('FAIL:', error);
  process.exitCode = 1;
});
