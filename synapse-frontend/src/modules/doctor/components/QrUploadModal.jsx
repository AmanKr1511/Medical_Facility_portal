import { useEffect, useState, useRef } from 'react';
import { api } from '../../../core/api/client';
import { Button, Icon } from '../../../core/ui';
import './QrUploadModal.css';

export default function QrUploadModal({
  appointmentId,
  patientName,
  onClose,
  onReportUploaded,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qrData, setQrData] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [copied, setCopied] = useState(false);
  const [uploadReceived, setUploadReceived] = useState(null);

  const initialReportCountRef = useRef(null);

  // 1. Fetch initial reports count and generate QR session
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        setLoading(true);
        setError('');

        // Get current reports count so we can detect when a new one arrives
        try {
          const currentReports = await api.get(`/clinical/appointments/${appointmentId}/reports/`);
          if (Array.isArray(currentReports)) {
            initialReportCountRef.current = currentReports.length;
          }
        } catch {
          initialReportCountRef.current = 0;
        }

        // Generate QR code session
        const session = await api.post(`/clinical/appointments/${appointmentId}/qr-session/`);
        if (isMounted) {
          setQrData(session);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to generate QR upload session.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initSession();

    return () => {
      isMounted = false;
    };
  }, [appointmentId]);

  // 2. Countdown timer effect
  useEffect(() => {
    if (!qrData?.expires_at) return;

    const interval = setInterval(() => {
      const remainingMs = new Date(qrData.expires_at).getTime() - Date.now();
      if (remainingMs <= 0) {
        setTimeLeft('Expired');
        clearInterval(interval);
      } else {
        const mins = Math.floor(remainingMs / 60000);
        const secs = Math.floor((remainingMs % 60000) / 1000);
        setTimeLeft(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [qrData]);

  // 3. Polling effect: poll every 3 seconds to see if patient uploaded a file
  useEffect(() => {
    if (!qrData) return;

    const pollInterval = setInterval(async () => {
      try {
        const reports = await api.get(`/clinical/appointments/${appointmentId}/reports/`);
        if (Array.isArray(reports)) {
          const currentCount = initialReportCountRef.current ?? 0;
          if (reports.length > currentCount) {
            const newest = reports[0];
            setUploadReceived(newest);
            initialReportCountRef.current = reports.length;
            if (onReportUploaded) {
              onReportUploaded(reports);
            }
          }
        }
      } catch {
        /* ignore polling errors */
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [qrData, appointmentId, onReportUploaded]);

  const handleCopyLink = () => {
    if (!qrData?.upload_url) return;
    navigator.clipboard.writeText(qrData.upload_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="qr-modal-card">
        <div className="qr-modal-header">
          <div>
            <h2 className="qr-modal-title">Patient Document QR Upload</h2>
            <p className="qr-modal-sub">
              Scan with smartphone to upload medical reports for <strong>{patientName}</strong>
            </p>
          </div>
          <button
            type="button"
            className="qr-modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {uploadReceived && (
          <div className="qr-received-banner" role="status">
            <Icon name="checkCircle" size={20} />
            <div>
              <strong>Report Received!</strong>
              <span>
                "{uploadReceived.name}" ({uploadReceived.type}) was just uploaded by the patient.
              </span>
            </div>
          </div>
        )}

        <div className="qr-modal-body">
          {loading && (
            <div className="qr-modal-loading">
              <div className="qr-spinner" />
              <p>Generating unique secure QR code...</p>
            </div>
          )}

          {error && (
            <div className="qr-modal-error">
              <Icon name="alertCircle" size={32} />
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && qrData && (
            <div className="qr-display-wrap">
              <div className="qr-image-frame">
                <img
                  src={qrData.qr_code_data_url}
                  alt="Upload QR Code"
                  className="qr-code-img"
                />
                <div className="qr-scan-badge">
                  <Icon name="camera" size={14} /> Scan with Mobile Camera
                </div>
              </div>

              <div className="qr-instructions">
                <div className="qr-instruction-step">
                  <div className="qr-step-num">1</div>
                  <p>Ask the patient to open their phone's camera app.</p>
                </div>
                <div className="qr-instruction-step">
                  <div className="qr-step-num">2</div>
                  <p>Point at this QR code to open the secure upload form.</p>
                </div>
                <div className="qr-instruction-step">
                  <div className="qr-step-num">3</div>
                  <p>Patient selects their lab report PDF or takes a clear photo.</p>
                </div>

                <div className="qr-timer-pill">
                  <Icon name="clock" size={14} />
                  <span>
                    Valid for: <strong>{timeLeft || '15:00'}</strong>
                  </span>
                </div>

                <div className="qr-link-copy-row">
                  <input
                    type="text"
                    readOnly
                    value={qrData.upload_url}
                    className="qr-link-input"
                  />
                  <Button variant="outline" size="sm" onClick={handleCopyLink}>
                    <Icon name={copied ? 'check' : 'copy'} size={14} />
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="qr-modal-footer">
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
