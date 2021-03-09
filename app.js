/** BizTime express application. */

const express = require('express');
const axios = require('axios');
const morgan = require('morgan');

const ExpressError = require('./expressError');	  
// const middleware = require('./middleware');

const app = express();

app.use(morgan('dev'));
app.use(express.json());

app.get('/favicon.ico', (req, res) => res.sendStatus(204));	


/** 404 handler */

app.use(function(req, res, next) {
  const err = new ExpressError("Not Found", 404);
  return next(err);
});

/** general error handler */

// app.use((err, req, res, next) => {
//   res.status(err.status || 500);

//   return res.json({
//     error: err,
//     message: err.message
//   });
// });

// JSON Global Error handler. 

app.use((err, req, resp, next) => {	
  let status = err.status || 500;
  let message = err.message;

  return resp.status(status).json({
    error: {message, status}
  });
});

module.exports = app;
