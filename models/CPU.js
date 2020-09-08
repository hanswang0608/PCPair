const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CPUSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        // validate: {
        //     validator: async (name) => {
        //         let re = new RegExp(`${name}`, 'i');
        //         const doc = await CPU.findOne({name: re});
        //         if (doc) {
        //             console.log(`${name} is repeated in validation`);
        //             return false;
        //         }
        //         else return true;
        //     }
        // }
    },
    price: {
        type: Number,
        required: true
    },
    img: {
        type: String,
        required: true
    },
    company: {
        type: String,
        required: true
    },
    online: {
        type: Boolean,
        required: true
    },
    instore: {
        type: Boolean,
        required: true
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
    score: {
        type: Number
    },
    scoreHistory: [{
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
    }
}, {collation: {locale: 'en', strength: 2}});

module.exports = CPU = mongoose.model('CPU', CPUSchema);