import {getCPU} from './apis.js';

const cpuInfoRef = document.getElementById('cpu-info');
const searchParams = new URLSearchParams(window.location.search);
const cpuname = searchParams.get('cpuname');

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
}

getCPUInfo(cpuname);