/**
 * components.js - Reusable UI Components
 */

var Components = (function() {
  'use strict';

  /**
   * Create stat card
   */
  function createStatCard(icon, color, value, label) {
    return '<div class="stat-card">' +
      '<div class="stat-icon ' + color + '">' +
      '<span class="material-icons">' + icon + '</span>' +
      '</div>' +
      '<div class="stat-info">' +
      '<h3>' + value + '</h3>' +
      '<p>' + label + '</p>' +
      '</div>' +
      '</div>';
  }

  /**
   * Create status badge
   */
  function createStatusBadge(status) {
    var statusClass = status.toLowerCase().replace(/\s+/g, '-');
    var statusLabels = {
      'new': 'جديد',
      'under-review': 'قيد المراجعة',
      'approved': 'معتمد',
      'rejected': 'مرفوض',
      'completed': 'مكتمل',
      'pending': 'قيد الانتظار'
    };
    var label = statusLabels[statusClass] || status;
    return '<span class="status-badge ' + statusClass + '">' + label + '</span>';
  }

  /**
   * Create request row
   */
  function createRequestRow(request) {
    var requestId = request['Request ID'] || '';
    var requesterName = request['Requester Name'] || '';
    var sector = request['Sector'] || '';
    var requestType = request['Request Type'] || '';
    var status = request['Status'] || 'New';
    var timestamp = request['Timestamp'] || '';
    var formattedDate = formatDate(timestamp);

    return '<tr>' +
      '<td><strong>' + requestId + '</strong></td>' +
      '<td>' + sanitizeHtml(requesterName) + '</td>' +
      '<td>' + sanitizeHtml(sector) + '</td>' +
      '<td>' + sanitizeHtml(requestType) + '</td>' +
      '<td>' + createStatusBadge(status) + '</td>' +
      '<td>' + formattedDate + '</td>' +
      '<td>' +
      '<button class="btn btn-secondary btn-sm" onclick="viewRequest(\'' + requestId + '\')">' +
      '<span class="material-icons">visibility</span>' +
      'عرض' +
      '</button>' +
      '</td>' +
      '</tr>';
  }

  /**
   * Create pagination
   */
  function createPagination(currentPage, totalPages, onPageChange) {
    if (totalPages <= 1) return '';

    var html = '<button class="pagination-btn" onclick="' + onPageChange + '(' + (currentPage - 1) + ')" ' +
      (currentPage === 1 ? 'disabled' : '') + '>' +
      '<span class="material-icons">chevron_right</span>' +
      '</button>';

    var start = Math.max(1, currentPage - 2);
    var end = Math.min(totalPages, start + 4);
    start = Math.max(1, end - 4);

    for (var i = start; i <= end; i++) {
      html += '<button class="pagination-btn ' + (i === currentPage ? 'active' : '') + '" ' +
        'onclick="' + onPageChange + '(' + i + ')">' + i + '</button>';
    }

    html += '<button class="pagination-btn" onclick="' + onPageChange + '(' + (currentPage + 1) + ')" ' +
      (currentPage === totalPages ? 'disabled' : '') + '>' +
      '<span class="material-icons">chevron_left</span>' +
      '</button>';

    return html;
  }

  /**
   * Create item select options
   */
  function createItemSelectOptions(items, selected) {
    var html = '<option value="">اختر البند</option>';
    items.forEach(function(item) {
      html += '<option value="' + item + '" ' + (item === selected ? 'selected' : '') + '>' + item + '</option>';
    });
    return html;
  }

  /**
   * Create item row for table
   */
  function createItemRow(type, index) {
    if (type === 'urgent') {
      return '<tr data-index="' + index + '">' +
        '<td><input type="text" class="form-input" placeholder="الوصف" onchange="updateItemTotal(\'' + type + '\')"></td>' +
        '<td><input type="number" class="form-input" min="0" step="0.01" placeholder="0.00" onchange="updateItemTotal(\'' + type + '\')"></td>' +
        '<td><button type="button" class="btn btn-danger btn-sm" onclick="removeItemRow(this, \'' + type + '\')"><span class="material-icons">delete</span></button></td>' +
        '</tr>';
    }

    return '<tr data-index="' + index + '">' +
      '<td><select class="form-select" onchange="updateItemTotal(\'' + type + '\')">' +
      createItemSelectOptions(['إيفنت', 'مطبوعات', 'جيفتات', 'استقبال', 'لوجستيك', 'قاعات', 'Other']) +
      '</select></td>' +
      '<td><input type="text" class="form-input" placeholder="الوصف" onchange="updateItemTotal(\'' + type + '\')"></td>' +
      '<td><input type="number" class="form-input" min="0" step="0.01" placeholder="0.00" onchange="updateItemTotal(\'' + type + '\')"></td>' +
      '<td><button type="button" class="btn btn-danger btn-sm" onclick="removeItemRow(this, \'' + type + '\')"><span class="material-icons">delete</span></button></td>' +
      '</tr>';
  }

  /**
   * Create detail section
   */
  function createDetailSection(title, content) {
    return '<div class="detail-section">' +
      '<h4 class="detail-title">' + title + '</h4>' +
      '<div class="detail-content">' + content + '</div>' +
      '</div>';
  }

  /**
   * Create detail item
   */
  function createDetailItem(label, value) {
    return '<div class="detail-item">' +
      '<span class="detail-label">' + label + '</span>' +
      '<span class="detail-value">' + sanitizeHtml(value || 'غير محدد') + '</span>' +
      '</div>';
  }

  /**
   * Create items table for detail view
   */
  function createItemsTable(items) {
    if (!items || items.length === 0) {
      return '<p style="color: var(--text-secondary);">لا توجد بنود</p>';
    }

    var html = '<table class="data-table"><thead><tr>';
    html += '<th>البند</th><th>الوصف</th><th>التكلفة</th>';
    html += '</tr></thead><tbody>';

    var total = 0;
    items.forEach(function(item) {
      var cost = parseFloat(item['Cost'] || item.cost || 0);
      total += cost;
      html += '<tr>';
      html += '<td>' + sanitizeHtml(item['Category'] || item.category || '') + '</td>';
      html += '<td>' + sanitizeHtml(item['Description'] || item.description || '') + '</td>';
      html += '<td>' + cost.toFixed(2) + ' ج.م</td>';
      html += '</tr>';
    });

    html += '</tbody><tfoot><tr>';
    html += '<td colspan="2"><strong>الإجمالي</strong></td>';
    html += '<td><strong>' + total.toFixed(2) + ' ج.م</strong></td>';
    html += '</tr></tfoot></table>';

    return html;
  }

  /**
   * Create workflow timeline
   */
  function createWorkflowTimeline(workflow) {
    if (!workflow || workflow.length === 0) {
      return '<p style="color: var(--text-secondary);">لا توجد سجلات</p>';
    }

    var html = '<div class="workflow-timeline">';
    
    workflow.forEach(function(log) {
      var action = log['Action'] || '';
      var details = log['Details'] || '';
      var timestamp = log['Timestamp'] || '';
      var formattedDate = formatDate(timestamp);

      var icon = 'info';
      var color = 'blue';
      
      switch (action) {
        case 'Created': icon = 'add_circle'; color = 'green'; break;
        case 'Email Sent': icon = 'email'; color = 'blue'; break;
        case 'Reply Received': icon = 'reply'; color = 'yellow'; break;
        case 'Forwarded': icon = 'forward'; color = 'blue'; break;
        case 'Status Changed': icon = 'swap_horiz'; color = 'purple'; break;
        case 'Approved': icon = 'check_circle'; color = 'green'; break;
        case 'Rejected': icon = 'cancel'; color = 'red'; break;
        case 'Closed': icon = 'lock'; color = 'red'; break;
      }

      html += '<div class="timeline-item">' +
        '<div class="timeline-icon ' + color + '">' +
        '<span class="material-icons">' + icon + '</span>' +
        '</div>' +
        '<div class="timeline-content">' +
        '<div class="timeline-header">' +
        '<strong>' + sanitizeHtml(action) + '</strong>' +
        '<span class="timeline-date">' + formattedDate + '</span>' +
        '</div>' +
        '<p class="timeline-details">' + sanitizeHtml(details) + '</p>' +
        '</div>' +
        '</div>';
    });

    html += '</div>';
    return html;
  }

  /**
   * Sanitize HTML
   */
  function sanitizeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Format date
   */
  function formatDate(date) {
    if (!date) return '';
    try {
      var d = new Date(date);
      return d.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return date;
    }
  }

  return {
    createStatCard: createStatCard,
    createStatusBadge: createStatusBadge,
    createRequestRow: createRequestRow,
    createPagination: createPagination,
    createItemRow: createItemRow,
    createDetailSection: createDetailSection,
    createDetailItem: createDetailItem,
    createItemsTable: createItemsTable,
    createWorkflowTimeline: createWorkflowTimeline,
    sanitizeHtml: sanitizeHtml,
    formatDate: formatDate
  };
})();
