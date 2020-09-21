const express = require('express');
const path = require('path');

const router = express.Router();

// Static Folder
router.use(express.static(path.join(__dirname, '../client')));

// Routes
router.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/public', 'index.html'));
});

router.get('/about', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/public', 'about.html'));
});

router.get('/cpu/', (req, res) => {
    if (Object.keys(req.query).length !== 0) {
        res.sendFile(path.resolve(__dirname, '../client/public', 'cpu.html'));
    } else {
        res.sendFile(path.resolve(__dirname, '../client/public', 'cpus.html'));
    }
});

router.get('/gpu/', (req, res) => {
    if (Object.keys(req.query).length !== 0) {
        res.sendFile(path.resolve(__dirname, '../client/public', 'gpu.html'));
    } else {
        res.sendFile(path.resolve(__dirname, '../client/public', 'gpus.html'));
    }
});

router.get('/pair/', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/public', 'pair.html'));
});

module.exports = router;