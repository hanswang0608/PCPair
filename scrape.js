const puppeteer = require('puppeteer');
const mongoose = require('mongoose');

const CPU = require('./models/CPU');
const GPU = require('./models/GPU');
const Pair = require('./models/Pair');


const scraper = require('./scraper');
const mongoURI = require('./config/keys');

mongoose.connect(mongoURI,
    {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true})
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));


// scrape();

// // Main scrape function that runs on heroku worker
// async function scrape() {
//     const browser = await puppeteer.launch({
//         ignoreDefaultArgs: ["--hide-scrollbars"],
//         args: ["--no-sandbox"]
//     });
//     if (process.env.NODE_ENV === 'production') {
//         await scraper.scrapeCPU(browser);
//         await scraper.scrapeAllGPUs(browser);
//         await scraper.queryPairsNew();
//     }
//     // await scraper.scrapeCPU(browser);
//     // await scraper.scrapeAllGPUs(browser);
//     // await scraper.queryPairsNew();
// }

async function main() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox"]
    });
    const page = await browser.newPage();
    const text = await (await page.goto("https://www.canadacomputers.com/index.php?cPath=4", {timeout: 0})).text();
    console.log(text);
    console.log("done");
    browser.close();
}


main();
