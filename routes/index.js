var express = require('express');
var router = express.Router();

const postController = require('../controllers/post');
const userController = require('../controllers/user');
const sessionController = require('../controllers/session');

// CheckLoginExpires (session)
router.all('*',sessionController.checkLoginExpires);



// History: Restoration routes.

// Redirection to the saved restoration route.
function redirectBack(req, res, next) {
  const url = req.session.backURL || "/";
  delete req.session.backURL;
  res.redirect(url);
}

router.get('/goback', redirectBack);

// Save the route that will be the current restoration route.
function saveBack(req, res, next) {
  req.session.backURL = req.url;
  next();
}

// Restoration routes from the following paths:
router.get(
  [
      '/',
      '/users',
      '/users/:id(\\d+)',
      '/posts'
  ],
  saveBack);

//-----------------------------------------------------------



/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Koopap' });
});

// Autoload for routes using :postId
router.param('postId', postController.load);
router.param('userId', userController.load);


// Routes for the resource /post
router.get('/posts', postController.index);
router.get('/posts/:postId(\\d+)', postController.show);
router.get('/posts/new', postController.new);
router.post('/posts', postController.create);
router.get('/posts/:postId(\\d+)/edit', postController.edit);
router.put('/posts/:postId(\\d+)', postController.update);
router.delete('/posts/:postId(\\d+)', postController.destroy);

// Routes for the resource /user
router.get('/users', userController.index);
router.get('/users/:userId(\\d+)', userController.show);
router.get('/users/new', userController.new);
router.post('/users', userController.create);
router.get('/users/:userId(\\d+)/edit', userController.edit);
router.put('/users/:userId(\\d+)', userController.update);
router.delete('/users/:userId(\\d+)', userController.destroy);

// Routes for the resource /session
router.get('/login', sessionController.new);
router.post('/login', sessionController.create, sessionController.createLoginExpires);
router.delete('/login', sessionController.destroy);




module.exports = router;
