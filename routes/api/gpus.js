const express = require('express');
const GPU = require('../../models/GPU');

const router = express.Router();

// GET All GPUs
// router.get('/', (req, res) => {
//     GPU.find()
//         .then(data => res.json(data))
//         .catch(err => res.status(500).json({success: false, message: 'Get request failed'}));
// });

// GET One GPU
// router.get('/:id', (req, res) => {
//     GPU.findById(req.params.id) 
//         .then(data => res.json(data))
//         .catch(() => {
//             console.log('first catch');
//             GPU.findOne({name: req.params.id})
//                 .then(data => {res.json(data); console.log('second then')})
//                 .catch(err => {res.status(404).json({success:false, message: 'Item Not Found'}); console.log('second catch')});
//         });
// });

// router.get('/:id', async (req, res) => {
//     try {
//         const data = await GPU.findById(req.params.id);
//         if (data === null) {
//             throw new Error();
//         }
//         res.json(data);
//     } catch (e) {
//         try {
//             const data = await GPU.findOne({name: req.params.id});
//             if (data === null) throw new Error();
//             res.json(data);
//         } catch (e) {
//             res.status(404).json({success: false, message: 'Item not found'});
//         }
//     }
// });

router.get('/', (req, res) => {
    if (Object.keys(req.query).length !== 0) {
        GPU.findOne({name: req.query.name})
            .then(async data => {
                if (data === null) return res.status(404).json({success: false, message: 'Item not found'});
                data._doc.total = await GPU.countDocuments();
                res.json(data);
            })
            .catch(err => res.status(500).json({success: false, message: 'Get request failed'}));
    } else {
        GPU.find()
            .then(data => {
                if (data === null) return res.status(404).json({success: false, message: 'Item not found'});
                res.json(data);
            })
            .catch(err => res.status(500).json({success: false, message: 'Get request failed'}));
    }
});

// CREATE a GPU
router.post('/', (req, res) => {
    if (req.header('Content-Type') !== 'application/json') {
        return res.status(406).json({success: false, message: 'Header content-type must be application/json'});
    }
    const newGPU = new GPU(req.body);
    newGPU.save()
        .then(data => res.json(data))
        .catch(err => res.status(409).json({success: false, message: 'Post failed'}));
});

// UPDATE a GPU
// router.put('/:id', (req, res) => {
//     if (req.header('Content-Type') !== 'application/json') {
//         return res.status(406).json({ success: false, message: 'Unacceptable Header Type' });
//     }
//     GPU.findById(req.params.id)
//         .then(data => data.updateOne(req.body)
//             .then(() => res.json({ success: true, message: 'Update Successful' }))
//             .catch((err) => res.json({ success: false, message: 'Update Failed' })))
//         .catch(() => {
//             GPU.findOne({ name: req.params.id })
//                 .then(data => data.updateOne(req.body).then(() => res.json({ success: true, message: 'Update Successful' })).catch((err => res.json({ success: false, message: 'Update Failed' }))))
//                 .catch((err) => res.status(404).json({ success: false, message: 'Item Not Found' }))
//         });
// });

router.put('/:id', async (req, res) => {
    if (req.header('Content-Type') !== 'application/json') {
        return res.status(406).json({success: false, message: 'Header content-type must be application/json'});
    }
    try {
        const data = await GPU.findById(req.params.id);
        if (data === null) {
            throw new Error();
        }
        try {
            await data.updateOne(req.body);
            res.json({success: true, message: 'Update successful'});
        } catch (e) {res.status(409).json({success: false, message: 'Duplicate index'});};
    } catch (e) {
        try {
            const data = await GPU.findOne({name: req.params.id});
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

// DELETE a GPU
// Update to async/await
// router.delete('/:id', (req, res) => {
//     GPU.findById(req.params.id)
//         .then(data => data.remove()
//             .then(() => res.json({ success: true, message: 'Delete Successful' }))
//             .catch((err) => res.status(400).json({ success: false, message: 'Delete Failed' })))
//         .catch(() => {
//             GPU.findOne({ name: req.params.id })
//                 .then(data => data.remove()
//                     .then(() => res.json({ success: true, message: 'Delete Successful' }))
//                     .catch((err => res.status(400).json({ success: false, message: 'Delete Failed' }))))
//                 .catch((err) => res.status(404).json({ success: false, message: 'Item Not Found' }))
//         });
// });

router.delete('/:id', async (req, res) => {
    try {
        const data = await GPU.findById(req.params.id);
        if (data === null) {
            throw new Error();
        }
        try {
            await data.remove();
            res.json({success: true, message: 'Delete successful'});
        } catch (e) {res.status(400).json({success: false, message: 'Delete failed'});};
    } catch (e) {
        try {
            const data = await GPU.findOne({name: req.params.id});
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