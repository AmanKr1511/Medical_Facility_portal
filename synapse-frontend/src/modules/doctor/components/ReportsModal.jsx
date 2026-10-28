import { useState } from 'react';
import { Button, Icon } from '../../../core/ui';

export default function ReportsModal({
  patientName,
  reports = [],
  onClose,
}) {
  const [selectedPreview, setSelectedPreview] = useState(null);
  const [downloadNotice, setDownloadNotice] = useState('');

  const handleDownload = (rep) => {
    setDownloadNotice(`Downloading "${rep.name}"...`);

    if (rep.db_id) {
      const baseUrl = (window.__CONFIG__?.apiBaseUrl || '/api').replace(/\/+$/, '');
      const downloadUrl = `${baseUrl}/clinical/reports/${rep.db_id}/download/`;
      window.open(downloadUrl, '_blank');
    } else if (rep.file_url) {
      window.open(rep.file_url, '_blank');
    }

    setTimeout(() => {
      setDownloadNotice('');
    }, 2500);
  };

  const isPdf = (rep) => {
    if (!rep) return false;
    return (
      rep.mime_type === 'application/pdf' ||
      /\.pdf$/i.test(rep.name) ||
      /\.pdf$/i.test(rep.file_url || '')
    );
  };

  const isImage = (rep) => {
    if (!rep) return false;
    return (
      (rep.mime_type && rep.mime_type.startsWith('image/')) ||
      /\.(png|jpe?g|webp)$/i.test(rep.name) ||
      /\.(png|jpe?g|webp)$/i.test(rep.file_url || '')
    );
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="reports-modal-card">
        <div className="reports-modal-header">
          <div>
            <h2 className="reports-modal-title">Patient Medical Reports</h2>
            <p className="reports-modal-sub">
              Uploaded records for <strong>{patientName}</strong>
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              className="reports-modal-close-btn"
              onClick={onClose}
              aria-label="Close"
            >
              <Icon name="close" size={20} />
            </button>
          </div>
        </div>

        {downloadNotice && (
          <div className="reports-notice-banner" role="status">
            <Icon name="checkCircle" size={16} />
            <span>{downloadNotice}</span>
          </div>
        )}

        <div className="reports-modal-content">
          {reports.length === 0 ? (
            <div className="reports-empty-state">
              <Icon name="fileText" size={40} />
              <p>No reports uploaded by this patient yet.</p>
            </div>
          ) : (
            <div className="reports-table-wrap">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Report Name</th>
                    <th>Report Type</th>
                    <th>Upload Date</th>
                    <th>Size</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((rep) => (
                    <tr key={rep.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Icon name="fileText" size={18} />
                          <strong>{rep.name}</strong>
                        </div>
                      </td>
                      <td>
                        <span className="report-type-badge">{rep.type}</span>
                      </td>
                      <td style={{ color: 'var(--c-muted)' }}>{rep.date}</td>
                      <td style={{ color: 'var(--c-muted)', fontSize: 12 }}>
                        {rep.size || '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedPreview(rep)}
                          >
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(rep)}
                            title="Download Report"
                          >
                            <Icon name="download" size={14} /> Download
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Document Preview Pane */}
          {selectedPreview && (
            <div className="report-preview-box">
              <div className="report-preview-head">
                <div>
                  <strong>Document Preview: {selectedPreview.name}</strong>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--c-muted)' }}>
                    Type: {selectedPreview.type} • Dated: {selectedPreview.date}
                  </span>
                </div>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => setSelectedPreview(null)}
                >
                  Close Preview
                </button>
              </div>

              <div className="report-preview-body">
                {selectedPreview.file_url ? (
                  isPdf(selectedPreview) ? (
                    <div style={{ width: '100%', height: '520px', background: '#525659', borderRadius: '8px', overflow: 'hidden' }}>
                      <iframe
                        src={selectedPreview.file_url}
                        title={selectedPreview.name}
                        style={{ width: '100%', height: '100%', border: 'none' }}
                      />
                    </div>
                  ) : isImage(selectedPreview) ? (
                    <div style={{ textAlign: 'center', padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
                      <img
                        src={selectedPreview.file_url}
                        alt={selectedPreview.name}
                        style={{ maxWidth: '100%', maxHeight: '520px', objectFit: 'contain', borderRadius: '4px' }}
                      />
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                      <Icon name="fileText" size={48} />
                      <p style={{ marginTop: 12 }}>This document format can be downloaded and opened with your local system viewer.</p>
                      <Button variant="primary" size="sm" onClick={() => handleDownload(selectedPreview)}>
                        <Icon name="download" size={14} /> Download {selectedPreview.name}
                      </Button>
                    </div>
                  )
                ) : (
                  /* Fallback to mock template preview for mock records */
                  <div className="report-doc-sheet">
                    <div className="report-doc-watermark">IIT ROPAR MEDICAL CENTRE</div>
                    <h4>CLINICAL INVESTIGATION REPORT</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '12px 0' }}>
                      <div>Patient: <strong>{patientName}</strong></div>
                      <div>Investigation: <strong>{selectedPreview.name}</strong></div>
                      <div>Category: {selectedPreview.type}</div>
                      <div>Date Verified: {selectedPreview.date}</div>
                    </div>
                    <hr style={{ border: 'none', borderTop: '1px solid #ddd', margin: '12px 0' }} />
                    <h5>Findings & Clinical Interpretation</h5>
                    <p style={{ marginTop: 6, lineHeight: 1.6 }}>
                      {selectedPreview.summary ||
                        'Standard baseline parameters observed within physiological reference intervals.'}
                    </p>
                    <div style={{ marginTop: 24, fontSize: 12, color: '#666', borderTop: '1px dashed #ccc', paddingTop: 8 }}>
                      Signed by Resident Laboratory Officer • Verified on Electronic Health Portal
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="reports-modal-footer">
          <Button variant="outline" onClick={onClose}>
            Back to Consultation
          </Button>
        </div>
      </div>
    </div>
  );
}
