const express = require('express');
const CPU = require('../../models/CPU');

const router = express.Router();

// GET All CPUs
// router.get('/', (req, res) => {
//     CPU.find()
//         .then(data => res.json(data))
//         .catch(err => res.status(500).json({success: false, message: 'Get request failed'}));
// });

// GET One CPU
// router.get('/:id', (req, res) => {
//     CPU.findById(req.params.id) 
//         .then(data => res.json(data))
//         .catch(() => {
//             console.log('first catch');
//             CPU.findOne({name: req.params.id})
//                 .then(data => {res.json(data); console.log('second then')})
//                 .catch(err => {res.status(404).json({success:false, message: 'Item Not Found'}); console.log('second catch')});
//         });
// });

// router.get('/:id', async (req, res) => {
//     try {
//         const data = await CPU.findById(req.params.id);
//         if (data === null) {
//             throw new Error();
//         }
//         res.json(data);
//     } catch (e) {
//         try {
//             const data = await CPU.findOne({name: req.params.id});
//             if (data === null) throw new Error();
//             res.json(data);
//         } catch (e) {
//             res.status(404).json({success: false, message: 'Item not found'});
//         }
//     }
// });

router.get('/', (req, res) => {
    if (Object.keys(req.query).length !== 0) {
        CPU.findOne({name: req.query.name})
            .then(async data => {
                if (data === null) return res.status(404).json({success: false, message: 'Item not found'});
                data._doc.total = await CPU.countDocuments();
                res.json(data);
            })
            .catch(err => res.status(500).json({success: false, message: 'Get request failed'}));
    } else {
        CPU.find()
            .then(data => {
                if (data === null) return res.status(404).json({success: false, message: 'Item not found'});
                res.json(data);
            })
            .catch(err => res.status(500).json({success: false, message: 'Get request failed'}));
    }
});

// CREATE a CPU
router.post('/', (req, res) => {
    if (req.header('Content-Type') !== 'application/json') {
        return res.status(406).json({success: false, message: 'Header content-type must be application/json'});
    }
    const newGPU = new CPU(req.body);
    newGPU.save()
        .then(data => res.json(data))
        .catch(err => res.status(409).json({success: false, message: 'Post failed'}));
});

// UPDATE a CPU
// router.put('/:id', (req, res) => {
//     if (req.header('Content-Type') !== 'application/json') {
//         return res.status(406).json({ success: false, message: 'Unacceptable Header Type' });
//     }
//     CPU.findById(req.params.id)
//         .then(data => data.updateOne(req.body)
//             .then(() => res.json({ success: true, message: 'Update Successful' }))
//             .catch((err) => res.json({ success: false, message: 'Update Failed' })))
//         .catch(() => {
//             CPU.findOne({ name: req.params.id })
//                 .then(data => data.updateOne(req.body).then(() => res.json({ success: true, message: 'Update Successful' })).catch((err => res.json({ success: false, message: 'Update Failed' }))))
//                 .catch((err) => res.status(404).json({ success: false, message: 'Item Not Found' }))
//         });
// });

router.put('/:id', async (req, res) => {
    if (req.header('Content-Type') !== 'application/json') {
        return res.status(406).json({success: false, message: 'Header content-type must be application/json'});
    }
    try {
        const data = await CPU.findById(req.params.id);
        if (data === null) {
            throw new Error();
        }
        try {
            await data.updateOne(req.body);
            res.json({success: true, message: 'Update successful'});
        } catch (e) {res.status(409).json({success: false, message: 'Duplicate index'});};
    } catch (e) {
        try {
            const data = await CPU.findOne({name: req.params.id});
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

// DELETE a CPU
// Update to async/await
// router.delete('/:id', (req, res) => {
//     CPU.findById(req.params.id)
//         .then(data => data.remove()
//             .then(() => res.json({ success: true, message: 'Delete Successful' }))
//             .catch((err) => res.status(400).json({ success: false, message: 'Delete Failed' })))
//         .catch(() => {
//             CPU.findOne({ name: req.params.id })
//                 .then(data => data.remove()
//                     .then(() => res.json({ success: true, message: 'Delete Successful' }))
//                     .catch((err => res.status(400).json({ success: false, message: 'Delete Failed' }))))
//                 .catch((err) => res.status(404).json({ success: false, message: 'Item Not Found' }))
//         });
// });

router.delete('/:id', async (req, res) => {
    try {
        const data = await CPU.findById(req.params.id);
        if (data === null) {
            throw new Error();
        }
        try {
            await data.remove();
            res.json({success: true, message: 'Delete successful'});
        } catch (e) {res.status(400).json({success: false, message: 'Delete failed'});};
    } catch (e) {
        try {
            const data = await CPU.findOne({name: req.params.id});
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