import {getGPU, getPair} from './apis.js';

const searchParams = new URLSearchParams(window.location.search);
const gpuname = searchParams.get('gpuname');

const gpuInfoRef = document.getElementById('gpu-info');
const gpuImgRef = gpuInfoRef.querySelector('img');
const gpuNameRef = document.getElementById('gpu-name');
const gpuNameLinkRef = gpuNameRef.parentElement;
const gpuInfoHeadersRef = gpuInfoRef.querySelectorAll('.gpu-info-header');
const buyInfoRef = document.getElementById('buy-info');
const buyInfoCellsRef = buyInfoRef.querySelectorAll('td');

let GPURes, pairRes;

async function init() {
    await getGPUInfo(gpuname);
    // await getPairInfo(gpuname);
    google.charts.load('current', {'packages': ['corechart']});
    google.charts.setOnLoadCallback(() => drawPriceChart(GPURes));
    // google.charts.setOnLoadCallback(() => drawStackChart(pairRes));
    google.charts.setOnLoadCallback(() => drawScoreChart(GPURes));
}

init();

async function getGPUInfo(gpuname) {
    GPURes = (await getGPU({name: gpuname})).data;
    console.log(GPURes);
    gpuImgRef.src = GPURes.img;
    gpuImgRef.alt = GPURes.name;
    gpuNameRef.innerHTML = GPURes.name;
    gpuNameLinkRef.href = `/gpu/?gpuname=${GPURes.name}`;
    gpuInfoHeadersRef[0].innerHTML = `${GPURes.rank} of ${GPURes.total}`;
    gpuInfoHeadersRef[1].innerHTML = `${GPURes.percentage}%`;
    gpuInfoHeadersRef[2].innerHTML = GPURes.score;
    gpuInfoHeadersRef[3].innerHTML = GPURes.price;
    gpuInfoHeadersRef[4].innerHTML = GPURes.priceToPerf;

    GPURes.onCC ? buyInfoCellsRef[0].querySelector('a').href = GPURes.ccLink : '';
    GPURes.onCC ? buyInfoCellsRef[1].innerHTML = `$${GPURes.price}` : buyInfoCellsRef[1].innerHTML = '-';
    buyInfoCellsRef[2].innerHTML = GPURes.instore ? 'Yes' : 'No';
    buyInfoCellsRef[3].innerHTML = GPURes.online ? 'Yes' : 'No';
    GPURes.onCC ? buyInfoCellsRef[4].querySelector('a').href = GPURes.ccLink : buyInfoCellsRef[4].querySelector('a').innerHTML = '';
}

async function getPairInfo(gpuname) {
    pairRes = (await getPair({gpu: gpuname})).data.filter(pair => pair.score && pair.price < 2000).sort((a, b) => a.score >= b.score ? -1 : 1);
    console.log(pairRes);
}

function drawStackChart(res) {
    const stackData = [['Price', 'Score']];
    res.forEach(pair => {
        stackData.push([pair.price, pair.score]);
    });

    var data = google.visualization.arrayToDataTable(stackData);

    var options = {
        legend: {position: 'bottom'},
        hAxis: {title: 'Price', minValue: 1000, maxValue: 2000, titleTextStyle: {italic: false}},
        vAxis: {title: 'Score', minValue: 0, maxValue: 10000, titleTextStyle: {italic: false}},
        colors: ['#40a8c4'],
        legend: 'none',
    };

    var chart = new google.visualization.ScatterChart(document.getElementById('stack-chart'));

    chart.draw(data, options);

    chart.getAction('s');
}

function drawScoreChart(res) {
    const scoreData = [['Date', 'Score']];
    res.scoreHistory.forEach(score => {
        const date = new Date(score.date);
        const dateStr = `${date.getMonth()}/${date.getDate()}`;
        scoreData.push([`${dateStr}`, score.score]);
    });

    var data = google.visualization.arrayToDataTable(scoreData);

    function getIntervals(res) {
        let result = [];
        const arr = res.scoreHistory.map(el => el.score);
        const max = Math.max.apply(null, arr);
        const min = Math.min.apply(null, arr);
        const interval = Math.pow(10, Math.floor(Math.log(res.score) / Math.LN10) - 1) * 2.5;
        const intervalMax = Math.round((max + 2 * interval) / Math.pow(10, Math.floor(Math.log(max + 2 * interval) / Math.LN10) - 1)) * Math.pow(10, Math.floor(Math.log(max + 2 * interval) / Math.LN10) - 1);
        const intervalMin = Math.round((min - 2 * interval) / Math.pow(10, Math.floor(Math.log(min - 2 * interval) / Math.LN10) - 1)) * Math.pow(10, Math.floor(Math.log(min - 2 * interval) / Math.LN10) - 1);
        const increment = (intervalMax - intervalMin) / 4;
        for (let i = 0; i < 5; i++) {
            result.push(Math.round(intervalMin + i * increment).toFixed(2));
        }
        return result;
    }
    var options = {
        legend: {position: 'bottom'},
        vAxis: {ticks: getIntervals(res)},
        colors: ['#40a8c4']
    };

    var chart = new google.visualization.LineChart(document.getElementById('score-history-chart'));

    chart.draw(data, options);
}

function drawPriceChart(res) {
    const priceData = [['Date', 'Price']];
    res.priceHistory.forEach(price => {
        const date = new Date(price.date);
        const dateStr = `${date.getMonth()}/${date.getDate()}`;
        priceData.push([`${dateStr}`, price.price]);
    });

    var data = google.visualization.arrayToDataTable(priceData);

    function getIntervals(res) {
        let result = [];
        const arr = res.priceHistory.map(el => el.price);
        const max = Math.max.apply(null, arr);
        const min = Math.min.apply(null, arr);
        const interval = Math.pow(10, Math.floor(Math.log(res.price) / Math.LN10) - 1) * 2.5;
        const intervalMax = Math.round((max + 2 * interval) / Math.pow(10, Math.floor(Math.log(max + 2 * interval) / Math.LN10) - 1)) * Math.pow(10, Math.floor(Math.log(max + 2 * interval) / Math.LN10) - 1);
        const intervalMin = Math.round((min - 2 * interval) / Math.pow(10, Math.floor(Math.log(min - 2 * interval) / Math.LN10) - 1)) * Math.pow(10, Math.floor(Math.log(min - 2 * interval) / Math.LN10) - 1);
        const increment = (intervalMax - intervalMin) / 4;
        for (let i = 0; i < 5; i++) {
            result.push(Math.round(intervalMin + i * increment).toFixed(2));
        }
        return result;
    }
    var options = {
        legend: {position: 'bottom'},
        vAxis: {ticks: getIntervals(res)},
        colors: ['#40a8c4']
    };

    var chart = new google.visualization.SteppedAreaChart(document.getElementById('price-history-chart'));

    chart.draw(data, options);
}