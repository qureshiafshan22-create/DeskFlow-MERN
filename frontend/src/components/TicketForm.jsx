import React, { useState } from 'react';

const TicketForm = ({ isOpen, onClose, onSubmit, isSubmitting }) => {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [priority, setPriority] = useState('medium');

  // Inline errors state
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!subject.trim()) {
      newErrors.subject = 'Subject is required';
    } else if (subject.length < 5) {
      newErrors.subject = 'Subject must be at least 5 characters long';
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    } else if (description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters long';
    }

    if (!customerEmail.trim()) {
      newErrors.customerEmail = 'Customer email is required';
    } else {
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(customerEmail)) {
        newErrors.customerEmail = 'Please enter a valid email address';
      }
    }

    if (!priority) {
      newErrors.priority = 'Priority is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const ticketData = {
      subject: subject.trim(),
      description: description.trim(),
      customerEmail: customerEmail.trim(),
      priority
    };

    const success = await onSubmit(ticketData);
    if (success) {
      // Clear form
      setSubject('');
      setDescription('');
      setCustomerEmail('');
      setPriority('medium');
      setErrors({});
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div style={styles.backdrop} onClick={onClose}></div>

      {/* Slide-out Panel */}
      <div style={styles.drawer}>
        <div style={styles.header}>
          <h2>Create Support Ticket</h2>
          <button style={styles.closeBtn} onClick={onClose} title="Close Panel">✕</button>
        </div>

        <form onSubmit={handleFormSubmit} style={styles.form} noValidate>
          {/* Customer Email */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Customer Email *</label>
            <input
              type="email"
              placeholder="e.g. support@customer.com"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              style={{
                ...styles.input,
                borderColor: errors.customerEmail ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.08)',
                boxShadow: errors.customerEmail ? '0 0 8px rgba(239, 68, 68, 0.15)' : 'none'
              }}
            />
            {errors.customerEmail && (
              <span style={styles.errorText}>{errors.customerEmail}</span>
            )}
          </div>

          {/* Subject */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Subject *</label>
            <input
              type="text"
              placeholder="e.g. Cannot login to dashboard"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={100}
              style={{
                ...styles.input,
                borderColor: errors.subject ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.08)',
                boxShadow: errors.subject ? '0 0 8px rgba(239, 68, 68, 0.15)' : 'none'
              }}
            />
            {errors.subject && (
              <span style={styles.errorText}>{errors.subject}</span>
            )}
          </div>

          {/* Priority */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Priority *</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              style={{
                ...styles.select,
                borderColor: errors.priority ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.08)'
              }}
            >
              <option value="low">Low (72h SLA)</option>
              <option value="medium">Medium (24h SLA)</option>
              <option value="high">High (4h SLA)</option>
              <option value="urgent">Urgent (1h SLA)</option>
            </select>
            {errors.priority && (
              <span style={styles.errorText}>{errors.priority}</span>
            )}
          </div>

          {/* Description */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Description *</label>
            <textarea
              placeholder="Provide a detailed description of the problem..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              style={{
                ...styles.textarea,
                borderColor: errors.description ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.08)',
                boxShadow: errors.description ? '0 0 8px rgba(239, 68, 68, 0.15)' : 'none'
              }}
            />
            {errors.description && (
              <span style={styles.errorText}>{errors.description}</span>
            )}
          </div>

          {/* Submit Action */}
          <button 
            type="submit" 
            className="primary" 
            disabled={isSubmitting}
            style={styles.submitBtn}
          >
            {isSubmitting ? (
              <>
                <span style={styles.spinner}></span>
                Creating...
              </>
            ) : (
              'Create Support Ticket'
            )}
          </button>
        </form>
      </div>
    </>
  );
};

const styles = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(5, 7, 12, 0.6)',
    backdropFilter: 'blur(8px)',
    zIndex: 1000,
    animation: 'fadeIn 0.25s ease-out'
  },
  drawer: {
    position: 'fixed',
    top: 0,
    right: 0,
    width: '100%',
    maxWidth: '450px',
    height: '100vh',
    background: '#0B0F19',
    borderLeft: '1px solid rgba(255, 255, 255, 0.06)',
    boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.4)',
    padding: '2rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
    zIndex: 1001,
    overflowY: 'auto',
    animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#94A3B8',
    fontSize: '1.25rem',
    padding: '0.25rem',
    cursor: 'pointer',
    transition: 'color 0.2s ease',
    outline: 'none'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  input: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    padding: '0.8rem 1rem',
    color: '#FFF',
    fontFamily: 'inherit',
    fontSize: '0.9rem',
    outline: 'none',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
  },
  select: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    padding: '0.8rem 1rem',
    color: '#FFF',
    fontFamily: 'inherit',
    fontSize: '0.9rem',
    outline: 'none',
    cursor: 'pointer'
  },
  textarea: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    padding: '0.8rem 1rem',
    color: '#FFF',
    fontFamily: 'inherit',
    fontSize: '0.9rem',
    outline: 'none',
    resize: 'vertical',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
  },
  errorText: {
    color: '#EF4444',
    fontSize: '0.75rem',
    fontWeight: '600',
    marginTop: '0.15rem'
  },
  submitBtn: {
    width: '100%',
    padding: '0.9rem',
    fontSize: '0.95rem',
    marginTop: '0.5rem'
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: '#FFF',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'spin 0.8s linear infinite'
  }
};

export default TicketForm;
