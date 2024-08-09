const BattleSign = require("../models/battleSignModel");

const addBattleSign = async (req, res) => {
  const { name, phone, email, message, categories } = req.body;

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

module.exports = {
  addBattleSign,
  fetchBattleSigns,
};
