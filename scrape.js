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

// scrape();
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


// Functions for maintenance

// Remove pairs with the specified gpu that has an incorrect pricehistory by price difference
async function remove() {
    const x = await Pair.find({gpu: 'GeForce RTX 2070 Super'});
    for (pair of x) {
        for (let i = 0; i < pair.priceHistory.length; i++) {
            if (pair.priceHistory[i].price > pair.priceHistory[pair.priceHistory.length - 1].price + 200) {
                pair.priceHistory.splice(i, 1);
                pair.save();
            }
        }
    }
}

async function remove2() {
    const x = await Pair.find();
    for (gpu of x) {
        for (let i = 0; i < gpu.priceHistory.length; i++) {
            if ((Date.now() - gpu.priceHistory[i].date) / 1000 / 60 / 60 < 50) {
                gpu.priceHistory.splice(i, 1);
                i -= 1;
            }
            // console.log((Date.now() - element.date) / 1000 / 60 / 60);
            // console.log(element);
        }
        gpu.save();
    }
}
