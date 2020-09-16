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
const tolerance = Number.parseFloat(searchParams.get('tolerance'));
const discontinued = searchParams.get('discontinued');
const cpuBrand = searchParams.get('cpuBrand');
const gpuBrand = searchParams.get('gpuBrand');

// Assign element references
const priceRef = document.querySelector('#price');
const toleranceRef = document.querySelector('#tolerance');
const discontinuedRef = document.querySelector('#discontinued');
const cpuBrandRef = document.querySelector('#cpuBrand');
const gpuBrandRef = document.querySelector('#gpuBrand');
const resultAreaRef = document.getElementById('result-area');
const resultPerfRef = document.getElementById('resultPerf');
const resultPricePerfRef = document.getElementById('resultPricePerf');
const viewMoreRef = document.getElementById('view-more');
const searchCollapseButtonRef = document.getElementById('search-collapse-button');
const searchCollapseRef = document.getElementById('search-collapse');
const ajaxLoadingRef = document.getElementById('ajax-loading');
const searchTipRef = document.getElementById('search-tip');
const searchAreaRef = document.getElementById('search-area');
const searchButtonGroupRef = document.getElementById('search-button-group');
const searchButtonRef = document.getElementById('search-button');

// Resetting search values from URL
// priceRef.value = price;
toleranceRef.value = tolerance || 10;
discontinuedRef.checked = discontinued;
cpuBrandRef.value = cpuBrand || 'All';
gpuBrandRef.value = gpuBrand || 'All';

// Declare variable to store data
let res;

// Listening for events
if (price != null && tolerance != null) {
    const priceMin = 50;
    if (price >= 50) {
        priceRef.value = price;
    } else {
        priceRef.placeholder = `Price must be at least ${priceMin}`;
        priceRef.style.boxShadow = 'inset 0 0 3px rgb(255, 0, 32)';
        priceRef.style.borderColor = 'rgb(255, 0, 32)';
        // const formWarningRef = document.getElementById('form-warning');
        // formWarningRef.innerHTML = 'bad input';
        // formWarningRef.style.display = 'block';
    }
    if (price >= 50 && tolerance > 0) {
        priceSearch(price, tolerance, discontinued, cpuBrand, gpuBrand);
    }
}

window.addEventListener('resize', () => overlapCheck());

// Listen for extra search options
searchCollapseButtonRef.addEventListener('click', () => {
    const searchTipRef = document.getElementById('search-tip');
    if (searchCollapseRef.className === 'collapse') {
        searchTipRef.style.display = 'none';
    } else if (searchCollapseRef.className === 'collapse show') {
        searchTipRef.style.display = 'block';
    }
});

// Listen for view more button
viewMoreRef.addEventListener('click', () => {
    populateResults(15);
    viewMoreRef.style.display = 'none';
});


function overlapCheck() {
    let rect1 = searchTipRef.getBoundingClientRect();
    let rect2 = resultAreaRef.getBoundingClientRect();
    let overlap = !(rect1.right < rect2.left ||
        rect1.left > rect2.right ||
        rect1.bottom < rect2.top ||
        rect1.top > rect2.bottom);

    if (overlap) {
        // while (overlap) {
        //     margin += 20;
        //     // searchAreaRef.style.marginBottom = `${margin}px`;
        //     // rect1 = searchTipRef.getBoundingClientRect();
        //     // rect2 = resultAreaRef.getBoundingClientRect();
        //     console.log(searchTipRef.getBoundingClientRect().bottom, resultAreaRef.getBoundingClientRect().top + margin);

        //     overlap = !(rect1.right < rect2.left ||
        //         rect1.left > rect2.right ||
        //         rect1.bottom < rect2.top + margin ||
        //         rect1.top > rect2.bottom);
        // }
        searchAreaRef.style.marginBottom = '150px';
    } else {
        overlap = !(rect1.right < rect2.left ||
            rect1.left > rect2.right ||
            rect1.bottom < rect2.top - 50 ||
            rect1.top > rect2.bottom);
        if (!overlap) {
            searchAreaRef.style.marginBottom = '100px';
        }
    }
}

async function priceSearch(price, tolerance, discontinued, cpuBrand, gpuBrand) {
    document.getElementById('result-area').style.display = 'block';
    overlapCheck();
    ajaxLoadingRef.style.display = 'inline-block';
    res = await getPrice({price, tolerance, discontinued, cpuBrand, gpuBrand});
    ajaxLoadingRef.style.display = 'none';
    // console.log(res.data);
    populateResults(5);
    if (res.data[1].length > 5) {
        viewMoreRef.style.display = 'block';
    }
    document.querySelectorAll('th').forEach(th => th.addEventListener('click', (() => {
        const table = th.closest('table');
        const tbody = table.querySelector('tbody');
        Array.from(tbody.querySelectorAll('tr'))
            .sort(comparer(Array.from(th.parentNode.children).indexOf(th), window.asc = !window.asc))
            .forEach(tr => tbody.appendChild(tr));
    })));
}

function populateResults(n) {
    const resultPerf = res.data[0].slice(0, n);
    const resultPricePerf = res.data[1].slice(0, n);
    resultPricePerfRef.innerHTML = (resultPricePerf.map((el, index) =>
        `<tr class="table-row pcpair-color-hover">
                <th><span>${index + 1}</span></th>
                <td><a class="table-row-link no-deco-link"><span>${el.cpu}</span></a></td>
                <td><a class="table-row-link no-deco-link"><span>${el.gpu}</span></a></td>
                <td><a class="table-row-link no-deco-link"><span>${el.percentage.toFixed(1)}</span>%</a></td>
                <td><a class="table-row-link no-deco-link"><span>${el.score}</span></a></td>
                <td><a class="table-row-link no-deco-link">$<span>${el.price}</span></a></td>
            </tr>`
    )).join('');
    document.querySelectorAll('.table-row').forEach(el => {
        const cpuName = el.querySelectorAll('span')[1].innerHTML;
        const gpuName = el.querySelectorAll('span')[2].innerHTML;
        el.querySelectorAll('a').forEach(a => a.href = `/pair/?cpuname=${cpuName}&gpuname=${gpuName}`);
    });
}
