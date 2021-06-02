const express = require('express');

const app = express();
const indexRouter = require('./routes/index');

const port = process.env.PORT || 5000;

app.listen(port, console.log(`Server running on port ${port}`));
app.use('/', indexRouter);

module.exports = app;
