const express = require('express');
const Pair = require('../../models/Pair');

const router = express.Router();

// GET All Scoress
// router.get('/', (req, res) => {
//     Pair.find()
//         .then(data => res.json(data))
//         .catch(err => res.status(500).json({success: false, message: 'Get request failed'}));
// });

// GET One Pair
// router.get('/:id', (req, res) => {
//     Pair.findById(req.params.id) 
//         .then(data => res.json(data))
//         .catch(() => {
//             console.log('first catch');
//             Pair.findOne({name: req.params.id})
//                 .then(data => {res.json(data); console.log('second then')})
//                 .catch(err => {res.status(404).json({success:false, message: 'Item Not Found'}); console.log('second catch')});
//         });
// });

// router.get('/:id', async (req, res) => {
//     try {
//         const data = await Pair.findById(req.params.id);
//         if (data === null) {
//             throw new Error();
//         }
//         res.json(data);
//     } catch (e) {
//         try {
//             const data = await Pair.findOne({name: req.params.id});
//             if (data === null) throw new Error();
//             res.json(data);
//         } catch (e) {
//             res.status(404).json({success: false, message: 'Item not found'});
//         }
//     }
// });

router.get('/', (req, res) => {
    if (req.query.cpu && req.query.gpu) {
        Pair.findOne({cpu: req.query.cpu, gpu: req.query.gpu})
            .then(async data => {
                if (data === null) return res.status(404).json({success: false, message: 'Item not found'});
                data._doc.total = (await Pair.find().sort({rank: -1}).limit(1))[0].rank;
                res.json(data);
            })
            .catch(err => res.status(500).json({success: false, message: 'Get request failed'}));
    } else if (req.query.cpu) {
        Pair.find({cpu: req.query.cpu})
            .then(data => {
                if (data === null) return res.status(404).json({success: false, message: 'Item not found'});
                res.json(data);
            });
    } else if (req.query.gpu) {
        Pair.find({gpu: req.query.gpu})
            .then(data => {
                if (data === null) return res.status(404).json({success: false, message: 'Item not found'});
                res.json(data);
            });
    } else {
        Pair.find()
            .then(data => {
                if (data === null) return res.status(404).json({success: false, message: 'Item not found'});
                res.json(data);
            })
            .catch(err => res.status(500).json({success: false, message: 'Get request failed'}));
    }
});

// CREATE a Pair
router.post('/', (req, res) => {
    if (req.header('Content-Type') !== 'application/json') {
        return res.status(406).json({success: false, message: 'Header content-type must be application/json'});
    }
    const newPair = new Pair(req.body);
    newPair.save()
        .then(data => res.json(data))
        .catch(err => res.status(409).json({success: false, message: 'Post failed'}));
});

// UPDATE a Pair
// router.put('/:id', (req, res) => {
//     if (req.header('Content-Type') !== 'application/json') {
//         return res.status(406).json({ success: false, message: 'Unacceptable Header Type' });
//     }
//     Pair.findById(req.params.id)
//         .then(data => data.updateOne(req.body)
//             .then(() => res.json({ success: true, message: 'Update Successful' }))
//             .catch((err) => res.json({ success: false, message: 'Update Failed' })))
//         .catch(() => {
//             Pair.findOne({ name: req.params.id })
//                 .then(data => data.updateOne(req.body).then(() => res.json({ success: true, message: 'Update Successful' })).catch((err => res.json({ success: false, message: 'Update Failed' }))))
//                 .catch((err) => res.status(404).json({ success: false, message: 'Item Not Found' }))
//         });
// });

router.put('/:id', async (req, res) => {
    if (req.header('Content-Type') !== 'application/json') {
        return res.status(406).json({success: false, message: 'Header content-type must be application/json'});
    }
    try {
        const data = await Pair.findById(req.params.id);
        if (data === null) {
            throw new Error();
        }
        try {
            await data.updateOne(req.body);
            res.json({success: true, message: 'Update successful'});
        } catch (e) {res.status(409).json({success: false, message: 'Duplicate index'});};
    } catch (e) {
        try {
            const data = await Pair.findOne({name: req.params.id});
            if (data === null) {
                throw new Error();
            }
            try {
                await data.updateOne(req.body);
                res.json({success: true, message: 'Update successful'});
            } catch (e) {res.status(409).json({success: false, message: 'Duplicate index'});}
        } catch (e) {
            res.status(404).json({success: false, message: 'Item not found'});
        }
    }
});

// DELETE a Pair
// Update to async/await
// router.delete('/:id', (req, res) => {
//     Pair.findById(req.params.id)
//         .then(data => data.remove()
//             .then(() => res.json({ success: true, message: 'Delete Successful' }))
//             .catch((err) => res.status(400).json({ success: false, message: 'Delete Failed' })))
//         .catch(() => {
//             Pair.findOne({ name: req.params.id })
//                 .then(data => data.remove()
//                     .then(() => res.json({ success: true, message: 'Delete Successful' }))
//                     .catch((err => res.status(400).json({ success: false, message: 'Delete Failed' }))))
//                 .catch((err) => res.status(404).json({ success: false, message: 'Item Not Found' }))
//         });
// });

router.delete('/:id', async (req, res) => {
    try {
        const data = await Pair.findById(req.params.id);
        if (data === null) {
            throw new Error();
        }
        try {
            await data.remove();
            res.json({success: true, message: 'Delete successful'});
        } catch (e) {res.status(400).json({success: false, message: 'Delete failed'});};
    } catch (e) {
        try {
            const data = await Pair.findOne({name: req.params.id});
            if (data === null) {
                throw new Error();
            }
            try {
                await data.remove();
                res.json({success: true, message: 'Delete successful'});
            } catch (e) {res.status(400).json({success: false, message: 'Delete failed'});}
        } catch (e) {
            res.status(404).json({success: false, message: 'Item not found'});
        }
    }
});


module.exports = router;