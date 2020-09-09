import {getCPU, getGPU, getPair} from './apis.js';

const cpuInfoRef = document.getElementById('cpu-info');
const gpuInfoRef = document.getElementById('gpu-info');
const pairInfoRef = document.getElementById('pair-info');
const searchParams = new URLSearchParams(window.location.search);
const cpuname = searchParams.get('cpuname');
const gpuname = searchParams.get('gpuname');

let res;

async function init() {
    const promises = [getPairInfo(cpuname, gpuname), getCPUInfo(cpuname), getGPUInfo(gpuname)];
    await Promise.all(promises);
    google.charts.load('current', {'packages': ['corechart']});
    google.charts.setOnLoadCallback(() => drawScoreChart(res));
    google.charts.setOnLoadCallback(() => drawPriceChart(res));
};

init();

async function getPairInfo(cpuname, gpuname) {
    res = (await getPair({cpu: cpuname, gpu: gpuname})).data;
    const pairInfoHeadersRef = pairInfoRef.querySelectorAll('.pair-info-headers');
    pairInfoHeadersRef[0].innerHTML = `${res.rank} of ${res.total}`;
    pairInfoHeadersRef[1].innerHTML = res.price;
    pairInfoHeadersRef[2].innerHTML = `${res.percentage}%`;
    pairInfoHeadersRef[3].innerHTML = res.score || 'Not Benchmarked';
    pairInfoHeadersRef[4].innerHTML = res.priceToPerf || 'Not Benchmarked';
}


async function getCPUInfo(cpuname) {
    const res = (await getCPU({name: cpuname})).data;
    //`/cpu/?cpuname=${cpuName}`
    const cpuImgRef = cpuInfoRef.querySelector('img');
    cpuImgRef.src = res.img;
    cpuImgRef.alt = res.name;
    const cpuNameRef = document.getElementById('cpu-name');
    cpuNameRef.innerHTML = res.name;
    const cpuNameLinkRef = cpuNameRef.parentElement;
    cpuNameLinkRef.href = `/cpu/?cpuname=${res.name}`;
    const cpuInfoHeadersRef = cpuInfoRef.querySelectorAll('span');
    cpuInfoHeadersRef[0].innerHTML = `${res.rank} of ${res.total}`;
    cpuInfoHeadersRef[1].innerHTML = `${res.percentage}%`;
    cpuInfoHeadersRef[2].innerHTML = res.score;
    cpuInfoHeadersRef[3].innerHTML = res.price;

    // cpuInfoRef.innerHTML =
    //     `
    //     <h2>${res.name}</h2>
    //     <img src="${res.img}" width="100" height="100" placeholder="${res.name}">
    //     <h3>${res.price}</h3>
    //     <h3>${res.score}</h3>
    // `;
}

async function getGPUInfo(gpuname) {
    const res = (await getGPU({name: gpuname})).data;
    const gpuImgRef = gpuInfoRef.querySelector('img');
    gpuImgRef.src = res.img;
    gpuImgRef.alt = res.name;
    const gpuNameRef = document.getElementById('gpu-name');
    gpuNameRef.innerHTML = res.name;
    const gpuNameLinkRef = gpuNameRef.parentElement;
    gpuNameLinkRef.href = `/gpu/?gpuname=${res.name}`;
    const gpuInfoHeadersRef = gpuInfoRef.querySelectorAll('span');
    gpuInfoHeadersRef[0].innerHTML = `${res.rank} of ${res.total}`;
    gpuInfoHeadersRef[1].innerHTML = `${res.percentage}%`;
    gpuInfoHeadersRef[2].innerHTML = res.score;
    gpuInfoHeadersRef[3].innerHTML = res.price;
    // gpuInfoRef.innerHTML =
    //     `
    //     <h2>${res.name}</h2>
    //     <img src="${res.img}" width="100" height="100 placeholder="${res.name}">
    //     <h3>${res.price}</h3>
    //     <h3>${res.score}</h3>
    // `;
}

function drawScoreChart(res) {
    const scoreData = [['Date', 'Score']];
    res.scoreHistory.forEach(score => {
        const date = new Date(score.date);
        const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
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
        const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
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