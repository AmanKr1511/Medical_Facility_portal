import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../core/api/client';
import { Icon, LogoMark } from '../../../core/ui';
import './PatientQrUploadPage.css';

const REPORT_TYPES = [
  'Blood Test (CBC, LFT, KFT, etc.)',
  'Radiology / X-Ray / Ultrasound / CT / MRI',
  'Diagnostic Pathology Report',
  'Previous Prescription / OPD Slip',
  'Discharge Summary',
  'Other Medical Document',
];

export default function PatientQrUploadPage() {
  const { token } = useParams();

  const [loading, setLoading] = useState(true);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [errorState, setErrorState] = useState(null);

  // Form states
  const [selectedFile, setSelectedFile] = useState(null);
  const [reportType, setReportType] = useState(REPORT_TYPES[0]);
  const [reportName, setReportName] = useState('');
  const [summary, setSummary] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadedDetails, setUploadedDetails] = useState(null);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // 1. Fetch upload session validity on mount
  useEffect(() => {
    let mounted = true;
    async function verifySession() {
      try {
        setLoading(true);
        setErrorState(null);
        const data = await api.get(`/clinical/upload-session/${token}/`);
        if (mounted) {
          setSessionInfo(data);
        }
      } catch (err) {
        if (mounted) {
          if (err.status === 410) {
            setErrorState({
              title: 'Link Expired or Already Used',
              message:
                'This QR upload session has expired or the report has already been uploaded. If you need to upload another file, please ask your doctor to show a new QR code.',
            });
          } else {
            setErrorState({
              title: 'Invalid Upload Link',
              message:
                'The upload session could not be verified. Please verify you scanned the latest QR code displayed on the doctor’s screen.',
            });
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    verifySession();
    return () => {
      mounted = false;
    };
  }, [token]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (15 MB max)
    if (file.size > 15 * 1024 * 1024) {
      alert('Selected file is too large. Maximum file size is 15 MB.');
      return;
    }

    // Validate type (PDF or Image)
    const validMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    const hasValidExt = /\.(pdf|jpg|jpeg|png)$/i.test(file.name);

    if (!validMimes.includes(file.type) && !hasValidExt) {
      alert('Invalid file format. Please choose a PDF document or a JPEG/PNG photo.');
      return;
    }

    setSelectedFile(file);
    if (!reportName) {
      setReportName(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Please select or capture a file to upload.');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(20);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('report_name', reportName || selectedFile.name);
      formData.append('report_type', reportType);
      formData.append('summary', summary);

      // Using fetch directly for multipart upload
      const baseUrl = (window.__CONFIG__?.apiBaseUrl || '/api').replace(/\/+$/, '');
      const uploadUrl = `${baseUrl}/clinical/upload-session/${token}/upload/`;

      setUploadProgress(50);

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(90);

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.detail || 'Upload failed. Please try again.');
      }

      setUploadProgress(100);
      setUploadedDetails(resData.report || { name: selectedFile.name });
      setUploadSuccess(true);
    } catch (err) {
      alert(err.message || 'Error uploading file. Please check your network and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="qr-upload-page">
      <header className="qr-header">
        <div className="qr-header-inner">
          <LogoMark size={28} />
          <div>
            <h1 className="qr-title">IIT Ropar Medical Centre</h1>
            <p className="qr-subtitle">SYNapse Patient Report Upload Portal</p>
          </div>
        </div>
      </header>

      <main className="qr-container">
        {loading && (
          <div className="qr-card qr-card--loading">
            <div className="qr-spinner" />
            <p>Connecting to consultation session...</p>
          </div>
        )}

        {!loading && errorState && (
          <div className="qr-card qr-card--error">
            <div className="qr-error-icon">
              <Icon name="alertCircle" size={48} />
            </div>
            <h2>{errorState.title}</h2>
            <p>{errorState.message}</p>
            <div className="qr-error-hint">
              Consultation with the doctor is still active. Ask the doctor to click <strong>"Upload via QR"</strong> to generate a fresh link.
            </div>
          </div>
        )}

        {!loading && !errorState && uploadSuccess && (
          <div className="qr-card qr-card--success">
            <div className="qr-success-icon">
              <Icon name="checkCircle" size={56} />
            </div>
            <h2>Upload Successful!</h2>
            <p className="qr-success-sub">
              Your document has been sent directly to <strong>Dr. {sessionInfo?.doctor_name}</strong>'s consultation dashboard.
            </p>

            <div className="qr-uploaded-box">
              <div className="qr-uploaded-item">
                <span className="qr-u-label">Document:</span>
                <span className="qr-u-val">{uploadedDetails?.name || selectedFile?.name}</span>
              </div>
              <div className="qr-uploaded-item">
                <span className="qr-u-label">Category:</span>
                <span className="qr-u-val">{uploadedDetails?.type || reportType}</span>
              </div>
              <div className="qr-uploaded-item">
                <span className="qr-u-label">Consultation OPD:</span>
                <span className="qr-u-val">{sessionInfo?.opd_number}</span>
              </div>
            </div>

            <p className="qr-success-footer">
              You can now return to the doctor. The doctor can view and review your report on their screen immediately.
            </p>
          </div>
        )}

        {!loading && !errorState && !uploadSuccess && sessionInfo && (
          <div className="qr-card">
            {/* Consultation Banner */}
            <div className="qr-session-banner">
              <div className="qr-banner-icon">
                <Icon name="stethoscope" size={24} />
              </div>
              <div className="qr-banner-text">
                <h3>Consultation: Dr. {sessionInfo.doctor_name}</h3>
                <p>
                  Patient: <strong>{sessionInfo.patient_name}</strong> • OPD: <strong>{sessionInfo.opd_number}</strong>
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="qr-form">
              {/* File Selection Box */}
              <div className="qr-field">
                <label className="qr-field-label">Choose Document or Photo</label>
                <div
                  className={`qr-dropzone ${selectedFile ? 'qr-dropzone--has-file' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/jpg"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />

                  {selectedFile ? (
                    <div className="qr-file-chosen">
                      <div className="qr-file-icon">
                        <Icon name="fileText" size={32} />
                      </div>
                      <div className="qr-file-meta">
                        <strong>{selectedFile.name}</strong>
                        <span>
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type || 'Document'}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="qr-change-file-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                        }}
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="qr-dropzone-prompt">
                      <div className="qr-prompt-icon">
                        <Icon name="upload" size={32} />
                      </div>
                      <p className="qr-prompt-main">Tap to select a PDF or photo</p>
                      <span className="qr-prompt-sub">Supports PDF reports, JPEG, or PNG images (up to 15 MB)</span>
                      
                      <div className="qr-action-buttons">
                        <button
                          type="button"
                          className="btn btn--secondary btn--sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                        >
                          <Icon name="folder" size={16} /> Choose File
                        </button>
                        <button
                          type="button"
                          className="btn btn--outline btn--sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            cameraInputRef.current?.click();
                          }}
                        >
                          <Icon name="camera" size={16} /> Take Photo
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Report Category */}
              <div className="qr-field">
                <label className="qr-field-label" htmlFor="qr-category">
                  Report Category
                </label>
                <select
                  id="qr-category"
                  className="qr-select"
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                >
                  {REPORT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Document Title (optional) */}
              <div className="qr-field">
                <label className="qr-field-label" htmlFor="qr-title-input">
                  Document Title <span className="qr-opt">(optional)</span>
                </label>
                <input
                  id="qr-title-input"
                  type="text"
                  className="qr-input"
                  placeholder="e.g. Complete Blood Count (CBC) or Chest X-Ray"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                />
              </div>

              {/* Remarks / Notes (optional) */}
              <div className="qr-field">
                <label className="qr-field-label" htmlFor="qr-summary-input">
                  Remarks / Notes for Doctor <span className="qr-opt">(optional)</span>
                </label>
                <textarea
                  id="qr-summary-input"
                  rows={2}
                  className="qr-textarea"
                  placeholder="e.g. Done on 25 Oct at Civil Hospital"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                />
              </div>

              {/* Progress bar */}
              {isSubmitting && (
                <div className="qr-progress-bar-wrap">
                  <div className="qr-progress-bar" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={!selectedFile || isSubmitting}
                className="btn btn--primary qr-submit-btn"
              >
                {isSubmitting ? 'Uploading to Doctor...' : 'Send Report to Doctor'}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
