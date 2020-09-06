const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const fs = require('fs');
const axios = require('axios');

const CPU = require('../models/CPU');
const GPU = require('../models/GPU');
const Pair = require('../models/Pair');

const nodeLevenshtein = require('node-levenshtein');
const {isNull, isUndefined} = require('util');

async function queryPairsExisting(priceTarget, tolerance, discontinued, cpuBrand, gpuBrand) {
    const results = [];
    let query = {};
    query['$and'] = [];
    query['$and'].push({price: {$lte: priceTarget * (100 + tolerance) / 100}});
    if (!discontinued) {
        query['$and'].push({onCC: true});
    }
    let queryRes = await Pair.find(query);
    // queryRes.forEach(x => console.log(x.cpu, x.gpu, x.cpuBrand, x.gpuBrand));
    // let query = await Pair.find({$and: [{price: {$lte: priceTarget * (100 + tolerance) / 100}}, {onCC: !discontinued}]});
    let combinations = [];
    if (cpuBrand !== 'All' || gpuBrand !== 'All') {
        for (pair of queryRes) {
            if (cpuBrand !== 'All') {
                // const cpu = (await CPU.findOne({name: pair.cpu})).company.toLowerCase();
                console.log(pair.cpu, pair.gpu, pair.cpuBrand, pair.gpuBrand);
                if (pair.cpuBrand.toLowerCase() !== cpuBrand) continue;
            }
            if (gpuBrand !== 'All') {
                // const gpu = (await GPU.findOne({name: pair.gpu})).company.toLowerCase();
                if (pair.gpuBrand.toLowerCase() !== gpuBrand) continue;
            }
            combinations.push(pair);
        }
    } else {
        combinations = [...queryRes];
    }

    while (combinations.length === 0) {
        // console.log('No results at the given price, increasing tolerance.');
        if (priceTarget <= 300) {
            tolerance += 25;
            query['$and'][0] = {price: {$lte: priceTarget * (100 + tolerance) / 100}};
        } else {
            tolerance += 10;
            query['$and'][0] = {price: {$lte: priceTarget * (100 + tolerance) / 100}};
        }
        // console.log(priceTarget, priceTarget * tolerance / 100);
        queryRes = await Pair.find(query);
        if (cpuBrand !== 'All' || gpuBrand !== 'All') {
            for (pair of queryRes) {
                if (cpuBrand !== 'All') {
                    // const cpu = (await CPU.findOne({name: pair.cpu})).company.toLowerCase();
                    if (pair.cpuBrand.toLowerCase() !== cpuBrand) continue;
                }
                if (gpuBrand !== 'All') {
                    // const gpu = (await GPU.findOne({name: pair.gpu})).company.toLowerCase();
                    if (pair.gpuBrand.toLowerCase() !== gpuBrand) continue;
                }
                combinations.push(pair);
            }
        } else {
            combinations = [...queryRes];
        }
    }
    //change algorithm for checking nearby combinations
    //step through a few price intervals near the target to check if a cheaper combination performs better
    //basically fix the problem of putting 10000 as pricetarget and getting subpar recommendations
    combinations.sort((a, b) => {
        if (a.score > b.score) return -1;
        else return 1;
    });
    results.push([...combinations.slice(0, 15)]);
    let highestScore = combinations[0].score;
    combinations.sort((a, b) => {
        // make the score threshold scale with pricetarget
        // higher pricetarget reduces the importance of value
        if (a.score >= highestScore * scoreThresholdFactor(priceTarget)) {
            if (a.priceToPerf > b.priceToPerf) return -1;
            else return 1;
        } else return 1;
    });
    results.push([...combinations.slice(0, 15)]);
    return results;
}

function scoreThresholdFactor(priceTarget) {
    const startPrice = 700;
    const endPrice = 1900;
    const baselineFactor = 0.9;
    if (priceTarget <= startPrice) {
        return baselineFactor;
    } else if (priceTarget > startPrice && priceTarget <= endPrice) {
        const x = (priceTarget - startPrice) / 100;
        // return x * x / 1600 + baselineFactor;
        return 0.09 / 12 * x + 0.9;
    } else {
        return baselineFactor + 0.09;
    }
}

async function queryPairsNew(priceTarget) {
    let CPUCollection = await CPU.find();
    let GPUCollection = await GPU.find();
    if (priceTarget) {
        GPUCollection = GPUCollection.filter(gpu => gpu.price <= priceTarget * 1.1);
        CPUCollection = CPUCollection.filter(cpu => cpu.price <= priceTarget * 1.1);
    }
    const pairs = [];
    for (cpu of CPUCollection) {
        for (gpu of GPUCollection) {
            if (priceTarget) {
                if ((cpu.price + gpu.price > priceTarget * 0.9) && (cpu.price + gpu.price < priceTarget * 1.1)) {
                    pairs.push(new Object({cpu, gpu}));
                }
            } else {
                pairs.push(new Object({cpu, gpu}));
            }
        }
    }
    let counter = 0;
    let promises = [];
    const results = [];
    console.log(pairs.length);
    while (pairs.length !== 0) {
        const pair = pairs.pop();
        promises.push(scrapePairScore(pair.gpu, pair.cpu));
        counter++;
        if (counter === 5 || pairs.length === 0) {
            counter = 0;
            results.push(...await Promise.all(promises));
            promises = [];
        }
    }

    const pairArr = await Pair.find();
    pairArr.sort((a, b) => {
        if (a.score >= b.score) return -1;
        else return 1;
    });
    for ([index, pair] of pairArr.entries()) {
        if (pair.score === 0) {
            for (zeroScorePair of pairArr.slice(index)) {
                await Pair.updateOne({gpu: zeroScorePair.gpu, cpu: zeroScorePair.cpu}, {rank: index + 1});
            }
            break;
        }
        await Pair.updateOne({gpu: pair.gpu, cpu: pair.cpu}, {rank: index + 1});
    }

    console.log('Done All');
}

async function scrapeAllGPUs(browser) {
    console.log('Scraping All GPUs');
    const promises = [];
    const GPUs = await GPU.find();
    for (gpu of GPUs) {
        promises.push(scraper.scrapeGPU(browser, gpu));
    }
    // console.log(GPUs);
    await Promise.all(promises);
    console.log('All GPUs Finished Scraping');
}

async function scrapeGPU(browser, product) {
    console.log(`Scraping ${product.name}`);
    if (isNull(product)) {
        console.log(`${product.name} does not exist`);
        return;
    }

    await GPU.updateOne({name: product.name}, {score: await scrapeGPUScore(product.name)});

    // List of special names
    let tempName = product.name;
    switch (tempName) {
        case 'Nvidia Titan RTX':
            tempName = 'TITAN';
    }

    // Scraping Canada Computers
    const cc = await browser.newPage();
    console.log('new page created.');
    await cc.setViewport({width: 1920, height: 1920, deviceScaleFactor: 1});
    await cc.goto('https://www.canadacomputers.com/index.php?cPath=43');
    console.log('page navigated to canada computers.');
    const gpuList = await cc.$$eval('#collapse3 > div > ul > li', lis => lis.map(li => li.textContent.match(/^[^\(]*/)[0].trim()));
    let gpuMatch;
    for (let i = 0; i < gpuList.length; i++) {
        if (tempName === gpuList[i]) {
            gpuMatch = i;
            break;
        }
    }
    if (isUndefined(gpuMatch)) {
        console.log(`${product.name} is not on CC`);
        return;
    }
    await cc.click(`#collapse3 > div > ul > li:nth-child(${gpuMatch + 1}) input`);
    console.log('clicked on matching gpu.');
    await loadFullPage(cc);
    console.log('full page loaded.');
    await scrapeDiv(cc, product);
    await cc.close();

    console.log(`Finished scraping ${product.name}`);
}

async function scrapeCPU(browser) {
    console.log('Scraping CPU');
    const cc = await browser.newPage();
    console.log('new page created.');
    await cc.goto('https://www.canadacomputers.com/index.php?cPath=4');
    console.log('page navigated to canada computers.');
    await loadFullPage(cc);
    console.log('full page loaded.');
    await scrapeDiv(cc);
    await cc.close();
    console.log('Finished Scraping CPU');
}

async function scrapeDiv(page, product) {
    console.log('in scrapeDiv.');
    let counter = 2;
    let div;
    let isCPU = arguments.length === 1;
    let variantsArr = [];
    let namesArr = [];
    await page.waitForSelector(`#product-list div`);
    console.log('waited for selector');

    do {
        div = await page.$(`#product-list > div:nth-child(${counter}) > div`);
        if (!div) break;

        if (isCPU && !await div.$eval('small.d-block span', span => span.textContent.match(/(AMD)|(INT)/))) {
            counter += 2;
            continue;
        }

        // Disregard Athlon & Pentium CPUs
        if (isCPU && await div.$eval('span.text-dark.d-block.productTemplate_title a', a => a.textContent.match(/(Athlon)|(Pentium)/))) {
            counter += 2;
            //console.log('skipped');
            continue;
        }

        // Create new object to hold product info
        const newProduct = new Object();

        newProduct.name = await div.$eval('span.text-dark.d-block.productTemplate_title a', a => a.textContent);
        if (isCPU && newProduct.name.match(/.+?(\d{4,5}[a-z]{0,2})/i)) {
            //Trim CPU names
            newProduct.name = newProduct.name.match(/.+?(\d{4,5}[a-z]{0,2})/i)[0];
        }

        if (newProduct.name.match(/threadripper/i)) {
            counter += 2;
            continue;
        }

        newProduct.name = newProduct.name.replace(/intel/i, 'Intel');

        let repeat = false;
        for (name of namesArr) {
            if (newProduct.name.toLowerCase() === name.toLowerCase()) {
                console.log(`${newProduct.name} is repeated`);
                repeat = true;
                break;
            }
        }
        if (repeat) {
            counter += 2;
            continue;
        }

        namesArr.push(newProduct.name);

        //await page.screenshot({ path: `C:/Users/HansW/OneDrive/Desktop/ccload.png`, type: 'png' });
        newProduct.price = Number(await div.$eval('span.d-block.mb-0.pq-hdr-product_price.line-height strong', strong => strong.textContent.match(/[0-9]{1,3},?[0-9]{1,3}\.?[0-9]+/)[0].replace(/,/g, '')));

        if (isCPU) {
            try {
                newProduct.priceHistory = [...(await CPU.findOne({name: newProduct.name})).priceHistory];
            } catch (e) {
                console.log(`${newProduct.name} is new`);
                newProduct.priceHistory = [];
            }
            if (newProduct.priceHistory.length === 0 || (newProduct.price !== newProduct.priceHistory[newProduct.priceHistory.length - 1].price)) {
                // console.log(newProduct.name, );
                newProduct.priceHistory.push(new Object({
                    price: newProduct.price,
                    date: Date.now()
                }));
            }

            newProduct.score = await scrapeCPUScore(newProduct.name);
            // console.log(cpuId);
            newProduct.priceToPerf = (newProduct.score / newProduct.price).toFixed(4);
        }

        // All this below is possibly not needed!!!!
        // Maybe change the system for gpu updates as well
        // Regex for cases
        // use save() instead of update
        // add validation to schema
        // delete items that are no longer on CC


        newProduct.img = await div.$eval('div div img', img => img.src);
        newProduct.TS = '';
        try {newProduct.company = await div.$eval('div.pq-img-manu_logo_box img', img => img.alt);} catch (e) {newProduct.company = undefined;}
        let onlineStatus, instoreStatus;
        try {onlineStatus = await div.$eval('a.stock-popup.pointer div:nth-child(1) small', small => small.textContent.trim());} catch (e) {onlineStatus = undefined;}
        try {instoreStatus = await div.$eval('a.stock-popup.pointer div:nth-child(2) small', small => small.textContent.trim());} catch (e) {instoreStatus = undefined;}

        if (onlineStatus === 'Online In Stock' || onlineStatus === 'Order Online and Pick Up In-Store' || onlineStatus === 'Online Special Order')
            newProduct.online = true;
        else newProduct.online = false;

        if (instoreStatus === 'Available In Stores' || instoreStatus === 'Available In Selected Stores' || instoreStatus === 'In-Store Back Order')
            newProduct.instore = true;
        else newProduct.instore = false;

        newProduct.lastModified = Date.now();

        newProduct.ccLink = await div.$eval('div.row > div > a', a => a.href);



        // if (isCPU) CPU.updateOne({name: newProduct.name}, newProduct, {upsert: true}).catch(err => console.log(err));
        if (isCPU) {
            let doc = await CPU.findOne({name: newProduct.name});
            if (doc) {
                doc.name = newProduct.name;
                doc.price = newProduct.price;
                doc.img = newProduct.img;
                doc.company = newProduct.company;
                doc.online = newProduct.online;
                doc.instore = newProduct.instore;
                doc.priceHistory = newProduct.priceHistory;
                doc.lastModified = newProduct.lastModified;
                doc.score = newProduct.score;
                doc.priceToPerf = newProduct.priceToPerf;
                doc.ccLink = newProduct.ccLink;
                doc.save();
            }
            else {
                const newCPU = new CPU(newProduct);
                newCPU.save();
            }
        }
        else variantsArr.push(newProduct);
        counter += 2;

    } while (div);

    if (!isCPU) {
        const sumVariantsPrice = variantsArr.reduce((acc, cur) => {
            return acc + cur.price;
        }, 0);
        const productPrice = Math.round(sumVariantsPrice / variantsArr.length * 100) / 100;

        let priceHistory;
        try {
            priceHistory = [...product.priceHistory];
        } catch (e) {
            console.log(`${product.name} is new`);
            priceHistory = [];
        }
        if (productPrice !== product.price || priceHistory.length === 0) {
            priceHistory.push(new Object({
                price: productPrice,
                date: Date.now()
            }));
        }
        const score = (await GPU.findOne({name: product.name})).score;
        await GPU.updateOne({name: product.name}, {price: productPrice, variants: variantsArr, priceHistory, priceToPerf: (score / productPrice).toFixed(4), lastModified: Date.now(), ccLink: page.url()});

        const GPUArr = await GPU.find();
        GPUArr.sort((a, b) => {
            if (a.score >= b.score) return -1;
            else return 1;
        });
        for ([index, gpu] of GPUArr.entries()) {
            if (!gpu.lastModified || (new Date() - gpu.lastModified) / 1000 > 600) {
                await GPU.updateOne({name: gpu.name}, {onCC: false, rank: index + 1});
            } else {
                await GPU.updateOne({name: gpu.name}, {onCC: true, rank: index + 1});
            }
        }

    }

    if (isCPU) {
        const CPUArr = await CPU.find();
        CPUArr.sort((a, b) => {
            if (a.score >= b.score) return -1;
            else return 1;
        });
        for ([index, cpu] of CPUArr.entries()) {
            if ((new Date() - cpu.lastModified) / 1000 > 600) {
                await CPU.updateOne({name: cpu.name}, {onCC: false, rank: index + 1});
            } else {
                await CPU.updateOne({name: cpu.name}, {onCC: true, rank: index + 1});
            }
        }
    }
    // console.log(`Finished Scraping ${isCPU ? 'CPU' : 'GPU'}`);
}

async function scrapeId(name, isCPU) {
    // if (name.toLowerCase().includes('intel')) {
    //     name += ' Processor';
    // }
    const idQueryURL = encodeURI(`https://www.3dmark.com/proxycon/ajax/search/${isCPU ? 'cpuname' : 'gpuname'}?term=${name}`);
    const res = (await axios.get(idQueryURL)).data;
    if (res.length === 0) {
        console.log('no results');
        return;
    }
    let match = 0;
    if (isCPU) {
        for (let i = 0; i < res.length; i++) {
            matchScore = stringMatch(name, res[i].value.match(/.+?(\d{4,5}[a-z]{0,2})/i) ? res[i].value.match(/.+?(\d{4,5}[a-z]{0,2})/i)[0] : '');
            if (matchScore < stringMatch(name, res[match].value.match(/.+?(\d{4,5}[a-z]{0,2})/i) ? res[match].value.match(/.+?(\d{4,5}[a-z]{0,2})/i)[0] : '')) {
                match = i;
            }
        }
    } else {
        for (let i = 0; i < res.length; i++) {
            matchScore = stringMatch(name, res[i].value);
            if (matchScore < stringMatch(name, res[match].value)) {
                match = i;
            }
        }
    }
    return res[match].id;
}
//
async function scrapePairScore(gpu, cpu) {
    const gpuName = gpu.name;
    const cpuName = cpu.name;

    console.log(`Scraping 3DMark Time Spy Overall Score for ${gpuName} and ${cpuName}`);

    const ids = await Promise.all([scrapeId(gpuName, false), scrapeId(cpuName, true)]);
    const timeSpyURL = `https://www.3dmark.com/proxycon/ajax/medianscore?test=spy%20P&cpuId=${ids[1]}&gpuId=${ids[0]}&gpuCount=1&deviceType=DESKTOP&memoryChannels=0&country=&scoreType=overallScore&hofMode=false&showInvalidResults=false&freeParams=`;
    const res = (await axios.get(timeSpyURL)).data;
    let median = Math.round(isNaN(res.median) ? 0 : res.median);
    let newPair;
    try {
        newPair = await Pair.findOne({gpu: gpuName, cpu: cpuName});
        newPair.gpu = gpuName;
        newPair.cpu = cpuName;
        newPair.gpuBrand = gpu.company;
        newPair.cpuBrand = cpu.company;
        newPair.score = median;
        if (newPair.scoreHistory.length === 0 || (newPair.score !== newPair.scoreHistory[newPair.scoreHistory.length - 1].score)) {
            newPair.scoreHistory.push(new Object({score: median, date: Date.now()}));
        }
        newPair.price = (gpu.price + cpu.price).toFixed(2);
        newPair.priceToPerf = (median / (gpu.price + cpu.price)).toFixed(4);
        newPair.lastModified = Date.now();
        (gpu.onCC && cpu.onCC) ? newPair.onCC = true : newPair.onCC = false;
    } catch (e) {
        newPair = new Pair({
            gpu: gpuName,
            cpu: cpuName,
            gpuBrand: gpu.company,
            cpuBrand: cpu.company,
            score: median,
            scoreHistory: [{score: median, date: Date.now()}],
            price: (gpu.price + cpu.price).toFixed(2),
            priceToPerf: (median / (gpu.price + cpu.price)).toFixed(4),
            lastModified: Date.now(),
            onCC: (gpu.onCC && cpu.onCC) ? true : false
        });
    }
    newPair.save();

    return newPair;

    // console.log(`${gpuName} and ${cpuName} scored: ${jsonContent.median}\n${timeSpyQuery.url()}\n`);
}

async function scrapeCPUScore(cpu) {
    const cpuName = cpu;
    // console.log(`Scraping 3DMark Time Spy Physics Score for ${cpuName}`);
    const id = await scrapeId(cpuName, true);
    const timeSpyURL = `https://www.3dmark.com/proxycon/ajax/medianscore?test=spy%20P&cpuId=${id}&gpuId=&gpuCount=1&deviceType=DESKTOP&memoryChannels=0&country=&scoreType=physicsScore&hofMode=false&showInvalidResults=false&freeParams=`;
    const res = (await axios.get(timeSpyURL)).data;
    let median = Math.round(isNaN(res.median) ? 0 : res.median);

    return median;
}

async function scrapeGPUScore(gpu) {
    const gpuName = gpu;
    // console.log(`Scraping 3DMark Time Spy Physics Score for ${gpuName}`);
    const id = await scrapeId(gpuName, false);
    const timeSpyURL = `https://www.3dmark.com/proxycon/ajax/medianscore?test=spy%20P&cpuId=&gpuId=${id}&gpuCount=1&deviceType=DESKTOP&memoryChannels=0&country=&scoreType=graphicsScore&hofMode=false&showInvalidResults=false&freeParams=`;
    const res = (await axios.get(timeSpyURL)).data;
    let median = Math.round(isNaN(res.median) ? 0 : res.median);

    return median;
}

function stringMatch(str1, str2) {
    str1 = str1.toUpperCase();
    str2 = str2.toUpperCase();
    const split1 = str1.split(/\s+|-+/g);
    const split2 = str2.split(/\s+|-+/g);
    let wordSimilarity = 0;
    for (word1 of split1) {
        let closestMatch = Infinity;
        for (word2 of split2) {
            const currentMatch = nodeLevenshtein(word1, word2);
            if (currentMatch < closestMatch) {
                closestMatch = currentMatch;
            }
        }
        wordSimilarity += closestMatch;
    }
    let sentenceSimilarity = nodeLevenshtein(str1, str2);
    return Math.round((sentenceSimilarity * 0.3 + wordSimilarity * 0.7) * 10) / 10;
}

async function loadFullPage(page) {
    let moreToLoad;
    try {
        moreToLoad = await page.$eval('#load_more', div => div.className) === 'pb-3 text-center text-uppercase text-muted';
        while (moreToLoad) {
            await page.click('#load_more > button');
            await page.waitForSelector('#loading', {hidden: true});
            count = await page.$$eval('#product-list > div.col-xl-3.col-lg-4.col-6.mt-0_5.px-0_5.toggleBox.mb-1', divs => divs.length);
            moreToLoad = await page.$eval('#load_more', div => div.className) === 'pb-3 text-center text-uppercase text-muted';
        }
    } catch (e) {}
}


module.exports = scraper = {
    scrapeGPU, scrapeCPU, stringMatch, queryPairsNew, queryPairsExisting, scrapePairScore, scrapeAllGPUs, scrapeId, scrapeCPUScore, scrapeGPUScore
};

/// Deprecated ///
/*

async function scrapeScore(browser, gpu, cpu, options) {
    if (options) console.log(`Debugging scrapeScore for ${options.testGPU?'GPU':'CPU'}`);
    const gpuName = gpu.name;
    const cpuName = cpu.name;
    const writeStream = fs.createWriteStream(`C:/Users/HansW/OneDrive/Desktop/debug/levenshtein/${gpuName}_${cpuName}.txt`);
    console.log(`Scraping 3DMark Time Spy Score for ${gpuName} and ${cpuName}`);
    const timeSpy = 'https://www.3dmark.com/newsearch#advanced?test=spy%20P&cpuId=&gpuId=&gpuCount=1&deviceType=DESKTOP&memoryChannels=0&country=&scoreType=overallScore&hofMode=false&showInvalidResults=false&freeParams=';
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1440, deviceScaleFactor: 1 });
    await page.goto(timeSpy);
    //await page.waitFor(1000);
    try{
        await page.waitForSelector('#chart > div', {timeout: 2000});
    }catch(e){console.log(`Waiting for chart of ${gpuName} and ${cpuName} failed`)}
    try{
        await page.waitForSelector('#resultTable > table', {timeout: 2000});
    }catch(e){console.log(`Waiting for table of ${gpuName} and ${cpuName} failed`)}
    await page.screenshot({ path: `C:/Users/HansW/OneDrive/Desktop/debug/firstLoad/${gpuName}_${cpuName}.png`, type: 'png' });
    //await page.evaluate('window.scrollTo(0, 200)');
    // await page.evaluate((input) => {
    //     (document.getElementById('#gpuName')).value = input;
    // }, gpuName);
    await page.type('#gpuName', gpuName);
    //page.screenshot({ path: `C:/Users/HansW/OneDrive/Desktop/debug/gpu/nameTyped/${gpuName}_${cpuName}.png`, type: 'png' });
    // while (await page.$eval('#gpuName', input => input.value) !== gpuName){
    //     await page.focus('#gpuName');
    //     await page.keyboard.down('Control');
    //     await page.keyboard.press('a');
    //     await page.keyboard.up('Control');
    //     await page.keyboard.press('Backspace')
    //     await page.type('#gpuName', gpuName);
    //     await page.waitFor(100);
    //     console.log(await page.$eval('#gpuName', input => input.value) + 'fixed');
    // }
    //typeInInputElement(page, '#gpuName', gpuName);
    // const ele = await page.$eval('#gpuName', input => input.value);
    // console.log(ele);
    await page.waitForFunction(input => input === document.getElementById('gpuName').value, {timeout: 5000}, gpuName);
    await page.waitForSelector('div.gpuid-list > ul.gpu-list > li', { timeout: 5000 }).catch(err => console.log(`${gpuName} Not Found`));
    //page.screenshot({ path: `C:/Users/HansW/OneDrive/Desktop/debug/gpu/selector/${gpuName}_${cpuName}.png`, type: 'png' });

    //await page.screenshot({ path: `C:/Users/HansW/OneDrive/Desktop/${gpuName}_${cpuName}.png`, type: 'png' });
    const gpuResults = await page.$$eval('div.gpuid-list > ul.gpu-list > li', lis => lis.map(li => li.textContent));

    if (options && options.testGPU) console.log(gpuResults);
    let gpuMatch = 0;
    const gpuMatchScores = [];
    gpuMatchScores.push(stringMatch(gpuName, gpuResults[0]));
    if (options && options.testGPU) console.log(gpuMatchScores[0]);
    for (let i = 1; i < gpuResults.length; i++) {
        gpuMatchScores.push(stringMatch(gpuName, gpuResults[i]));
        if (options && options.testGPU) console.log(gpuMatchScores[i]);
        if (gpuMatchScores[i] < stringMatch(gpuName, gpuResults[gpuMatch])) {
            gpuMatch = i;
        }
    }
    if (options && options.testGPU) console.log(gpuMatch);
    await page.waitFor(100);
    //console.log(await page.evaluate('window.scrollY'));
    // 771 - 800
    await page.mouse.click(500, 780 + 30 * gpuMatch);

    // await page.evaluate((input) => {
    //     (document.getElementById('#cpuName')).value = input;
    // }, cpuName);
    // typeInInputElement(page, '#cpuName', cpuName);
    await page.type('#cpuName', cpuName);
    //page.screenshot({ path: `C:/Users/HansW/OneDrive/Desktop/debug/cpu/nameTyped/${gpuName}_${cpuName}.png`, type: 'png' });

    // console.log(await page.$eval('#cpuName', input => input.value));
    // while (await page.$eval('#cpuName', input => input.value) !== cpuName){
    //     await page.focus('#cpuName');
    //     await page.keyboard.down('Control');
    //     await page.keyboard.press('a');
    //     await page.keyboard.press('Backspace')
    //     await page.type('#cpuName', cpuName);
    //     await page.waitFor(100);
    // }
    await page.waitForFunction(input => input === document.getElementById('cpuName').value, {timeout: 5000}, cpuName);
    await page.waitFor(500)
    await page.waitForSelector('div.cpuid-list > ul.cpu-list > li', { timeout: 5000 }).catch(err => console.log(`${cpuName} Not Found`));
    //page.screenshot({ path: `C:/Users/HansW/OneDrive/Desktop/debug/cpu/selector/${gpuName}_${cpuName}.png`, type: 'png' });

    const cpuResults = await page.$$eval('div.cpuid-list > ul.cpu-list > li', lis => lis.map(li => li.textContent));
    if (options && options.testCPU) console.log(cpuResults);
    let cpuMatch = 0;
    const cpuMatchScores = [];
    cpuMatchScores.push(stringMatch(cpuName, cpuResults[0]));
    if (options && options.testGPU) console.log(cpuMatchScores[0]);
    for (let i = 1; i < cpuResults.length; i++) {
        cpuMatchScores.push(stringMatch(cpuName, cpuResults[i]));
        if (options && options.testGPU) console.log(cpuMatchScores[i]);
        if (cpuMatchScores[i] < stringMatch(cpuName, cpuResults[cpuMatch])) {
            cpuMatch = i;
        }
    }
    if (options && options.testCPU) console.log(cpuMatch);
    await page.waitFor(100);
    // 906 - 935
    await page.mouse.click(500, 915 + 30 * cpuMatch);
    await page.waitFor(1000);
    const cpuId = page.url().match(/(?<=cpuId=)(\d*)(?=&)/)[0];
    const gpuId = page.url().match(/(?<=gpuId=)(\d*)(?=&)/)[0];
    await page.screenshot({ path: `C:/Users/HansW/OneDrive/Desktop/debug/final/${gpuName}_${cpuName}.png`, type: 'png' });
    //await page.screenshot({ path: 'C:/Users/HansW/OneDrive/Desktop/test1.png', type: 'png' });
    //console.log('Finished Scraping Time Spy');
    console.log(`${gpuName} and ${cpuName} scored: ${await page.$eval('#medianScore', span => span.textContent)}\n${page.url()}\tcpu:${cpuId}\tgpu:${gpuId}\tcpuLength:${cpuResults.length}\tcpuMatch:${cpuMatch}\tgpuLength:${gpuResults.length}\tgpuMatch:${gpuMatch}\n`);
    writeStream.write(`${gpuResults}\n${gpuMatchScores}\nmatch:${gpuMatch}\n${cpuResults}\n${cpuMatchScores}\nmatch:${cpuMatch}`);
    page.close();
}

async function countDivs(page) {
    let counter = 2;
    let div;
    let divs = [];
    do {
        div = await page.$(`#product-list > div:nth-child(${counter}) > div`);
        if (!div) break;
        divs.push(div);
        counter += 2;
    } while (div)
    return divs.length;
}

async function scrollLoad(page) {
    let count, previousHeight;
    try {
        await page.waitFor(500);
        do {
            count = await page.$$eval('#product-list > div.col-xl-3.col-lg-4.col-6.mt-0_5.px-0_5.toggleBox.mb-1', divs => divs.length);
            console.log(count);
            previousHeight = await page.evaluate('document.body.scrollHeight');
            await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
            await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`, { timeout: 5000 });
            //await page.waitFor(1000);
            await page.waitForSelector('')
        } while (count !== await page.$$eval('#product-list > div.col-xl-3.col-lg-4.col-6.mt-0_5.px-0_5.toggleBox.mb-1', divs => divs.length));
    } catch (e) { console.log(e)}
    return page;
}

async function scrapeGPU(browser, product) {
    try {
        let cc = await browser.newPage();
        await cc.goto('https://www.canadacomputers.com/index.php?cPath=43&sf=:3_20&mfr=&pr=').catch(err => console.log(err));
        const res = await Promise.all([xPathNames(cc), xPathPrices(cc), xPathImgs(cc), xPathBrand(cc), xPathOnline(cc), xPathInStore(cc), xPathPerformance(ub)]);
        cc.close();
        const output = [];
        for (let i = 0; i < res[0].length; i++) {
            //console.log(i);
            const newVariant = new Object({
                name: res[0][i],
                price: res[1][i],
                img: res[2][i],
                brand: res[3][i],
                online: res[4][i],
                instore: res[5][i]
            });
            output.push(newVariant);
        }
        product.variants = output;
        product.performance = res[6];
        product.save();
    } catch (e) {
        console.log(e);
    }
}
async function xPathPrices(page) {
    const output = [];
    let counter = 2;
    let regular, discount, name;
    do {
        try {
            [name] = await page.$x(`//*[@id="product-list"]/div[${counter}]/div/div/div[1]/div/div[2]/span[1]/a`);
            if (!name) break;
            [regular] = await page.$x(`//*[@id="product-list"]/div[${counter}]/div/div/div[1]/div/div[2]/span[2]/strong`);
            [discount] = await page.$x(`//*[@id="product-list"]/div[${counter}]/div/div/div[1]/div/div[2]/span[3]/strong`);
            if (discount) {
                output.push((await (await (await discount.getProperty('textContent')).jsonValue()).match(/[0-9]+\.?[0-9]+/g))[0]);
            } else if (regular) {
                output.push((await (await (await regular.getProperty('textContent')).jsonValue()).match(/[0-9]+\.?[0-9]+/g))[0]);
            } else {
                output.push('Unavailable');
            }
        } catch (e) {
            console.log(e);
        }
        counter += 2;
    }
    while (name);
    return output;
}

async function xPathNames(page) {
    const output = [];
    let counter = 2;
    let name;
    do {
        try {
            [name] = await page.$x(`//*[@id="product-list"]/div[${counter}]/div/div/div[1]/div/div[2]/span[1]/a`);
            if (!name) break;
            output.push((await (await (await name.getProperty('textContent')).jsonValue()).match(/^([^,]*)/))[0]);

        } catch (e) {
            console.log(e);
        }
        counter += 2;
    }
    while (name);
    return output;
}

async function xPathImgs(page) {
    const output = [];
    let counter = 2;
    let img;
    do {
        try {
            [img] = await page.$x(`//*[@id="product-list"]/div[${counter}]/div/div/div[1]/div/div[1]/a/div[1]/div/img`);
            if (!img) break;
            output.push((await (await img.getProperty('src')).jsonValue()));

        } catch (e) {
            console.log(e);
        }
        counter += 2;
    }
    while (img);
    return output;
}

async function xPathOnline(page) {
    const output = [];
    let counter = 2;
    let online, name;
    do {
        try {
            [name] = await page.$x(`//*[@id="product-list"]/div[${counter}]/div/div/div[1]/div/div[2]/span[1]/a`);
            if (!name) break;
            [online] = await page.$x(`//*[@id="product-list"]/div[${counter}]/div/div/div[2]/div/div/a/div[1]/small`);
            const onlineStatus = await (await (await online.getProperty('textContent')).jsonValue()).trim();
            if (onlineStatus === 'Online In Stock' || onlineStatus === 'Order Online and Pick Up In-Store' || onlineStatus === 'Online Special Order') {
                output.push(true);
            } else if (onlineStatus === 'Not Available Online') {
                output.push(false);
            } else {
                output.push(false);
            }
        } catch (e) {
            console.log(e);
        }
        counter += 2;
    }
    while (name);
    return output;
}

async function xPathInStore(page) {
    const output = [];
    let counter = 2;
    let instore, name;
    do {
        try {
            [name] = await page.$x(`//*[@id="product-list"]/div[${counter}]/div/div/div[1]/div/div[2]/span[1]/a`);
            if (!name) break;
            [instore] = await page.$x(`//*[@id="product-list"]/div[${counter}]/div/div/div[2]/div/div/a/div[2]/small`);
            const instoreStatus = await (await (await instore.getProperty('textContent')).jsonValue()).trim();
            if (instoreStatus === 'Available In Stores' || instoreStatus === 'Available In Selected Stores' || instoreStatus === 'In-Store Back Order') {
                output.push(true);
            } else if (instoreStatus === 'Not Available In Stores') {
                output.push(false);
            } else {
                output.push(false);
            }
        } catch (e) {
            console.log(e);
        }
        counter += 2;
    }
    while (name);
    return output;
}

async function xPathBrand(page) {
    const output = [];
    let counter = 2;
    let brand, name;
    do {
        try {
            [name] = await page.$x(`//*[@id="product-list"]/div[${counter}]/div/div/div[1]/div/div[2]/span[1]/a`);
            if (!name) break;
            [brand] = await page.$x(`//*[@id="product-list"]/div[${counter}]/div/div/div[1]/div/div[1]/a/div[2]/img`);
            if (brand) {
                output.push((await (await brand.getProperty('alt')).jsonValue()));
            } else {
                output.push('Unknown');
            }
        } catch (e) {
            console.log(e);
        }
        counter += 2;
    }
    while (name);
    return output;
}

async function xPathPerformance(page) {
    try {
        const [performance] = await page.$x('//*[@id="ucandpagerform"]/div[3]/div[1]/div/div/span[2]/span/span');
        return parseFloat(await (await performance.getProperty('textContent')).jsonValue());
    } catch (e) {
        console.log(e);
    }
}
*/
