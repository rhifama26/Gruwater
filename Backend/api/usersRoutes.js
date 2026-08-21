const express = require('express');
const UsersController = require('../controllers/usersController');
const auth = require('../middlewares/auth');
const role = require('../middlewares/role');

const router = express.Router();
router.use(auth, role(['admin']));
router.get('/', UsersController.getAll);
router.post('/', UsersController.create);
router.put('/:id', UsersController.update);
router.delete('/:id', UsersController.delete);

module.exports = router;