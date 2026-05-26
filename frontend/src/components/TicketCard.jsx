import React, { useState } from 'react';

const formatAge = (mins) => {
  if (mins < 0) mins = 0;
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  if (hours < 24) {
    return `${hours}h ${remainingMins}m`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h`;
};

const TicketCard = ({ ticket, onTransition, onDelete, onDragStart }) => {
  const [expanded, setExpanded] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const { _id, subject, description, customerEmail, priority, status, ageMinutes, slaBreached } = ticket;

  // Enforce shake animation if needed
  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 400);
  };

  // Attach reference to card for shake calling
  React.useEffect(() => {
    if (ticket.triggerShake) {
      triggerShake();
      delete ticket.triggerShake; // clear it
    }
  }, [ticket.triggerShake]);

  // Transition mapping for controls
  // Shows adjacent allowed transitions
  const renderControls = () => {
    switch (status) {
      case 'open':
        return (
          <button 
            style={styles.transitionBtn}
            onClick={() => onTransition(_id, 'in_progress')}
            title="Move to In Progress"
          >
            Start Work ➔
          </button>
        );
      case 'in_progress':
        return (
          <div style={styles.btnGroup}>
            <button 
              style={styles.transitionBtnBack}
              onClick={() => onTransition(_id, 'open')}
              title="Move back to Open"
            >
              ⬅ Revert to Open
            </button>
            <button 
              style={styles.transitionBtn}
              onClick={() => onTransition(_id, 'resolved')}
              title="Move to Resolved"
            >
              Resolve ➔
            </button>
          </div>
        );
      case 'resolved':
        return (
          <div style={styles.btnGroup}>
            <button 
              style={styles.transitionBtnBack}
              onClick={() => onTransition(_id, 'in_progress')}
              title="Move back to In Progress"
            >
              ⬅ Reopen Work
            </button>
            <button 
              style={styles.transitionBtnClose}
              onClick={() => onTransition(_id, 'closed')}
              title="Move to Closed"
            >
              Close Ticket ➔
            </button>
          </div>
        );
      case 'closed':
        return (
          <button 
            style={styles.transitionBtnBack}
            onClick={() => onTransition(_id, 'resolved')}
            title="Move back to Resolved"
          >
            ⬅ Reopen to Resolved
          </button>
        );
      default:
        return null;
    }
  };

  const getPriorityStyle = (p) => {
    switch (p) {
      case 'urgent':
        return { color: 'var(--priority-urgent)', border: '1px solid rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.1)' };
      case 'high':
        return { color: 'var(--priority-high)', border: '1px solid rgba(245, 158, 11, 0.4)', background: 'rgba(245, 158, 11, 0.1)' };
      case 'medium':
        return { color: 'var(--priority-medium)', border: '1px solid rgba(59, 130, 246, 0.4)', background: 'rgba(59, 130, 246, 0.1)' };
      case 'low':
        return { color: 'var(--priority-low)', border: '1px solid rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.1)' };
      default:
        return {};
    }
  };

  return (
    <div 
      className={`ticket-card ${isShaking ? 'shake-animation' : ''}`}
      draggable
      onDragStart={(e) => onDragStart(e, ticket)}
      style={{
        ...styles.card,
        border: slaBreached ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-glow)'
      }}
    >
      {/* Header section with priority & SLA breach indicator */}
      <div style={styles.cardHeader}>
        <span style={{ ...styles.priorityBadge, ...getPriorityStyle(priority) }}>
          {priority}
        </span>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {slaBreached && (
            <span className="pulse-red" style={styles.breachedBadge}>
              SLA BREACHED
            </span>
          )}
          <button 
            style={styles.deleteBtn}
            onClick={() => {
              if (window.confirm(`Are you sure you want to delete this ticket?`)) {
                onDelete(_id);
              }
            }}
            title="Delete Ticket"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main Subject */}
      <h3 style={styles.subject} onClick={() => setExpanded(!expanded)}>
        {subject}
      </h3>

      {/* Collapsible Details */}
      <div style={{ ...styles.detailsContainer, height: expanded ? 'auto' : '52px' }}>
        <p style={styles.description}>
          {description}
        </p>
      </div>
      
      {description.length > 70 && (
        <span 
          style={styles.toggleText} 
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Show Less ▴' : 'Read More ▾'}
        </span>
      )}

      {/* Customer Email & Age Tracker */}
      <div style={styles.metadataSection}>
        <div style={styles.metaRow}>
          <span style={styles.metaLabel}>From:</span>
          <span style={styles.metaValue} title={customerEmail}>{customerEmail}</span>
        </div>
        <div style={styles.metaRow}>
          <span style={styles.metaLabel}>Age:</span>
          <span style={{ 
            ...styles.metaValue, 
            fontWeight: '700',
            color: slaBreached ? 'var(--sla-breached)' : '#E2E8F0' 
          }}>
            {formatAge(ageMinutes)}
          </span>
        </div>
      </div>

      {/* State controls */}
      <div style={styles.controlsContainer}>
        {renderControls()}
      </div>
    </div>
  );
};

const styles = {
  card: {
    background: 'var(--bg-card)',
    backdropFilter: 'blur(12px)',
    borderRadius: '12px',
    padding: '1.1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    cursor: 'grab',
    transition: 'transform 0.15s ease, border-color 0.2s ease, box-shadow 0.2s ease',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  priorityBadge: {
    textTransform: 'uppercase',
    fontSize: '0.65rem',
    fontWeight: '800',
    padding: '0.2rem 0.5rem',
    borderRadius: '6px',
    letterSpacing: '0.05em'
  },
  breachedBadge: {
    backgroundColor: 'var(--sla-breached)',
    color: '#FFF',
    fontSize: '0.6rem',
    fontWeight: '800',
    padding: '0.2rem 0.4rem',
    borderRadius: '4px',
    letterSpacing: '0.02em'
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: '#64748B',
    padding: '0',
    cursor: 'pointer',
    fontSize: '0.8rem',
    transition: 'color 0.2s ease',
    outline: 'none'
  },
  subject: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#FFF',
    lineHeight: '1.3',
    cursor: 'pointer',
    userSelect: 'none'
  },
  detailsContainer: {
    overflow: 'hidden',
    position: 'relative',
    transition: 'height 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
  },
  description: {
    fontSize: '0.85rem',
    color: '#94A3B8',
    lineHeight: '1.4',
    wordBreak: 'break-word'
  },
  toggleText: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: 'var(--accent-cyan)',
    cursor: 'pointer',
    alignSelf: 'flex-start',
    marginTop: '-0.25rem'
  },
  metadataSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    paddingTop: '0.5rem',
    fontSize: '0.75rem'
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  metaLabel: {
    color: '#64748B',
    fontWeight: '500'
  },
  metaValue: {
    color: '#CBD5E1',
    maxWidth: '150px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  controlsContainer: {
    marginTop: '0.25rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    paddingTop: '0.6rem',
    display: 'flex',
    flexDirection: 'column'
  },
  btnGroup: {
    display: 'flex',
    gap: '0.5rem',
    width: '100%'
  },
  transitionBtn: {
    fontSize: '0.7rem',
    padding: '0.4rem 0.6rem',
    width: '100%',
    color: '#06B6D4',
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    border: '1px solid rgba(6, 182, 212, 0.2)',
    borderRadius: '6px'
  },
  transitionBtnBack: {
    fontSize: '0.7rem',
    padding: '0.4rem 0.6rem',
    width: '100%',
    color: '#94A3B8',
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: '6px'
  },
  transitionBtnClose: {
    fontSize: '0.7rem',
    padding: '0.4rem 0.6rem',
    width: '100%',
    color: '#8B5CF6',
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: '6px'
  }
};

export default TicketCard;
