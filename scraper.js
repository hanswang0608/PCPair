const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const fs = require('fs');
const axios = require('axios');
const nodeLevenshtein = require('node-levenshtein');
const scraperConfig = require('./config/scraper-config.json');

const CPU = require('./models/CPU');
const GPU = require('./models/GPU');
const Pair = require('./models/Pair');


// Function for returning CPU and GPU pairs on homepage price search
async function queryPairsExisting(priceTarget, tolerance, discontinued, cpuBrand, gpuBrand) {
    const results = [];
    let query = {};
    query['$and'] = [];
    query['$and'].push({price: {$lte: priceTarget * (100 + tolerance) / 100}});
    if (!discontinued) {
        query['$and'].push({onCC: true});
    }
    let queryRes = await Pair.find(query);
    let combinations = [];
    if (cpuBrand !== 'All' || gpuBrand !== 'All') {
        for (pair of queryRes) {
            if (cpuBrand !== 'All') {
                if (pair.cpuBrand.toLowerCase() !== cpuBrand) continue;
            }
            if (gpuBrand !== 'All') {
                if (pair.gpuBrand.toLowerCase() !== gpuBrand) continue;
            }
            combinations.push(pair);
        }
    } else {
        combinations = [...queryRes];
    }

    while (combinations.length === 0) {
        if (priceTarget <= 300) {
            tolerance += 25;
            query['$and'][0] = {price: {$lte: priceTarget * (100 + tolerance) / 100}};
        } else {
            tolerance += 10;
            query['$and'][0] = {price: {$lte: priceTarget * (100 + tolerance) / 100}};
        }
        queryRes = await Pair.find(query);
        if (cpuBrand !== 'All' || gpuBrand !== 'All') {
            for (pair of queryRes) {
                if (cpuBrand !== 'All') {
                    if (pair.cpuBrand.toLowerCase() !== cpuBrand) continue;
                }
                if (gpuBrand !== 'All') {
                    if (pair.gpuBrand.toLowerCase() !== gpuBrand) continue;
                }
                combinations.push(pair);
            }
        } else {
            combinations = [...queryRes];
        }
    }
    combinations.sort((a, b) => {
        if (a.score > b.score) return -1;
        else return 1;
    });
    results.push([...combinations.slice(0, 15)]);
    let highestScore = combinations[0].score;

    const scoreThresholdFactor = (priceTarget) => {
        const startPrice = 700;
        const endPrice = 1900;
        const baselineFactor = 0.9;
        if (priceTarget <= startPrice) {
            return baselineFactor;
        } else if (priceTarget > startPrice && priceTarget <= endPrice) {
            const x = (priceTarget - startPrice) / 100;
            return 0.09 / 12 * x + 0.9;
        } else {
            return baselineFactor + 0.09;
        }
    };

    combinations.sort((a, b) => {
        if (a.score >= highestScore * scoreThresholdFactor(priceTarget)) {
            if (a.priceToPerf > b.priceToPerf) return -1;
            else return 1;
        } else return 1;
    });
    results.push([...combinations.slice(0, 15)]);
    return results;
}

// function scoreThresholdFactor(priceTarget) {
//     const startPrice = 700;
//     const endPrice = 1900;
//     const baselineFactor = 0.9;
//     if (priceTarget <= startPrice) {
//         return baselineFactor;
//     } else if (priceTarget > startPrice && priceTarget <= endPrice) {
//         const x = (priceTarget - startPrice) / 100;
//         return 0.09 / 12 * x + 0.9;
//     } else {
//         return baselineFactor + 0.09;
//     }
// }


// Function for scraping new CPU and GPU pairs
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
    console.log(`Scraping ${pairs.length} pairs`);
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
    const highestScore = pairArr[0].score;
    const baselineScore = (await Pair.findOne({cpu: scraperConfig.relativeCPU, gpu: scraperConfig.relativeGPU})).score;
    for ([index, pair] of pairArr.entries()) {
        if (pair.score === 0) {
            for (zeroScorePair of pairArr.slice(index)) {
                await Pair.updateOne({gpu: zeroScorePair.gpu, cpu: zeroScorePair.cpu}, {rank: index + 1, percentage: 0, maxPercentage: 0});
            }
            break;
        }
        await Pair.updateOne({gpu: pair.gpu, cpu: pair.cpu}, {rank: index + 1, percentage: (pair.score / baselineScore * 100).toFixed(2), maxPercentage: (pair.score / highestScore * 100).toFixed(2)});
    }

    console.log('Done All');
}


// Function for scraping all GPUs stored in mongodb
async function scrapeAllGPUs(browser) {
    console.log('Scraping All GPUs');
    const promises = [];
    const GPUs = await GPU.find();
    for (gpu of GPUs) {
        promises.push(scrapeGPU(browser, gpu));
    }
    await Promise.all(promises);
    const GPUArr = await GPU.find();
    GPUArr.sort((a, b) => {
        if (a.score >= b.score) return -1;
        else return 1;
    });
    const highestScore = GPUArr[0].score;
    const baselineScore = (await GPU.findOne({name: scraperConfig.relativeGPU})).score;
    for ([index, gpu] of GPUArr.entries()) {
        let onCC;
        if ((new Date() - gpu.lastModified) / 1000 < scraperConfig.onCCThreshold) {
            onCC = true;
        } else {
            onCC = false;
            await GPU.updateOne({name: gpu.name}, {online: false, instore: false});
        }
        await GPU.updateOne({name: gpu.name},
            {onCC, rank: index + 1, percentage: (gpu.score / baselineScore * 100).toFixed(2), maxPercentage: (gpu.score / highestScore * 100).toFixed(2)});
    }
    console.log('All GPUs Finished Scraping');
}


// Function for scraping a single GPU
async function scrapeGPU(browser, product) {
    console.log(`Scraping ${product.name}`);
    if (product === null) {
        console.log(`${product.name} does not exist`);
        return;
    }
    const score = await scrapeGPUScore(product.name);
    await GPU.updateOne({name: product.name}, {score});
    let scoreHistory = product.scoreHistory;
    if (scoreHistory.length === 0 || (score !== scoreHistory[scoreHistory.length - 1].score)) {
        scoreHistory.push(new Object({score, date: Date.now()}));
    }
    await GPU.updateOne({name: product.name}, {scoreHistory});

    // List of special names
    let tempName = product.name;
    switch (tempName) {
        case 'Nvidia Titan RTX':
            tempName = 'TITAN';
    }

    // Scraping Canada Computers
    const cc = await browser.newPage();
    await cc.setViewport({width: 1920, height: 1920, deviceScaleFactor: 1});
    try {
        await cc.goto('https://www.canadacomputers.com/index.php?cPath=43');
    } catch (e) {
        await cc.waitFor(3000);
        try {
            await cc.goto('https://www.canadacomputers.com/index.php?cPath=43');
        } catch (e) {
            console.log(`Cannot navigate to CC for ${product.name} , skipping`);
            return;
        }
    }
    let gpuList;
    try {
        gpuList = await cc.$$eval('#collapse3 > div > ul > li', lis => lis.map(li => li.textContent.match(/^[^\(]*/)[0].trim()));
    } catch (e) {
        await cc.waitFor(3000);
        try {
            gpuList = await cc.$$eval('#collapse3 > div > ul > li', lis => lis.map(li => li.textContent.match(/^[^\(]*/)[0].trim()));
        } catch (e) {
            console.log(`Cannot read gpuList for ${product.name} , skipping`);
            return;
        }
    }
    let gpuMatch;
    for (let i = 0; i < gpuList.length; i++) {
        if (tempName === gpuList[i]) {
            gpuMatch = i;
            break;
        }
    }
    if (gpuMatch === undefined) {
        console.log(`${product.name} is not on CC`);
        return;
    }
    await cc.click(`#collapse3 > div > ul > li:nth-child(${gpuMatch + 1}) input`);
    await loadFullPage(cc);
    await scrapeDiv(cc, product);
    await cc.close();

    console.log(`Finished scraping ${product.name}`);
}


// Function for scraping all CPUs found on Canada Computers CPU section
async function scrapeCPU(browser) {
    console.log('Scraping CPU');
    const cc = await browser.newPage();
    try {
        await cc.goto('https://www.canadacomputers.com/index.php?cPath=4');
    } catch (e) {
        await cc.waitFor(3000);
        try {
            await cc.goto('https://www.canadacomputers.com/index.php?cPath=4');
        } catch (e) {
            console.log(`Cannot navigate to CC for CPU, skipping`);
            return;
        }
    }
    await loadFullPage(cc);
    await scrapeDiv(cc);
    await cc.close();
    console.log('Finished Scraping CPU');
}


// Function for scraping individual product listings on Canada Computers
async function scrapeDiv(page, product) {
    let counter = 2;
    let div;
    let isCPU = arguments.length === 1;
    let variantsArr = [];
    let namesArr = [];

    // Wait for page to load
    await page.waitForSelector(`#product-list > div:nth-child(${counter}) > div span.text-dark.d-block.productTemplate_title a`, {
        timeout: scraperConfig.navigationTimeout
    });
    await page.waitForSelector(`#product-list > div:nth-child(${counter}) > div span.d-block.mb-0.pq-hdr-product_price.line-height strong`, {
        timeout: scraperConfig.navigationTimeout
    });
    await page.waitForSelector(`#product-list > div:nth-child(${counter}) > div div div img`, {
        timeout: scraperConfig.navigationTimeout
    });

    loopDivs: do {
        div = await page.$(`#product-list > div:nth-child(${counter}) > div`);
        if (!div) break;

        if (isCPU && !await div.$eval('small.d-block span', span => span.textContent.match(/(AMD)|(INT)/))) {
            counter += 2;
            continue;
        }

        // Create new object to hold product info
        const newProduct = new Object();
        try {
            newProduct.name = await div.$eval('span.text-dark.d-block.productTemplate_title a', a => a.textContent);
        } catch (e) {
            await page.waitFor(3000);
            try {
                newProduct.name = await div.$eval('span.text-dark.d-block.productTemplate_title a', a => a.textContent);
            } catch (e) {
                console.log(`Cannot read name of div #${counter / 2} in ${isCPU ? 'CPU' : product.name} , skipping`);
                counter += 2;
                continue;
            }
        }

        //Trim CPU names
        if (isCPU && newProduct.name.match(/.+?(\d{4,5}[a-z]{0,2})/i)) {
            newProduct.name = newProduct.name.match(/.+?(\d{4,5}[a-z]{0,2})/i)[0];
        }

        if (!isCPU) {
            const nameCheck = new RegExp(product.name.replace('GeForce', '').replace('RTX', '').replace('GTX', '').replace('Radeon', '').replace('RX', '').replace(/ /g, ''), 'i');
            if (!(newProduct.name.replace(/ /g, '').match(nameCheck))) {
                console.log(`${newProduct.name} does not belong`);
                counter += 2;
                continue;
            }
        }

        for (item of scraperConfig.CPUBlacklist) {
            if (newProduct.name.match(new RegExp(item, 'i'))) {
                console.log(`${newProduct.name} was skipped`);
                counter += 2;
                continue loopDivs;
            }
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

        try {
            newProduct.price = Number(await div.$eval('span.d-block.mb-0.pq-hdr-product_price.line-height strong', strong => strong.textContent.match(/[0-9]{1,3},?[0-9]{1,3}\.?[0-9]+/)[0].replace(/,/g, '')));
        } catch (e) {
            await page.waitFor(3000);
            try {
                newProduct.price = Number(await div.$eval('span.d-block.mb-0.pq-hdr-product_price.line-height strong', strong => strong.textContent.match(/[0-9]{1,3},?[0-9]{1,3}\.?[0-9]+/)[0].replace(/,/g, '')));
            } catch (e) {
                console.log(`Cannot read price of div #${counter / 2} in ${isCPU ? 'CPU' : product.name} , skipping`);
                counter += 2;
                continue;
            }
        }
        if (isCPU) {
            try {
                newProduct.priceHistory = [...(await CPU.findOne({name: newProduct.name})).priceHistory];
                newProduct.scoreHistory = [...(await CPU.findOne({name: newProduct.name})).scoreHistory];
            } catch (e) {
                console.log(`${newProduct.name} is new`);
                newProduct.priceHistory = [];
                newProduct.scoreHistory = [];
            }
            if (newProduct.priceHistory.length === 0 || (newProduct.price !== newProduct.priceHistory[newProduct.priceHistory.length - 1].price)) {
                newProduct.priceHistory.push(new Object({
                    price: newProduct.price,
                    date: Date.now()
                }));
            }

            newProduct.score = await scrapeCPUScore(newProduct.name);
            if (newProduct.scoreHistory.length === 0 || (newProduct.score !== newProduct.scoreHistory[newProduct.scoreHistory.length - 1].score)) {
                newProduct.scoreHistory.push(new Object({score: newProduct.score, date: Date.now()}));
            }
            newProduct.priceToPerf = (newProduct.score / newProduct.price).toFixed(4);
        }

        try {
            newProduct.img = await div.$eval('div div img', img => img.src);
        } catch (e) {
            await page.waitFor(3000);
            try {
                newProduct.img = await div.$eval('div div img', img => img.src);
            } catch (e) {
                console.log(`Cannot find picture of div #${counter / 2} in ${isCPU ? 'CPU' : product.name}`);
                newProduct.img = '';
            }
        }

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

        try {newProduct.ccLink = await div.$eval('div.row > div > a', a => a.href);} catch (e) {newProduct.ccLink = 'https://www.canadacomputers.com/index.php';};

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
                doc.scoreHistory = newProduct.scoreHistory;
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
        if (variantsArr.length === 0) return;
        variantsArr = variantsArr.sort((a, b) => b.price - a.price);
        let productPrice;
        if (variantsArr.length % 2 === 0) {
            productPrice = (variantsArr[variantsArr.length / 2 - 1].price + variantsArr[variantsArr.length / 2].price) / 2;
        } else {
            productPrice = variantsArr[Math.floor(variantsArr.length / 2)].price;
        }
        productPrice = productPrice.toFixed(2);

        let priceHistory;
        try {
            priceHistory = [...product.priceHistory];
        } catch (e) {
            console.log(`${product.name} is new`);
            priceHistory = [];
        }
        if (priceHistory.length === 0 || (productPrice !== priceHistory[priceHistory.length - 1].price.toFixed(2))) {
            priceHistory.push(new Object({
                price: productPrice,
                date: Date.now()
            }));
        }
        const score = (await GPU.findOne({name: product.name})).score;
        await GPU.updateOne({name: product.name},
            {
                price: productPrice, variants: variantsArr, priceHistory, priceToPerf: (score / productPrice).toFixed(4), lastModified: Date.now(),
                ccLink: page.url(), online: variantsArr.some(variant => variant.online), instore: variantsArr.some(variant => variant.instore)
            });
    }

    if (isCPU) {
        const CPUArr = await CPU.find();
        CPUArr.sort((a, b) => {
            if (a.score >= b.score) return -1;
            else return 1;
        });
        const highestScore = CPUArr[0].score;
        const baselineScore = (await CPU.findOne({name: scraperConfig.relativeCPU})).score;
        for ([index, cpu] of CPUArr.entries()) {
            let onCC;
            if ((new Date() - cpu.lastModified) / 1000 < scraperConfig.onCCThreshold) {
                onCC = true;
            } else {
                onCC = false;
            }
            await CPU.updateOne({name: cpu.name},
                {onCC, rank: index + 1, percentage: (cpu.score / baselineScore * 100).toFixed(2), maxPercentage: (cpu.score / highestScore * 100).toFixed(2)});
        }
    }
}


// Function for getting the ID of a product on 3dMark
async function scrapeId(name, isCPU) {
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


// Function for scraping Pair score on 3dMark
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
        if (newPair.priceHistory.length === 0 || (newPair.price !== newPair.priceHistory[newPair.priceHistory.length - 1].price)) {
            newPair.priceHistory.push(new Object({price: newPair.price, date: Date.now()}));
        }
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
            priceHistory: [{price: (gpu.price + cpu.price).toFixed(2), date: Date.now()}],
            priceToPerf: (median / (gpu.price + cpu.price)).toFixed(4),
            lastModified: Date.now(),
            onCC: (gpu.onCC && cpu.onCC) ? true : false
        });
    }
    newPair.save();

    return newPair;
}


// Function for scraping CPU score on 3dMark
async function scrapeCPUScore(cpu) {
    const cpuName = cpu;
    const id = await scrapeId(cpuName, true);
    const timeSpyURL = `https://www.3dmark.com/proxycon/ajax/medianscore?test=spy%20P&cpuId=${id}&gpuId=&gpuCount=1&deviceType=DESKTOP&memoryChannels=0&country=&scoreType=physicsScore&hofMode=false&showInvalidResults=false&freeParams=`;
    const res = (await axios.get(timeSpyURL)).data;
    let median = Math.round(isNaN(res.median) ? 0 : res.median);

    return median;
}


// Function for scraping GPU score on 3dMark
async function scrapeGPUScore(gpu) {
    const gpuName = gpu;
    const id = await scrapeId(gpuName, false);
    const timeSpyURL = `https://www.3dmark.com/proxycon/ajax/medianscore?test=spy%20P&cpuId=&gpuId=${id}&gpuCount=1&deviceType=DESKTOP&memoryChannels=0&country=&scoreType=graphicsScore&hofMode=false&showInvalidResults=false&freeParams=`;
    const res = (await axios.get(timeSpyURL)).data;
    let median = Math.round(isNaN(res.median) ? 0 : res.median);

    return median;
}


// Function for fuzzy string matching
// Computes the similarity of two strings with the levenshtein distance algorithm
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


// Function to load a full infinite scrolling page on Canada Computers
async function loadFullPage(page) {
    let moreToLoad;
    try {
        moreToLoad = await page.$eval('#load_more', div => div.className) === 'pb-3 text-center text-uppercase text-muted';
        while (moreToLoad) {
            await page.click('#load_more > button');
            await page.waitForSelector('#loading', {
                hidden: true,
                timeout: scraperConfig.navigationTimeout
            });
            count = await page.$$eval('#product-list > div.col-xl-3.col-lg-4.col-6.mt-0_5.px-0_5.toggleBox.mb-1', divs => divs.length);
            moreToLoad = await page.$eval('#load_more', div => div.className) === 'pb-3 text-center text-uppercase text-muted';
        }
    } catch (e) {}
}


module.exports = scraper = {
    scrapeGPU, scrapeCPU, stringMatch, queryPairsNew, queryPairsExisting, scrapePairScore, scrapeAllGPUs, scrapeId, scrapeCPUScore, scrapeGPUScore
};