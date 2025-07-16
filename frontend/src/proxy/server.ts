import express from 'express';
import cors from 'cors';
import downloadRouter from './download';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());
app.use('/api', downloadRouter);

app.listen(port, () => {
  console.log(`Proxy server running at http://localhost:${port}`);
});
