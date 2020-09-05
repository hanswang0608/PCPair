import {getGPU} from './apis.js';

const gpuInfoRef = document.getElementById('gpuInfo');
const searchParams = new URLSearchParams(window.location.search);
const gpuname = searchParams.get('gpuname');

async function getGPUInfo(gpuname) {
    const res = (await getGPU({name: gpuname})).data;
    gpuInfoRef.innerHTML =
        `
        <h2>${res.name}</h2>
        <img src="${res.img}" width="100" height="100" placeholder="${res.name}">
        <h3>${res.price}</h3>
        <h3>${res.score}</h3>
    `;
}

getGPUInfo(gpuname);