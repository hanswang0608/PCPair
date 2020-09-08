async function getGPUs() {
    try {
        return await axios.get('/api/gpus');
    } catch (e) {
        console.log(e);
    }
}

async function getCPUs() {
    try {
        return await axios.get('/api/cpus');
    } catch (e) {
        console.log(e);
    }
}

async function getPairs() {
    try {
        return await axios.get('/api/pairs/');
    } catch (e) {
        console.log(e);
    }
}

async function getCPU(payload) {
    try {
        return await axios.get('/api/cpus/', {
            params: {
                name: payload.name
            }
        });
    } catch (e) {
        console.log(e);
    }
}

async function getGPU(payload) {
    try {
        return await axios.get('/api/gpus/', {
            params: {
                name: payload.name
            }
        });
    } catch (e) {
        console.log(e);
    }
}

async function getPair(payload) {
    try {
        return await axios.get('/api/pairs/', {
            params: {
                cpu: payload.cpu,
                gpu: payload.gpu
            }
        });
    } catch (e) {
        console.log(e);
    }
}

async function getPrice(payload) {
    try {
        return await axios.get(`/api/price/`, {
            params: {
                price: payload.price,
                tolerance: payload.tolerance,
                discontinued: payload.discontinued ? true : false,
                cpuBrand: payload.cpuBrand,
                gpuBrand: payload.gpuBrand
            }
        });
    } catch (e) {
        console.log('getPrice failed');
        console.log(e);
    }
}

export {getCPU, getCPUs, getGPUs, getGPU, getPairs, getPair, getPrice};