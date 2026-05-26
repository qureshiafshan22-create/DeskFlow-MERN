const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  customerEmail: {
    type: String,
    required: [true, 'Customer email is required'],
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  priority: {
    type: String,
    required: [true, 'Priority is required'],
    enum: {
      values: ['low', 'medium', 'high', 'urgent'],
      message: 'Priority must be low, medium, high, or urgent'
    }
  },
  status: {
    type: String,
    enum: {
      values: ['open', 'in_progress', 'resolved', 'closed'],
      message: 'Status must be open, in_progress, resolved, or closed'
    },
    default: 'open'
  },
  resolvedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: { createdAt: true, updatedAt: false } // Only auto-generate createdAt
});

const MongooseTicket = mongoose.model('Ticket', ticketSchema);

// In-Memory Database Fallback Implementation for systems without local MongoDB running
let inMemoryDb = [
  {
    _id: "demo-t1",
    subject: "Unable to access customer dashboard dashboard page",
    description: "Every time I try to load the client dashboard, I receive a 504 Gateway Timeout error. Please resolve this as it is impacting our operations.",
    customerEmail: "operations@clientcompany.com",
    priority: "high",
    status: "open",
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago (SLA breached)
    resolvedAt: null
  },
  {
    _id: "demo-t2",
    subject: "Integrate stripe payment payment processor",
    description: "Requesting help setting up webhook endpoints for billing notifications on stripe API connection.",
    customerEmail: "developer@startup.io",
    priority: "medium",
    status: "in_progress",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    resolvedAt: null
  },
  {
    _id: "demo-t3",
    subject: "Urgent: API key reset request",
    description: "We lost our production API token and need an immediate regeneration to restore access.",
    customerEmail: "cto@enterprise.com",
    priority: "urgent",
    status: "resolved",
    createdAt: new Date(Date.now() - 40 * 60 * 1000), // 40m ago
    resolvedAt: new Date(Date.now() - 10 * 60 * 1000) // resolved 10m ago (within 1h SLA)
  }
];

class InMemoryTicket {
  constructor(data) {
    this._id = data._id || Math.random().toString(36).substring(2, 9);
    this.subject = data.subject;
    this.description = data.description;
    this.customerEmail = data.customerEmail;
    this.priority = data.priority;
    this.status = data.status || 'open';
    this.createdAt = data.createdAt || new Date();
    this.resolvedAt = data.resolvedAt || null;
  }

  async save() {
    if (!this.subject) throw new Error('Subject is required');
    if (!this.description) throw new Error('Description is required');
    if (!this.customerEmail) throw new Error('Customer email is required');
    if (!this.priority) throw new Error('Priority is required');
    if (!/^\S+@\S+\.\S+$/.test(this.customerEmail)) {
      throw new Error('Please enter a valid email address');
    }

    const idx = inMemoryDb.findIndex(t => t._id === this._id);
    if (idx !== -1) {
      inMemoryDb[idx] = this.toObject();
    } else {
      inMemoryDb.push(this.toObject());
    }
    return this;
  }

  toObject() {
    return {
      _id: this._id,
      subject: this.subject,
      description: this.description,
      customerEmail: this.customerEmail,
      priority: this.priority,
      status: this.status,
      createdAt: this.createdAt,
      resolvedAt: this.resolvedAt
    };
  }

  static find(query = {}) {
    let results = inMemoryDb.map(t => new InMemoryTicket(t));
    if (query.status) {
      results = results.filter(t => t.status === query.status);
    }
    if (query.priority) {
      results = results.filter(t => t.priority === query.priority);
    }

    const chainable = Promise.resolve(results);
    chainable.sort = (sortObj) => {
      const sortedResults = [...results].sort((a, b) => b.createdAt - a.createdAt);
      return Promise.resolve(sortedResults);
    };
    return chainable;
  }

  static async findById(id) {
    const ticket = inMemoryDb.find(t => t._id === id);
    return ticket ? new InMemoryTicket(ticket) : null;
  }

  static async findByIdAndDelete(id) {
    const idx = inMemoryDb.findIndex(t => t._id === id);
    if (idx !== -1) {
      const deleted = inMemoryDb[idx];
      inMemoryDb.splice(idx, 1);
      return new InMemoryTicket(deleted);
    }
    return null;
  }
}

// Proxy module exports to dynamically switch depending on active DB mode
module.exports = new Proxy(MongooseTicket, {
  get(target, prop) {
    if (global.useInMemoryDb) {
      return InMemoryTicket[prop] !== undefined ? InMemoryTicket[prop] : InMemoryTicket;
    }
    return MongooseTicket[prop] !== undefined ? MongooseTicket[prop] : MongooseTicket;
  },
  construct(target, args) {
    if (global.useInMemoryDb) {
      return new InMemoryTicket(...args);
    }
    return new MongooseTicket(...args);
  }
});
