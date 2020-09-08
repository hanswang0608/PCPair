import {getPrice} from './apis.js';
import comparer from './sorting.js';

// document.getElementById('button').addEventListener('submit', priceSearch);
// document.getElementById('button').addEventListener('submit', (e) => {
//     e.preventDefault();
//     window.alert('submit');
//     const priceRef = document.querySelector('#price');
//     const toleranceRef = document.querySelector('#tolerance');
//     if (priceRef.value <= 50 || toleranceRef.value < 0) {
//         console.log(e);
//         e.preventDefault;
//     }
// });

// document.getElementById('button').addEventListener('submit', () => window.alert('sdf'));

// Read query values
const searchParams = new URLSearchParams(window.location.search);
const price = searchParams.get('price');
const tolerance = searchParams.get('tolerance');
const discontinued = searchParams.get('discontinued');
const cpuBrand = searchParams.get('cpuBrand');
const gpuBrand = searchParams.get('gpuBrand');

// Assign form references and set default values
const priceRef = document.querySelector('#price');
const toleranceRef = document.querySelector('#tolerance');
const discontinuedRef = document.querySelector('#discontinued');
const cpuBrandRef = document.querySelector('#cpuBrand');
const gpuBrandRef = document.querySelector('#gpuBrand');
const resultPerfRef = document.getElementById('resultPerf');
const resultPricePerfRef = document.getElementById('resultPricePerf');
const viewMoreRef = document.getElementById('view-more');
const searchCollapseButtonRef = document.getElementById('search-collapse-button');
const searchCollapseRef = document.getElementById('search-collapse');
const ajaxLoadingRef = document.getElementById('ajax-loading');

priceRef.value = price;
toleranceRef.value = tolerance || 10;
discontinuedRef.checked = discontinued;
cpuBrandRef.value = cpuBrand || 'All';
gpuBrandRef.value = gpuBrand || 'All';

// Declare variable to store data
let res;


// Listening for events
if (price != null && tolerance != null) {
    if (price > 50 && tolerance > 0) {
        priceSearch(price, tolerance, discontinued, cpuBrand, gpuBrand);
    } else {
        const formWarningRef = document.getElementById('form-warning');
        formWarningRef.innerHTML = 'bad input';
        formWarningRef.style.display = 'block';
    }
}

searchCollapseButtonRef.addEventListener('click', () => {
    const searchTipRef = document.getElementById('search-tip');
    if (searchCollapseRef.className === 'collapse') {
        searchTipRef.style.display = 'none';
    } else if (searchCollapseRef.className === 'collapse show') {
        searchTipRef.style.display = 'block';
    }
});

console.log(document.body.style.fontFamily);
// Listen for view more button
viewMoreRef.addEventListener('click', () => {
    const resultPricePerf = res.data[1];
    resultPricePerfRef.innerHTML = (resultPricePerf.map((el, index) =>
        `<tr class="table-row pcpair-color-hover">
            <th><span>${index + 1}</span></th>
            <td><a class="table-row-link no-deco-link"><span>${el.cpu}</span></a></td>
            <td><a class="table-row-link no-deco-link"><span>${el.gpu}</span></a></td>
            <td><a class="table-row-link no-deco-link"><span>${el.score}</span></a></td>
            <td><a class="table-row-link no-deco-link">$<span>${el.price}</span></a></td>
            <td><a class="table-row-link no-deco-link"><span>${el.priceToPerf}</span></a></td>
        </tr>`
    )).join('');
    document.querySelectorAll('.table-row').forEach(el => {
        const cpuName = el.querySelectorAll('span')[1].innerHTML;
        const gpuName = el.querySelectorAll('span')[2].innerHTML;
        el.querySelectorAll('a').forEach(a => a.href = `/pair/?cpuname=${cpuName}&gpuname=${gpuName}`);
    });
    document.querySelectorAll('.table-row-link').forEach(td => {
        td.addEventListener('hover', () => {
            td.parentElement.style.backgroundColor = 'black';
            console.log('hovered');
        });
    });

    viewMoreRef.style.display = 'none';

    document.querySelectorAll('.table-row-link').forEach(td => {
        td.addEventListener('hover', () => {
            td.parentElement.style.backgroundColor = 'black';
            console.log('hovered');
        });
    });
});


async function priceSearch(price, tolerance, discontinued, cpuBrand, gpuBrand) {
    document.getElementById('result-area').style.display = 'block';
    ajaxLoadingRef.style.display = 'inline-block';
    res = await getPrice({price, tolerance, discontinued, cpuBrand, gpuBrand});
    ajaxLoadingRef.style.display = 'none';
    console.log(res.data);
    const resultPerf = res.data[0].slice(0, 3);
    const resultPricePerf = res.data[1].slice(0, 5);
    resultPricePerfRef.innerHTML = (resultPricePerf.map((el, index) =>
        `<tr class="table-row pcpair-color-hover">
                <th><span>${index + 1}</span></th>
                <td><a class="table-row-link no-deco-link"><span>${el.cpu}</span></a></td>
                <td><a class="table-row-link no-deco-link"><span>${el.gpu}</span></a></td>
                <td><a class="table-row-link no-deco-link"><span>${el.score}</span></a></td>
                <td><a class="table-row-link no-deco-link">$<span>${el.price}</span></a></td>
                <td><a class="table-row-link no-deco-link"><span>${el.priceToPerf}</span></a></td>
            </tr>`
    )).join('');
    viewMoreRef.style.display = 'block';
    document.querySelectorAll('.table-row').forEach(el => {
        const cpuName = el.querySelectorAll('span')[1].innerHTML;
        const gpuName = el.querySelectorAll('span')[2].innerHTML;
        el.querySelectorAll('a').forEach(a => a.href = `/pair/?cpuname=${cpuName}&gpuname=${gpuName}`);
    });

    document.querySelectorAll('th').forEach(th => th.addEventListener('click', (() => {
        const table = th.closest('table');
        const tbody = table.querySelector('tbody');
        Array.from(tbody.querySelectorAll('tr'))
            .sort(comparer(Array.from(th.parentNode.children).indexOf(th), window.asc = !window.asc))
            .forEach(tr => tbody.appendChild(tr));
    })));
}
