const express = require('express');
const mongoose = require('mongoose');
const puppeteer = require('puppeteer');

const scraper = require('./scraper');
const mongoURI = require('./config/keys');

// Import routes
const gpus = require('./routes/api/gpus');
const cpus = require('./routes/api/cpus');
const pairs = require('./routes/api/pairs');
const price = require('./routes/api/price');
const routes = require('./routes/routes');


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
mongoose.connect(mongoURI,
    {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true})
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

// Setting a Port
const port = process.env.PORT || 80;
app.listen(port, () => console.log(`Server started on port ${port}`));

scrape();

// --- DISABLED --- 
//Main scrape function that runs on heroku worker
async function scrape() {
    const browser = await puppeteer.launch({
        ignoreDefaultArgs: ["--hide-scrollbars"],
        args: ["--no-sandbox"]
    });
    if (process.env.NODE_ENV === 'production') {
        await scraper.scrapeCPU(browser);
        await scraper.scrapeAllGPUs(browser);
        await scraper.queryPairsNew();
    }
    // await scraper.scrapeCPU(browser);
    // await scraper.scrapeAllGPUs(browser);
    // await scraper.queryPairsNew();
}