const { getDB } = require("../../config/db");
const { ObjectId } = require("mongodb");

// Obtener todas las estadísticas de jugadores
const getAllPlayerStats = async (req, res) => {
  try {
    const db = getDB();
    const playerStats = await db.collection("player_stats").find().toArray();

    if (playerStats) {
      res.status(200).send({
        code: 200,
        message: "Estadísticas de jugadores obtenidas exitosamente",
        data: playerStats,
      });
    } else {
      return res
        .status(500)
        .send("Error al leer las estadísticas de jugadores");
    }
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Obtener estadísticas de un jugador por ID y torneo
const getPlayerStatsByPlayerAndTournament = async (req, res) => {
  try {
    const db = getDB();
    const stats = await db.collection("player_stats").findOne({
      id_player: ObjectId(req.params.playerId),
      id_tournament: ObjectId(req.params.tournamentId),
    });

    if (stats) {
      res.status(200).send({
        code: 200,
        message: "Estadísticas del jugador obtenidas exitosamente",
        data: stats,
      });
    } else {
      res.status(404).send("Estadísticas del jugador no encontradas");
    }
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Crear nuevas estadísticas de jugador para un torneo
const createPlayerStats = async (req, res) => {
  try {
    const db = getDB();
    const newStats = { ...req.body };
    const result = await db.collection("player_stats").insertOne(newStats);

    res.status(200).send({
      code: 200,
      message: "Estadísticas del jugador creadas exitosamente",
      data: result.ops[0], // Retorna el documento creado
    });
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Actualizar estadísticas de un jugador por ID y torneo
const updatePlayerStats = async (req, res) => {
  try {
    const db = getDB();
    const updatedStats = { ...req.body };

    const result = await db.collection("player_stats").findOneAndUpdate(
      {
        id_player: ObjectId(req.params.playerId),
        id_tournament: ObjectId(req.params.tournamentId),
      },
      { $set: updatedStats },
      { returnOriginal: false }
    );

    if (result.value) {
      res.status(200).send({
        code: 200,
        message: "Estadísticas del jugador actualizadas exitosamente",
        data: result.value,
      });
    } else {
      res.status(404).send("Estadísticas del jugador no encontradas");
    }
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Eliminar estadísticas de un jugador por ID y torneo
const deletePlayerStats = async (req, res) => {
  try {
    const db = getDB();
    const result = await db.collection("player_stats").findOneAndDelete({
      id_player: ObjectId(req.params.playerId),
      id_tournament: ObjectId(req.params.tournamentId),
    });

    if (result.value) {
      res.status(200).send({
        code: 200,
        message: "Estadísticas del jugador eliminadas exitosamente",
        data: result.value,
      });
    } else {
      res.status(404).send("Estadísticas del jugador no encontradas");
    }
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

module.exports = {
  getAllPlayerStats,
  getPlayerStatsByPlayerAndTournament,
  createPlayerStats,
  updatePlayerStats,
  deletePlayerStats,
};
