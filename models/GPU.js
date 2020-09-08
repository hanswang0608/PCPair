const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const GPUSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    price: {
        type: Number
    },
    img: {
        type: String,
    },
    company: {
        type: String,
    },
    online: {
        type: Boolean,
        required: true
    },
    instore: {
        type: Boolean,
        required: true
    },
    variants: [{
        name: {type: String, required: true},
        price: Number,
        img: String,
        company: String,
        online: Boolean,
        instore: Boolean,
        ccLink: String
    }],
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
    score: {
        type: Number
    }, scoreHistory: [{
        score: Number, date: Date
    }],
    rank: {
        type: Number
    },
    ccLink: {
        type: String
    },
    percentage: {
        type: Number
    },
    maxPercentage: {
        type: Number
    }
}, {collation: {locale: 'en', strength: 2}});

module.exports = GPU = mongoose.model('GPU', GPUSchema);