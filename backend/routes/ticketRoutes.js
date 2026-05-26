const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');

// Stats endpoint (needs to be above /:id so it doesn't get captured as an ID)
router.get('/stats', ticketController.getStats);

// List and Create
router.get('/', ticketController.listTickets);
router.post('/', ticketController.createTicket);

// Update and Delete
router.patch('/:id', ticketController.updateTicketStatus);
router.delete('/:id', ticketController.deleteTicket);

module.exports = router;
