const express = require('express');
const { dashboard } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, dashboard);

module.exports = router;
