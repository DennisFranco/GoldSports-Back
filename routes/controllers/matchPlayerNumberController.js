const { getDB } = require("../../config/db");

// Obtener todos los números de jugadores en partido
const getAllMatchPlayersNumbers = async (req, res) => {
  try {
    const db = getDB();
    const matchPlayersNumbers = await db
      .collection("match_players_numbers")
      .find()
      .toArray();

    if (matchPlayersNumbers) {
      res.status(200).send({
        code: 200,
        message: "Match players numbers successfully obtained",
        data: matchPlayersNumbers,
      });
    } else {
      return res
        .status(500)
        .send("Error fetching match players numbers from database");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Obtener un número de jugador en partido por ID
const getMatchPlayerNumberByID = async (req, res) => {
  try {
    const db = getDB();
    const matchPlayerNumber = await db
      .collection("match_players_numbers")
      .findOne({ id: parseInt(req.params.id) });

    if (matchPlayerNumber) {
      res.status(200).send({
        code: 200,
        message: "Match player number successfully obtained",
        data: matchPlayerNumber,
      });
    } else {
      res.status(404).send("Match player number not found");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Crear nuevos números de jugadores en partido
const createMatchPlayerNumbers = async (req, res) => {
  try {
    const db = getDB();
    const matchPlayersNumbers = await db
      .collection("match_players_numbers")
      .find()
      .toArray();

    const newEntries = Object.entries(req.body).map(
      ([id_player, number], index) => ({
        id: matchPlayersNumbers.length + index + 1,
        id_match: parseInt(req.params.idMatch),
        id_player: parseInt(id_player),
        number: number,
      })
    );

    await db.collection("match_players_numbers").insertMany(newEntries);

    res.status(200).send({
      code: 200,
      message: "Match player numbers successfully created",
      data: newEntries,
    });
  } catch (err) {
    res.status(500).send("Server error");
  }
};

module.exports = {
  getAllMatchPlayersNumbers,
  getMatchPlayerNumberByID,
  createMatchPlayerNumbers,
};
