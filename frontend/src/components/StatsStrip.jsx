import React from 'react';

const StatsStrip = ({ stats, loading }) => {
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.skeleton}></div>
      </div>
    );
  }

  const { statusCounts = {}, priorityCounts = {}, slaBreachedOpenCount = 0 } = stats || {};

  const totalTickets = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  return (
    <div style={styles.container}>
      <div style={styles.statCard}>
        <div style={styles.cardHeader}>
          <span style={styles.cardTitle}>Total Tickets</span>
          <span style={styles.icon}>📋</span>
        </div>
        <div style={styles.value}>{totalTickets}</div>
      </div>

      <div style={styles.statCard}>
        <div style={styles.cardHeader}>
          <span style={styles.cardTitle}>Open</span>
          <span style={{ ...styles.badge, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}></span>
        </div>
        <div style={styles.value}>{statusCounts.open || 0}</div>
      </div>

      <div style={styles.statCard}>
        <div style={styles.cardHeader}>
          <span style={styles.cardTitle}>In Progress</span>
          <span style={{ ...styles.badge, backgroundColor: '#3B82F6' }}></span>
        </div>
        <div style={styles.value}>{statusCounts.in_progress || 0}</div>
      </div>

      <div style={styles.statCard}>
        <div style={styles.cardHeader}>
          <span style={styles.cardTitle}>Resolved</span>
          <span style={{ ...styles.badge, backgroundColor: '#10B981' }}></span>
        </div>
        <div style={styles.value}>{statusCounts.resolved || 0}</div>
      </div>

      <div style={styles.statCard}>
        <div style={styles.cardHeader}>
          <span style={styles.cardTitle}>Closed</span>
          <span style={{ ...styles.badge, backgroundColor: '#64748B' }}></span>
        </div>
        <div style={styles.value}>{statusCounts.closed || 0}</div>
      </div>

      <div style={{ ...styles.statCard, ...styles.breachedCard }}>
        <div style={styles.cardHeader}>
          <span style={{ ...styles.cardTitle, color: '#FF8A8A' }}>SLA Breached</span>
          <span style={styles.pulseIcon}>⚠️</span>
        </div>
        <div style={{ ...styles.value, color: '#EF4444' }}>{slaBreachedOpenCount}</div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1rem',
    width: '100%',
    marginBottom: '1rem'
  },
  skeleton: {
    height: '90px',
    borderRadius: '12px',
    background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    width: '100%'
  },
  statCard: {
    background: 'var(--bg-card)',
    backdropFilter: 'blur(12px)',
    border: '1px solid var(--border-glow)',
    borderRadius: '12px',
    padding: '1rem 1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    transition: 'all 0.3s ease'
  },
  breachedCard: {
    background: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  value: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#FFF'
  },
  icon: {
    fontSize: '1rem'
  },
  pulseIcon: {
    fontSize: '1rem',
    animation: 'pulseGlow 2s infinite'
  },
  badge: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    display: 'inline-block'
  }
};

export default StatsStrip;
