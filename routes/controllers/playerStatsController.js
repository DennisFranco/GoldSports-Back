const fs = require("fs");
const path = require("path");

const playerStatsPath = path.join(__dirname, "../../db/player_stats.json");

const getJSONData = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(JSON.parse(data));
      }
    });
  });
};

const writeJSONData = (filePath, data) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8", (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
};

// Obtener todas las estadísticas de jugadores
const getAllPlayerStats = async (req, res) => {
  const playerStats = await getJSONData(playerStatsPath);

  try {
    if (playerStats) {
      res.status(200).send({
        code: 200,
        message: "Player stats successfully obtained",
        data: playerStats,
      });
    } else {
      return res.status(500).send("Error reading player stats from file");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Obtener estadísticas de un jugador por ID y torneo
const getPlayerStatsByPlayerAndTournament = async (req, res) => {
  const playerStats = await getJSONData(playerStatsPath);

  try {
    if (playerStats) {
      const stats = playerStats.find((s) => s.id_player === parseInt(req.params.playerId) && s.id_tournament === parseInt(req.params.tournamentId));
      if (stats) {
        res.status(200).send({
          code: 200,
          message: "Player stats successfully obtained",
          data: stats,
        });
      } else {
        res.status(404).send("Player stats not found");
      }
    } else {
      return res.status(500).send("Error reading player stats from file");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Crear nuevas estadísticas de jugador para un torneo
const createPlayerStats = async (req, res) => {
  try {
    const playerStats = await getJSONData(playerStatsPath);
    const newStats = {
      id: playerStats.length + 1,
      ...req.body,
    };
    playerStats.push(newStats);
    await writeJSONData(playerStatsPath, playerStats);
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
    const playerStats = await getJSONData(playerStatsPath);
    const statsIndex = playerStats.findIndex((s) => s.id_player === parseInt(req.params.playerId) && s.id_tournament === parseInt(req.params.tournamentId));
    if (statsIndex !== -1) {
      playerStats[statsIndex] = {
        ...playerStats[statsIndex],
        ...req.body
      };
      await writeJSONData(playerStatsPath, playerStats);
      res.status(200).send({
        code: 200,
        message: "Player stats successfully updated",
        data: playerStats[statsIndex],
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
    const playerStats = await getJSONData(playerStatsPath);
    const statsIndex = playerStats.findIndex((s) => s.id_player === parseInt(req.params.playerId) && s.id_tournament === parseInt(req.params.tournamentId));
    if (statsIndex !== -1) {
      const deletedStats = playerStats.splice(statsIndex, 1);
      await writeJSONData(playerStatsPath, playerStats);
      res.status(200).send({
        code: 200,
        message: "Player stats successfully deleted",
        data: deletedStats,
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
