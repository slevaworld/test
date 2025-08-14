const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

require('./config/passport')(passport);

const app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB je připojena...'))
  .catch((err) => console.log(err));

app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('layout', 'layouts/main');

app.use(express.static('public'));

app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null;
  if (!req.session.guestGenerations) {
    req.session.guestGenerations = 0;
  }
  next();
});

app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/settings', require('./routes/settings'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, console.log(`Server běží na portu ${PORT}`));