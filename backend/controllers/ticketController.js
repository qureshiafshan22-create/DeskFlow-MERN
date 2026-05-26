const Ticket = require('../models/ticket');

// Priority SLA targets in minutes
const SLA_TARGETS = {
  urgent: 60,       // 1 hour
  high: 240,       // 4 hours
  medium: 1440,    // 24 hours
  low: 4320        // 72 hours
};

// Valid single-step transitions
const VALID_TRANSITIONS = {
  open: ['in_progress'],
  in_progress: ['open', 'resolved'],
  resolved: ['in_progress', 'closed'],
  closed: ['resolved']
};

/**
 * Helper to compute derived fields for a single ticket
 */
const computeDerivedFields = (ticket) => {
  const now = new Date();
  const createdAt = new Date(ticket.createdAt);
  
  let ageMinutes = 0;
  if (ticket.status === 'resolved' || ticket.status === 'closed') {
    // If ticket was resolved, age is based on resolvedAt
    const endTime = ticket.resolvedAt ? new Date(ticket.resolvedAt) : now;
    ageMinutes = Math.floor((endTime - createdAt) / 60000);
  } else {
    // Still open/in_progress
    ageMinutes = Math.floor((now - createdAt) / 60000);
  }
  
  // Enforce floor to avoid negative ages due to clock differences
  if (ageMinutes < 0) ageMinutes = 0;

  const targetMinutes = SLA_TARGETS[ticket.priority] || 4320;
  const slaBreached = ageMinutes > targetMinutes;

  return {
    ...ticket.toObject ? ticket.toObject() : ticket,
    ageMinutes,
    slaBreached
  };
};

// @desc    Create a ticket
// @route   POST /api/tickets
// @access  Public
exports.createTicket = async (req, res) => {
  try {
    const { subject, description, customerEmail, priority } = req.body;
    
    // Explicitly validate required fields before saving to give a nice 400 error
    if (!subject) return res.status(400).json({ error: 'Subject is required' });
    if (!description) return res.status(400).json({ error: 'Description is required' });
    if (!customerEmail) return res.status(400).json({ error: 'Customer email is required' });
    if (!priority) return res.status(400).json({ error: 'Priority is required' });
    
    const ticket = new Ticket({
      subject,
      description,
      customerEmail,
      priority,
      status: 'open'
    });

    await ticket.save();
    
    const responseTicket = computeDerivedFields(ticket);
    res.status(201).json(responseTicket);
  } catch (error) {
    if (error.name === 'ValidationError' || error.message.includes('validation')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Get all tickets with filters
// @route   GET /api/tickets
// @access  Public
exports.listTickets = async (req, res) => {
  try {
    const { status, priority, breached } = req.query;
    
    // Build DB query
    const dbQuery = {};
    if (status) dbQuery.status = status;
    if (priority) dbQuery.priority = priority;

    const tickets = await Ticket.find(dbQuery);

    // Compute derived fields for all matching tickets
    let mappedTickets = tickets.map(computeDerivedFields);

    // Apply breached filter in memory if specified
    if (breached !== undefined) {
      const shouldBeBreached = breached === 'true';
      mappedTickets = mappedTickets.filter(t => t.slaBreached === shouldBeBreached);
    }

    // Apply descending sort by creation date
    mappedTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(mappedTickets);
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
};

// @desc    Update a ticket status (PATCH)
// @route   PATCH /api/tickets/:id
// @access  Public
exports.updateTicketStatus = async (req, res) => {
  try {
    const { status: newStatus } = req.body;
    const ticketId = req.params.id;

    if (!newStatus) {
      return res.status(400).json({ error: 'Status is required in body' });
    }

    // Find current ticket
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const currentStatus = ticket.status;

    // If no change, return ticket
    if (currentStatus === newStatus) {
      return res.json(computeDerivedFields(ticket));
    }

    // Enforce transition rules
    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(newStatus)) {
      return res.status(400).json({
        error: `Invalid transition: Can only move to ${allowed ? allowed.join(' or ') : 'none'} from current status '${currentStatus}'`
      });
    }

    // Handle resolvedAt logic
    if (newStatus === 'resolved') {
      ticket.resolvedAt = new Date();
    } else if (newStatus === 'in_progress' && currentStatus === 'resolved') {
      // Moving back to in_progress clears resolvedAt
      ticket.resolvedAt = null;
    }

    // Update status
    ticket.status = newStatus;
    await ticket.save();

    res.json(computeDerivedFields(ticket));
  } catch (error) {
    if (error.name === 'ValidationError' || error.message.includes('validation')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server Error' });
  }
};

// @desc    Delete a ticket
// @route   DELETE /api/tickets/:id
// @access  Public
exports.deleteTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndDelete(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json({ message: 'Ticket deleted successfully', id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
};

// @desc    Get aggregate statistics
// @route   GET /api/tickets/stats
// @access  Public
exports.getStats = async (req, res) => {
  try {
    const tickets = await Ticket.find();

    const statusCounts = { open: 0, in_progress: 0, resolved: 0, closed: 0 };
    const priorityCounts = { low: 0, medium: 0, high: 0, urgent: 0 };
    let slaBreachedOpenCount = 0;

    tickets.forEach(ticket => {
      // Count statuses
      if (statusCounts[ticket.status] !== undefined) {
        statusCounts[ticket.status]++;
      }
      
      // Count priorities
      if (priorityCounts[ticket.priority] !== undefined) {
        priorityCounts[ticket.priority]++;
      }

      // Check SLA breach for open tickets (open or in_progress)
      if (ticket.status === 'open' || ticket.status === 'in_progress') {
        const derived = computeDerivedFields(ticket);
        if (derived.slaBreached) {
          slaBreachedOpenCount++;
        }
      }
    });

    res.json({
      statusCounts,
      priorityCounts,
      slaBreachedOpenCount
    });
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
};
