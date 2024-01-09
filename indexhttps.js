const express = require('express');
const cors = require('cors');
const httpServer = express();
const app = express();
const port = 3001;


const { reset } = require('nodemon');
const { machine } = require('os');
app.use(express.json());

const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('./key.pem'),     
  cert: fs.readFileSync('./cert.pem')    
};
const planlamaRout = require('./planlama'); 
const bakimRout = require('./bakim'); 
app.use('/', planlamaRout);
app.use('/', bakimRout);



// İlk çalıştırmayı anında yapmak için:


// app.listen(3001, '10.0.0.35', () => {
//   console.log(`PLANLAMA SATINAALMA BACKEND Sunucu ${port} numaralı portta çalışıyor.`);
// });
const server = https.createServer(options, app);
server.listen(port, '10.0.0.35', () => {
  console.log('HTTPS server running on port 3000');
});
