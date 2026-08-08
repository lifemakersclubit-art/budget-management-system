/* ================================================================
   Budget Management System - API Backend (Google Apps Script)
   Deploy as Web App. Frontend calls this via fetch().
   ================================================================ */

// ======================== CONFIG ========================

var CONFIG = {
  SPREADSHEET_ID: '19A3aldFVV9RVBtG5aM2OqBBn7sPUMOUC3AMy3mRDmIE',
  SHEETS: {
    REQUESTS: 'Requests',
    ITEMS: 'Items',
    WORKFLOW: 'Workflow',
    REPLIES: 'Replies'
  },
  EMAIL: {
    ADMIN: 'Kareem.shair2@gmail.com',
    WATCHER_1: 'Lifemakersclub.it@gmail.com',
    WATCHER_3: 'seif2412002@gmail.com',
    WATCHER_4: 'seif.tamer@lifemakers.org',
    WATCHER_5: 'Leaguemanagerunielm@gmail.com',
    SUBJECT_PREFIX: '[Budget Request]',
    FROM_NAME: 'Budget Management System'
  },
  TIMEZONE: 'Africa/Cairo',
  REQUEST_TYPES: {
    MONTHLY: 'ميزانية شهرية',
    URGENT: 'ميزانية عاجلة',
    TECHNICAL: 'احتياج فني',
    TRANSPORT: 'بدل مواصلات'
  },
  STATUS: {
    NEW: 'New',
    UNDER_REVIEW: 'Under Review',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    COMPLETED: 'Completed',
    PENDING: 'Pending'
  },
  WORKFLOW_ACTIONS: {
    CREATED: 'Created',
    EMAIL_SENT: 'Email Sent',
    REPLY_RECEIVED: 'Reply Received',
    FORWARDED: 'Forwarded',
    CLOSED: 'Closed',
    REJECTED: 'Rejected',
    APPROVED: 'Approved',
    STATUS_CHANGED: 'Status Changed'
  },
  SECTORS: ['اللجان المركزية','التوسع','التفعيل','قطاع بحري','قطاع الجنوب 1','قطاع الجنوب 2','قطاع شمال الصعيد','قطاع القاهرة الكبري','قطاع القناة'],
  GOVERNORATES: ['القاهرة','الأسكندرية','بورسعيد','السويس','دمياط','الدقهلية','الشرقية','القليوبية','كفر الشيخ','الغربية','المنوفية','البحيرة','الإسماعيلية','الجيزة','بنى سويف','الفيوم','المنيا','أسيوط','سوهاج','قنا','أسوان','الأقصر','البحر الأحمر','الوادي الجديد','مطروح','شمال سيناء','جنوب سيناء'],
  UNIVERSITIES: ['فريق مركزي','جامعة القاهرة','جامعة المنصورة','جامعة السويس','جامعة قناة السويس','جامعة بنها','جامعة الأزهر بالقاهرة','جامعة MTI','جامعة المنيا','جامعة بني سويف','جامعة أسيوط','جامعة أسوان','جامعة قنا','جامعة سوهاج','جامعة المعهد العاشر فرع مطروح','جامعة المعهد العاشر','جامعة المنوفية','جامعة طنطا','جامعة طيبة التكنولوجية','جامعة Sphinx','جامعة الأقصر الحكومية','جامعة الأقصر الأهلية','جامعة سيناء','جامعة العريش','جامعة EST','جامعة مطروح','جامعة الوادى الجديد','جامعة تفهنا فرع الأزهر','جامعة الأقصر فرع الأزهر','معهد القاهرة العالى الجديد','جامعة اللوتس','المعهد التكنولوچى العالى للعلوم التطبيقية','المعهد العالى للخدمة الإجتماعية باسوان','جامعة الأهرام الكندية','المعهد العالي للهندسة بالأقصر','جامعة المنوفية الأهلية','جامعة المنصورة الاهلية','جامعة الزقازيق','جامعة ميريت'],
  COMMITTEES: ['Media','HR','PR','Training','Activation','IT','Attraction'],
  EXPENSE_ITEMS: ['إيفنت','مطبوعات','جيفتات','استقبال','لوجستيك','قاعات','Other'],
  COLORS: {
    PRIMARY: '#014976',
    SECONDARY: '#5f6368',
    SUCCESS: '#34a853',
    WARNING: '#FBAE42',
    ERROR: '#ea4335',
    INFO: '#4285f4',
    BACKGROUND: '#F4F3EF',
    CARD: '#ffffff',
    TEXT: '#202124',
    TEXT_SECONDARY: '#5f6368',
    BORDER: '#dadce0',
    ACCENT: '#e8f0fe'
  },
  CACHE_DURATION: 300,
  FORM_OPEN: true,
  RATE_LIMIT: {
    MAX_REQUESTS: 10,
    WINDOW_SECONDS: 60
  }
};


// ======================== UTILS ========================

var Utils = (function() {
  'use strict';

  function formatDate(date, format) {
    if (!date) return '';
    date = new Date(date);
    format = format || 'yyyy-MM-dd HH:mm:ss';
    try { return Utilities.formatDate(date, CONFIG.TIMEZONE, format); }
    catch (e) { return date.toString(); }
  }

  function formatCurrency(amount) {
    return parseFloat(amount || 0).toFixed(2) + ' ج.م';
  }

  function buildResponse(success, data, message, error) {
    return { success: success, data: data || null, message: message || '', error: error || '', timestamp: new Date().toISOString() };
  }

  function createErrorResponse(message) {
    return ContentService.createTextOutput(JSON.stringify(buildResponse(false, null, '', message))).setMimeType(ContentService.MimeType.JSON);
  }

  function createSuccessResponse(data, message) {
    return ContentService.createTextOutput(JSON.stringify(buildResponse(true, data, message, ''))).setMimeType(ContentService.MimeType.JSON);
  }

  function logError(error, context) {
    Logger.log('ERROR [' + context + ']: ' + error.toString());
  }

  return { formatDate: formatDate, formatCurrency: formatCurrency, buildResponse: buildResponse, createErrorResponse: createErrorResponse, createSuccessResponse: createSuccessResponse, logError: logError };
})();


// ======================== DATABASE ========================

var Database = (function() {
  'use strict';

  var spreadsheet = null;
  var sheets = {};
  var cache = CacheService.getScriptCache();

  function getCacheVersion() {
    return PropertiesService.getScriptProperties().getProperty('data_version') || '0';
  }
  function bumpCacheVersion() {
    PropertiesService.getScriptProperties().setProperty('data_version', String(new Date().getTime()));
  }

  function init() {
    try {
      spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      sheets = {
        requests: spreadsheet.getSheetByName(CONFIG.SHEETS.REQUESTS),
        items: spreadsheet.getSheetByName(CONFIG.SHEETS.ITEMS),
        workflow: spreadsheet.getSheetByName(CONFIG.SHEETS.WORKFLOW),
        replies: spreadsheet.getSheetByName(CONFIG.SHEETS.REPLIES)
      };
      createSheetsIfNotExist();
      return true;
    } catch (e) {
      Logger.log('Database init error: ' + e.toString());
      return false;
    }
  }

  function createSheetsIfNotExist() {
    if (!sheets.requests) {
      sheets.requests = spreadsheet.insertSheet(CONFIG.SHEETS.REQUESTS);
      sheets.requests.appendRow(['Request ID','UUID','Timestamp','Request Type','Sector','Governorate','Amount','Description','Requester Name','Requester Email','Requester Phone','Status','Thread ID','Message ID','Total Items','Deadline','Notified Admin','Notes','Extra Data','Created At','Updated At']);
    }
    if (!sheets.items) {
      sheets.items = spreadsheet.insertSheet(CONFIG.SHEETS.ITEMS);
      sheets.items.appendRow(['Item ID','Request ID','Category','Description','Cost','Quantity','Total','Created At']);
    }
    if (!sheets.workflow) {
      sheets.workflow = spreadsheet.insertSheet(CONFIG.SHEETS.WORKFLOW);
      sheets.workflow.appendRow(['Workflow ID','Request ID','Action','Details','Actor Email','Timestamp','Status Before','Status After']);
    }
    if (!sheets.replies) {
      sheets.replies = spreadsheet.insertSheet(CONFIG.SHEETS.REPLIES);
      sheets.replies.appendRow(['Reply ID','Request ID','Thread ID','Message ID','From Email','Subject','Body','Timestamp','Is Admin Reply']);
    }
  }

  function generateRequestId() {
    var lock = LockService.getScriptLock();
    try { lock.waitLock(10000); } catch(e) {}
    try {
      var now = new Date();
      var y = now.getFullYear();
      var m = String(now.getMonth() + 1).padStart(2, '0');
      var d = String(now.getDate()).padStart(2, '0');
      var hh = String(now.getHours()).padStart(2, '0');
      var mm = String(now.getMinutes()).padStart(2, '0');
      var ss = String(now.getSeconds()).padStart(2, '0');
      var props = PropertiesService.getScriptProperties();
      var seqKey = 'rc_' + y + m + d;
      var c = parseInt(props.getProperty(seqKey) || '0') + 1;
      props.setProperty(seqKey, String(c));
      return 'REQ-' + y + m + d + '-' + hh + mm + ss + '-' + String(c).padStart(4, '0');
    } finally { try { lock.releaseLock(); } catch(e) {} }
  }

  function generateUUID() { return Utilities.getUuid(); }

  function saveRequest(data) {
    var lock = LockService.getScriptLock();
    try { lock.waitLock(30000); } catch (e) { throw new Error('Could not acquire lock.'); }
    try {
      var requestId = generateRequestId();
      var uuid = generateUUID();
      var ts = new Date();
      var extras = JSON.stringify({ deadline: data.deadline||'', notifiedCoordinator: data.notifiedCoordinator||false, transferNumber: data.transferNumber||'', activityName: data.activityName||'', followUpEmail: data.followUpEmail||'', purpose: data.purpose||'', committee: data.committee||'', technicalNeed: data.technicalNeed||'', executionDate: data.executionDate||'', submissionDate: data.submissionDate||'', numberOfPeople: data.numberOfPeople||'', reason: data.reason||'' });
      var row = [requestId, uuid, ts, data.requestType, data.sector, data.governorate, data.amount||0, data.description||'', data.requesterName, data.requesterEmail, data.requesterPhone, CONFIG.STATUS.NEW, '', '', data.items?data.items.length:0, data.deadline||'', data.notifiedAdmin||false, data.notes||'', extras, ts, ts];
      sheets.requests.appendRow(row);
      bumpCacheVersion();
      if (data.items && data.items.length > 0) saveItems(requestId, data.items);
      logWorkflow(requestId, CONFIG.WORKFLOW_ACTIONS.CREATED, 'Request created by ' + data.requesterName, data.requesterEmail, '', CONFIG.STATUS.NEW);
      return { requestId: requestId, uuid: uuid, timestamp: ts };
    } finally { lock.releaseLock(); }
  }

  function saveItems(requestId, items) {
    var rows = items.map(function(item) {
      return [generateUUID(), requestId, item.category||'', item.description||'', parseFloat(item.cost)||0, parseInt(item.quantity)||1, (parseFloat(item.cost)||0)*(parseInt(item.quantity)||1), new Date()];
    });
    if (rows.length > 0) {
      var last = sheets.items.getLastRow();
      if (last > 0) { sheets.items.getRange(last+1, 1, rows.length, rows[0].length).setValues(rows); }
      else { sheets.items.appendRow(rows[0]); if (rows.length > 1) sheets.items.getRange(2, 1, rows.length-1, rows[0].length).setValues(rows.slice(1)); }
    }
  }

  function getRequest(requestId) {
    var key = 'req_' + requestId;
    var cached = cache.get(key);
    if (cached) return JSON.parse(cached);
    var data = sheets.requests.getDataRange().getValues();
    var headers = data[0];
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === requestId) {
        var req = {};
        for (var j = 0; j < headers.length; j++) req[headers[j]] = data[i][j];
        cache.put(key, JSON.stringify(req), CONFIG.CACHE_DURATION);
        return req;
      }
    }
    return null;
  }

  function getAllRequests(options) {
    options = options || {};
    var page = options.page || 1, limit = options.limit || 50, status = options.status || '', search = options.search || '', type = options.type || '';
    var cacheKey = 'reqs_' + getCacheVersion() + '_' + page + '_' + limit + '_' + status + '_' + type + '_' + search.toLowerCase();
    var cached = cache.get(cacheKey);
    if (cached) return JSON.parse(cached);
    var data = sheets.requests.getDataRange().getValues();
    var headers = data[0], results = [];
    for (var i = 1; i < data.length; i++) {
      var row = {};
      for (var j = 0; j < headers.length; j++) row[headers[j]] = data[i][j];
      if (status && row['Status'] !== status) continue;
      if (type && row['Request Type'] !== type) continue;
      if (search) { var sl = search.toLowerCase(), match = false; for (var k in row) { if (row[k] && String(row[k]).toLowerCase().indexOf(sl) !== -1) { match = true; break; } } if (!match) continue; }
      results.push(row);
    }
    results.sort(function(a,b) { return new Date(b['Timestamp']) - new Date(a['Timestamp']); });
    var total = results.length, start = (page-1)*limit;
    var result = { data: results.slice(start, start+limit), total: total, page: page, limit: limit, totalPages: Math.ceil(total/limit) };
    cache.put(cacheKey, JSON.stringify(result), 60);
    return result;
  }

  function updateRequestStatus(requestId, newStatus, actorEmail) {
    var lock = LockService.getScriptLock();
    try { lock.waitLock(30000); } catch (e) { throw new Error('Could not acquire lock.'); }
    try {
      var data = sheets.requests.getDataRange().getValues();
      var headers = data[0];
      for (var i = 1; i < data.length; i++) {
        if (data[i][0] === requestId) {
          var si = headers.indexOf('Status'), ui = headers.indexOf('Updated At'), old = data[i][si];
          sheets.requests.getRange(i+1, si+1).setValue(newStatus);
          sheets.requests.getRange(i+1, ui+1).setValue(new Date());
          cache.remove('req_' + requestId);
          bumpCacheVersion();
          logWorkflow(requestId, CONFIG.WORKFLOW_ACTIONS.STATUS_CHANGED, 'Status: '+old+' → '+newStatus, actorEmail, old, newStatus);
          return true;
        }
      }
      return false;
    } finally { lock.releaseLock(); }
  }

  function updateEmailInfo(requestId, threadId, messageId) {
    var lock = LockService.getScriptLock();
    try { lock.waitLock(30000); } catch (e) { throw new Error('Could not acquire lock.'); }
    try {
      var data = sheets.requests.getDataRange().getValues();
      var headers = data[0];
      for (var i = 1; i < data.length; i++) {
        if (data[i][0] === requestId) {
          sheets.requests.getRange(i+1, headers.indexOf('Thread ID')+1).setValue(threadId);
          sheets.requests.getRange(i+1, headers.indexOf('Message ID')+1).setValue(messageId);
          cache.remove('req_' + requestId);
          return true;
        }
      }
      return false;
    } finally { lock.releaseLock(); }
  }

  function logWorkflow(requestId, action, details, actorEmail, statusBefore, statusAfter) {
    sheets.workflow.appendRow([generateUUID(), requestId, action, details, actorEmail||'', new Date(), statusBefore||'', statusAfter||'']);
  }

  function saveReply(data) {
    var fromEmail = data.fromEmail || data.from || data.email || '';
    var body = data.body || data.replyBody || '';
    var subject = data.subject || '';
    var threadId = data.threadId || '';
    var messageId = data.messageId || '';
    var isAdmin = data.isAdminReply || data.isAdmin || false;
    if (!data.requestId || !body) {
      Logger.log('saveReply skipped: missing requestId or body');
      return null;
    }
    sheets.replies.appendRow([generateUUID(), data.requestId, threadId, messageId, fromEmail, subject, body, new Date(), isAdmin]);
    bumpCacheVersion();
    logWorkflow(data.requestId, CONFIG.WORKFLOW_ACTIONS.REPLY_RECEIVED, 'Reply from ' + fromEmail, fromEmail, '', '');
    return true;
  }

  function getReplies(requestId) {
    if (!requestId) return [];
    try {
      var data = sheets.replies.getDataRange().getValues(), headers = data[0], results = [];
      for (var i = 1; i < data.length; i++) {
        if (data[i][1] === requestId) {
          var r = {};
          for (var j = 0; j < headers.length; j++) r[headers[j]] = data[i][j];
          r.from = r['From Email'] || '';
          r.body = r['Body'] || '';
          r.timestamp = r['Timestamp'] || '';
          r.isAdminReply = r['Is Admin Reply'] || false;
          r.replyId = r['Reply ID'] || '';
          results.push(r);
        }
      }
      return results;
    } catch(e) {
      Logger.log('getReplies error: ' + e.toString());
      return [];
    }
  }

  function getWorkflowLog(requestId) {
    var data = sheets.workflow.getDataRange().getValues(), headers = data[0], results = [];
    for (var i = 1; i < data.length; i++) { if (data[i][1] === requestId) { var l = {}; for (var j = 0; j < headers.length; j++) l[headers[j]] = data[i][j]; results.push(l); } }
    return results;
  }

  function getDashboardStats() {
    var cacheKey = 'stats_' + getCacheVersion();
    var cached = cache.get(cacheKey);
    if (cached) return JSON.parse(cached);
    var data = sheets.requests.getDataRange().getValues();
    var stats = { total:0, new:0, underReview:0, approved:0, rejected:0, completed:0, newAmount:0, underReviewAmount:0, approvedAmount:0, rejectedAmount:0, completedAmount:0, totalAmount:0, byType:{} };
    for (var i = 1; i < data.length; i++) {
      stats.total++;
      var s = data[i][11], t = data[i][3], a = parseFloat(data[i][6])||0;
      if (s===CONFIG.STATUS.NEW) { stats.new++; stats.newAmount+=a; }
      else if (s===CONFIG.STATUS.UNDER_REVIEW) { stats.underReview++; stats.underReviewAmount+=a; }
      else if (s===CONFIG.STATUS.APPROVED) { stats.approved++; stats.approvedAmount+=a; }
      else if (s===CONFIG.STATUS.REJECTED) { stats.rejected++; stats.rejectedAmount+=a; }
      else if (s===CONFIG.STATUS.COMPLETED) { stats.completed++; stats.completedAmount+=a; }
      if (!stats.byType[t]) stats.byType[t]={count:0,amount:0};
      stats.byType[t].count++; stats.byType[t].amount+=a; stats.totalAmount+=a;
    }
    cache.put(cacheKey, JSON.stringify(stats), 60);
    return stats;
  }

  function checkDuplicate(requesterEmail, requestType, timestamp) {
    var fiveMinAgo = new Date(timestamp.getTime() - 5*60*1000);
    var data = sheets.requests.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][9]===requesterEmail && data[i][3]===requestType && new Date(data[i][2])>fiveMinAgo) return true;
    }
    return false;
  }

  function getItems(requestId) {
    var data = sheets.items.getDataRange().getValues(), headers = data[0], results = [];
    for (var i = 1; i < data.length; i++) { if (data[i][1]===requestId) { var it = {}; for (var j = 0; j < headers.length; j++) it[headers[j]] = data[i][j]; results.push(it); } }
    return results;
  }

  return { init:init, saveRequest:saveRequest, getRequest:getRequest, getAllRequests:getAllRequests, updateRequestStatus:updateRequestStatus, updateEmailInfo:updateEmailInfo, logWorkflow:logWorkflow, saveReply:saveReply, getReplies:getReplies, getWorkflowLog:getWorkflowLog, getDashboardStats:getDashboardStats, checkDuplicate:checkDuplicate, getItems:getItems };
})();


// ======================== VALIDATION ========================

var Validation = (function() {
  'use strict';

  function validateRequest(data) {
    var errors = [];
    if (!data.requestType) errors.push('نوع الطلب مطلوب');
    if (!data.sector) errors.push('القطاع مطلوب');
    if (!data.governorate) errors.push('المحافظة مطلوبة');
    if (!data.requesterName || data.requesterName.trim().length < 2) errors.push('اسم مقدم الطلب مطلوب');
    if (!data.requesterEmail || !isValidEmail(data.requesterEmail)) errors.push('البريد الإلكتروني غير صحيح');
    if (!data.requesterPhone || !isValidPhone(data.requesterPhone)) errors.push('رقم الهاتف غير صحيح');
    if (data.requestType===CONFIG.REQUEST_TYPES.MONTHLY) {
      if (!data.budgetMonth) errors.push('شهر الميزانية مطلوب');
      if (!data.amount || parseFloat(data.amount)<=0) errors.push('المبلغ يجب أن يكون أكبر من صفر');
      if (!data.items || data.items.length===0) errors.push('يجب إضافة بنود');
    }
    if (data.requestType===CONFIG.REQUEST_TYPES.URGENT) {
      if (!data.activityName) errors.push('اسم النشاط مطلوب');
      if (!data.amount || parseFloat(data.amount)<=0) errors.push('المبلغ يجب أن يكون أكبر من صفر');
    }
    if (data.requestType===CONFIG.REQUEST_TYPES.TECHNICAL) {
      if (!data.committee) errors.push('اللجنة مطلوبة');
      if (!data.technicalNeed || data.technicalNeed.trim().length<10) errors.push('الاحتياج يجب أن يكون على الأقل 10 أحرف');
      if (!data.executionDate) errors.push('تاريخ التنفيذ مطلوب');
    }
    if (data.requestType===CONFIG.REQUEST_TYPES.TRANSPORT) {
      if (!data.activityName) errors.push('اسم النشاط مطلوب');
      if (!data.amount || parseFloat(data.amount)<=0) errors.push('المبلغ يجب أن يكون أكبر من صفر');
      if (!data.numberOfPeople || parseInt(data.numberOfPeople)<=0) errors.push('عدد الأفراد يجب أن يكون أكبر من صفر');
    }
    return { isValid: errors.length===0, errors: errors, data: sanitizeInputs(data) };
  }

  function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
  function isValidPhone(phone) { return /^[\d\s\-\+\(\)]{10,15}$/.test(phone); }

  function sanitizeInputs(data) {
    var s = {};
    for (var k in data) {
      if (data.hasOwnProperty(k)) {
        if (typeof data[k]==='string') s[k] = data[k].replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;').trim();
        else if (Array.isArray(data[k])) s[k] = data[k].map(function(i){ return typeof i==='string' ? i.replace(/</g,'&lt;').replace(/>/g,'&gt;') : i; });
        else s[k] = data[k];
      }
    }
    return s;
  }

  function validateCSRF(token) {
    if (!token) return false;
    var stored = PropertiesService.getScriptProperties().getProperty('csrf_token');
    if (!stored) { generateCSRFToken(); stored = PropertiesService.getScriptProperties().getProperty('csrf_token'); }
    var ts = PropertiesService.getScriptProperties().getProperty('csrf_timestamp');
    if (ts && (new Date().getTime()-parseInt(ts))/1000 > 3600) { generateCSRFToken(); return false; }
    return token === stored;
  }

  function generateCSRFToken() {
    var token = Utilities.getUuid();
    PropertiesService.getScriptProperties().setProperty('csrf_token', token);
    PropertiesService.getScriptProperties().setProperty('csrf_timestamp', String(new Date().getTime()));
    return token;
  }

  function checkRateLimit(identifier) {
    var c = CacheService.getScriptCache(), key = 'rate_' + identifier, count = parseInt(c.get(key)||'0');
    if (count >= CONFIG.RATE_LIMIT.MAX_REQUESTS) return false;
    c.put(key, String(count+1), CONFIG.RATE_LIMIT.WINDOW_SECONDS);
    return true;
  }

  return { validateRequest:validateRequest, isValidEmail:isValidEmail, isValidPhone:isValidPhone, sanitizeInputs:sanitizeInputs, validateCSRF:validateCSRF, generateCSRFToken:generateCSRFToken, checkRateLimit:checkRateLimit };
})();


// ======================== EMAIL SERVICE ========================

var EmailService = (function() {
  'use strict';

  function sendRequestEmail(requestData, requestId) {
    try {
      var htmlBody = buildRequestEmailBody(requestData, requestId);
      var plainBody = buildRequestEmailPlain(requestData, requestId);
      var subject = CONFIG.EMAIL.SUBJECT_PREFIX + ' ' + requestId + ' - ' + requestData.requestType;
      var recipients = [CONFIG.EMAIL.ADMIN, CONFIG.EMAIL.WATCHER_1, CONFIG.EMAIL.WATCHER_3, CONFIG.EMAIL.WATCHER_4, CONFIG.EMAIL.WATCHER_5];
      var unique = [];
      recipients.forEach(function(r){ if(r && unique.indexOf(r)===-1) unique.push(r); });
      var thread = GmailApp.sendEmail(unique.join(','), subject, plainBody, { htmlBody: htmlBody, name: CONFIG.EMAIL.FROM_NAME, replyTo: requestData.requesterEmail });
      var threadId = thread.getId();
      Database.logWorkflow(requestId, CONFIG.WORKFLOW_ACTIONS.EMAIL_SENT, 'Email sent to '+unique.join(', '), CONFIG.EMAIL.ADMIN, '', '');
      return { threadId: threadId, messageId: threadId };
    } catch(e) { Logger.log('Email error: '+e.toString()); throw e; }
  }

  function buildRequestEmailBody(data, requestId) {
    var itemsTable = '';
    if (data.items && data.items.length > 0) {
      itemsTable = '<div style="font-size:15px;color:#014976;margin:20px 0 10px;padding-bottom:5px;border-bottom:2px solid #e8f0fe;font-weight:bold;">بنود الصرف</div><table style="width:100%;border-collapse:collapse;margin:10px 0;"><thead><tr><th style="background:#014976;color:white;padding:12px;text-align:right;font-size:13px;">البند</th><th style="background:#014976;color:white;padding:12px;text-align:right;font-size:13px;">الوصف</th><th style="background:#014976;color:white;padding:12px;text-align:right;font-size:13px;">التكلفة</th></tr></thead><tbody>';
      var total = 0;
      data.items.forEach(function(item) { var cost=parseFloat(item.cost)||0; total+=cost; itemsTable+='<tr><td style="padding:10px 12px;border-bottom:1px solid #e0e0e0;font-size:13px;">'+esc(item.category)+'</td><td style="padding:10px 12px;border-bottom:1px solid #e0e0e0;font-size:13px;">'+esc(item.description)+'</td><td style="padding:10px 12px;border-bottom:1px solid #e0e0e0;font-size:13px;">'+cost.toFixed(2)+' ج.م</td></tr>'; });
      itemsTable+='<tr style="background:#e8f0fe;font-weight:bold;"><td colspan="2" style="padding:10px 12px;border-top:2px solid #014976;">الإجمالي</td><td style="padding:10px 12px;border-top:2px solid #014976;">'+total.toFixed(2)+' ج.م</td></tr></tbody></table>';
    } else { itemsTable = '<div style="font-size:15px;color:#014976;margin:20px 0 10px;padding-bottom:5px;border-bottom:2px solid #e8f0fe;font-weight:bold;">بنود الصرف</div><p style="color:#5f6368;">لا توجد بنود</p>'; }
    var replyLink = 'https://lifemakersclubit-art.github.io/budget-management-system/reply.html?requestId='+encodeURIComponent(requestId)+'&email='+encodeURIComponent(data.requesterEmail);
    var sheetUrl = 'https://docs.google.com/spreadsheets/d/'+CONFIG.SPREADSHEET_ID+'/edit';
    var h = '';
    h += '<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"></head><body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">';
    h += '<div style="max-width:600px;margin:0 auto;background:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.1);">';
    h += '<div style="background:linear-gradient(135deg,#014976,#016199);color:white;padding:30px;text-align:center;">';
    h += '<h1 style="margin:0;font-size:24px;">نظام إدارة الطلبات</h1>';
    h += '<div style="margin-top:10px;font-size:14px;opacity:0.9;">رقم الطلب: '+requestId+'</div></div>';
    h += '<div style="padding:30px;">';
    h += '<div style="text-align:center;margin-bottom:20px;"><span style="display:inline-block;background:#34a853;color:white;padding:5px 15px;border-radius:20px;font-size:12px;">طلب جديد</span></div>';
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:20px;">';
    h += '<div style="background:#f8f9fa;padding:15px;border-radius:8px;"><div style="font-size:12px;color:#5f6368;margin-bottom:5px;">مقدم الطلب</div><div style="font-size:14px;color:#202124;font-weight:bold;">'+esc(data.requesterName)+'</div></div>';
    h += '<div style="background:#f8f9fa;padding:15px;border-radius:8px;"><div style="font-size:12px;color:#5f6368;margin-bottom:5px;">القطاع</div><div style="font-size:14px;color:#202124;font-weight:bold;">'+esc(data.sector)+'</div></div>';
    h += '<div style="background:#f8f9fa;padding:15px;border-radius:8px;"><div style="font-size:12px;color:#5f6368;margin-bottom:5px;">نوع الطلب</div><div style="font-size:14px;color:#202124;font-weight:bold;">'+esc(data.requestType)+'</div></div>';
    h += '<div style="background:#f8f9fa;padding:15px;border-radius:8px;"><div style="font-size:12px;color:#5f6368;margin-bottom:5px;">المحافظة</div><div style="font-size:14px;color:#202124;font-weight:bold;">'+esc(data.governorate)+'</div></div>';
    h += '<div style="background:#f8f9fa;padding:15px;border-radius:8px;"><div style="font-size:12px;color:#5f6368;margin-bottom:5px;">البريد الإلكتروني</div><div style="font-size:14px;color:#202124;">'+esc(data.requesterEmail)+'</div></div>';
    h += '<div style="background:#f8f9fa;padding:15px;border-radius:8px;"><div style="font-size:12px;color:#5f6368;margin-bottom:5px;">رقم الهاتف</div><div style="font-size:14px;color:#202124;">'+esc(data.requesterPhone)+'</div></div>';
    h += '</div>';
    h += itemsTable;
    h += '<div style="margin-top:20px;"><div style="font-size:15px;color:#014976;margin-bottom:8px;font-weight:bold;">ملاحظات</div><p style="color:#5f6368;line-height:1.6;font-size:14px;">'+esc(data.notes||'لا توجد ملاحظات')+'</p></div>';
    h += '<div style="text-align:center;margin-top:25px;"><a href="'+replyLink+'" style="display:inline-block;background:#FBAE42;color:#012e52;padding:12px 30px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:bold;">الرد على الطلب</a></div>';
    h += '<div style="text-align:center;margin-top:12px;"><a href="'+sheetUrl+'" style="display:inline-block;background:#014976;color:white;padding:10px 25px;border-radius:6px;text-decoration:none;font-size:14px;">فتح الجدول</a></div>';
    h += '</div>';
    h += '<div style="background:#f8f9fa;padding:15px;text-align:center;font-size:12px;color:#5f6368;"><p>هذا إيميل تلقائي من نظام إدارة الطلبات</p></div>';
    h += '</div></body></html>';
    return h;
  }

  function buildRequestEmailPlain(data, requestId) {
    var t = 'نظام إدارة الطلبات\nرقم الطلب: '+requestId+'\n\nمقدم الطلب: '+data.requesterName+'\nالقطاع: '+data.sector+'\nنوع الطلب: '+data.requestType+'\nالمحافظة: '+data.governorate+'\nالبريد الإلكتروني: '+data.requesterEmail+'\nرقم الهاتف: '+data.requesterPhone+'\n\n';
    if (data.items && data.items.length>0) { t+='بنود الصرف:\n'; var total=0; data.items.forEach(function(i){var c=parseFloat(i.cost)||0;total+=c;t+='- '+i.category+': '+i.description+' - '+c.toFixed(2)+' ج.م\n';}); t+='الإجمالي: '+total.toFixed(2)+' ج.م\n\n'; }
    t+='ملاحظات: '+(data.notes||'لا توجد ملاحظات')+'\n\nالرد على الطلب: https://lifemakersclubit-art.github.io/budget-management-system/reply.html?requestId='+encodeURIComponent(requestId)+'&email='+encodeURIComponent(data.requesterEmail)+'\n\nفتح الجدول: https://docs.google.com/spreadsheets/d/'+CONFIG.SPREADSHEET_ID+'/edit';
    return t;
  }

  function sendReplyEmail(requestId, replyBody, threadId) {
    try {
      var request = Database.getRequest(requestId);
      if (!request) throw new Error('Request not found: '+requestId);
      var requesterEmail = request['Requester Email'] || '';
      var requesterName = request['Requester Name'] || '';
      var requestStatus = request['Status'] || 'New';
      var requestType = request['Request Type'] || '';
      var sector = request['Sector'] || '';
      var statusLabels = { 'New':'جديد', 'Under Review':'قيد المراجعة', 'Approved':'معتمد', 'Rejected':'مرفوض', 'Completed':'مكتمل' };
      var statusArabic = statusLabels[requestStatus] || requestStatus;
      var statusColors = { 'New':'#3498DB', 'Under Review':'#F39C12', 'Approved':'#2ECC71', 'Rejected':'#E74C3C', 'Completed':'#2ECC71' };
      var statusColor = statusColors[requestStatus] || '#3498DB';
      var replyPageUrl = 'https://lifemakersclubit-art.github.io/budget-management-system/reply.html?requestId='+encodeURIComponent(requestId)+'&email='+encodeURIComponent(requesterEmail);
      var sheetUrl = 'https://docs.google.com/spreadsheets/d/'+CONFIG.SPREADSHEET_ID+'/edit';
      var subject = CONFIG.EMAIL.SUBJECT_PREFIX+' '+requestId+' - رد على طلبك ['+statusArabic+']';
      var plainBody = 'مرحبا '+requesterName+'\n\nرد على طلبك رقم '+requestId+'\nالنوع: '+requestType+'\nالقطاع: '+sector+'\nالحالة: '+statusArabic+'\n\n'+replyBody+'\n\nالرد على الطلب: '+replyPageUrl+'\nفتح الجدول: '+sheetUrl;
      var h = '';
      h += '<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"></head><body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">';
      h += '<div style="max-width:600px;margin:0 auto;background:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.1);">';
      h += '<div style="background:linear-gradient(135deg,#014976,#016199);color:white;padding:25px;text-align:center;">';
      h += '<h1 style="margin:0;font-size:20px;">رد على طلبك '+requestId+'</h1></div>';
      h += '<div style="padding:25px;">';
      h += '<div style="margin-bottom:15px;font-size:14px;color:#5f6368;">مرحبا '+esc(requesterName)+'</div>';
      h += '<div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;">';
      h += '<div style="background:#f8f9fa;padding:12px 16px;border-radius:8px;flex:1;min-width:140px;"><div style="font-size:11px;color:#5f6368;margin-bottom:4px;">نوع الطلب</div><div style="font-size:14px;font-weight:bold;color:#202124;">'+esc(requestType)+'</div></div>';
      h += '<div style="background:#f8f9fa;padding:12px 16px;border-radius:8px;flex:1;min-width:140px;"><div style="font-size:11px;color:#5f6368;margin-bottom:4px;">القطاع</div><div style="font-size:14px;font-weight:bold;color:#202124;">'+esc(sector)+'</div></div>';
      h += '</div>';
      h += '<div style="text-align:center;margin-bottom:20px;"><span style="display:inline-block;background:'+statusColor+';color:white;padding:6px 20px;border-radius:20px;font-size:13px;font-weight:bold;">الحالة: '+statusArabic+'</span></div>';
      h += '<div style="background:#f8f9fa;border-right:4px solid #FBAE42;padding:15px;margin:15px 0;border-radius:4px;"><div style="font-size:12px;color:#5f6368;margin-bottom:6px;font-weight:bold;">الرد:</div><p style="margin:0;color:#202124;line-height:1.8;font-size:15px;">'+esc(replyBody)+'</p></div>';
      h += '<div style="text-align:center;margin-top:25px;"><a href="'+replyPageUrl+'" style="display:inline-block;background:#FBAE42;color:#012e52;padding:12px 30px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:bold;">الرد على هذا الطلب</a></div>';
      h += '<div style="text-align:center;margin-top:12px;"><a href="'+sheetUrl+'" style="display:inline-block;background:#014976;color:white;padding:10px 25px;border-radius:6px;text-decoration:none;font-size:14px;">فتح الجدول</a></div>';
      h += '</div>';
      h += '<div style="background:#f8f9fa;padding:15px;text-align:center;font-size:12px;color:#5f6368;"><p>هذا إيميل تلقائي من نظام إدارة الطلبات</p></div>';
      h += '</div></body></html>';
      var opts = { htmlBody: h, name: CONFIG.EMAIL.FROM_NAME };

      var recipients = [];
      if (requesterEmail) recipients.push(requesterEmail);
      recipients.push(CONFIG.EMAIL.WATCHER_1);
      recipients.push(CONFIG.EMAIL.WATCHER_3);
      recipients.push(CONFIG.EMAIL.WATCHER_4);
      recipients.push(CONFIG.EMAIL.WATCHER_5);

      var uniqueRecipients = [];
      recipients.forEach(function(r){ if(r && uniqueRecipients.indexOf(r)===-1) uniqueRecipients.push(r); });

      try { GmailApp.sendEmail(uniqueRecipients.join(','), subject, plainBody, opts); } catch(e) { Logger.log('Reply email error: '+e.toString()); }

      Database.logWorkflow(requestId, CONFIG.WORKFLOW_ACTIONS.REPLY_RECEIVED, 'Reply sent to: '+uniqueRecipients.join(', '), CONFIG.EMAIL.ADMIN, replyBody, '');
      return true;
    } catch(e) { Logger.log('Reply email error: '+e.toString()); throw e; }
  }

  function esc(text) { if (!text) return ''; return String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  return { sendRequestEmail:sendRequestEmail, sendReplyEmail:sendReplyEmail };
})();


// ======================== REPLY SERVICE ========================

var ReplyService = (function() {
  'use strict';

  function checkForReplies() {
    try {
      var threads = GmailApp.search('to:'+CONFIG.EMAIL.ADMIN+' is:unread');
      threads.forEach(function(thread) {
        thread.getMessages().forEach(function(message) {
          var mid = message.getId();
          if (CacheService.getScriptCache().get('processed_'+mid)) return;
          if (message.isDraft() || message.getFrom()===CONFIG.EMAIL.ADMIN) return;
          var rid = extractRequestId(message.getSubject());
          if (rid) processReply(message, thread, rid, mid);
        });
      });
    } catch(e) { Logger.log('Reply check error: '+e.toString()); }
  }

  function processReply(message, thread, requestId, messageId) {
    try {
      var request = Database.getRequest(requestId);
      if (!request) return;
      var replyData = { requestId:requestId, threadId:thread.getId(), messageId:messageId, fromEmail:message.getFrom(), subject:message.getSubject(), body:message.getPlainBody(), isAdminReply:message.getFrom().indexOf(CONFIG.EMAIL.ADMIN)!==-1 };
      Database.saveReply(replyData);
      if (!replyData.isAdminReply) forwardReplyToAdmin(message, requestId);
      CacheService.getScriptCache().put('processed_'+messageId, '1', 86400);
      Database.logWorkflow(requestId, CONFIG.WORKFLOW_ACTIONS.REPLY_RECEIVED, 'Reply from '+message.getFrom(), message.getFrom(), '', '');
    } catch(e) { Logger.log('Process reply error: '+e.toString()); }
  }

  function forwardReplyToAdmin(message, requestId) {
    try {
      var subject = CONFIG.EMAIL.SUBJECT_PREFIX+' '+requestId+' - رد جديد';
      var body = 'رد جديد على الطلب '+requestId+'\n\nمن: '+message.getFrom()+'\nالموضوع: '+message.getSubject()+'\n\nالرسالة:\n'+message.getPlainBody();
      GmailApp.sendEmail(CONFIG.EMAIL.ADMIN, subject, body, { name:CONFIG.EMAIL.FROM_NAME, replyTo:message.getFrom() });
      Database.logWorkflow(requestId, CONFIG.WORKFLOW_ACTIONS.FORWARDED, 'Forwarded from '+message.getFrom(), CONFIG.EMAIL.ADMIN, '', '');
    } catch(e) { Logger.log('Forward error: '+e.toString()); }
  }

  function sendStatusUpdateEmail(requestId, newStatus) {
    try {
      var request = Database.getRequest(requestId);
      if (!request) return;
      var requesterEmail = request['Requester Email'] || '';
      var requesterName = request['Requester Name'] || '';
      var requestType = request['Request Type'] || '';
      var statusLabels = {'New':'جديد','Under Review':'قيد المراجعة','Approved':'معتمد','Rejected':'مرفوض','Completed':'مكتمل'};
      var statusArabic = statusLabels[newStatus] || newStatus;
      var colors = {'New':'#4285f4','Under Review':'#FBAE42','Approved':'#34a853','Rejected':'#ea4335','Completed':'#34a853'};
      var color = colors[newStatus]||'#5f6368';
      var replyPageUrl = 'https://lifemakersclubit-art.github.io/budget-management-system/reply.html?requestId='+encodeURIComponent(requestId)+'&email='+encodeURIComponent(requesterEmail);
      var subject = CONFIG.EMAIL.SUBJECT_PREFIX+' '+requestId+' - تحديث الحالة ['+statusArabic+']';
      var plainBody = 'مرحبا '+requesterName+'\n\nتم تحديث حالة طلبك رقم '+requestId+'\nنوع الطلب: '+requestType+'\nالحالة الجديدة: '+statusArabic+'\n\nالرد على الطلب: '+replyPageUrl+'\n\nفتح الجدول: https://docs.google.com/spreadsheets/d/'+CONFIG.SPREADSHEET_ID+'/edit';
      var htmlBody = '<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"></head><body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;"><div style="max-width:600px;margin:0 auto;background:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.1);"><div style="background:'+color+';color:white;padding:25px;text-align:center;"><h1 style="margin:0;font-size:20px;">تحديث حالة طلبك</h1><p style="margin-top:8px;opacity:0.9;">'+requestId+'</p></div><div style="padding:25px;"><div style="margin-bottom:15px;font-size:14px;color:#5f6368;">مرحبا '+esc(requesterName)+'</div><div style="background:#f8f9fa;padding:12px 16px;border-radius:8px;margin-bottom:15px;"><div style="font-size:11px;color:#5f6368;margin-bottom:4px;">نوع الطلب</div><div style="font-size:14px;font-weight:bold;color:#202124;">'+esc(requestType)+'</div></div><p style="text-align:center;margin-bottom:15px;color:#5f6368;">تم تحديث حالة طلبك إلى:</p><div style="text-align:center;margin-bottom:20px;"><span style="display:inline-block;background:'+color+';color:white;padding:8px 28px;border-radius:25px;font-size:16px;font-weight:bold;">'+statusArabic+'</span></div><div style="text-align:center;"><a href="https://docs.google.com/spreadsheets/d/'+CONFIG.SPREADSHEET_ID+'/edit" style="display:inline-block;background:#014976;color:white;padding:10px 25px;border-radius:6px;text-decoration:none;font-size:14px;">عرض التفاصيل</a></div></div><div style="background:#f8f9fa;padding:15px;text-align:center;font-size:12px;color:#5f6368;"><p>هذا إيميل تلقائي من نظام إدارة الطلبات</p></div></div></body></html>';
      var opts = { htmlBody: htmlBody, name: CONFIG.EMAIL.FROM_NAME };

      var recipients = [];
      if (requesterEmail) recipients.push(requesterEmail);
      recipients.push(CONFIG.EMAIL.WATCHER_1);
      recipients.push(CONFIG.EMAIL.WATCHER_3);
      recipients.push(CONFIG.EMAIL.WATCHER_4);
      recipients.push(CONFIG.EMAIL.WATCHER_5);
      var uniqueRecipients = [];
      recipients.forEach(function(r){ if(r && uniqueRecipients.indexOf(r)===-1) uniqueRecipients.push(r); });

      try { GmailApp.sendEmail(uniqueRecipients.join(','), subject, plainBody, opts); } catch(e) { Logger.log('Status email error: '+e.toString()); }
    } catch(e) { Logger.log('Status update email error: '+e.toString()); }
  }

  function extractRequestId(subject) { if (!subject) return null; var m = subject.match(/REQ-\d{8}-\d{6}-\d{4}/); return m ? m[0] : null; }

  return { checkForReplies:checkForReplies, sendStatusUpdateEmail:sendStatusUpdateEmail };
})();


// ======================== WEB APP ========================

function doGet(e) {
  try {
    var p = e.parameter || {};
    var action = p.action || '';

    init();

    switch (action) {
      case 'getConfig':
        var config = {
          requestTypes: CONFIG.REQUEST_TYPES,
          statuses: CONFIG.STATUS,
          sectors: CONFIG.SECTORS,
          governorates: CONFIG.GOVERNORATES,
          universities: CONFIG.UNIVERSITIES,
          committees: CONFIG.COMMITTEES,
          expenseItems: CONFIG.EXPENSE_ITEMS,
          colors: CONFIG.COLORS,
          formOpen: CONFIG.FORM_OPEN
        };
        return Utils.createSuccessResponse(config);

      case 'getCSRFToken':
        var existing = PropertiesService.getScriptProperties().getProperty('csrf_token');
        var exTs = PropertiesService.getScriptProperties().getProperty('csrf_timestamp');
        var expired = exTs && (new Date().getTime() - parseInt(exTs)) / 1000 > 3600;
        if (existing && !expired) {
          return Utils.createSuccessResponse({ token: existing });
        }
        var token = Validation.generateCSRFToken();
        return Utils.createSuccessResponse({ token: token });

      case 'getRequests':
        var reqs = Database.getAllRequests({ page: parseInt(p.page)||1, limit: parseInt(p.limit)||10, status: p.status||'', type: p.type||'', search: p.search||'' });
        return Utils.createSuccessResponse(reqs);

      case 'getRequest':
        if (!p.requestId) return Utils.createErrorResponse('Request ID is required');
        var req = Database.getRequest(p.requestId);
        if (!req) return Utils.createErrorResponse('Request not found');
        return Utils.createSuccessResponse(req);

      case 'getStats':
        var stats = Database.getDashboardStats();
        return Utils.createSuccessResponse(stats);

      case 'getItems':
        var items = Database.getItems(p.requestId);
        return Utils.createSuccessResponse(items);

      case 'getWorkflow':
        var workflow = Database.getWorkflowLog(p.requestId);
        return Utils.createSuccessResponse(workflow);

      case 'getReplies':
        var replies = Database.getReplies(p.requestId);
        return Utils.createSuccessResponse(replies);

      case 'submitRequest':
        if (!CONFIG.FORM_OPEN) return Utils.createErrorResponse('تم إغلاق الاستمارة حالياً. نرجو المحاولة لاحقاً.');
        if (!Validation.validateCSRF(p.csrfToken)) return Utils.createErrorResponse('Invalid CSRF token');
        if (!Validation.checkRateLimit(p.requesterEmail)) return Utils.createErrorResponse('Too many requests');
        if (Database.checkDuplicate(p.requesterEmail, p.requestType, new Date())) return Utils.createErrorResponse('Duplicate request');
        var submitData = {requesterName:p.requesterName,requesterEmail:p.requesterEmail,requesterPhone:p.requesterPhone,requestType:p.requestType,sector:p.sector,governorate:p.governorate,university:p.university,notes:p.notes,notifiedAdmin:p.notifiedAdmin==='true',budgetMonth:p.budgetMonth,amount:p.amount,deadline:p.deadline,notifiedCoordinator:p.notifiedCoordinator==='true',transferNumber:p.transferNumber,submissionDate:p.submissionDate,activityName:p.activityName,committee:p.committee,executionDate:p.executionDate,purpose:p.purpose,followUpEmail:p.followUpEmail,technicalNeed:p.technicalNeed,numberOfPeople:p.numberOfPeople,reason:p.reason};
        try { submitData.items = p.items ? JSON.parse(p.items) : []; } catch(ex) { submitData.items = []; }
        var sv = Validation.validateRequest(submitData);
        if (!sv.isValid) return Utils.createErrorResponse(sv.errors.join(', '));
        var result = Database.saveRequest(sv.data);
        try { var email = EmailService.sendRequestEmail(sv.data, result.requestId); Database.updateEmailInfo(result.requestId, email.threadId, email.messageId); } catch(em){ Logger.log('Email err: '+em); }
        var ntoken = Validation.generateCSRFToken();
        return Utils.createSuccessResponse({ requestId: result.requestId, uuid: result.uuid, timestamp: result.timestamp, csrfToken: ntoken });

      case 'updateStatus':
        if (!p.requestId||!p.newStatus) return Utils.createErrorResponse('Missing fields: requestId=' + p.requestId + ', newStatus=' + p.newStatus);
        if (!Validation.validateCSRF(p.csrfToken)) {
          Logger.log('updateStatus CSRF failed. Token received: ' + (p.csrfToken||'EMPTY'));
          return Utils.createErrorResponse('Invalid CSRF');
        }
        var upd = Database.updateRequestStatus(p.requestId, p.newStatus, p.actorEmail||'');
        if (!upd) return Utils.createErrorResponse('Request not found: ' + p.requestId);
        Logger.log('updateStatus: ' + p.requestId + ' → ' + p.newStatus);
        try { ReplyService.sendStatusUpdateEmail(p.requestId, p.newStatus); } catch(em){ Logger.log('updateStatus email err: ' + em); }
        var updToken = Validation.generateCSRFToken();
        return Utils.createSuccessResponse({ csrfToken: updToken });

      case 'sendReply':
        if (!p.requestId||!p.replyBody) return Utils.createErrorResponse('Missing fields');
        try {
          var reqR = Database.getRequest(p.requestId);
          if (!reqR) return Utils.createErrorResponse('Request not found: ' + p.requestId);
          if (!Validation.validateCSRF(p.csrfToken)) {
            Logger.log('sendReply CSRF failed. Token received: ' + (p.csrfToken||'EMPTY'));
            return Utils.createErrorResponse('Invalid CSRF');
          }
          Database.saveReply({ requestId: p.requestId, body: p.replyBody, fromEmail: CONFIG.EMAIL.ADMIN, isAdminReply: true });
          Logger.log('sendReply: Reply saved for ' + p.requestId);
          try { EmailService.sendReplyEmail(p.requestId, p.replyBody, reqR['Thread ID']); } catch(em) { Logger.log('sendReply email err (non-fatal): ' + em); }
          var srToken = Validation.generateCSRFToken();
          return Utils.createSuccessResponse({ csrfToken: srToken });
        } catch(err) {
          Logger.log('sendReply error: ' + err.toString());
          return Utils.createErrorResponse('حدث خطأ أثناء إرسال الرد: ' + err.toString());
        }

      case 'getRequestPublic':
        var pubReq = Database.getRequest(p.requestId);
        if (!pubReq) return Utils.createErrorResponse('طلب غير موجود');
        var pubReplies = Database.getReplies(p.requestId);
        return Utils.createSuccessResponse({
          requestId: pubReq['Request ID'],
          requesterName: pubReq['Requester Name'],
          requesterEmail: pubReq['Requester Email'],
          requestType: pubReq['Request Type'],
          sector: pubReq['Sector'],
          status: pubReq['Status'],
          governorate: pubReq['Governorate'],
          replies: pubReplies
        });

      case 'requesterReply':
        if (!p.requestId || !p.replyBody || !p.email) return Utils.createErrorResponse('جميع الحقول مطلوبة');
        try {
          var rr = Database.getRequest(p.requestId);
          if (!rr) return Utils.createErrorResponse('طلب غير موجود');
          if (rr['Requester Email'] !== p.email) return Utils.createErrorResponse('البريد الإلكتروني غير متطابق');
          var saved = Database.saveReply({ requestId: p.requestId, body: p.replyBody, fromEmail: p.email, isAdminReply: false });
          if (!saved) return Utils.createErrorResponse('حدث خطأ أثناء حفظ الرد');
          try { EmailService.sendReplyEmail(p.requestId, p.replyBody, rr['Thread ID']); } catch(em) { Logger.log('Reply email err: ' + em); }
          return Utils.createSuccessResponse({ message: 'تم إرسال ردك بنجاح' });
        } catch(err) {
          Logger.log('requesterReply error: ' + err.toString());
          return Utils.createErrorResponse('حدث خطأ غير متوقع');
        }

      default:
        return Utils.createSuccessResponse({ status: 'Budget Management API is running', version: '2.0' });
    }

  } catch(err) {
    Logger.log('doGet error: ' + err.toString());
    return Utils.createErrorResponse(err.toString());
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var data = body.data || {};
    init();

    switch (action) {

      case 'getConfig':
        var config = {
          requestTypes: CONFIG.REQUEST_TYPES,
          statuses: CONFIG.STATUS,
          sectors: CONFIG.SECTORS,
          governorates: CONFIG.GOVERNORATES,
          universities: CONFIG.UNIVERSITIES,
          committees: CONFIG.COMMITTEES,
          expenseItems: CONFIG.EXPENSE_ITEMS,
          colors: CONFIG.COLORS,
          formOpen: CONFIG.FORM_OPEN
        };
        return Utils.createSuccessResponse(config);

      case 'getCSRFToken':
        var existing = PropertiesService.getScriptProperties().getProperty('csrf_token');
        var exTs = PropertiesService.getScriptProperties().getProperty('csrf_timestamp');
        var expired = exTs && (new Date().getTime() - parseInt(exTs)) / 1000 > 3600;
        if (existing && !expired) {
          return Utils.createSuccessResponse({ token: existing });
        }
        var token = Validation.generateCSRFToken();
        return Utils.createSuccessResponse({ token: token });

      case 'submitRequest':
        if (!CONFIG.FORM_OPEN) return Utils.createErrorResponse('تم إغلاق الاستمارة حالياً. نرجو المحاولة لاحقاً.');
        if (!Validation.validateCSRF(data.csrfToken)) return Utils.createErrorResponse('Invalid CSRF token');
        if (!Validation.checkRateLimit(data.requesterEmail)) return Utils.createErrorResponse('Too many requests');
        if (Database.checkDuplicate(data.requesterEmail, data.requestType, new Date())) return Utils.createErrorResponse('Duplicate request');
        var v = Validation.validateRequest(data);
        if (!v.isValid) return Utils.createErrorResponse(v.errors.join(', '));
        var result = Database.saveRequest(v.data);
        try { var email = EmailService.sendRequestEmail(v.data, result.requestId); Database.updateEmailInfo(result.requestId, email.threadId, email.messageId); } catch(em){ Logger.log('Email err: '+em); }
        var newToken = Validation.generateCSRFToken();
        return Utils.createSuccessResponse({ requestId: result.requestId, uuid: result.uuid, timestamp: result.timestamp, csrfToken: newToken });

      case 'getRequests':
        var reqs = Database.getAllRequests(data);
        return Utils.createSuccessResponse(reqs);

      case 'getRequest':
        var req = Database.getRequest(data.requestId);
        if (!req) return Utils.createSuccessResponse(null, 'Not found');
        return Utils.createSuccessResponse(req);

      case 'getStats':
        var stats = Database.getDashboardStats();
        return Utils.createSuccessResponse(stats);

      case 'updateStatus':
        if (!Validation.validateCSRF(data.csrfToken)) return Utils.createSuccessResponse(null, 'Invalid CSRF');
        if (!data.requestId||!data.newStatus) return Utils.createSuccessResponse(null, 'Missing fields');
        var updated = Database.updateRequestStatus(data.requestId, data.newStatus, data.actorEmail||'');
        if (!updated) return Utils.createSuccessResponse(null, 'Not found');
        try { ReplyService.sendStatusUpdateEmail(data.requestId, data.newStatus); } catch(em){}
        var nt = Validation.generateCSRFToken();
        return Utils.createSuccessResponse({ csrfToken: nt });

      case 'sendReply':
        if (!data.requestId||!data.replyBody) return Utils.createSuccessResponse(null, 'Missing fields');
        try {
          var reqR = Database.getRequest(data.requestId);
          if (!reqR) return Utils.createSuccessResponse(null, 'Request not found');
          if (!Validation.validateCSRF(data.csrfToken)) return Utils.createSuccessResponse(null, 'Invalid CSRF');
          Database.saveReply({ requestId: data.requestId, body: data.replyBody, fromEmail: CONFIG.EMAIL.ADMIN, isAdminReply: true });
          try { EmailService.sendReplyEmail(data.requestId, data.replyBody, reqR['Thread ID']); } catch(em) { Logger.log('doPost sendReply email err: ' + em); }
          var nt2 = Validation.generateCSRFToken();
          return Utils.createSuccessResponse({ csrfToken: nt2 });
        } catch(err) {
          Logger.log('doPost sendReply error: ' + err.toString());
          return Utils.createSuccessResponse(null, 'حدث خطأ أثناء إرسال الرد');
        }

      case 'getItems':
        var items = Database.getItems(data.requestId);
        return Utils.createSuccessResponse(items);

      case 'getWorkflow':
        var workflow = Database.getWorkflowLog(data.requestId);
        return Utils.createSuccessResponse(workflow);

      case 'getReplies':
        var replies = Database.getReplies(data.requestId);
        return Utils.createSuccessResponse(replies);

      default:
        return Utils.createErrorResponse('Unknown action: ' + action);
    }

  } catch(err) {
    Logger.log('doPost error: ' + err.toString());
    return Utils.createErrorResponse(err.toString());
  }
}


// ======================== TRIGGERS ========================

function init() {
  try { Database.init(); } catch(e) { Logger.log('DB init: '+e.toString()); }
}

function checkReplies() { init(); ReplyService.checkForReplies(); }

function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(function(t){ ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('checkReplies').timeBased().everyMinutes(1).create();
  Logger.log('Triggers setup done');
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Budget Management')
    .addItem('Setup Triggers','setupTriggers')
    .addItem('Init System','init')
    .addItem('Check Replies','checkReplies')
    .addItem('Test: Create 4 Entries','createTestEntries')
    .addToUi();
}

function createTestEntries() {
  init();
  var now = new Date();

  var entries = [
    {
      requestType: 'ميزانية شهرية',
      sector: 'اللجان المركزية',
      governorate: 'القاهرة',
      university: 'فريق مركزي',
      requesterName: 'أحمد محمد علي',
      requesterEmail: 'ahmed.test@example.com',
      requesterPhone: '01012345678',
      amount: 15000,
      notes: 'ميزانية شهر يوليو لنشاط اللجان المركزية',
      budgetMonth: 'يوليو 2026',
      items: [
        { category: 'إيفنت', description: 'تنظيم ورشة عمل', cost: 5000 },
        { category: 'مطبوعات', description: 'طباعة مطويات', cost: 3000 },
        { category: 'لوجستيك', description: 'نقل وأILogISTICS', cost: 2000 }
      ]
    },
    {
      requestType: 'ميزانية عاجلة',
      sector: 'التوسع',
      governorate: 'الإسكندرية',
      university: 'جامعة الإسكندرية',
      requesterName: 'سارة أحمد حسن',
      requesterEmail: 'sara.test@example.com',
      requesterPhone: '01098765432',
      amount: 8500,
      notes: 'احتياج عاجل لنشاط التوسع في الإسكندرية خلال هذا الأسبوع',
      activityName: 'حملة التوسع - الإسكندرية',
      deadline: '2026-07-30',
      items: []
    },
    {
      requestType: 'احتياج فني',
      sector: 'قطاع بحري',
      governorate: 'دمياط',
      university: 'جامعة المنصورة',
      requesterName: 'محمد إبراهيم سعيد',
      requesterEmail: 'mohamed.test@example.com',
      requesterPhone: '01155544433',
      amount: 0,
      notes: 'احتياج فني لتجهيزات قاعات التدريب',
      committee: 'IT',
      technicalNeed: 'تجهيز نظام صوتي لقاعة التدريب الرئيسية بسعة 200 شخص مع شاشة عرض وبروجكتور',
      executionDate: '2026-08-05',
      items: []
    },
    {
      requestType: 'بدل مواصلات',
      sector: 'التفعيل',
      governorate: 'الجيزة',
      university: 'جامعة القاهرة',
      requesterName: 'نورا خالد عبدالرحمن',
      requesterEmail: 'noura.test@example.com',
      requesterPhone: '01222333444',
      amount: 6000,
      notes: 'بدل مواصلات لأعضاء فريق التفعيل',
      activityName: 'ورشة التفعيل - الجيزة',
      numberOfPeople: 15,
      reason: 'تنقل الأعضاء بين الفروع أثناء النشاط',
      items: []
    }
  ];

  var createdIds = [];

  entries.forEach(function(entry, index) {
    try {
      var requestId = generateRequestId();
      var uuid = generateUUID();
      var extras = JSON.stringify({
        deadline: entry.deadline || '',
        activityName: entry.activityName || '',
        committee: entry.committee || '',
        technicalNeed: entry.technicalNeed || '',
        executionDate: entry.executionDate || '',
        numberOfPeople: entry.numberOfPeople || '',
        reason: entry.reason || '',
        budgetMonth: entry.budgetMonth || ''
      });
      var row = [
        requestId, uuid, now, entry.requestType, entry.sector, entry.governorate,
        entry.amount || 0, entry.notes || '', entry.requesterName, entry.requesterEmail,
        entry.requesterPhone, CONFIG.STATUS.NEW, '', '',
        entry.items ? entry.items.length : 0, entry.deadline || '', false,
        entry.notes || '', extras, now, now
      ];
      sheets.requests.appendRow(row);

      if (entry.items && entry.items.length > 0) {
        saveItems(requestId, entry.items);
      }

      logWorkflow(requestId, CONFIG.WORKFLOW_ACTIONS.CREATED, 'Test entry #' + (index+1), 'system@test.com', '', CONFIG.STATUS.NEW);

      createdIds.push(requestId);
      Logger.log('Created test entry: ' + requestId + ' - ' + entry.requesterName + ' (' + entry.requestType + ')');
    } catch(e) {
      Logger.log('Error creating test entry #' + (index+1) + ': ' + e.toString());
    }
  });

  Logger.log('=== Created ' + createdIds.length + ' test entries ===');
  createdIds.forEach(function(id) { Logger.log(id); });
  SpreadsheetApp.getUi().alert('تم إنشاء ' + createdIds.length + ' تسجيلات تجريبية بنجاح!\n\n' + createdIds.join('\n'));
  return createdIds;
}
