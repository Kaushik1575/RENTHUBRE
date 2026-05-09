import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import StatusPopup from './StatusPopup';


const STATUS_CONFIG = {
  'Pending': { bg: '#fefce8', color: '#854d0e', border: '#fde047', icon: '⏳' },
  'In Progress': { bg: '#eff6ff', color: '#1e40af', border: '#93c5fd', icon: '🔄' },
  'Resolved': { bg: '#f0fdf4', color: '#166534', border: '#86efac', icon: '✅' }
};

export default function AdminIssues() {
  const [issues, setIssues] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, resolved: 0 });
  const [filterStatus, setFilterStatus] = useState('All');
  const [loading, setLoading] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState('In Progress');
  const [replyLoading, setReplyLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [popup, setPopup] = useState({ isOpen: false, type: 'success', title: '', message: '', onConfirm: null });

  const showPopup = (type, title, message, onConfirm = null) => {
    setPopup({ isOpen: true, type, title, message, onConfirm });
  };

  const getToken = () => {
    const t = localStorage.getItem('token');
    if (!t || t === 'null' || t === 'undefined') return null;
    return t;
  };

  const fetchStats = useCallback(async () => {
    const t = getToken();
    if (!t) return;
    try {
      const res = await fetch('/api/support/admin/stats', {
        headers: { Authorization: `Bearer ${t}` }
      });
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch (e) {
      console.error('stats error', e);
    }
  }, []);

  const fetchIssues = useCallback(async () => {
    const t = getToken();
    if (!t) return;
    setLoading(true);
    try {
      const url = filterStatus === 'All'
        ? '/api/support/admin/all'
        : `/api/support/admin/all?status=${encodeURIComponent(filterStatus)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${t}` }
      });
      const data = await res.json();
      if (data.success) setIssues(data.issues);
    } catch (e) {
      toast.error('Failed to load issues');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const handleReply = async () => {
    const t = getToken();
    if (!t) {
      toast.error('Session expired. Please login again.');
      return;
    }

    // Make reply optional, default message if empty
    const finalReply = replyText.trim() || `Status updated to ${replyStatus} by admin.`;
    
    setReplyLoading(true);
    try {
      const res = await fetch(`/api/support/admin/reply/${selectedIssue.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${t}`
        },
        body: JSON.stringify({ admin_reply: finalReply, status: replyStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to send reply');
      toast.success('Reply sent! Email notification dispatched.');
      setSelectedIssue(null);
      setReplyText('');
      setReplyStatus('In Progress');
      fetchIssues();
      fetchStats();
    } catch (e) {
      toast.error(e.message || 'Failed to send reply');
    } finally {
      setReplyLoading(false);
    }
  };

  const filteredIssues = issues.filter(issue => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      issue.issue_id?.toLowerCase().includes(s) ||
      issue.email?.toLowerCase().includes(s) ||
      issue.category?.toLowerCase().includes(s) ||
      issue.booking_id?.toLowerCase().includes(s)
    );
  });

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  const sc = (status) => STATUS_CONFIG[status] || STATUS_CONFIG['Pending'];

  const [selectedIssueIds, setSelectedIssueIds] = useState([]);

  const toggleSelectIssue = (id) => {
    setSelectedIssueIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIssueIds.length === filteredIssues.length && filteredIssues.length > 0) {
      setSelectedIssueIds([]);
    } else {
      setSelectedIssueIds(filteredIssues.map(i => i.id));
    }
  };

  const handleBulkResolve = async () => {
    if (!selectedIssueIds.length) return;
    
    showPopup('confirm', 'Bulk Resolve', `Are you sure you want to mark ${selectedIssueIds.length} issues as Resolved?`, async () => {
      setLoading(true);
      try {
        const t = getToken();
        if (!t) throw new Error('Auth token missing');

        const promises = selectedIssueIds.map(id => 
          fetch(`/api/support/admin/reply/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${t}`
            },
            body: JSON.stringify({ admin_reply: 'Marked as resolved via bulk action.', status: 'Resolved' })
          })
        );
        await Promise.all(promises);
        setPopup({ ...popup, isOpen: false });
        toast.success(`${selectedIssueIds.length} issues resolved!`);
        setSelectedIssueIds([]);
        fetchIssues();
        fetchStats();
      } catch (e) {
        toast.error('Bulk update failed');
      } finally {
        setLoading(false);
      }
    });
  };

  return (
    <div style={styles.container}>
      {/* Page Header */}
      <div style={styles.pageHeader}>
        <div>
          <h2 style={styles.pageTitle}>🎫 Support Issues</h2>
          <p style={styles.pageSub}>Manage user support requests and send replies</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {selectedIssueIds.length > 0 && (
            <button onClick={handleBulkResolve} style={styles.bulkBtn}>
              ✅ Resolve Selected ({selectedIssueIds.length})
            </button>
          )}
          <button onClick={() => { fetchIssues(); fetchStats(); }} style={styles.refreshBtn}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div style={styles.statsBar}>
        {[
          { label: 'Total Issues', value: stats.total, color: '#6366f1', bg: '#eff2ff', icon: '📊' },
          { label: 'Pending', value: stats.pending, color: '#854d0e', bg: '#fefce8', icon: '⏳' },
          { label: 'In Progress', value: stats.inProgress, color: '#1e40af', bg: '#eff6ff', icon: '🔄' },
          { label: 'Resolved', value: stats.resolved, color: '#166534', bg: '#f0fdf4', icon: '✅' }
        ].map(s => (
          <div key={s.label} style={{ ...styles.statCard, background: s.bg, borderColor: s.color + '30' }}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>{s.icon}</div>
            <div style={{ fontSize: '28px', fontWeight: '900', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '12px', color: s.color, fontWeight: 600, opacity: 0.8 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={styles.filtersRow}>
        <div style={styles.filterGroup}>
          {['All', 'Pending', 'In Progress', 'Resolved'].map(status => (
            <button
              key={status}
              onClick={() => { setFilterStatus(status); setSelectedIssueIds([]); }}
              style={{
                ...styles.filterBtn,
                background: filterStatus === status
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  : 'white',
                color: filterStatus === status ? 'white' : '#374151',
                border: filterStatus === status ? 'none' : '1px solid #e5e7eb',
                boxShadow: filterStatus === status ? '0 4px 12px rgba(99,102,241,0.3)' : 'none'
              }}
            >
              {status}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="🔍 Search by ID, email, category..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* Issues Table */}
      {loading ? (
        <div style={styles.loadingBox}>
          <div style={styles.spinner} />
          <p style={{ color: '#94a3b8', marginTop: '12px' }}>Loading issues...</p>
        </div>
      ) : filteredIssues.length === 0 ? (
        <div style={styles.emptyBox}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
          <h3 style={{ margin: '0 0 8px', color: '#374151' }}>No Issues Found</h3>
          <p style={{ color: '#94a3b8', margin: 0 }}>
            {filterStatus !== 'All' ? `No "${filterStatus}" issues at the moment.` : 'No support tickets have been raised yet.'}
          </p>
        </div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: '40px' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedIssueIds.length === filteredIssues.length && filteredIssues.length > 0}
                    onChange={toggleSelectAll}
                    style={styles.checkbox}
                  />
                </th>
                {['Issue ID', 'Email', 'Category', 'Booking ID', 'Status', 'Submitted', 'Actions'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredIssues.map(issue => {
                const cfg = sc(issue.status);
                const isSelected = selectedIssueIds.includes(issue.id);
                return (
                  <tr key={issue.id} style={{ ...styles.tr, background: isSelected ? '#f5f7ff' : 'transparent' }}>
                    <td style={styles.td}>
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => toggleSelectIssue(issue.id)}
                        style={styles.checkbox}
                      />
                    </td>
                    <td style={styles.td}>
                      <span style={styles.issueIdTag}>{issue.issue_id}</span>
                    </td>
                    <td style={{ ...styles.td, maxWidth: '180px' }}>
                      <span style={{ fontSize: '13px', color: '#4b5563', wordBreak: 'break-all' }}>{issue.email}</span>
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 700, color: '#1f2937', fontSize: '14px' }}>{issue.category}</div>
                      {issue.sub_category && (
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{issue.sub_category}</div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <span style={{ fontSize: '13px', color: '#6366f1', fontWeight: 600 }}>
                        {issue.booking_id || '—'}
                      </span>
                      {issue.attachment_url && (
                        <a 
                          href={issue.attachment_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          title="View Attachment / Evidence"
                          style={{ marginLeft: '8px', fontSize: '16px', cursor: 'pointer', textDecoration: 'none', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          📎
                        </a>
                      )}
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                        borderRadius: '50px', padding: '4px 12px', fontWeight: 700, fontSize: '13px',
                        display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content'
                      }}>
                        {cfg.icon} {issue.status}
                      </span>
                    </td>
                    <td style={{ ...styles.td, fontSize: '12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      {formatDate(issue.created_at)}
                    </td>
                    <td style={styles.td}>
                      <button
                        onClick={() => {
                          setSelectedIssue(issue);
                          setReplyText(issue.admin_reply || '');
                          setReplyStatus(issue.status);
                        }}
                        style={styles.replyBtn}
                      >
                        {issue.admin_reply ? '✏️ Edit' : '💬 Reply'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Reply Modal */}
      {selectedIssue && (
        <div style={styles.modalOverlay} onClick={() => setSelectedIssue(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>💬 Reply to Issue</h3>
                <div style={styles.modalIssueId}>{selectedIssue.issue_id}</div>
              </div>
              <button onClick={() => setSelectedIssue(null)} style={styles.modalClose}>✕</button>
            </div>

            {/* Issue Summary */}
            <div style={styles.modalBody}>
              <div style={styles.issueSummaryBox}>
                <div style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>📂 Category</span>
                  <span style={styles.summaryValue}>{selectedIssue.category}{selectedIssue.sub_category ? ` › ${selectedIssue.sub_category}` : ''}</span>
                </div>
                <div style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>📧 Email</span>
                  <span style={styles.summaryValue}>{selectedIssue.email}</span>
                </div>
                {selectedIssue.booking_id && (
                  <div style={styles.summaryRow}>
                    <span style={styles.summaryLabel}>🎟️ Booking ID</span>
                    <span style={styles.summaryValue}>{selectedIssue.booking_id}</span>
                  </div>
                )}
              </div>

              <div style={styles.issueDescBox}>
                <div style={styles.descLabel}>📋 User's Description</div>
                <p style={styles.descText}>{selectedIssue.description}</p>
                
                {selectedIssue.attachment_url && (
                  <div style={{ marginTop: '16px', borderTop: '1px solid rgba(146, 64, 14, 0.1)', paddingTop: '12px' }}>
                    <div style={styles.descLabel}>📎 Attachment</div>
                    <a 
                      href={selectedIssue.attachment_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ display: 'inline-block', position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e5e7eb' }}
                    >
                      <img 
                        src={selectedIssue.attachment_url} 
                        alt="Issue Attachment" 
                        style={{ maxWidth: '100%', maxHeight: '180px', display: 'block', objectFit: 'contain', background: 'white' }} 
                      />
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0, 
                        background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '10px',
                        textAlign: 'center', padding: '4px', fontWeight: 700
                      }}>Click to View Full Size</div>
                    </a>
                  </div>
                )}
              </div>

              {/* Status Selector */}
              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>Update Status</label>
                <div style={styles.statusBtns}>
                  {['Pending', 'In Progress', 'Resolved'].map(s => {
                    const cfg = sc(s);
                    return (
                      <button
                        key={s}
                        onClick={() => setReplyStatus(s)}
                        style={{
                          ...styles.statusBtn,
                          background: replyStatus === s ? cfg.bg : 'white',
                          color: replyStatus === s ? cfg.color : '#64748b',
                          border: `2px solid ${replyStatus === s ? cfg.border : '#e5e7eb'}`,
                          fontWeight: replyStatus === s ? '800' : '600'
                        }}
                      >
                        {cfg.icon} {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reply Textarea */}
              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>Your Reply <span style={{ color: '#ef4444' }}>*</span></label>
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Type your reply here. This will be emailed to the user..."
                  style={styles.replyTextarea}
                  maxLength={1000}
                />
                <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'right', marginTop: '4px' }}>
                  {replyText.length}/1000
                </div>
              </div>

              {/* Info */}
              <div style={styles.emailInfo}>
                <span>📧</span>
                <span>An email notification will be sent to <strong>{selectedIssue.email}</strong> with your reply.</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={styles.modalFooter}>
              <button onClick={() => setSelectedIssue(null)} style={styles.cancelBtn}>Cancel</button>
              <button onClick={handleReply} disabled={replyLoading} style={replyLoading ? styles.sendBtnDisabled : styles.sendBtn}>
                {replyLoading ? '⏳ Sending...' : '🚀 Send Reply & Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Popup */}
      <StatusPopup
        isOpen={popup.isOpen}
        onClose={() => setPopup({ ...popup, isOpen: false })}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        onConfirm={popup.onConfirm}
        confirmText="Yes, Proceed"
        cancelText="Cancel"
      />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const styles = {
  container: { padding: '0' },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  pageTitle: { margin: '0 0 4px', fontSize: '24px', fontWeight: '900', color: '#1e1b4b' },
  pageSub: { margin: 0, color: '#94a3b8', fontSize: '14px' },
  refreshBtn: { padding: '10px 20px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '14px', color: '#6366f1' },
  bulkBtn: { padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '14px', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' },
  checkbox: { width: '18px', height: '18px', cursor: 'pointer', accentColor: '#6366f1' },

  statsBar: { display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' },
  statCard: { flex: '1 1 120px', minWidth: '100px', borderRadius: '16px', padding: '18px 16px', textAlign: 'center', border: '1px solid transparent' },

  filtersRow: { display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' },
  filterGroup: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  filterBtn: { padding: '8px 18px', borderRadius: '50px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', transition: 'all 0.2s' },
  searchInput: {
    flex: 1, minWidth: '220px', padding: '10px 16px', border: '1px solid #e5e7eb',
    borderRadius: '12px', fontSize: '14px', outline: 'none', background: 'white'
  },

  loadingBox: { textAlign: 'center', padding: '60px 20px' },
  spinner: { width: '36px', height: '36px', border: '4px solid #e5e7eb', borderTop: '4px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' },
  emptyBox: { textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '20px', border: '1px solid #e5e7eb' },

  tableWrapper: { background: 'white', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e5e7eb', overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: '900px' },
  th: { padding: '14px 16px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontWeight: 800, fontSize: '12px', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' },
  td: { padding: '14px 16px', verticalAlign: 'middle' },
  issueIdTag: { fontFamily: 'monospace', fontWeight: 800, color: '#6366f1', fontSize: '13px', background: '#eff2ff', padding: '4px 10px', borderRadius: '6px' },
  replyBtn: { padding: '7px 16px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', whiteSpace: 'nowrap' },

  // Modal
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15,15,35,0.65)', backdropFilter: 'blur(6px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box' },
  modal: { background: 'white', borderRadius: '24px', width: '100%', maxWidth: '640px', boxShadow: '0 25px 60px rgba(0,0,0,0.3)', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px 28px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', flexShrink: 0 },
  modalTitle: { color: 'white', margin: '0 0 6px', fontSize: '20px', fontWeight: '900' },
  modalIssueId: { color: 'rgba(255,255,255,0.8)', fontFamily: 'monospace', fontSize: '14px', fontWeight: 700 },
  modalClose: { background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalBody: { padding: '24px 28px', overflow: 'auto', flex: 1 },
  issueSummaryBox: { background: '#f8fafc', borderRadius: '12px', padding: '16px 18px', marginBottom: '18px', border: '1px solid #e5e7eb' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f1f5f9' },
  summaryLabel: { color: '#94a3b8', fontSize: '13px', fontWeight: 600 },
  summaryValue: { color: '#1f2937', fontWeight: 700, fontSize: '13px', textAlign: 'right', maxWidth: '60%' },
  issueDescBox: { background: '#fffbeb', borderRadius: '12px', padding: '16px 18px', marginBottom: '18px', border: '1px solid #fde68a' },
  descLabel: { fontWeight: 800, color: '#92400e', marginBottom: '8px', fontSize: '13px' },
  descText: { margin: 0, color: '#374151', lineHeight: 1.6, fontSize: '14px' },
  fieldGroup: { marginBottom: '18px' },
  fieldLabel: { display: 'block', fontWeight: 700, color: '#374151', marginBottom: '8px', fontSize: '13px' },
  statusBtns: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  statusBtn: { padding: '8px 18px', borderRadius: '50px', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s' },
  replyTextarea: { width: '100%', padding: '13px 16px', borderRadius: '12px', border: '2px solid #e5e7eb', fontSize: '14px', color: '#1f2937', minHeight: '120px', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6, outline: 'none', boxSizing: 'border-box', background: '#fafafa' },
  emailInfo: { display: 'flex', gap: '10px', alignItems: 'flex-start', background: '#eff6ff', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#1e40af', border: '1px solid #bfdbfe' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '18px 28px', borderTop: '1px solid #f1f5f9', flexShrink: 0 },
  cancelBtn: { padding: '11px 22px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '14px' },
  sendBtn: { padding: '11px 24px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '14px', boxShadow: '0 4px 15px rgba(99,102,241,0.35)' },
  sendBtnDisabled: { padding: '11px 24px', background: '#a5b4fc', color: 'white', border: 'none', borderRadius: '12px', cursor: 'not-allowed', fontWeight: 700, fontSize: '14px' }
};
