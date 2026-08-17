'use strict';
const {
  buildJournalLine,
  maskBody,
  javaMap,
  fmtStamp,
} = require('../middleware/requestJournal');

describe('requestJournal – buildJournalLine', () => {
  const start = new Date('2026-07-31T00:28:10.708Z');
  const end   = new Date('2026-07-31T00:28:10.713Z');

  const base = {
    start, end,
    reqId: 'rea-trust-shedst1-app-deployment-6759995567-j4fkb2026073109281000193678',
    trace: '*rea-trust-shedst1-app-deployment-6759995567-j4fkb2026073109281000193678',
    thread: 'node-http',
    system: 'APPLICATION',
    envName: 'production',
    hostname: 'rea-trust-shedst1-app-deployment-6759995567-j4fkb',
    companyId: '8267',
    accountId: 'null',
    uri: '/admin/reaAdmAutLoginOthExecuteAction.do',
    method: 'GET',
    contentType: 'application/json',
    contentLength: '751',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    cookie: 'JSESSIONID=4D633F66330E74FE35DE97A2318C2198',
    reqHeaders: { accept: 'text/html', host: 'st1.example.jp', cookie: 'JSESSIONID=4D63' },
    dto: {},
    queryParameters: {},
    queryString: '',
    status: 404,
    resSize: 1591,
    resHeaders: { 'X-Content-Type-Options': ['nosniff'], 'X-Frame-Options': 'DENY' },
    errorCode: '0',
    messages: [],
  };

  test('emits 32 tab-separated fields matching the legacy journal shape', () => {
    const line = buildJournalLine(base);
    const fields = line.split('\t');
    expect(fields.length).toBe(32);

    expect(fields[0]).toBe('2026-07-31 00:28:10,708');          // start ts (comma millis)
    expect(fields[1]).toBe(`[${base.reqId}]`);                    // request id
    expect(fields[2]).toBe(`[${base.trace}]`);                    // trace id
    expect(fields[3]).toBe('[node-http]');                        // thread
    expect(fields[4]).toBe('[INFO ]');                            // level
    expect(fields[5]).toBe('[HTTP_REQUEST_JOURNAL]');             // logger
    expect(fields[7]).toBe('HTTP_RES');                           // type
    expect(fields[8]).toBe('FILTER');                             // layer
    expect(fields[9]).toBe('production');                         // env
    expect(fields[11]).toBe('APPLICATION');                       // system
    expect(fields[12]).toBe('8267');                              // company id
    expect(fields[13]).toBe('null');                              // account id
    expect(fields[14]).toBe('/admin/reaAdmAutLoginOthExecuteAction.do');
    expect(fields[15]).toBe('GET');
    expect(fields[16]).toBe('application/json');
    expect(fields[17]).toBe('751');
    expect(fields[19]).toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    expect(fields[20]).toBe('JSESSIONID=4D633F66330E74FE35DE97A2318C2198');
    expect(fields[23]).toBe('404');
    expect(fields[24]).toBe('1591');
    expect(fields[26]).toBe('[X-Content-Type-Options=[nosniff],X-Frame-Options=[DENY]]');
    expect(fields[28]).toBe('0');
    expect(fields[29]).toBe('[]');
    expect(fields[30]).toBe('2026-07-31 00:28:10,713');
    expect(fields[31]).toBe('5[msec]');
  });

  test('captures a masked JSON body into the dto of the request-body column', () => {
    const line = buildJournalLine({
      ...base,
      method: 'POST',
      status: 200,
      dto: { email: 'general-user@example.com', password: 'hunter2' },
    });
    const fields = line.split('\t');
    const body = JSON.parse(fields[22]);
    expect(body.dto).toEqual({ email: 'general-user@example.com', password: '*****' });
    expect(body.queryParameters).toEqual({});
    expect(body.queryString).toBe('');
    expect(body.uploadedFileInfoMap).toEqual({});
  });

  test('formats auth fast-path account id in the sample style', () => {
    const line = buildJournalLine({
      ...base,
      accountId: 'ACC0000005',
      status: 200,
      messages: [
        'MessageId=REAI100002, MessageTextSummary=管理者アカウントの登録が完了しました。, MessageTextDetail=null, TargetProperties=[]',
      ],
    });
    const fields = line.split('\t');
    expect(fields[13]).toBe('ACC0000005');
    expect(fields[29]).toContain('MessageId=REAI100002');
  });
});

describe('requestJournal – helpers', () => {
  test('maskBody redacts nested sensitive keys', () => {
    const body = { user: { email: 'a@b.com', token: 'abc' }, secret: 'x'.repeat(40) };
    expect(maskBody(body).user.token).toBe('*****');
    expect(maskBody(body).secret).toBe('*****');
    expect(maskBody(body).user.email).toBe('a@b.com');
  });

  test('javaMap renders arrays inside brackets', () => {
    expect(javaMap({ 'X-Content-Type-Options': ['nosniff'], 'X-Frame-Options': 'DENY' }))
      .toBe('[X-Content-Type-Options=[nosniff],X-Frame-Options=[DENY]]');
    expect(javaMap({})).toBe('[]');
  });

  test('fmtStamp uses comma-separated milliseconds', () => {
    expect(fmtStamp(new Date('2026-07-31T00:28:10.708Z'))).toBe('2026-07-31 00:28:10,708');
  });
});
