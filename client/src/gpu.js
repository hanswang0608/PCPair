import {getGPU} from './apis.js';

let res;

const searchParams = new URLSearchParams(window.location.search);
const gpuname = searchParams.get('gpuname');

const gpuInfoRef = document.getElementById('gpu-info');
const gpuImgRef = gpuInfoRef.querySelector('img');
const gpuNameRef = document.getElementById('gpu-name');
const gpuNameLinkRef = gpuNameRef.parentElement;
const gpuInfoHeadersRef = gpuInfoRef.querySelectorAll('.gpu-info-header');
const buyInfoRef = document.getElementById('buy-info');
const buyInfoCellsRef = buyInfoRef.querySelectorAll('td');

getGPUInfo(gpuname);

async function getGPUInfo(gpuname) {
    res = (await getGPU({name: gpuname})).data;
    console.log(res);
    gpuImgRef.src = res.img;
    gpuImgRef.alt = res.name;
    gpuNameRef.innerHTML = res.name;
    gpuNameLinkRef.href = `/gpu/?gpuname=${res.name}`;
    gpuInfoHeadersRef[0].innerHTML = `${res.rank} of ${res.total}`;
    gpuInfoHeadersRef[1].innerHTML = res.score;
    gpuInfoHeadersRef[2].innerHTML = res.price;
    gpuInfoHeadersRef[3].innerHTML = res.priceToPerf;

    res.onCC ? buyInfoCellsRef[0].querySelector('a').href = res.ccLink : '';
    res.onCC ? buyInfoCellsRef[1].innerHTML = `$${res.price}` : buyInfoCellsRef[1].innerHTML = '-';
    buyInfoCellsRef[2].innerHTML = res.instore ? 'Yes' : 'No';
    buyInfoCellsRef[3].innerHTML = res.online ? 'Yes' : 'No';
    res.onCC ? buyInfoCellsRef[4].querySelector('a').href = res.ccLink : buyInfoCellsRef[4].querySelector('a').innerHTML = '';

    return res;
}

google.charts.load('current', {'packages': ['corechart']});
google.charts.setOnLoadCallback(() => drawPriceChart(res));
google.charts.setOnLoadCallback(() => drawScoreChart(res));

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

    var chart = new google.visualization.LineChart(document.getElementById('price-history-chart'));

    chart.draw(data, options);
}