// Sorting functions
const getCellValue = (tr, idx) => tr.children[idx].querySelector('span').innerText || tr.children[idx].querySelector('span').textContent;

export default (idx, asc) => (a, b) => ((v1, v2) =>
    v1 !== '' && v2 !== '' && !isNaN(v1) && !isNaN(v2) ? v1 - v2 : v1.toString().localeCompare(v2)
)(getCellValue(asc ? a : b, idx), getCellValue(asc ? b : a, idx));
