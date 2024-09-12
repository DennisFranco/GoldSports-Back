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
        message: "Números de jugadores del partido obtenidos con éxito",
        data: matchPlayersNumbers,
      });
    } else {
      return res
        .status(500)
        .send(
          "Error al recuperar los números de los jugadores del partido de la base de datos"
        );
    }
  } catch (err) {
    res.status(500).send("error del servidor");
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
        message: "Número de jugador del partido obtenido con éxito",
        data: matchPlayerNumber,
      });
    } else {
      res.status(404).send("Número de jugador del partido no encontrado");
    }
  } catch (err) {
    res.status(500).send("error del servidor");
  }
};

const createMatchPlayerNumbers = async (req, res) => {
  try {
    const db = getDB();

    // Obtener el último ID y generar uno nuevo
    const lastID = await db
      .collection("match_players_numbers")
      .findOne({}, { sort: { id: -1 } });
    const newId = lastID ? lastID.id + 1 : 1;

    // Crear nuevas entradas para los jugadores
    const newEntries = Object.entries(req.body).map(
      ([id_player, number], index) => ({
        id: newId + index,
        id_match: parseInt(req.params.idMatch),
        id_player: parseInt(id_player),
        number: number,
      })
    );

    // Insertar las nuevas entradas en la base de datos
    await db.collection("match_players_numbers").insertMany(newEntries);

    res.status(200).send({
      code: 200,
      message: "Números de jugadores creados exitosamente",
      data: newEntries,
    });
  } catch (err) {
    res.status(500).send("error del servidor");
  }
};

module.exports = {
  getAllMatchPlayersNumbers,
  getMatchPlayerNumberByID,
  createMatchPlayerNumbers,
};
