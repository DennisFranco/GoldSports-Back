const { getDB } = require("../../config/db");

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
        .send(
          "Error al obtener las estadísticas de jugadores de la base de datos"
        );
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
      id_jugador: parseInt(req.params.playerId),
      id_torneo: parseInt(req.params.tournamentId),
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
    const playerStats = await db.collection("player_stats").find().toArray();

    // Obtener el último ID y generar uno nuevo
    const lastID = await db
      .collection("player_stats")
      .findOne({}, { sort: { id: -1 } });
    const newId = lastID ? lastID.id + 1 : 1;

    const newStats = {
      id: newId, // O usar un enfoque más robusto para IDs
      ...req.body,
    };

    await db.collection("player_stats").insertOne(newStats);

    res.status(200).send({
      code: 200,
      message: "Estadísticas del jugador creadas exitosamente",
      data: newStats,
    });
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Actualizar estadísticas de un jugador por ID y torneo
const updatePlayerStats = async (req, res) => {
  try {
    const db = getDB();
    const updatedStats = await db.collection("player_stats").findOneAndUpdate(
      {
        id_jugador: parseInt(req.params.playerId),
        id_torneo: parseInt(req.params.tournamentId),
      },
      { $set: req.body },
      { returnOriginal: false }
    );

    if (updatedStats) {
      res.status(200).send({
        code: 200,
        message: "Estadísticas del jugador actualizadas exitosamente",
        data: updatedStats,
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
    const deletedStats = await db.collection("player_stats").findOneAndDelete({
      id_jugador: parseInt(req.params.playerId),
      id_torneo: parseInt(req.params.tournamentId),
    });

    if (deletedStats) {
      res.status(200).send({
        code: 200,
        message: "Estadísticas del jugador eliminadas exitosamente",
        data: deletedStats,
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
