const BattleSign = require("../models/battleSignModel");

const addBattleSign = async (req, res) => {
  const { name, phone, email, message, categories } = req.body;

  console.log("REQ BODY", req.body);

  try {
    const createdBattleSign = await BattleSign.create({
      name,
      phone,
      email,
      message,
      categories,
    });

    res.status(201).json(createdBattleSign);
  } catch (error) {
    console.log(error);
    res.status(400).send("Error adding battle sign: " + error.message);
  }
};

const fetchBattleSigns = async (req, res) => {
  try {
    const battleSigns = await BattleSign.find().sort({ createdAt: -1 });
    res.json(battleSigns);
  } catch (error) {
    res.status(500).send("Error fetching battle signs!");
  }
};

const updateBattleSignStatus = async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;

  try {
    let status;
    switch (action) {
      case "confirm":
        status = "confirmed";
        break;
      case "decline":
        status = "declined";
        break;
      case "reset":
        status = "pending";
        break;
      default:
        return res.status(400).send("Invalid action");
    }

    const updatedBattleSign = await BattleSign.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedBattleSign) {
      return res.status(404).send("Battle sign not found");
    }

    res.json(updatedBattleSign);
  } catch (error) {
    console.log(error);
    res.status(500).send("Error updating battle sign status: " + error.message);
  }
};

module.exports = {
  addBattleSign,
  fetchBattleSigns,
  updateBattleSignStatus,
};
