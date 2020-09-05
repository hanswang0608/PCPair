import {getGPUs} from './apis.js';
import comparer from './sorting.js';

const resultRef = document.getElementById('result');
getGPUs().then(res => {
    resultRef.innerHTML = (res.data
        .sort((a, b) => {
            if (a.score > b.score) return -1;
            else return 1;
        })
        .map((el, index) =>
            `<tr class="table-row">
                <th><span>${index + 1}</span></th>
                <td><a class="table-row-link"><span>${el.name}</span></a></td>
                <td><a class="table-row-link"><span>${el.score}</span></a></td>
                <td><a class="table-row-link">$<span>${el.price}</span></a></td>
                <td><a class="table-row-link"><span>${el.priceToPerf}</span></a></td>
            </tr>
            `
        )).join('');

    document.querySelectorAll('.table-row').forEach(el => {
        const gpuName = el.querySelectorAll('span')[1].innerHTML;
        el.querySelectorAll('a').forEach(a => a.href = `/gpu/?gpuname=${gpuName}`);
    });

    document.querySelectorAll('th').forEach(th => th.addEventListener('click', (() => {
        const table = th.closest('table');
        const tbody = table.querySelector('tbody');
        Array.from(tbody.querySelectorAll('tr'))
            .sort(comparer(Array.from(th.parentNode.children).indexOf(th), window.asc = !window.asc))
            .forEach(tr => tbody.appendChild(tr));
    })));
});
