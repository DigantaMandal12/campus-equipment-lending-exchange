document.addEventListener(
  "DOMContentLoaded",
  () => {
    const currentYear =
      new Date().getFullYear();

    document
      .querySelectorAll(
        "[data-current-year]"
      )
      .forEach((element) => {
        element.textContent =
          currentYear;
      });

    console.log(
      "Campus Exchange frontend initialized."
    );
  }
);

function confirmDeleteEquipment() {
  return window.confirm(
    "Are you sure you want to delete this equipment listing?"
  );
}