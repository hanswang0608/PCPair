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
    },
    rank: {
        type: Number
    },
    ccLink: {
        type: String
    }
}, {collation: {locale: 'en', strength: 2}});

module.exports = GPU = mongoose.model('GPU', GPUSchema);