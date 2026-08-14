const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  buyerTag: { type: String, default: 'Unlinked Buyer' },
  buyerId: { type: String, default: 'N/A' },
  items: [
    {
      title: String,
      price: Number,
      cycle: String,
      quantity: Number,
    }
  ],
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['PENDING', 'VERIFIED', 'DELIVERED', 'REJECTED'], default: 'PENDING' },
  notes: { type: String, default: '' },
  verifiedBy: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
