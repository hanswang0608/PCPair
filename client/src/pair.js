import {getCPU, getGPU, getPair} from './apis.js';

const cpuInfoRef = document.getElementById('cpu-info');
const gpuInfoRef = document.getElementById('gpu-info');
const pairInfoRef = document.getElementById('pair-info');
const searchParams = new URLSearchParams(window.location.search);
const cpuname = searchParams.get('cpuname');
const gpuname = searchParams.get('gpuname');

async function getPairInfo(cpuname, gpuname) {
    const res = (await getPair({cpu: cpuname, gpu: gpuname})).data;
    const pairInfoHeadersRef = pairInfoRef.querySelectorAll('span');
    pairInfoHeadersRef[0].innerHTML = `${res.rank} of ${res.total}`;
    pairInfoHeadersRef[1].innerHTML = res.score;
    pairInfoHeadersRef[2].innerHTML = res.price;
    pairInfoHeadersRef[3].innerHTML = res.priceToPerf;
}

async function getCPUInfo(cpuname) {
    const res = (await getCPU({name: cpuname})).data;
    //`/cpu/?cpuname=${cpuName}`
    console.log(res);
    const cpuImgRef = cpuInfoRef.querySelector('img');
    cpuImgRef.src = res.img;
    cpuImgRef.alt = res.name;
    const cpuNameRef = document.getElementById('cpu-name');
    cpuNameRef.innerHTML = res.name;
    const cpuNameLinkRef = cpuNameRef.parentElement;
    cpuNameLinkRef.href = `/cpu/?cpuname=${res.name}`;
    const cpuInfoHeadersRef = cpuInfoRef.querySelectorAll('span');
    cpuInfoHeadersRef[0].innerHTML = `${res.rank} of ${res.total}`;
    cpuInfoHeadersRef[1].innerHTML = res.score;
    cpuInfoHeadersRef[2].innerHTML = res.price;

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
    gpuInfoHeadersRef[1].innerHTML = res.score;
    gpuInfoHeadersRef[2].innerHTML = res.price;
    // gpuInfoRef.innerHTML =
    //     `
    //     <h2>${res.name}</h2>
    //     <img src="${res.img}" width="100" height="100 placeholder="${res.name}">
    //     <h3>${res.price}</h3>
    //     <h3>${res.score}</h3>
    // `;
}

async function init() {
    const promises = [getPairInfo(cpuname, gpuname), getCPUInfo(cpuname), getGPUInfo(gpuname)];
    await Promise.all(promises);

};

init();