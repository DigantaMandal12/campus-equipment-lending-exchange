let mongoose;
try {
  mongoose = require('mongoose');
} catch (e) {
  mongoose = null;
}
let bcrypt;
try {
  bcrypt = require('bcryptjs');
} catch (e) {
  bcrypt = {
    genSalt: async () => 'mock-salt',
    hash: async (pass) => pass,
    compare: async (p1, p2) => p1 === p2,
  };
}

if (!mongoose) {
  const dummyChain = {
    select: () => dummyChain,
    limit: () => dummyChain,
    lean: async () => null,
  };

  module.exports = {
    findOne: () => dummyChain,
    findById: () => dummyChain,
    findByIdAndUpdate: () => dummyChain,
    create: async (data) => data,
  };
} else {
  const userSchema = new mongoose.Schema({
    name: {
      type: String,
      required: [true, 'Please provide your full name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide your campus email'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function () {
        // Password is only required for local accounts without social OAuth IDs
        return !this.googleId && !this.facebookId;
      },
      minlength: 6,
    },
    googleId: {
      type: String,
      default: null,
      sparse: true,
    },
    facebookId: {
      type: String,
      default: null,
      sparse: true,
    },
    provider: {
      type: String,
      enum: ['local', 'google', 'facebook'],
      default: 'local',
    },
    profileImage: {
      type: String,
      default: '',
    },
    college: {
      type: String,
      default: 'Apex Institute of Technology',
      trim: true,
    },
    year: {
      type: String,
      default: '1st Year',
      trim: true,
    },
    role: {
      type: String,
      enum: ['student', 'teacher', 'admin'],
      default: 'student',
    },
    department: {
      type: String,
      default: 'Computer Science',
      trim: true,
    },
    studentId: {
      type: String,
      default: '',
      trim: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    upiId: {
      type: String,
      default: '',
      trim: true,
    },
    trustScore: {
      type: Number,
      default: 5.0,
      min: 0,
      max: 5,
    },
    successfulBorrows: {
      type: Number,
      default: 0,
    },
    onTimeReturns: {
      type: Number,
      default: 0,
    },
    lateReturns: {
      type: Number,
      default: 0,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    }
  });

  // Password hash middleware
  userSchema.pre('save', async function (next) {
    if (!this.password || !this.isModified('password')) return next();
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
      next();
    } catch (err) {
      next(err);
    }
  });

  // Password match / compare methods
  userSchema.methods.comparePassword = async function (enteredPassword) {
    if (!this.password) return false;
    return await bcrypt.compare(enteredPassword, this.password);
  };

  userSchema.methods.matchPassword = async function (enteredPassword) {
    if (!this.password) return false;
    return await bcrypt.compare(enteredPassword, this.password);
  };

  module.exports = mongoose.model('User', userSchema);
}
