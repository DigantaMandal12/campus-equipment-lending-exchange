const mongoose = require("mongoose");
const nodemailer = require("nodemailer");

const connectDB =
  require("../config/db");

const Transaction =
  require("../models/Transaction");

const Notification =
  require("../models/Notification");

const User =
  require("../models/User");


const ACTIVE = "ACTIVE";
const OVERDUE = "OVERDUE";

const DUE_SOON =
  "DUE_SOON";

const HOURS_48 =
  48 * 60 * 60 * 1000;


/*
 * ==================================================
 * DUE DATE STATE
 * ==================================================
 */

function getDueDateState(
  requestedReturnDate,
  now = new Date()
) {

  const dueDate =
    new Date(
      requestedReturnDate
    );

  const currentDate =
    new Date(now);

  const millisecondsRemaining =
    dueDate.getTime() -
    currentDate.getTime();


  const isOverdue =
    millisecondsRemaining < 0;


  const isDueSoon =
    millisecondsRemaining >= 0 &&
    millisecondsRemaining <= HOURS_48;


  return {
    dueDate,

    millisecondsRemaining,

    isOverdue,

    isDueSoon,

    totalHoursRemaining:
      Math.max(
        0,
        millisecondsRemaining /
          (60 * 60 * 1000)
      )
  };
}


/*
 * ==================================================
 * OPTIONAL EMAIL
 * ==================================================
 */

function getTransporter() {

  const host =
    process.env.SMTP_HOST;

  const port =
    Number(
      process.env.SMTP_PORT || 587
    );

  const user =
    process.env.SMTP_USER;

  const pass =
    process.env.SMTP_PASS;


  if (
    !host ||
    !user ||
    !pass
  ) {
    return null;
  }


  return nodemailer.createTransport(
    {
      host,

      port,

      secure:
        String(
          process.env.SMTP_SECURE || "false"
        ).toLowerCase() ===
        "true",

      auth: {
        user,
        pass
      }
    }
  );
}


/*
 * ==================================================
 * OPTIONAL DUE EMAIL
 * ==================================================
 */

async function sendDueSoonEmail(
  user,
  transaction
) {

  const enabled =
    String(
      process.env.NOTIFICATION_EMAIL_ENABLED ||
      "false"
    ).toLowerCase() ===
    "true";


  if (!enabled) {
    return;
  }


  if (
    !user ||
    !user.email
  ) {
    return;
  }


  const transporter =
    getTransporter();


  if (!transporter) {
    return;
  }


  const equipmentName =
    transaction.equipment &&
    transaction.equipment.name
      ? transaction.equipment.name
      : "borrowed equipment";


  const dueDate =
    new Date(
      transaction.requestedReturnDate
    ).toLocaleString(
      "en-IN"
    );


  const from =
    process.env.EMAIL_FROM ||
    process.env.SMTP_USER;


  await transporter.sendMail(
    {
      from,

      to: user.email,

      subject:
        `Campus Exchange: ${equipmentName} is due within 48 hours`,

      text:
        [
          `Hello ${user.name || "Borrower"},`,

          "",

          `Your borrowed equipment "${equipmentName}" is due within 48 hours.`,

          `Expected return: ${dueDate}`,

          "",

          "Please return the equipment on time to avoid late penalties.",

          "",

          "Campus Exchange"
        ].join("\n")
    }
  );
}


/*
 * ==================================================
 * MARK OVERDUE TRANSACTIONS
 * ==================================================
 */

async function markOverdueTransactions() {

  await connectDB();


  const now =
    new Date();


  const result =
    await Transaction.updateMany(
      {
        status: ACTIVE,

        requestedReturnDate: {
          $lt: now
        }
      },
      {
        $set: {
          status: OVERDUE
        }
      }
    );


  return {
    matched:
      result.matchedCount || 0,

    modified:
      result.modifiedCount || 0
  };
}


/*
 * ==================================================
 * CREATE DUE SOON NOTIFICATIONS
 * ==================================================
 */

async function createDueSoonNotifications() {

  await connectDB();


  const now =
    new Date();


  const reminderLimit =
    new Date(
      now.getTime() +
      HOURS_48
    );


  const transactions =
    await Transaction.find(
      {
        status: ACTIVE,

        requestedReturnDate: {
          $gte: now,
          $lte: reminderLimit
        }
      }
    )
      .populate(
        "borrower",
        "name email"
      )
      .populate(
        "equipment",
        "name"
      )
      .lean();


  let created = 0;
  let skipped = 0;
  let emailed = 0;


  for (
    const transaction
    of transactions
  ) {

    try {

      const notification =
        await Notification.create(
          {
            user:
              transaction.borrower._id,

            title:
              "Equipment due within 48 hours",

            message:
              `Your borrowed equipment "${transaction.equipment?.name || "equipment"}" is due on ${new Date(transaction.requestedReturnDate).toLocaleString("en-IN")}. Please return it on time.`,

            type:
              DUE_SOON,

            relatedTransaction:
              transaction._id
          }
        );


      if (notification) {
        created++;
      }


      try {

        await sendDueSoonEmail(
          transaction.borrower,
          transaction
        );

        if (
          String(
            process.env.NOTIFICATION_EMAIL_ENABLED ||
            "false"
          ).toLowerCase() ===
          "true"
        ) {
          emailed++;
        }

      } catch (emailError) {

        console.error(
          "Due reminder email failed:",
          emailError.message
        );

      }


    } catch (error) {

      /*
       * Duplicate-key means the reminder already
       * exists. This is expected during hourly runs.
       */
      if (
        error &&
        error.code === 11000
      ) {

        skipped++;

        continue;
      }


      throw error;

    }

  }


  return {
    matched:
      transactions.length,

    created,

    skipped,

    emailed
  };
}


/*
 * ==================================================
 * FULL REMINDER RUN
 * ==================================================
 */

async function runDueDateReminderJob() {

  await connectDB();


  const overdue =
    await markOverdueTransactions();


  const reminders =
    await createDueSoonNotifications();


  return {
    overdue,

    reminders,

    executedAt:
      new Date()
  };
}


/*
 * ==================================================
 * BORROWER NOTIFICATIONS
 * ==================================================
 */

async function getNotifications(
  userId
) {

  await connectDB();


  if (
    !mongoose.Types.ObjectId.isValid(
      userId
    )
  ) {

    const error =
      new Error(
        "Invalid user ID."
      );

    error.statusCode = 400;

    throw error;
  }


  return Notification.find(
    {
      user: userId
    }
  )
    .sort({
      createdAt: -1
    })
    .limit(50)
    .populate(
      "relatedTransaction",
      "status requestedReturnDate"
    )
    .lean();
}


/*
 * ==================================================
 * MARK ONE READ
 * ==================================================
 */

async function markNotificationRead(
  userId,
  notificationId
) {

  await connectDB();


  if (
    !mongoose.Types.ObjectId.isValid(
      notificationId
    )
  ) {

    const error =
      new Error(
        "Invalid notification ID."
      );

    error.statusCode = 400;

    throw error;
  }


  const notification =
    await Notification.findOneAndUpdate(
      {
        _id:
          notificationId,

        user:
          userId
      },
      {
        $set: {
          read: true
        }
      },
      {
        new: true
      }
    );


  if (!notification) {

    const error =
      new Error(
        "Notification not found."
      );

    error.statusCode = 404;

    throw error;
  }


  return notification;
}


/*
 * ==================================================
 * MARK ALL READ
 * ==================================================
 */

async function markAllNotificationsRead(
  userId
) {

  await connectDB();


  const result =
    await Notification.updateMany(
      {
        user: userId,
        read: false
      },
      {
        $set: {
          read: true
        }
      }
    );


  return {
    modified:
      result.modifiedCount || 0
  };
}


module.exports = {
  getDueDateState,
  markOverdueTransactions,
  createDueSoonNotifications,
  runDueDateReminderJob,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead
};