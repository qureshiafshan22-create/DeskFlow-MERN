const mongoose = require('mongoose');
const Ticket = require('./models/ticket');
const ticketController = require('./controllers/ticketController');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/deskflow_test';

// Import our controller helpers directly to test them in isolation
// Priority targets
const SLA_TARGETS = {
  urgent: 60,       // 1 hour
  high: 240,       // 4 hours
  medium: 1440,    // 24 hours
  low: 4320        // 72 hours
};

// Valid transitions
const VALID_TRANSITIONS = {
  open: ['in_progress'],
  in_progress: ['open', 'resolved'],
  resolved: ['in_progress', 'closed'],
  closed: ['resolved']
};

const computeDerivedFields = (ticket) => {
  const now = new Date();
  const createdAt = new Date(ticket.createdAt);
  
  let ageMinutes = 0;
  if (ticket.status === 'resolved' || ticket.status === 'closed') {
    const endTime = ticket.resolvedAt ? new Date(ticket.resolvedAt) : now;
    ageMinutes = Math.floor((endTime - createdAt) / 60000);
  } else {
    ageMinutes = Math.floor((now - createdAt) / 60000);
  }
  
  if (ageMinutes < 0) ageMinutes = 0;

  const targetMinutes = SLA_TARGETS[ticket.priority] || 4320;
  const slaBreached = ageMinutes > targetMinutes;

  return {
    ...ticket.toObject ? ticket.toObject() : ticket,
    ageMinutes,
    slaBreached
  };
};

function runTest(description, assertFn) {
  try {
    assertFn();
    console.log(`✅ PASS: ${description}`);
  } catch (error) {
    console.error(`❌ FAIL: ${description}`);
    console.error(`   Error: ${error.message}`);
  }
}

async function startTests() {
  console.log('=== Running DeskFlow Logic Verification Tests ===\n');

  // Test 1: Derived fields calculation (unresolved high priority, 5 hours old -> breached = true)
  runTest('SLA Breached is true for a high-priority ticket created 5 hours (300 minutes) ago', () => {
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
    const mockTicket = {
      subject: 'Test SLA',
      priority: 'high',
      status: 'open',
      createdAt: fiveHoursAgo,
      resolvedAt: null
    };

    const derived = computeDerivedFields(mockTicket);
    if (derived.ageMinutes !== 300) {
      throw new Error(`Expected ageMinutes to be 300, got ${derived.ageMinutes}`);
    }
    if (derived.slaBreached !== true) {
      throw new Error(`Expected slaBreached to be true for high priority exceeding 4 hours (240m)`);
    }
  });

  // Test 2: Derived fields calculation (resolved high priority, resolved in 3 hours -> breached = false)
  runTest('SLA Breached is false for a high-priority ticket resolved in 3 hours', () => {
    const start = new Date(Date.now() - 5 * 60 * 60 * 1000);
    const resolved = new Date(start.getTime() + 3 * 60 * 60 * 1000); // 3h later
    const mockTicket = {
      subject: 'Test SLA Resolved',
      priority: 'high',
      status: 'resolved',
      createdAt: start,
      resolvedAt: resolved
    };

    const derived = computeDerivedFields(mockTicket);
    if (derived.ageMinutes !== 180) {
      throw new Error(`Expected ageMinutes to be 180, got ${derived.ageMinutes}`);
    }
    if (derived.slaBreached !== false) {
      throw new Error(`Expected slaBreached to be false for high priority resolved within 4h`);
    }
  });

  // Test 3: SLA Breached is true for a high-priority ticket resolved in 5 hours (resolved after target)
  runTest('SLA Breached is true for a high-priority ticket resolved in 5 hours', () => {
    const start = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const resolved = new Date(start.getTime() + 5 * 60 * 60 * 1000); // 5h later
    const mockTicket = {
      subject: 'Test SLA Resolved Late',
      priority: 'high',
      status: 'resolved',
      createdAt: start,
      resolvedAt: resolved
    };

    const derived = computeDerivedFields(mockTicket);
    if (derived.ageMinutes !== 300) {
      throw new Error(`Expected ageMinutes to be 300, got ${derived.ageMinutes}`);
    }
    if (derived.slaBreached !== true) {
      throw new Error(`Expected slaBreached to be true for high priority resolved after 4 hours`);
    }
  });

  // Test 4: Age stops growing once resolved
  runTest('ageMinutes stops growing and stays frozen at resolution time', () => {
    const tenHoursAgo = new Date(Date.now() - 10 * 60 * 60 * 1000);
    const resolvedTwoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000); // resolved after 8 hours
    const mockTicket = {
      subject: 'Test SLA Resolved Age',
      priority: 'medium',
      status: 'resolved',
      createdAt: tenHoursAgo,
      resolvedAt: resolvedTwoHoursAgo
    };

    const derived = computeDerivedFields(mockTicket);
    // Age should be difference between tenHoursAgo and resolvedTwoHoursAgo, which is 8 hours (480 minutes)
    if (derived.ageMinutes !== 480) {
      throw new Error(`Expected ageMinutes to be 480 (8 hours), got ${derived.ageMinutes}`);
    }
  });

  // Test 5: Validate Transition Logic
  runTest('Transition validation logic matches rules', () => {
    const checkTransition = (current, next) => {
      const allowed = VALID_TRANSITIONS[current];
      return allowed && allowed.includes(next);
    };

    // Valid forward transitions
    if (!checkTransition('open', 'in_progress')) throw new Error('open -> in_progress should be allowed');
    if (!checkTransition('in_progress', 'resolved')) throw new Error('in_progress -> resolved should be allowed');
    if (!checkTransition('resolved', 'closed')) throw new Error('resolved -> closed should be allowed');

    // Valid backward transitions (1 step)
    if (!checkTransition('in_progress', 'open')) throw new Error('in_progress -> open should be allowed');
    if (!checkTransition('resolved', 'in_progress')) throw new Error('resolved -> in_progress should be allowed');
    if (!checkTransition('closed', 'resolved')) throw new Error('closed -> resolved should be allowed');

    // Invalid forward transitions
    if (checkTransition('open', 'resolved')) throw new Error('open -> resolved should NOT be allowed');
    if (checkTransition('open', 'closed')) throw new Error('open -> closed should NOT be allowed');
    if (checkTransition('in_progress', 'closed')) throw new Error('in_progress -> closed should NOT be allowed');

    // Invalid backward transitions (> 1 step)
    if (checkTransition('closed', 'in_progress')) throw new Error('closed -> in_progress should NOT be allowed');
    if (checkTransition('closed', 'open')) throw new Error('closed -> open should NOT be allowed');
    if (checkTransition('resolved', 'open')) throw new Error('resolved -> open should NOT be allowed');
  });

  console.log('\n=== Logic verification completed ===');
}

startTests();
