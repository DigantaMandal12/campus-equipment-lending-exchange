const {
  runDueDateReminderJob
} = require("../services/dueDateService");


/*
 * ==================================================
 * CHECK CRON AUTHORIZATION
 * ==================================================
 *
 * LOCAL:
 *   http://localhost:3000/reminders/due
 *   works without a CRON_SECRET.
 *
 * PRODUCTION:
 *   Requires:
 *
 *   Authorization: Bearer <CRON_SECRET>
 *
 * This prevents unauthorized users from manually
 * triggering the reminder job on production.
 */
function isAuthorizedCronRequest(req) {

  /*
   * Local development:
   * allow browser/manual testing.
   */
  if (
    process.env.NODE_ENV !== "production"
  ) {

    return true;

  }


  /*
   * Production must have a secret.
   */
  if (
    !process.env.CRON_SECRET
  ) {

    return false;

  }


  const authorization =
    req.get(
      "authorization"
    );


  if (
    !authorization
  ) {

    return false;

  }


  const expected =
    `Bearer ${process.env.CRON_SECRET}`;


  return authorization.trim() ===
    expected;

}


/*
 * ==================================================
 * RUN DUE-DATE REMINDER JOB
 * ==================================================
 *
 * GET /reminders/due
 *
 * Performs:
 *
 * 1. ACTIVE overdue detection
 * 2. 48-hour reminder creation
 * 3. Optional email reminder
 */
async function runReminderJob(
  req,
  res
) {

  try {

    /*
     * Only GET is supported for this endpoint.
     */
    if (
      req.method !== "GET"
    ) {

      return res
        .status(405)
        .json({
          success: false,
          message:
            "Method not allowed."
        });

    }


    /*
     * Production authentication.
     */
    if (
      !isAuthorizedCronRequest(req)
    ) {

      return res
        .status(401)
        .json({
          success: false,
          message:
            "Unauthorized reminder request."
        });

    }


    /*
     * Execute the actual business logic.
     */
    const result =
      await runDueDateReminderJob();


    /*
     * Successful response.
     */
    return res
      .status(200)
      .json({
        success: true,

        message:
          "Due-date reminder job completed.",

        result
      });

  } catch (error) {

    console.error(
      "Reminder job error:",
      error.message
    );


    return res
      .status(
        error.statusCode || 500
      )
      .json({
        success: false,

        message:
          error.message ||
          "Reminder job failed."
      });

  }

}


module.exports = {
  runReminderJob
};