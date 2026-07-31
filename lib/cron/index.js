/**
 * lib/cron/index.js — 크론잡 통합 등록
 */
module.exports = function(db, solapi) {
  require('./scheduled-notice')(db);
  require('./contract-expiry')(db, solapi);
  require('./regular-conversion')(db, solapi);
  require('./regular-conversion-weekly')(db, solapi);
  require('./probation-expiry')(db, solapi);
  require('./kakao-retry')(db, solapi);
  require('./retention-cleanup')(db);
};
