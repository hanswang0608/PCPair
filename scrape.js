const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const schedule = require('node-schedule');

const scraper = require('./scraper');

const CPU = require('./models/CPU');
const GPU = require('./models/GPU');
const Pair = require('./models/Pair');

mongoose.connect('mongodb+srv://hans:010608Wang@pcpair.9ty34.azure.mongodb.net/PCPair?retryWrites=true&w=majority',
    {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true})
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

var scrp = schedule.scheduleJob('0 0 * * *', scrape);

console.log("Hey friends, nothing happening here... Scraping starts at 00:00");

scrape();
// Scrape function that updates to MongoDB Atlas
async function scrape() {
    console.log("Hey friends, active here...");
    const browser = await puppeteer.launch({
        ignoreDefaultArgs: ["--hide-scrollbars"]
    });
    await scraper.scrapeCPU(browser);
    await scraper.scrapeAllGPUs(browser);
    await scraper.queryPairsNew();
    await browser.close();
    console.log("Hey friends, nothing happening here... Scraping starts at 00:00");
    process.exit();
}