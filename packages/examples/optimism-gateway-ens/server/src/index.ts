import dotenv from 'dotenv';
import { makeApp } from './app';

dotenv.config({ path: '../.env' });

const app = makeApp(process.env.SIGNER_PRIVATE_KEY as string, '/');
app.listen(8080);
