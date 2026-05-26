import React, { useState } from 'react';
import TicketCard from './TicketCard';

const COLUMNS = [
  { id: 'open', title: 'Open', color: 'rgba(255, 255, 255, 0.05)', icon: '📥' },
  { id: 'in_progress', title: 'In Progress', color: 'rgba(59, 130, 246, 0.05)', icon: '⚡' },
  { id: 'resolved', title: 'Resolved', color: 'rgba(16, 185, 129, 0.05)', icon: '✅' },
  { id: 'closed', title: 'Closed', color: 'rgba(100, 116, 139, 0.05)', icon: '🔒' }
];

const Board = ({ tickets, onTransition, onDelete, handleDragStart, handleDrop }) => {
  const [activeDragOverCol, setActiveDragOverCol] = useState(null);

  const onDragOver = (e) => {
    e.preventDefault();
  };

  const onDragEnter = (colId) => {
    setActiveDragOverCol(colId);
  };

  const onDragLeave = () => {
    setActiveDragOverCol(null);
  };

  const onLocalDrop = (e, colId) => {
    setActiveDragOverCol(null);
    handleDrop(e, colId);
  };

  return (
    <div style={styles.boardGrid}>
      {COLUMNS.map((column) => {
        const columnTickets = tickets.filter((t) => t.status === column.id);
        const isHovered = activeDragOverCol === column.id;

        return (
          <div
            key={column.id}
            onDragOver={onDragOver}
            onDragEnter={() => onDragEnter(column.id)}
            onDragLeave={onDragLeave}
            onDrop={(e) => onLocalDrop(e, column.id)}
            style={{
              ...styles.column,
              backgroundColor: isHovered ? 'rgba(255, 255, 255, 0.02)' : 'var(--bg-board)',
              borderColor: isHovered ? 'var(--accent-purple)' : 'rgba(255, 255, 255, 0.05)',
              boxShadow: isHovered ? '0 0 15px rgba(139, 92, 246, 0.15)' : 'none'
            }}
          >
            {/* Column Header */}
            <div style={styles.columnHeader}>
              <div style={styles.titleGroup}>
                <span style={styles.colIcon}>{column.icon}</span>
                <h2 style={styles.columnTitle}>{column.title}</h2>
              </div>
              <span style={styles.ticketCount}>{columnTickets.length}</span>
            </div>

            {/* Ticket Cards list */}
            <div style={styles.cardsContainer}>
              {columnTickets.length === 0 ? (
                <div style={styles.emptyPlaceholder}>
                  <div style={styles.placeholderIcon}>✨</div>
                  <div style={styles.placeholderText}>Clean board</div>
                </div>
              ) : (
                columnTickets.map((ticket) => (
                  <TicketCard
                    key={ticket._id}
                    ticket={ticket}
                    onTransition={onTransition}
                    onDelete={onDelete}
                    onDragStart={handleDragStart}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const styles = {
  boardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.25rem',
    width: '100%',
    flex: '1',
    alignItems: 'stretch'
  },
  column: {
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '16px',
    padding: '1.1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    minHeight: '400px',
    transition: 'background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease'
  },
  columnHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    paddingBottom: '0.75rem',
    marginBottom: '0.25rem'
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  colIcon: {
    fontSize: '1.1rem'
  },
  columnTitle: {
    fontSize: '1.05rem',
    fontWeight: '700',
    color: '#FFF'
  },
  ticketCount: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#94A3B8',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    padding: '0.15rem 0.45rem',
    borderRadius: '6px'
  },
  cardsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.85rem',
    flex: '1',
    overflowY: 'auto'
  },
  emptyPlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0.35rem',
    border: '2px dashed rgba(255, 255, 255, 0.02)',
    borderRadius: '12px',
    padding: '2.5rem 1rem',
    color: '#64748B',
    height: '120px',
    userSelect: 'none'
  },
  placeholderIcon: {
    fontSize: '1.5rem',
    opacity: '0.6'
  },
  placeholderText: {
    fontSize: '0.8rem',
    fontWeight: '500'
  }
};

export default Board;
