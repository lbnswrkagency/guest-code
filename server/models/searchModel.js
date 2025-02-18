const mongoose = require("mongoose");

const searchHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  query: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["all", "users", "events", "brands"],
    default: "all",
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Index for better search performance
searchHistorySchema.index({ userId: 1, timestamp: -1 });
searchHistorySchema.index({ query: "text" });

const SearchHistory = mongoose.model("SearchHistory", searchHistorySchema);

module.exports = SearchHistory;
