import {getCPU, getPair} from './apis.js';

const searchParams = new URLSearchParams(window.location.search);
const cpuname = searchParams.get('cpuname');

const cpuInfoRef = document.getElementById('cpu-info');
const cpuImgRef = cpuInfoRef.querySelector('img');
const cpuNameRef = document.getElementById('cpu-name');
const cpuNameLinkRef = cpuNameRef.parentElement;
const cpuInfoHeadersRef = cpuInfoRef.querySelectorAll('.cpu-info-header');
const buyInfoRef = document.getElementById('buy-info');
const buyInfoCellsRef = buyInfoRef.querySelectorAll('td');

let CPURes, pairRes;

async function init() {
    await getCPUInfo(cpuname);
    // await getPairInfo(cpuname);
    google.charts.load('current', {'packages': ['corechart']});
    google.charts.setOnLoadCallback(() => drawPriceChart(CPURes));
    // google.charts.setOnLoadCallback(() => drawStackChart(pairRes));
    google.charts.setOnLoadCallback(() => drawScoreChart(CPURes));
}

init();

window.addEventListener('resize', () => {
    google.charts.load('current', {'packages': ['corechart']});
    google.charts.setOnLoadCallback(() => drawPriceChart(CPURes));
    google.charts.setOnLoadCallback(() => drawScoreChart(CPURes));
});

async function getCPUInfo(cpuname) {
    CPURes = (await getCPU({name: cpuname})).data;
    console.log(CPURes);
    cpuImgRef.src = CPURes.img;
    cpuImgRef.alt = CPURes.name;
    cpuNameRef.innerHTML = CPURes.name;
    cpuNameLinkRef.href = `/cpu/?cpuname=${CPURes.name}`;
    cpuInfoHeadersRef[0].innerHTML = `${CPURes.rank} of ${CPURes.total}`;
    cpuInfoHeadersRef[1].innerHTML = `${CPURes.percentage}%`;
    cpuInfoHeadersRef[2].innerHTML = CPURes.score;
    cpuInfoHeadersRef[3].innerHTML = CPURes.price;
    cpuInfoHeadersRef[4].innerHTML = CPURes.priceToPerf;

    CPURes.onCC ? buyInfoCellsRef[0].querySelector('a').href = CPURes.ccLink : '';
    CPURes.onCC ? buyInfoCellsRef[1].innerHTML = `$${CPURes.price}` : buyInfoCellsRef[1].innerHTML = '-';
    buyInfoCellsRef[2].innerHTML = CPURes.instore ? 'Yes' : 'No';
    buyInfoCellsRef[3].innerHTML = CPURes.online ? 'Yes' : 'No';
    CPURes.onCC ? buyInfoCellsRef[4].querySelector('a').href = CPURes.ccLink : buyInfoCellsRef[4].querySelector('a').innerHTML = '';
}

async function getPairInfo(cpuname) {
    pairRes = (await getPair({cpu: cpuname})).data.filter(pair => pair.score && pair.price < 3000).sort((a, b) => a.score >= b.score ? -1 : 1);
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
        const currentDate = new Date(Date.now());
        const date = new Date(score.date);
        const dateStr = `${date.getMonth() + 1}/${date.getDate()}${date.getFullYear() === currentDate.getFullYear() ? '' : `/${date.getFullYear()}`}`;
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
        const currentDate = new Date(Date.now());
        const date = new Date(price.date);
        const dateStr = `${date.getMonth() + 1}/${date.getDate()}${date.getFullYear() === currentDate.getFullYear() ? '' : `/${date.getFullYear()}`}`;
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