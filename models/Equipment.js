let mongoose;
try {
  mongoose = require('mongoose');
} catch (e) {
  mongoose = null;
}

if (!mongoose) {
  const dummyChain = {
    select: () => dummyChain,
    limit: () => dummyChain,
    lean: async () => []
  };

  module.exports = {
    find: () => dummyChain,
    findOne: () => dummyChain,
    findById: () => dummyChain
  };
} else {
  const equipmentSchema = new mongoose.Schema({
    title: {
      type: String,
      required: [true, 'Please provide an equipment name'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please provide a description'],
      trim: true,
    },
    category: {
      type: String,
      enum: [
        'Lab Equipment',
        'Electronics',
        'Calculators',
        'Laptops & Tablets',
        'Audio/Visual',
        'Books & Manuals',
        'Mechanical & Tools',
        'Other'
      ],
      default: 'Electronics',
    },
    department: {
      type: String,
      default: 'General',
      trim: true,
    },
    condition: {
      type: String,
      enum: ['Brand New', 'Like New', 'Good', 'Fair'],
      default: 'Good',
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'UNAVAILABLE', 'DRAFT', 'BORROWED'],
      default: 'AVAILABLE',
    },
    depositAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    dailyFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    imageUrl: {
      type: String,
      default: '',
    },
    serialNumber: {
      type: String,
      default: '',
      trim: true,
    },
    location: {
      type: String,
      default: 'Campus Library / Lab',
      trim: true,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingsCount: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    }
  });

  // Virtual for name to support name/title equivalence
  equipmentSchema.virtual('name').get(function () {
    return this.title;
  });

  equipmentSchema.set('toJSON', { virtuals: true });
  equipmentSchema.set('toObject', { virtuals: true });

  module.exports = mongoose.model('Equipment', equipmentSchema);
}
