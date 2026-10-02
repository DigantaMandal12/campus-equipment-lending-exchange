const mongoose = require('mongoose');

const borrowRequestSchema = new mongoose.Schema({
  equipment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Equipment',
    required: true,
  },
  borrower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  lender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  orderNumber: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
  },
  startDate: {
    type: Date,
    required: [true, 'Please select a start date'],
  },
  endDate: {
    type: Date,
    required: [true, 'Please select an expected return date'],
  },
  purpose: {
    type: String,
    default: 'Academic course project / lab research',
    trim: true,
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'PREPARING', 'READY_FOR_PICKUP', 'BORROWED', 'COMPLETED', 'RETURNED', 'REJECTED', 'CANCELLED'],
    default: 'PENDING',
  },
  depositAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  paymentStatus: {
    type: String,
    enum: ['UNPAID', 'PENDING_VERIFICATION', 'PAID', 'REFUNDED', 'WAIVED'],
    default: 'WAIVED',
  },
  paymentDetails: {
    paymentMethod: {
      type: String,
      default: 'UPI'
    },
    upiId: {
      type: String,
      default: '',
      trim: true
    },
    payeeUpiId: {
      type: String,
      default: 'campus.equipment@icici',
      trim: true
    },
    transactionId: {
      type: String,
      default: '',
      trim: true
    },
    paymentApp: {
      type: String,
      default: 'UPI',
      trim: true
    },
    receiptNumber: {
      type: String,
      default: '',
      trim: true
    },
    paidAt: {
      type: Date
    },
    amount: {
      type: Number,
      default: 0
    }
  },
  refundDetails: {
    refundMethod: {
      type: String,
      default: 'UPI'
    },
    refundTxnId: {
      type: String,
      default: '',
      trim: true
    },
    refundUpiId: {
      type: String,
      default: '',
      trim: true
    },
    refundedAt: {
      type: Date
    },
    refundAmount: {
      type: Number,
      default: 0
    }
  },
  // College Pickup & Handover Fields
  pickupLocation: {
    type: String,
    default: 'Electrical Lab - Room 304 (Engineering Building)',
    trim: true,
  },
  pickupDate: {
    type: Date,
  },
  pickupTime: {
    type: String,
    default: '2:00 PM – 2:30 PM',
    trim: true,
  },
  pickupSlotId: {
    type: String,
    default: 'slot-1400-1430',
    trim: true,
  },
  handoverStatus: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'HANDED_OVER', 'COMPLETED', 'CANCELLED'],
    default: 'PENDING',
  },
  readyForPickupAt: {
    type: Date,
  },
  handoverAt: {
    type: Date,
  },
  handoverNotes: {
    type: String,
    default: '',
    trim: true,
  },
  collegeIdVerified: {
    type: Boolean,
    default: false,
  },
  verificationCode: {
    type: String,
    default: '',
    trim: true,
  },
  returnDate: {
    type: Date,
  },
  returnNotes: {
    type: String,
    default: '',
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

// Auto-generate unique order number and verification code before save
borrowRequestSchema.pre('save', function (next) {
  if (!this.orderNumber) {
    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    this.orderNumber = `ORD-${randomDigits}`;
  }
  if (!this.verificationCode) {
    this.verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  next();
});

module.exports = mongoose.model('BorrowRequest', borrowRequestSchema);
