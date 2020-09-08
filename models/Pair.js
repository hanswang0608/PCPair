const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PairSchema = new Schema({
    gpu: {
        type: String,
        required: true
    },
    cpu: {
        type: String,
        required: true
    },
    score: {
        type: Number
    },
    rank: {
        type: Number
    },
    scoreHistory: [{
        score: Number, date: Date
    }],
    price: {
        type: Number
    },
    priceHistory: [{
        price: Number, date: Date
    }],
    priceToPerf: {
        type: Number
    },
    lastModified: {
        type: Date
    },
    onCC: {
        type: Boolean
    },
    cpuBrand: {
        type: String
    },
    gpuBrand: {
        type: String
    },
    percentage: {
        type: Number
    },
    maxPercentage: {
        type: Number
    }
}, {collation: {locale: 'en', strength: 2}});

module.exports = Pair = mongoose.model('Pair', PairSchema);