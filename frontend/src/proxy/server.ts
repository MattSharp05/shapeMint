import express from 'express';
import cors from 'cors';
import downloadRouter from './download.js';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());
app.use('/api/download', downloadRouter);

const server = app.listen(port, () => {
  console.log(`Proxy server running at http://localhost:${port}`);
});

// Keep the process alive
process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal');
  server.close(() => {
    console.log('Server closed gracefully');
    process.exit(0);
  });
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});
