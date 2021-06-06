import express from 'express';
import indexRouter from './routes/index';

const app = express();

const port = process.env.PORT || 5000;

app.use('/', indexRouter);
app.use(express.json({ limit: '50mb' }));
app.listen(port, console.log(`Server running on port ${port}`));

export default app;
