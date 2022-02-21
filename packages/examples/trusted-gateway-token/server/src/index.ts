import dotenv from 'dotenv';
import { makeApp } from './app';
import fs from 'fs';
import https from 'https';

dotenv.config({ path: '../.env' });

const key = fs.readFileSync('./key.pem');
const cert = fs.readFileSync('./cert.pem');

const httpApp = makeApp(process.env.SIGNER_PRIVATE_KEY as string, '/');

const app = makeApp(process.env.SIGNER_PRIVATE_KEY as string, '/');
const httpsApp = https.createServer({ key: key, cert: cert }, app);

httpApp.listen(8081);
httpsApp.listen(8080);
