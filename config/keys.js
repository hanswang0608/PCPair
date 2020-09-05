if (process.env.NODE_ENV === 'production') {
    module.exports = process.env.MONGO_URI;
} else {
    module.exports = 'mongodb://localhost/hardware';
}