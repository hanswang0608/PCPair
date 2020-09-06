const express = require('express');
const scraper = require('../../scraper');

const router = express.Router();
const {isNull} = require('util');

// Get an existing price query
router.get('/', (req, res) => {
    if (req.query.discontinued === 'true') {
        req.query.discontinued = true;
    } else {
        req.query.discontinued = false;
    }
    scraper.queryPairsExisting(Number.parseFloat(req.query.price), Number.parseFloat(req.query.tolerance), req.query.discontinued, req.query.cpuBrand, req.query.gpuBrand)
        .then(data => res.json(data))
        .catch(err => console.log(err));
});

module.exports = router;