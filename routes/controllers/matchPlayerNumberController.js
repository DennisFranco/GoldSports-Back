const { ObjectId } = require("mongodb");
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
        message: "Números de jugadores en partido obtenidos exitosamente",
        data: matchPlayersNumbers,
      });
    } else {
      return res
        .status(500)
        .send("Error al leer los números de jugadores en partido");
    }
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Obtener un número de jugador en partido por ID
const getMatchPlayerNumberByID = async (req, res) => {
  try {
    const db = getDB();
    const matchPlayerNumber = await db
      .collection("match_players_numbers")
      .findOne({ _id:  new ObjectId(req.params.id) });

    if (matchPlayerNumber) {
      res.status(200).send({
        code: 200,
        message: "Número de jugador en partido obtenido exitosamente",
        data: matchPlayerNumber,
      });
    } else {
      res.status(404).send("Número de jugador en partido no encontrado");
    }
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Crear nuevos números de jugadores en partido
const createMatchPlayerNumbers = async (req, res) => {
  try {
    const db = getDB();
    const id_match = new ObjectId(req.params.idMatch);
    const newEntries = Object.entries(req.body).map(([id_player, number]) => ({
      id_match,
      id_player:  new ObjectId(id_player),
      number: number,
    }));

    const result = await db
      .collection("match_players_numbers")
      .insertMany(newEntries);

    res.status(200).send({
      code: 200,
      message: "Números de jugadores en partido creados exitosamente",
      data: result.ops,
    });
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

module.exports = {
  getAllMatchPlayersNumbers,
  getMatchPlayerNumberByID,
  createMatchPlayerNumbers,
};
