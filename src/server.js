const bodyParser = require('body-parser');
const express = require('express');
const User = require('./user');
const session = require('express-session');
const bcrypt = require('bcrypt');

const STATUS_USER_ERROR = 422;
const BCRYPT_COST = 11;

const server = express();
// to enable parsing of json bodies for post requests
server.use(bodyParser.json());
server.use(
  session({
    secret: 'e5SPiqsEtjexkTj3Xqovsjzq8ovjfgVDFMfUzSmJO21dtXs4re'
  })
);

/* Sends the given err, a string or an object, to the client. Sets the status
 * code appropriately. */
const sendUserError = (err, res) => {
  res.status(STATUS_USER_ERROR);
  if (err && err.message) {
    res.json({ message: err.message, stack: err.stack });
  } else {
    res.json({ error: err });
  }
};

const handleLogin = (req, res, next) => {
  const { username, password } = req.body;
  if (!username) {
    sendUserError('No username', res);
    return;
  }
  User.find({ username })
    .then(user => {
      req.hashedPassword = user[0].password;
      next();
    })
    .catch(err => {
      sendUserError(err, res);
    });
};

const checkLoggedIn = (req, res, next) => {
  if (req.session.loggedIn) {
    req.user = req.session.username;
    next();
  } else {
    sendUserError('You must log in first', res);
  }
};

// TODO: implement routes

// TODO: add local middleware to this route to ensure the user is logged in
server.get('/me', checkLoggedIn, (req, res) => {
  // Do NOT modify this route handler in any way.
  console.log(req.user);
  res.json(req.user);
});

server.post('/users', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res
      .status(STATUS_USER_ERROR)
      .json({ errorMessage: 'Must provide both a username and a password.' });
  } else {
    bcrypt.hash(password, BCRYPT_COST, (err, hash) => {
      const newUser = { username, password: hash };
      const user = new User(newUser);
      if (err) {
        sendUserError(err, res);
      } else {
        user
          .save()
          .then(savedUser => {
            res.status(200).json(savedUser);
          })
          .catch(error => {
            sendUserError(error, res);
          });
      }
    });
  }
});

server.post('/log-in', handleLogin, (req, res) => {
  const { username, password } = req.body;
  const hash = req.hashedPassword;

  bcrypt.compare(password, hash, (err, isValid) => {
    if (err) {
      sendUserError(err, res);
    }
    if (isValid) {
      req.session.loggedIn = true;
      req.session.username = username;
      res.json({ success: true });
    } else {
      sendUserError('Invalid username and password', res);
    }
  });
});

module.exports = { server };
