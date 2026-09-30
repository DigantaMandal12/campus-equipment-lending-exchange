function showHome(req, res) {
  res.render("home", {
    title: "Campus Exchange",
    currentPhase: "Phase 1 — Project Setup & Architecture"
  });
}

module.exports = {
  showHome
};