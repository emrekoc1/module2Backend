const express = require('express');
const cors = require('cors');
const httpServer = express();
const app = express();
const port = 3000;


const { reset } = require('nodemon');
const { machine } = require('os');


app.use(express.json());
const planlamaRout = require('./planlama'); 
const bakimRout = require('./bakim'); 
app.use('/', planlamaRout);
app.use('/', bakimRout);


app.listen(port, '10.0.0.35', () => {
  console.log(`PLANLAMA SATINAALMA BACKEND Sunucu ${port} numaralı portta çalışıyor.`);
});
