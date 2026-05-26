import React, { useState, useEffect } from 'react';
import StatsStrip from './components/StatsStrip';
import Board from './components/Board';
import TicketForm from './components/TicketForm';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const VALID_TRANSITIONS = {
  open: ['in_progress'],
  in_progress: ['open', 'resolved'],
  resolved: ['in_progress', 'closed'],
  closed: ['resolved']
};

function App() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({
    statusCounts: { open: 0, in_progress: 0, resolved: 0, closed: 0 },
    priorityCounts: { low: 0, medium: 0, high: 0, urgent: 0 },
    slaBreachedOpenCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters State
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [breachedFilter, setBreachedFilter] = useState(false);

  // Toast notifications state
  const [notification, setNotification] = useState(null);

  // Dragged ticket state
  const [draggedTicket, setDraggedTicket] = useState(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    // Auto-clear after 4 seconds
    setTimeout(() => {
      setNotification((current) => {
        if (current && current.message === message) return null;
        return current;
      });
    }, 4000);
  };

  // Fetch Tickets matching active filters
  const fetchTickets = async (priority = priorityFilter, breached = breachedFilter) => {
    try {
      let url = `${API_BASE_URL}/tickets`;
      const queryParams = [];
      
      if (priority !== 'all') {
        queryParams.push(`priority=${priority}`);
      }
      if (breached) {
        queryParams.push('breached=true');
      }

      if (queryParams.length > 0) {
        url += `?${queryParams.join('&')}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load tickets');
      const data = await res.json();
      setTickets(data);
    } catch (err) {
      console.error(err);
      setError('Could not retrieve tickets. Please ensure the backend is running.');
    }
  };

  // Fetch Stats globally (always reflects actual DB stats)
  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/tickets/stats`);
      if (!res.ok) throw new Error('Failed to load stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    await Promise.all([fetchTickets(), fetchStats()]);
    setLoading(false);
  };

  // Initial load
  useEffect(() => {
    loadData();

    // Auto-refresh age metrics and breach status every 30 seconds
    const interval = setInterval(() => {
      fetchTickets();
      fetchStats();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Filter change handlers
  const handlePriorityFilterChange = (val) => {
    setPriorityFilter(val);
    fetchTickets(val, breachedFilter);
  };

  const handleBreachedFilterToggle = () => {
    const nextBreached = !breachedFilter;
    setBreachedFilter(nextBreached);
    fetchTickets(priorityFilter, nextBreached);
  };

  // Form Submit Handler
  const handleCreateTicket = async (ticketData) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketData)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create ticket');
      }

      showToast('Support ticket created successfully!', 'success');
      await Promise.all([fetchTickets(), fetchStats()]);
      return true;
    } catch (err) {
      showToast(err.message, 'error');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Transition Ticket Handler
  const handleTransition = async (ticketId, targetStatus) => {
    try {
      const res = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update status');
      }

      // Smooth state update: refetch lists and stats
      await Promise.all([fetchTickets(), fetchStats()]);
      showToast(`Status changed to ${targetStatus.replace('_', ' ')}!`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Delete Ticket Handler
  const handleDelete = async (ticketId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete ticket');
      }

      showToast('Ticket deleted successfully.', 'success');
      await Promise.all([fetchTickets(), fetchStats()]);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // HTML5 Drag Handlers
  const handleDragStart = (e, ticket) => {
    setDraggedTicket(ticket);
    e.dataTransfer.effectAllowed = 'move';
    // Stringify minimal data if needed
    e.dataTransfer.setData('text/plain', ticket._id);
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    if (!draggedTicket) return;

    const sourceStatus = draggedTicket.status;
    const ticketId = draggedTicket._id;

    // Check transition validity
    const allowed = VALID_TRANSITIONS[sourceStatus];
    if (sourceStatus !== targetStatus && (!allowed || !allowed.includes(targetStatus))) {
      // Invalid Transition! Trigger card shake and show error toast
      showToast(
        `Invalid Transition: Cannot move directly from '${sourceStatus.replace('_', ' ')}' to '${targetStatus.replace('_', ' ')}'`, 
        'error'
      );
      
      // Inject triggerShake into the ticket object in state to trigger keyframe animation
      setTickets((prevTickets) =>
        prevTickets.map((t) => (t._id === ticketId ? { ...t, triggerShake: true } : t))
      );
      setDraggedTicket(null);
      return;
    }

    // If status is unchanged, do nothing
    if (sourceStatus === targetStatus) {
      setDraggedTicket(null);
      return;
    }

    // Call update status
    await handleTransition(ticketId, targetStatus);
    setDraggedTicket(null);
  };

  return (
    <div style={styles.appContainer}>
      {/* Toast Notification Banner */}
      {notification && (
        <div 
          style={{
            ...styles.toast,
            backgroundColor: notification.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(16, 185, 129, 0.95)',
            boxShadow: notification.type === 'error' ? '0 10px 25px rgba(239, 68, 68, 0.3)' : '0 10px 25px rgba(16, 185, 129, 0.3)'
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>
            {notification.type === 'error' ? '🚫' : '✨'}
          </span>
          <span style={{ fontWeight: '600' }}>{notification.message}</span>
        </div>
      )}

      {/* Main Header Row */}
      <header style={styles.header}>
        <div>
          <h1>DeskFlow</h1>
          <p style={styles.subtitle}>Support Ticket Triage Board & SLA Monitor</p>
        </div>
        <button className="primary" onClick={() => setIsFormOpen(true)} style={styles.newTicketBtn}>
          <span style={{ fontSize: '1.2rem', marginRight: '0.2rem' }}>+</span>
          New Ticket
        </button>
      </header>

      {/* Dashboard Stats */}
      <StatsStrip stats={stats} loading={loading} />

      {/* Filter and Controls Area */}
      <div style={styles.controlsRow}>
        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>Filter Priority:</span>
          {['all', 'low', 'medium', 'high', 'urgent'].map((p) => (
            <button
              key={p}
              onClick={() => handlePriorityFilterChange(p)}
              style={{
                ...styles.filterBtn,
                backgroundColor: priorityFilter === p ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                borderColor: priorityFilter === p ? 'var(--accent-purple)' : 'rgba(255, 255, 255, 0.08)',
                color: priorityFilter === p ? '#FFF' : '#94A3B8',
              }}
            >
              {p}
            </button>
          ))}
        </div>

        <div style={styles.toggleGroup} onClick={handleBreachedFilterToggle}>
          <input 
            type="checkbox" 
            checked={breachedFilter}
            onChange={() => {}} // handled by click on parent group
            style={styles.checkbox} 
          />
          <span style={{ 
            fontSize: '0.9rem', 
            fontWeight: '600',
            color: breachedFilter ? 'var(--sla-breached)' : '#94A3B8' 
          }}>
            ⚠️ Show SLA Breached Only
          </span>
        </div>
      </div>

      {/* Board Kanban */}
      {error ? (
        <div style={styles.errorContainer}>
          <div style={{ fontSize: '3rem' }}>🔌</div>
          <h2>Connection Error</h2>
          <p style={{ color: '#94A3B8' }}>{error}</p>
          <button style={{ marginTop: '1rem' }} onClick={loadData}>Retry Connection</button>
        </div>
      ) : loading ? (
        <div style={styles.loadingContainer}>
          <div className="spinner" style={styles.mainSpinner}></div>
          <p style={{ color: '#94A3B8', fontWeight: '500' }}>Loading tickets and dashboard statistics...</p>
        </div>
      ) : (
        <Board
          tickets={tickets}
          onTransition={handleTransition}
          onDelete={handleDelete}
          handleDragStart={handleDragStart}
          handleDrop={handleDrop}
        />
      )}

      {/* Ticket Create Drawer */}
      <TicketForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleCreateTicket}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

const styles = {
  appContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    minHeight: '85vh'
  },
  toast: {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 2000,
    padding: '0.9rem 1.5rem',
    borderRadius: '12px',
    color: '#FFF',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    paddingBottom: '1rem'
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: '0.95rem',
    fontWeight: '500',
    marginTop: '0.2rem'
  },
  newTicketBtn: {
    padding: '0.75rem 1.4rem'
  },
  controlsRow: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: '12px',
    padding: '0.75rem 1.25rem',
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem'
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexWrap: 'wrap'
  },
  filterLabel: {
    fontSize: '0.8rem',
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginRight: '0.5rem'
  },
  filterBtn: {
    textTransform: 'capitalize',
    padding: '0.4rem 0.9rem',
    fontSize: '0.8rem',
    border: '1px solid transparent',
    borderRadius: '8px'
  },
  toggleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    userSelect: 'none',
    padding: '0.4rem 0.8rem',
    borderRadius: '8px',
    transition: 'background-color 0.2s ease',
    ':hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.02)'
    }
  },
  checkbox: {
    cursor: 'pointer',
    width: '16px',
    height: '16px',
    accentColor: '#EF4444'
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1rem',
    padding: '4rem 1rem',
    background: 'rgba(239, 68, 68, 0.02)',
    border: '1px dashed rgba(239, 68, 68, 0.2)',
    borderRadius: '16px',
    textAlign: 'center'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1rem',
    padding: '6rem 1rem',
    background: 'rgba(255, 255, 255, 0.01)',
    border: '1px dashed rgba(255, 255, 255, 0.05)',
    borderRadius: '16px'
  },
  mainSpinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(255, 255, 255, 0.05)',
    borderTopColor: 'var(--accent-purple)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  }
};

export default App;
