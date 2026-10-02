(function () {

  "use strict";


  function formatDuration(
    milliseconds
  ) {

    const totalSeconds =
      Math.max(
        0,
        Math.floor(
          milliseconds / 1000
        )
      );


    const days =
      Math.floor(
        totalSeconds /
        86400
      );


    const hours =
      Math.floor(
        (totalSeconds % 86400) /
        3600
      );


    const minutes =
      Math.floor(
        (totalSeconds % 3600) /
        60
      );


    const seconds =
      totalSeconds % 60;


    return {
      days,
      hours,
      minutes,
      seconds
    };

  }


  function renderCountdown(
    element
  ) {

    const dueDateValue =
      element.dataset.dueDate;


    const dueDate =
      new Date(
        dueDateValue
      );


    if (
      Number.isNaN(
        dueDate.getTime()
      )
    ) {

      element.textContent =
        "Invalid due date";

      return;

    }


    const now =
      new Date();


    const difference =
      dueDate.getTime() -
      now.getTime();


    const value =
      element.querySelector(
        ".due-countdown-value"
      );


    const label =
      element.querySelector(
        ".due-countdown-label"
      );


    if (
      !value
    ) {
      return;
    }


    if (
      difference <= 0
    ) {

      const overdue =
        Math.abs(
          difference
        );


      const duration =
        formatDuration(
          overdue
        );


      value.textContent =
        `${duration.days}d ${duration.hours}h ${duration.minutes}m ${duration.seconds}s`;


      label.textContent =
        "Overdue by";


      element.classList.add(
        "due-countdown-overdue"
      );

      element.classList.remove(
        "due-countdown-warning"
      );

      return;
    }


    const duration =
      formatDuration(
        difference
      );


    value.textContent =
      `${duration.days}d ${duration.hours}h ${duration.minutes}m ${duration.seconds}s`;


    label.textContent =
      "Time remaining";


    if (
      difference <=
      48 * 60 * 60 * 1000
    ) {

      element.classList.add(
        "due-countdown-warning"
      );

    } else {

      element.classList.remove(
        "due-countdown-warning"
      );

    }

  }


  function init() {

    const elements =
      document.querySelectorAll(
        ".due-countdown[data-due-date]"
      );


    if (
      elements.length === 0
    ) {
      return;
    }


    elements.forEach(
      renderCountdown
    );


    setInterval(
      function () {

        elements.forEach(
          renderCountdown
        );

      },
      1000
    );

  }


  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      init
    );

  } else {

    init();

  }

})();