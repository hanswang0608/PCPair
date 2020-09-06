const express = require('express');
const mongoose = require('mongoose');
const puppeteer = require('puppeteer');
const path = require('path');

// Import Mongoose Models
const GPU = require('../models/GPU');
const CPU = require('../models/CPU');
const Pair = require('../models/Pair');

const scraper = require('./scraper');

// Import routes
const gpus = require('../routes/api/gpus');
const cpus = require('../routes/api/cpus');
const pairs = require('../routes/api/pairs');
const price = require('../routes/api/price');
const routes = require('../routes/routes');


const app = express();

// Body-Parser
app.use(express.json());

// CORS Policy
// app.use((req, res, next) => {
//     res.header("Access-Control-Allow-Origin", "*");
//     res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//     res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, PUT");
//     next();
// });

// Use Routers
app.use('/api/gpus', gpus);
app.use('/api/cpus', cpus);
app.use('/api/pairs', pairs);
app.use('/api/price', price);
app.use('/', routes);

// Connect to MongoDB
const mongoURI = require('../config/keys');
mongoose.connect(mongoURI,
    {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true})
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

// Setting a Port
const port = process.env.PORT || 80;
app.listen(port, () => console.log(`Server started on port ${port}`));


async function init() {
    const browser = await puppeteer.launch({
        ignoreDefaultArgs: ["--hide-scrollbars"],
        args: ['--no-sandbox']
    });
    if (process.env.NODE_ENV === 'production') {
        await scraper.scrapeCPU(browser);
        await scraper.scrapeAllGPUs(browser);
        await scraper.queryPairsNew();
    }

    // await scraper.scrapeCPU(browser);
    // await scraper.scrapeAllGPUs(browser);
    // await scraper.queryPairsNew();

    // console.log(await scraper.scrapePairScore(await GPU.findOne({name: 'Radeon RX 5700 XT'}), await CPU.findOne({name: 'Intel Core™ i9-10850K'})));
    // console.log('Intel Core i5 Processor I5-750'.match(/.+?(\d{4,5}[a-z]{0,2})/i));

    // console.log(await scraper.queryPairsExisting(500, 10));

    // Pair.findOne({cpu: 'AMD Ryzen 5 3600', gpu: 'Radeon RX 57'})
    //     .then(res => console.log(res));

    // (await Pair.find({cpu: 'INTEL Core i7-9700K'})).forEach(pair => {
    //     pair.cpu = 'Intel Core i7-9700K';
    //     pair.save();
    // });

    // console.log(await scraper.scrapeCPUScore('Intel Core™ i9-10850K'));
    // let combinations = await Pair.find({$and: [{price: {$lte: 400}}, {onCC: true}]});
    // combinations = combinations.filter(async doc => {
    //     const cpuBrand = (await CPU.findOne({name: doc.cpu})).company;
    //     const gpuBrand = (await GPU.findOne({name: doc.gpu})).company;
    //     if (cpuBrand === 'AMD') return false;
    //     if (gpuBrand === 'AMD') return false;
    // });
    // let res = [];
    // for (pair of combinations) {
    //     const cpuBrand = (await CPU.findOne({name: pair.cpu})).company;
    //     const gpuBrand = (await GPU.findOne({name: pair.gpu})).company;
    //     if (cpuBrand === 'AMD') continue;
    //     if (gpuBrand === 'AMD') continue;
    //     res.push(pair);
    // }
    // console.log(res);
}

init();
