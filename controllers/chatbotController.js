"use strict";

const {
  askHardwareAssistant
} = require("../services/chatbotService");

async function page(
  req,
  res
) {

  res.render(
    "chatbot/index",
    {
      title:
        "AI Hardware Assistant"
    }
  );
}

async function ask(
  req,
  res
) {

  try {

    const message =
      req.body?.message;

    const userId =
      req.currentUser?._id ||
      req.user?._id ||
      req.session?.userId ||
      null;

    const result =
      await askHardwareAssistant({
        message,
        userId
      });

    return res.json(
      result
    );

  } catch (
    error
  ) {

    console.error(
      "Chatbot request failed:",
      error
    );

    const statusCode =
      Number(
        error.statusCode
      ) || 500;

    return res
      .status(statusCode)
      .json({
        success: false,

        message:
          statusCode >= 500
            ? "The hardware assistant is temporarily unavailable."
            : error.message
      });
  }
}

module.exports = {
  page,
  ask
};