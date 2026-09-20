import React, { useState, useEffect, useRef } from 'react';
import { attachmentService } from '../../services/attachmentService';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../hooks/useAuth';
import { formatRelativeTime } from '../../utils/formatters';
import {
  Paperclip,
  Upload,
  Download,
  Trash2,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  File,
  Loader2,
  AlertCircle,
} from 'lucide-react';

const ALLOWED_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx', 'xls', 'xlsx'];
const MAX_SIZE_MB = 10;

const TaskAttachments = ({ taskId }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const fetchAttachments = async () => {
    try {
      const res = await attachmentService.getAttachments(taskId);
      if (res?.attachments) {
        setAttachments(res.attachments);
      }
    } catch (err) {
      console.warn('Failed to load attachments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttachments();

    if (socket && taskId) {
      const handleAttachmentAdded = (newAttachment) => {
        if (newAttachment.task === taskId || newAttachment.task?._id === taskId) {
          setAttachments((prev) => {
            if (prev.some((a) => a._id === newAttachment._id)) return prev;
            return [newAttachment, ...prev];
          });
        }
      };

      const handleAttachmentDeleted = ({ taskId: targetTaskId, attachmentId }) => {
        if (targetTaskId === taskId) {
          setAttachments((prev) => prev.filter((a) => a._id !== attachmentId));
        }
      };

      socket.on('attachmentAdded', handleAttachmentAdded);
      socket.on('attachmentDeleted', handleAttachmentDeleted);

      return () => {
        socket.off('attachmentAdded', handleAttachmentAdded);
        socket.off('attachmentDeleted', handleAttachmentDeleted);
      };
    }
  }, [taskId, socket]);

  const handleFileUpload = async (file) => {
    if (!file) return;
    setError('');

    const ext = file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError(`Invalid file type "${ext}". Supported types: PDF, PNG, JPG, DOC, DOCX, XLS, XLSX.`);
      return;
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum limit is ${MAX_SIZE_MB} MB.`);
      return;
    }

    setUploading(true);
    try {
      const res = await attachmentService.uploadAttachment(taskId, file);
      if (res?.attachment) {
        setAttachments((prev) => {
          if (prev.some((a) => a._id === res.attachment._id)) return prev;
          return [res.attachment, ...prev];
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload attachment.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (window.confirm('Are you sure you want to remove this attachment?')) {
      try {
        setAttachments((prev) => prev.filter((a) => a._id !== attachmentId));
        await attachmentService.deleteAttachment(attachmentId);
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to delete attachment');
        fetchAttachments();
      }
    }
  };

  const getFileIcon = (type) => {
    const t = (type || '').toLowerCase();
    if (['png', 'jpg', 'jpeg'].includes(t)) {
      return <ImageIcon size={20} color="#3B82F6" />;
    }
    if (['xls', 'xlsx'].includes(t)) {
      return <FileSpreadsheet size={20} color="#10B981" />;
    }
    if (['pdf', 'doc', 'docx'].includes(t)) {
      return <FileText size={20} color="#FF5B26" />;
    }
    return <File size={20} color="#64748B" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 'var(--card-radius-md)',
        padding: '20px 24px',
        marginBottom: 20,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Paperclip size={18} color="var(--coral-primary)" />
          <h3
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
            }}
          >
            File Attachments ({attachments.length})
          </h3>
        </div>

        {/* Upload Trigger Button */}
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFileUpload(e.target.files[0])}
            style={{ display: 'none' }}
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-coral"
            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
          >
            {uploading ? (
              <>
                <Loader2 size={14} className="spin-animation" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload size={14} />
                <span>Upload File</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: '#FEF2F2',
            border: '1px solid #F87171',
            color: '#991B1B',
            borderRadius: 'var(--card-radius-sm)',
            padding: '8px 12px',
            fontSize: '0.8rem',
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* Attachments List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Loader2 size={20} className="spin-animation" style={{ margin: '0 auto 6px auto' }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading attachments...</span>
        </div>
      ) : attachments.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {attachments.map((file) => {
            const isUploader = file.uploadedBy?._id === user?._id || file.uploadedBy === user?._id;
            const isManagerOrAdmin = user?.role === 'Admin' || user?.role === 'Manager';
            const canDelete = isUploader || isManagerOrAdmin;
            const downloadUrl = attachmentService.getDownloadUrl(file._id);

            return (
              <div
                key={file._id}
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 'var(--card-radius-sm)',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {getFileIcon(file.fileType)}
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={file.originalName}
                    >
                      {file.originalName}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {formatFileSize(file.fileSize)} • {file.uploadedBy?.name || 'User'} •{' '}
                      {formatRelativeTime(file.createdAt)}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="btn-outline"
                    style={{ padding: 6, borderRadius: 6, color: 'var(--text-primary)' }}
                    title="Download file"
                  >
                    <Download size={14} />
                  </a>

                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDeleteAttachment(file._id)}
                      className="btn-outline"
                      style={{
                        padding: 6,
                        borderRadius: 6,
                        color: '#EF4444',
                        borderColor: 'rgba(239, 68, 68, 0.3)',
                      }}
                      title="Delete attachment"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            textAlign: 'center',
            padding: '24px 10px',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
            border: '1px dashed #CBD5E1',
            borderRadius: 'var(--card-radius-sm)',
          }}
        >
          No files attached to this task yet. Supported formats: PDF, PNG, JPG, DOC, DOCX, XLS, XLSX (up to 10MB).
        </div>
      )}
    </div>
  );
};

export default TaskAttachments;
