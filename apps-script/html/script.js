/**
 * script.js - Main Application Logic
 */

// Global state
var appState = {
  currentPage: 'form',
  currentRequestPage: 1,
  totalPages: 1,
  csrfToken: '',
  config: null,
  initialized: false
};

// Hardcoded config fallback (used if server call fails)
var FALLBACK_CONFIG = {
  requestTypes: {
    MONTHLY: '\u0645\u064a\u0632\u0627\u0646\u064a\u0629 \u0634\u0647\u0631\u064a\u0629',
    URGENT: '\u0645\u064a\u0632\u0627\u0646\u064a\u0629 \u0639\u0627\u062c\u0644\u0629',
    TECHNICAL: '\u0627\u062d\u062a\u064a\u0627\u062c \u0641\u0646\u064a',
    TRANSPORT: '\u0628\u062f\u0644 \u0645\u0648\u0627\u0635\u0644\u0627\u062a'
  },
  statuses: { NEW: 'New', UNDER_REVIEW: 'Under Review', APPROVED: 'Approved', REJECTED: 'Rejected', COMPLETED: 'Completed' },
  sectors: ['\u0627\u0644\u062c\u0627\u0645\u0639\u0629', '\u0627\u0644\u0643\u0644\u064a\u0629', '\u0627\u0644\u0645\u0639\u0647\u062f', '\u0627\u0644\u0645\u0631\u0643\u0632', '\u0627\u0644\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0639\u0627\u0645\u0629'],
  governorates: ['\u0627\u0644\u0642\u0627\u0647\u0631\u0629', '\u0627\u0644\u062c\u064a\u0632\u0629', '\u0627\u0644\u0625\u0633\u0643\u0646\u062f\u0631\u064a\u0629', '\u0627\u0644\u0642\u0644\u064a\u0648\u0628\u064a\u0629', '\u0627\u0644\u0634\u0631\u0642\u064a\u0629', '\u0627\u0644\u063a\u0631\u0628\u064a\u0629', '\u0627\u0644\u0645\u0646\u0648\u0641\u064a\u0629', '\u0627\u0644\u0628\u062d\u064a\u0631\u0629', '\u0643\u0641\u0631 \u0627\u0644\u0634\u064a\u062e', '\u062f\u0645\u064a\u0627\u0637', '\u0627\u0644\u062f\u0642\u0647\u0644\u064a\u0629', '\u0627\u0644\u0641\u064a\u0648\u0645', '\u0628\u0646\u064a \u0633\u0648\u064a\u0641', '\u0627\u0644\u0645\u0646\u064a\u0627', '\u0623\u0633\u064a\u0648\u0637', '\u0633\u0648\u0647\u0627\u062c', '\u0642\u0646\u0627', '\u0627\u0644\u0623\u0642\u0635\u0631', '\u0623\u0633\u0648\u0627\u0646', '\u0627\u0644\u0628\u062d\u0631 \u0627\u0644\u0623\u062d\u0645\u0631', '\u0627\u0644\u0648\u0627\u062f\u064a \u0627\u0644\u062c\u062f\u064a\u062f', '\u0645\u0637\u0631\u0648\u062d', '\u0634\u0645\u0627\u0644 \u0633\u064a\u0646\u0627\u0621', '\u062c\u0646\u0648\u0628 \u0633\u064a\u0646\u0627\u0621'],
  committees: ['Media', 'HR', 'PR', 'Training', 'Activation', 'IT', 'Attraction'],
  expenseItems: ['\u0625\u064a\u0641\u0646\u062a', '\u0645\u0637\u0628\u0648\u0639\u0627\u062a', '\u062c\u064a\u0641\u062a\u0627\u062a', '\u0627\u0633\u062a\u0642\u0628\u0627\u0644', '\u0644\u0648\u062c\u0633\u062a\u064a\u0643', '\u0642\u0639\u0627\u062a', 'Other'],
  colors: {}
};

// Initialize application
function initApp() {
  // Always set date first (no server needed)
  var today = new Date().toISOString().split('T')[0];
  var dateField = document.getElementById('submissionDateDisplay');
  if (dateField) dateField.value = today;

  // Show loading with a safety timeout
  showLoading();
  var safetyTimeout = setTimeout(function() {
    // If still loading after 8 seconds, use fallback config
    if (!appState.initialized) {
      applyFallbackConfig();
    }
  }, 8000);

  // Try loading from server
  try {
    google.script.run
      .withSuccessHandler(function(response) {
        clearTimeout(safetyTimeout);
        try {
          var data = (typeof response === 'string') ? JSON.parse(response) : response;
          if (data.success) {
            appState.config = data.data;
            populateDropdowns(data.data);
            appState.initialized = true;
            hideLoading();
          } else {
            applyFallbackConfig();
          }
        } catch (parseErr) {
          applyFallbackConfig();
        }
      })
      .withFailureHandler(function(error) {
        clearTimeout(safetyTimeout);
        applyFallbackConfig();
      })
      .getConfigJson();
  } catch (e) {
    clearTimeout(safetyTimeout);
    applyFallbackConfig();
  }
}

// Apply fallback config when server is unavailable
function applyFallbackConfig() {
  if (appState.initialized) return;
  appState.initialized = true;
  appState.config = FALLBACK_CONFIG;
  populateDropdowns(FALLBACK_CONFIG);
  hideLoading();
  showToast('\u062a\u0645 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0628\u0646\u062c\u0627\u062d', 'info');
}

// Populate dropdowns
function populateDropdowns(config) {
  // Sectors
  var sectorSelect = document.getElementById('sector');
  config.sectors.forEach(function(sector) {
    var option = document.createElement('option');
    option.value = sector;
    option.textContent = sector;
    sectorSelect.appendChild(option);
  });

  // Governorates
  var govSelect = document.getElementById('governorate');
  config.governorates.forEach(function(gov) {
    var option = document.createElement('option');
    option.value = gov;
    option.textContent = gov;
    govSelect.appendChild(option);
  });

  // Committees
  var committeeSelect = document.getElementById('committee');
  config.committees.forEach(function(committee) {
    var option = document.createElement('option');
    option.value = committee;
    option.textContent = committee;
    committeeSelect.appendChild(option);
  });

  // Load CSRF token
  loadCSRFToken();
}

// Load CSRF token
function loadCSRFToken() {
  google.script.run
    .withSuccessHandler(function(response) {
      var data = (typeof response === 'string') ? JSON.parse(response) : response;
      if (data.success) {
        appState.csrfToken = data.data.token;
        document.getElementById('csrfToken').value = data.data.token;
      }
    })
    .getCSRFTokenJson();
}

// Handle request type change
function handleRequestTypeChange(radio) {
  var sections = ['monthlyBudgetSection', 'urgentBudgetSection', 'technicalNeedSection', 'transportAllowanceSection'];
  sections.forEach(function(id) {
    document.getElementById(id).classList.add('hidden');
  });

  var value = radio.value;
  if (value === 'ميزانية شهرية') {
    document.getElementById('monthlyBudgetSection').classList.remove('hidden');
  } else if (value === 'ميزانية عاجلة') {
    document.getElementById('urgentBudgetSection').classList.remove('hidden');
  } else if (value === 'احتياج فني') {
    document.getElementById('technicalNeedSection').classList.remove('hidden');
  } else if (value === 'بدل مواصلات') {
    document.getElementById('transportAllowanceSection').classList.remove('hidden');
  }
}

// Add item row
function addItemRow(type) {
  type = type || 'monthly';
  var tbodyId = type === 'urgent' ? 'urgentItemsBody' : 'monthlyItemsBody';
  var tbody = document.getElementById(tbodyId);
  var index = tbody.rows.length;
  
  var row = Components.createItemRow(type, index);
  tbody.insertAdjacentHTML('beforeend', row);
  
  updateItemTotal(type);
}

// Remove item row
function removeItemRow(btn, type) {
  var row = btn.closest('tr');
  row.remove();
  updateItemTotal(type);
}

// Update item total
function updateItemTotal(type) {
  type = type || 'monthly';
  var tbodyId = type === 'urgent' ? 'urgentItemsBody' : 'monthlyItemsBody';
  var totalId = type === 'urgent' ? 'urgentTotal' : 'monthlyTotal';
  
  var tbody = document.getElementById(tbodyId);
  var total = 0;
  
  for (var i = 0; i < tbody.rows.length; i++) {
    var row = tbody.rows[i];
    var costInput = row.querySelector('input[type="number"]');
    if (costInput) {
      total += parseFloat(costInput.value) || 0;
    }
  }
  
  document.getElementById(totalId).textContent = total.toFixed(2) + ' ج.م';
}

// Form submission
document.getElementById('requestForm').addEventListener('submit', function(e) {
  e.preventDefault();
  submitRequest();
});

function submitRequest() {
  var form = document.getElementById('requestForm');
  var formData = new FormData(form);
  
  // Get request type
  var requestType = formData.get('requestType');
  if (!requestType) {
    showToast('يرجى اختيار نوع الطلب', 'error');
    return;
  }

  // Build data object
  var data = {
    action: 'submitRequest',
    csrfToken: appState.csrfToken,
    requestType: requestType,
    sector: formData.get('sector'),
    governorate: formData.get('governorate'),
    notes: formData.get('notes'),
    notifiedAdmin: formData.get('notifiedAdmin') === 'true',
    requesterName: formData.get('requesterName'),
    requesterEmail: formData.get('requesterEmail'),
    requesterPhone: formData.get('requesterPhone')
  };

  // Add type-specific data
  if (requestType === 'ميزانية شهرية') {
    data.budgetMonth = formData.get('budgetMonth');
    data.amount = formData.get('amount');
    data.deadline = formData.get('deadline');
    data.notifiedCoordinator = formData.get('notifiedCoordinator') === 'true';
    data.transferNumber = formData.get('transferNumber');
    data.items = getMonthlyItems();
  } else if (requestType === 'ميزانية عاجلة') {
    data.submissionDate = formData.get('submissionDate');
    data.activityName = formData.get('activityName');
    data.amount = formData.get('amount');
    data.transferNumber = formData.get('transferNumber');
    data.items = getUrgentItems();
  } else if (requestType === 'احتياج فني') {
    data.committee = formData.get('committee');
    data.submissionDate = formData.get('submissionDate');
    data.executionDate = formData.get('executionDate');
    data.purpose = formData.get('purpose');
    data.followUpEmail = formData.get('followUpEmail');
    data.technicalNeed = formData.get('technicalNeed');
  } else if (requestType === 'بدل مواصلات') {
    data.activityName = formData.get('activityName');
    data.submissionDate = formData.get('submissionDate');
    data.amount = formData.get('amount');
    data.numberOfPeople = formData.get('numberOfPeople');
    data.reason = formData.get('reason');
    data.transferNumber = formData.get('transferNumber');
  }

  // Validate
  if (!validateFormData(data)) {
    return;
  }

  // Show progress
  showProgress();
  document.getElementById('submitBtn').disabled = true;

  // Submit
  google.script.run
    .withSuccessHandler(function(response) {
      var result = (typeof response === 'string') ? JSON.parse(response) : response;
      hideProgress();
      document.getElementById('submitBtn').disabled = false;

      if (result.success) {
        showToast('تم إرسال الطلب بنجاح! رقم الطلب: ' + result.data.requestId, 'success');
        
        // Update CSRF token
        if (result.data.csrfToken) {
          appState.csrfToken = result.data.csrfToken;
          document.getElementById('csrfToken').value = result.data.csrfToken;
        }

        // Reset form
        form.reset();
        document.getElementById('monthlyItemsBody').innerHTML = '';
        document.getElementById('urgentItemsBody').innerHTML = '';
        
        // Hide sections
        var sections = ['monthlyBudgetSection', 'urgentBudgetSection', 'technicalNeedSection', 'transportAllowanceSection'];
        sections.forEach(function(id) {
          document.getElementById(id).classList.add('hidden');
        });

        // Set date
        var today = new Date().toISOString().split('T')[0];
        document.getElementById('submissionDateDisplay').value = today;
      } else {
        showToast('خطأ: ' + result.error, 'error');
      }
    })
    .withFailureHandler(function(error) {
      hideProgress();
      document.getElementById('submitBtn').disabled = false;
      showToast('خطأ في الاتصال بالخادم', 'error');
    })
    .submitRequestJson(data);
}

// Get monthly items
function getMonthlyItems() {
  var tbody = document.getElementById('monthlyItemsBody');
  var items = [];

  for (var i = 0; i < tbody.rows.length; i++) {
    var row = tbody.rows[i];
    var category = row.querySelector('select') ? row.querySelector('select').value : '';
    var description = row.querySelector('input[type="text"]') ? row.querySelector('input[type="text"]').value : '';
    var cost = row.querySelector('input[type="number"]') ? row.querySelector('input[type="number"]').value : 0;

    if (category || description || cost) {
      items.push({
        category: category,
        description: description,
        cost: parseFloat(cost) || 0,
        quantity: 1
      });
    }
  }

  return items;
}

// Get urgent items
function getUrgentItems() {
  var tbody = document.getElementById('urgentItemsBody');
  var items = [];

  for (var i = 0; i < tbody.rows.length; i++) {
    var row = tbody.rows[i];
    var description = row.querySelector('input[type="text"]') ? row.querySelector('input[type="text"]').value : '';
    var cost = row.querySelector('input[type="number"]') ? row.querySelector('input[type="number"]').value : 0;

    if (description || cost) {
      items.push({
        category: '',
        description: description,
        cost: parseFloat(cost) || 0,
        quantity: 1
      });
    }
  }

  return items;
}

// Validate form data
function validateFormData(data) {
  if (!data.requestType) {
    showToast('يرجى اختيار نوع الطلب', 'error');
    return false;
  }
  if (!data.sector) {
    showToast('يرجى اختيار القطاع', 'error');
    return false;
  }
  if (!data.governorate) {
    showToast('يرجى اختيار المحافظة', 'error');
    return false;
  }
  if (!data.requesterName || data.requesterName.trim().length < 2) {
    showToast('يرجى إدخال اسم مقدم الطلب', 'error');
    return false;
  }
  if (!data.requesterEmail || !validateEmail(data.requesterEmail)) {
    showToast('يرجى إدخال بريد إلكتروني صحيح', 'error');
    return false;
  }
  if (!data.requesterPhone || data.requesterPhone.length < 10) {
    showToast('يرجى إدخال رقم هاتف صحيح', 'error');
    return false;
  }
  return true;
}

// Validate email
function validateEmail(email) {
  var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Show page
function showPage(page) {
  document.querySelectorAll('.page').forEach(function(p) {
    p.classList.remove('active');
  });
  document.querySelectorAll('.nav-btn').forEach(function(btn) {
    btn.classList.remove('active');
  });

  document.getElementById(page + 'Page').classList.add('active');
  document.querySelector('[data-page="' + page + '"]').classList.add('active');

  appState.currentPage = page;

  if (page === 'dashboard') {
    loadDashboard();
  }
}

// Load dashboard
function loadDashboard() {
  loadStats();
  loadRequests();
}

// Load stats
function loadStats() {
  google.script.run
    .withSuccessHandler(function(response) {
      var data = (typeof response === 'string') ? JSON.parse(response) : response;
      if (data.success) {
        renderStats(data.data);
      }
    })
    .getStatsJson();
}

// Render stats
function renderStats(stats) {
  var html = Components.createStatCard('assignment', 'navy', stats.total, '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0637\u0644\u0628\u0627\u062a');
  html += Components.createStatCard('fiber_new', 'amber', stats.new, '\u0637\u0644\u0628\u0627\u062a \u062c\u062f\u064a\u062f\u0629');
  html += Components.createStatCard('pending', 'purple', stats.underReview, '\u0642\u064a\u062f \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629');
  html += Components.createStatCard('check_circle', 'green', stats.approved, '\u0645\u0639\u062a\u0645\u062f\u0629');
  html += Components.createStatCard('cancel', 'red', stats.rejected, '\u0645\u0631\u0641\u0648\u0636\u0629');
  html += Components.createStatCard('account_balance', 'navy', stats.totalAmount.toFixed(2), '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u0628\u0644\u063a\u0627\u062a');

  document.getElementById('statsGrid').innerHTML = html;
}

// Load requests
function loadRequests(page) {
  page = page || appState.currentRequestPage;
  appState.currentRequestPage = page;

  var status = document.getElementById('statusFilter').value;
  var type = document.getElementById('typeFilter').value;
  var search = document.getElementById('searchInput').value;

  var options = {
    page: parseInt(page),
    limit: 10,
    status: status,
    type: type,
    search: search
  };

  google.script.run
    .withSuccessHandler(function(response) {
      var data = (typeof response === 'string') ? JSON.parse(response) : response;
      if (data.success) {
        renderRequests(data.data);
      }
    })
    .getRequestsJson(options);
}

// Render requests
function renderRequests(result) {
  var tbody = document.getElementById('requestsBody');
  var html = '';

  if (result.data.length === 0) {
    html = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--text-secondary);">لا توجد طلبات</td></tr>';
  } else {
    result.data.forEach(function(request) {
      html += Components.createRequestRow(request);
    });
  }

  tbody.innerHTML = html;

  // Pagination
  var paginationHtml = Components.createPagination(result.page, result.totalPages, 'loadRequests');
  document.getElementById('pagination').innerHTML = paginationHtml;

  appState.totalPages = result.totalPages;
}

// Handle search
function handleSearch() {
  clearTimeout(window.searchTimeout);
  window.searchTimeout = setTimeout(function() {
    loadRequests(1);
  }, 300);
}

// View request details
function viewRequest(requestId) {
  showLoading();

  google.script.run
    .withSuccessHandler(function(response) {
      var data = (typeof response === 'string') ? JSON.parse(response) : response;
      if (data.success) {
        renderRequestDetails(data.data, requestId);
        hideLoading();
        document.getElementById('requestModal').classList.add('active');
      } else {
        hideLoading();
        showToast('\u062e\u0637\u0623 \u0641\u064a \u062a\u062d\u0645\u064a\u0644 \u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0637\u0644\u0628', 'error');
      }
    })
    .getRequestJson(requestId);
}

// Render request details
function renderRequestDetails(request, requestId) {
  var rid = requestId || request['Request ID'] || '';
  var html = '';

  // Basic Info
  html += Components.createDetailSection('\u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0623\u0633\u0627\u0633\u064a\u0629', 
    Components.createDetailItem('\u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628', rid) +
    Components.createDetailItem('\u0645\u0642\u062f\u0645 \u0627\u0644\u0637\u0644\u0628', request['Requester Name']) +
    Components.createDetailItem('\u0627\u0644\u0642\u0637\u0627\u0639', request['Sector']) +
    Components.createDetailItem('\u0627\u0644\u0645\u062d\u0627\u0641\u0638\u0629', request['Governorate']) +
    Components.createDetailItem('\u0646\u0648\u0639 \u0627\u0644\u0637\u0644\u0628', request['Request Type']) +
    Components.createDetailItem('\u0627\u0644\u062d\u0627\u0644\u0629', request['Status']) +
    Components.createDetailItem('\u0627\u0644\u0625\u064a\u0645\u064a\u0644', request['Requester Email']) +
    Components.createDetailItem('\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062a\u0641', request['Requester Phone']) +
    Components.createDetailItem('\u0627\u0644\u0645\u0644\u0627\u062d\u0638\u0627\u062a', request['Notes'])
  );

  // Items (loaded async)
  html += '<div id="modalItemsSection"><p style="color:var(--text-muted)">\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0628\u0646\u0648\u062f...</p></div>';
  
  // Workflow (loaded async)
  html += '<div id="modalWorkflowSection"><p style="color:var(--text-muted)">\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0633\u062c\u0644 \u0627\u0644\u0639\u0645\u0644\u064a\u0627\u062a...</p></div>';

  // Status Update
  html += Components.createDetailSection('\u062a\u062d\u062f\u064a\u062b \u0627\u0644\u062d\u0627\u0644\u0629', 
    '<div class="status-update-form">' +
    '<select id="newStatus" class="form-select">' +
    '<option value="New">\u062c\u062f\u064a\u062f</option>' +
    '<option value="Under Review">\u0642\u064a\u062f \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629</option>' +
    '<option value="Approved">\u0645\u0639\u062a\u0645\u062f</option>' +
    '<option value="Rejected">\u0645\u0631\u0641\u0648\u0636</option>' +
    '<option value="Completed">\u0645\u0643\u062a\u0645\u0644</option>' +
    '</select>' +
    '<button class="btn btn-primary" onclick="updateRequestStatus(\'' + rid + '\')">\u062a\u062d\u062f\u064a\u062b \u0627\u0644\u062d\u0627\u0644\u0629</button>' +
    '</div>'
  );

  // Reply
  html += Components.createDetailSection('\u0625\u0631\u0633\u0627\u0644 \u0631\u062f', 
    '<textarea id="replyBody" class="form-textarea" rows="4" placeholder="\u0627\u0643\u062a\u0628 \u0631\u062f\u0643 \u0647\u0646\u0627..."></textarea>' +
    '<button class="btn btn-primary" style="margin-top: 10px;" onclick="sendReply(\'' + rid + '\')">\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0631\u062f</button>'
  );

  document.getElementById('modalTitle').textContent = '\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0637\u0644\u0628 - ' + rid;
  document.getElementById('modalBody').innerHTML = html;

  // Load items async
  google.script.run
    .withSuccessHandler(function(resp) {
      var d = (typeof resp === 'string') ? JSON.parse(resp) : resp;
      if (d.success && d.data && d.data.length > 0) {
        document.getElementById('modalItemsSection').innerHTML = 
          Components.createDetailSection('\u0628\u0646\u0648\u062f \u0627\u0644\u0635\u0631\u0641', Components.createItemsTable(d.data));
      } else {
        document.getElementById('modalItemsSection').innerHTML = 
          Components.createDetailSection('\u0628\u0646\u0648\u062f \u0627\u0644\u0635\u0631\u0641', '<p style="color:var(--text-muted)">\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u0646\u0648\u062f</p>');
      }
    })
    .getItemsJson(rid);

  // Load workflow async
  google.script.run
    .withSuccessHandler(function(resp) {
      var d = (typeof resp === 'string') ? JSON.parse(resp) : resp;
      if (d.success && d.data && d.data.length > 0) {
        document.getElementById('modalWorkflowSection').innerHTML = 
          Components.createDetailSection('\u0633\u062c\u0644 \u0627\u0644\u0639\u0645\u0644\u064a\u0627\u062a', Components.createWorkflowTimeline(d.data));
      } else {
        document.getElementById('modalWorkflowSection').innerHTML = 
          Components.createDetailSection('\u0633\u062c\u0644 \u0627\u0644\u0639\u0645\u0644\u064a\u0627\u062a', '<p style="color:var(--text-muted)">\u0644\u0627 \u062a\u0648\u062c\u062f \u0633\u062c\u0644\u0627\u062a</p>');
      }
    })
    .getWorkflowJson(rid);
}

// Close modal
function closeModal() {
  document.getElementById('requestModal').classList.remove('active');
}

// Update request status
function updateRequestStatus(requestId) {
  var newStatus = document.getElementById('newStatus').value;
  
  showProgress();

  google.script.run
    .withSuccessHandler(function(response) {
      var data = (typeof response === 'string') ? JSON.parse(response) : response;
      hideProgress();

      if (data.success) {
        showToast('\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u062d\u0627\u0644\u0629 \u0628\u0646\u062c\u0627\u062d', 'success');
        if (data.data && data.data.csrfToken) {
          appState.csrfToken = data.data.csrfToken;
          document.getElementById('csrfToken').value = data.data.csrfToken;
        }
        loadRequests();
        closeModal();
      } else {
        showToast('\u062e\u0637\u0623: ' + data.error, 'error');
      }
    })
    .withFailureHandler(function(error) {
      hideProgress();
      showToast('\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u0627\u062a\u0635\u0627\u0644 \u0628\u0627\u0644\u062e\u0627\u062f\u0645', 'error');
    })
    .updateStatusJson({
      requestId: requestId,
      newStatus: newStatus,
      csrfToken: appState.csrfToken
    });
}

// Send reply
function sendReply(requestId) {
  var replyBody = document.getElementById('replyBody').value;
  
  if (!replyBody.trim()) {
    showToast('\u064a\u0631\u062c\u0649 \u0643\u062a\u0627\u0628\u0629 \u0631\u062f', 'error');
    return;
  }

  showProgress();

  google.script.run
    .withSuccessHandler(function(response) {
      var data = (typeof response === 'string') ? JSON.parse(response) : response;
      hideProgress();

      if (data.success) {
        showToast('\u062a\u0645 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0631\u062f \u0628\u0646\u062c\u0627\u062d', 'success');
        if (data.data && data.data.csrfToken) {
          appState.csrfToken = data.data.csrfToken;
        }
        document.getElementById('replyBody').value = '';
      } else {
        showToast('\u062e\u0637\u0623: ' + data.error, 'error');
      }
    })
    .withFailureHandler(function(error) {
      hideProgress();
      showToast('\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u0627\u062a\u0635\u0627\u0644 \u0628\u0627\u0644\u062e\u0627\u062f\u0645', 'error');
    })
    .sendReplyJson({
      requestId: requestId,
      replyBody: replyBody,
      csrfToken: appState.csrfToken
    });
}

// Show loading
function showLoading() {
  document.getElementById('loadingOverlay').style.display = 'flex';
}

// Hide loading
function hideLoading() {
  document.getElementById('loadingOverlay').style.display = 'none';
}

// Show progress
function showProgress() {
  document.getElementById('progressBar').style.display = 'block';
  var fill = document.querySelector('.progress-fill');
  fill.style.width = '100%';
}

// Hide progress
function hideProgress() {
  var fill = document.querySelector('.progress-fill');
  fill.style.width = '0%';
  setTimeout(function() {
    document.getElementById('progressBar').style.display = 'none';
  }, 300);
}

// Show toast
function showToast(message, type) {
  type = type || 'info';
  var container = document.getElementById('toastContainer');
  
  var icons = {
    success: 'check_circle',
    error: 'error',
    warning: 'warning',
    info: 'info'
  };

  var toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.innerHTML = 
    '<span class="material-icons toast-icon">' + icons[type] + '</span>' +
    '<span class="toast-message">' + message + '</span>' +
    '<button class="toast-close" onclick="this.parentElement.remove()">' +
    '<span class="material-icons">close</span>' +
    '</button>';

  container.appendChild(toast);

  setTimeout(function() {
    if (toast.parentElement) {
      toast.remove();
    }
  }, 3000);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initApp);
