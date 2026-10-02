"use strict";

const mongoose = require("mongoose");

const chatbotLogSchema =
  new mongoose.Schema(
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
        index: true
      },

      question: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
      },

      detectedIntent: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
      },

      recommendedEquipment: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Equipment"
        }
      ],

      response: {
        type: String,
        required: true,
        maxlength: 3000
      }
    },
    {
      timestamps: true
    }
  );

chatbotLogSchema.index({
  user: 1,
  createdAt: -1
});

chatbotLogSchema.index({
  detectedIntent: 1,
  createdAt: -1
});

module.exports =
  mongoose.models.ChatbotLog ||
  mongoose.model(
    "ChatbotLog",
    chatbotLogSchema
  );