const express = require('express');
const AuthController = require('../controllers/authController');
const auth = require('../middlewares/auth');

const router = express.Router();
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.get('/profile', auth, AuthController.getProfile);
router.post('/logout', auth, AuthController.logout);

module.exports = router;