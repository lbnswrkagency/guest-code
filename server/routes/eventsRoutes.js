const express = require("express");
const router = express.Router();
const eventsController = require("../controllers/eventsController");
const auth = require("../middleware/auth");

// Logging middleware for event routes
const eventRouteLogger = (req, res, next) => {
  console.log("[Event Route]", {
    method: req.method,
    path: req.path,
    params: req.params,
    query: req.query,
    userId: req.user?._id,
  });
  next();
};

router.use(eventRouteLogger);

// Event routes
router.post("/brand/:brandId", auth, eventsController.createEvent);
// ... rest of the routes ...

module.exports = router;
