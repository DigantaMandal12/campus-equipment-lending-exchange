let mongoose;
try {
  mongoose = require('mongoose');
} catch (e) {
  mongoose = null;
}

if (!mongoose) {
  module.exports = {
    deleteMany: async () => ({}),
    create: async (data) => data,
    findOne: async () => null,
    deleteOne: async () => ({})
  };
} else {
  const otpSchema = new mongoose.Schema({
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    otp: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 600, // Document automatically deletes after 10 minutes
    }
  });

  module.exports = mongoose.model('Otp', otpSchema);
}
