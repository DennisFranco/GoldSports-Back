const { getDB } = require("../config/db");

// Obtener todas las estadísticas de jugadores
const getAllPlayerStats = async (req, res) => {
  try {
    const db = getDB();
    const playerStats = await db.collection("player_stats").find().toArray();

    if (playerStats) {
      res.status(200).send({
        code: 200,
        message: "Player stats successfully obtained",
        data: playerStats,
      });
    } else {
      return res.status(500).send("Error fetching player stats from database");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Obtener estadísticas de un jugador por ID y torneo
const getPlayerStatsByPlayerAndTournament = async (req, res) => {
  try {
    const db = getDB();
    const stats = await db.collection("player_stats").findOne({
      id_player: parseInt(req.params.playerId),
      id_tournament: parseInt(req.params.tournamentId),
    });

    if (stats) {
      res.status(200).send({
        code: 200,
        message: "Player stats successfully obtained",
        data: stats,
      });
    } else {
      res.status(404).send("Player stats not found");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Crear nuevas estadísticas de jugador para un torneo
const createPlayerStats = async (req, res) => {
  try {
    const db = getDB();
    const playerStats = await db.collection("player_stats").find().toArray();

    const newStats = {
      id: playerStats.length + 1, // O usar un enfoque más robusto para IDs
      ...req.body,
    };

    await db.collection("player_stats").insertOne(newStats);

    res.status(200).send({
      code: 200,
      message: "Player stats successfully created",
      data: newStats,
    });
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Actualizar estadísticas de un jugador por ID y torneo
const updatePlayerStats = async (req, res) => {
  try {
    const db = getDB();
    const updatedStats = await db.collection("player_stats").findOneAndUpdate(
      {
        id_player: parseInt(req.params.playerId),
        id_tournament: parseInt(req.params.tournamentId),
      },
      { $set: req.body },
      { returnOriginal: false }
    );

    if (updatedStats.value) {
      res.status(200).send({
        code: 200,
        message: "Player stats successfully updated",
        data: updatedStats.value,
      });
    } else {
      res.status(404).send("Player stats not found");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Eliminar estadísticas de un jugador por ID y torneo
const deletePlayerStats = async (req, res) => {
  try {
    const db = getDB();
    const deletedStats = await db.collection("player_stats").findOneAndDelete({
      id_player: parseInt(req.params.playerId),
      id_tournament: parseInt(req.params.tournamentId),
    });

    if (deletedStats.value) {
      res.status(200).send({
        code: 200,
        message: "Player stats successfully deleted",
        data: deletedStats.value,
      });
    } else {
      res.status(404).send("Player stats not found");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

module.exports = {
  getAllPlayerStats,
  getPlayerStatsByPlayerAndTournament,
  createPlayerStats,
  updatePlayerStats,
  deletePlayerStats,
};
