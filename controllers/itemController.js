import Item from '../models/Item.js';

exports.createItem = async (req, res) => {
  const userId = req.user._id; // assume you got this from auth middleware
  const newItem = new Item({
    title: req.body.title,
    description: req.body.description,
    created_by: userId,
    status: 'live'
  });

  await newItem.save();
  res.status(201).json({ message: 'Item created successfully', item: newItem });
};



// itemController.js
exports.getItem = async (req, res) => {
  const itemId = req.params.id;
  const item = await Item.findById(itemId).populate('created_by', 'name role');

  if (!item) return res.status(404).json({ message: 'Item not found' });

  res.json({
    title: item.title,
    description: item.description,
    createdBy: `${item.created_by.role} ${item.created_by.name}`,
    status: item.status
  });
};