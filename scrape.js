const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const schedule = require('node-schedule');

const scraper = require('./scraper');

mongoose.connect('mongodb+srv://hans:010608Wang@pcpair.9ty34.azure.mongodb.net/PCPair?retryWrites=true&w=majority',
    {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true})
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

var scrp = schedule.scheduleJob('0 0 * * *', scrape);

// scrape();

// Scrape function that updates to MongoDB Atlas
async function scrape() {
    const browser = await puppeteer.launch({
        ignoreDefaultArgs: ["--hide-scrollbars"]
    });
    await scraper.scrapeCPU(browser);
    await scraper.scrapeAllGPUs(browser);
    await scraper.queryPairsNew();
    await browser.close();
}