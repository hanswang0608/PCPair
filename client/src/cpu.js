import {getCPU} from './apis.js';

const cpuInfoRef = document.getElementById('cpuInfo');
const searchParams = new URLSearchParams(window.location.search);
const cpuname = searchParams.get('cpuname');

async function getCPUInfo(cpuname) {
    const res = (await getCPU({name: cpuname})).data;
    cpuInfoRef.innerHTML =
        `
        <h2>${res.name}</h2>
        <img src="${res.img}" width="100" height="100" placeholder="${res.name}">
        <h3>${res.price}</h3>
        <h3>${res.score}</h3>
    `;
}

getCPUInfo(cpuname);