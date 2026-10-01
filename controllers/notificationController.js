const {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead
} = require(
  "../services/dueDateService"
);


function getCurrentUserId(
  req,
  res
) {

  const candidates = [

    req.currentUser,

    req.user,

    res.locals
      ? res.locals.currentUser
      : null,

    req.session
      ? req.session.userId
      : null,

    req.session
      ? req.session.userID
      : null,

    req.session
      ? req.session.user_id
      : null,

    req.session
      ? req.session.user
      : null

  ];


  for (
    const candidate
    of candidates
  ) {

    if (!candidate) {
      continue;
    }


    if (
      typeof candidate ===
      "string" &&
      candidate.trim() !== ""
    ) {

      return candidate;

    }


    if (
      candidate._id
    ) {

      return candidate._id;

    }


    if (
      candidate.id
    ) {

      return candidate.id;

    }

  }


  throw new Error(
    "Authenticated user ID is unavailable."
  );
}


/*
 * GET /notifications
 */
async function renderNotifications(
  req,
  res,
  next
) {

  try {

    const userId =
      getCurrentUserId(
        req,
        res
      );


    const notifications =
      await getNotifications(
        userId
      );


    res.render(
      "borrow/notifications",
      {
        title:
          "Notifications",

        notifications,

        unreadCount:
          notifications.filter(
            notification =>
              !notification.read
          ).length,

        success:
          req.query.success || "",

        error:
          req.query.error || ""
      }
    );

  } catch (error) {

    next(error);

  }
}


/*
 * POST /notifications/:id/read
 */
async function markRead(
  req,
  res
) {

  try {

    const userId =
      getCurrentUserId(
        req,
        res
      );


    await markNotificationRead(
      userId,
      req.params.id
    );


    res.redirect(
      "/notifications"
    );

  } catch (error) {

    res.redirect(
      "/notifications?error=" +
      encodeURIComponent(
        error.message ||
        "Unable to update notification."
      )
    );

  }
}


/*
 * POST /notifications/read-all
 */
async function markAllRead(
  req,
  res
) {

  try {

    const userId =
      getCurrentUserId(
        req,
        res
      );


    await markAllNotificationsRead(
      userId
    );


    res.redirect(
      "/notifications"
    );

  } catch (error) {

    res.redirect(
      "/notifications?error=" +
      encodeURIComponent(
        error.message ||
        "Unable to update notifications."
      )
    );

  }
}


module.exports = {
  renderNotifications,
  markRead,
  markAllRead
};