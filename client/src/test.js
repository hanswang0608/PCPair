const arr = [1, 2, 3, 4, 5];


function comparer(x) {
    console.log(x);

    if (a > b) return -1;
    else return 1;
}

document.querySelectorAll('th').forEach(th => th.addEventListener('click', (() => {
    const table = th.closest('table');
    const tbody = table.querySelector('tbody');
    console.log(this);
    // Array.from(tbody.querySelectorAll('tr'))
    //         .sort(comparer(Array.from(th.parentNode.children).indexOf(th)))
    //         .forEach(tr => tbody.appendChild(tr));
})));