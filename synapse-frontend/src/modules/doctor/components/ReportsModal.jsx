import { useState } from 'react';
import { Button, Icon } from '../../../core/ui';

export default function ReportsModal({ patientName, reports = [], onClose }) {
  const [selectedPreview, setSelectedPreview] = useState(null);
  const [downloadNotice, setDownloadNotice] = useState('');

  const handleDownload = (rep) => {
    setDownloadNotice(`Downloading "${rep.name}"...`);
    setTimeout(() => {
      setDownloadNotice('');
    }, 2500);
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
          <button
            type="button"
            className="reports-modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <Icon name="close" size={20} />
          </button>
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
              <p>No reports uploaded by this patient.</p>
            </div>
          ) : (
            <div className="reports-table-wrap">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Report Name</th>
                    <th>Report Type</th>
                    <th>Upload Date</th>
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
