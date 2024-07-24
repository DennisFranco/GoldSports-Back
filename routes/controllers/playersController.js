const fs = require("fs");
const path = require("path");

const playersPath = path.join(__dirname, "../../db/players.json");
const teamsPath = path.join(__dirname, "../../db/teams.json");
const teamsGroupsPath = path.join(__dirname, "../../db/teams_groups.json");
const groupsPath = path.join(__dirname, "../../db/groups.json");
const tournamentsPath = path.join(__dirname, "../../db/tournaments.json");
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

// Obtener todos los jugadores
const getAllPlayers = async (req, res) => {
  try {
    const [players, teams, teamsGroups, groups, tournaments] =
      await Promise.all([
        getJSONData(playersPath),
        getJSONData(teamsPath),
        getJSONData(teamsGroupsPath),
        getJSONData(groupsPath),
        getJSONData(tournamentsPath),
      ]);

    if (players) {
      const playersWithTeamAndTournament = players.map((player) => {
        const team = teams.find((team) => team.id === player.id_team);
        const teamGroup = teamsGroups.find(
          (tg) => tg.id_team === player.id_team
        );
        const group = teamGroup
          ? groups.find((g) => g.id === teamGroup.id_group)
          : null;
        const tournament = group
          ? tournaments.find((t) => t.id === group.id_tournament)
          : null;

        return {
          ...player,
          team_name: team ? team.name : "Unknown Team",
          tournament_name: tournament ? tournament.name : "Unknown Tournament",
          tournament_year: tournament ? tournament.year : "Unknown Year",
        };
      });

      res.status(200).send({
        code: 200,
        message: "Players successfully obtained",
        data: playersWithTeamAndTournament,
      });
    } else {
      return res.status(500).send("Error reading players from file");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Obtener un jugador por ID
const getPlayerByID = async (req, res) => {
  try {
    const [players, teams, teamsGroups, groups, tournaments, playerStats] =
      await Promise.all([
        getJSONData(playersPath),
        getJSONData(teamsPath),
        getJSONData(teamsGroupsPath),
        getJSONData(groupsPath),
        getJSONData(tournamentsPath),
        getJSONData(playerStatsPath),
      ]);

    if (players) {
      const player = players.find((p) => p.id === parseInt(req.params.id));
      if (player) {
        const team = teams.find((team) => team.id === player.id_team);
        const teamGroup = teamsGroups.find(
          (tg) => tg.id_team === player.id_team
        );
        const group = teamGroup
          ? groups.find((g) => g.id === teamGroup.id_group)
          : null;
        const tournament = group
          ? tournaments.find((t) => t.id === group.id_tournament)
          : null;
        const stats = playerStats.filter(
          (stat) => stat.id_player === player.id
        );

        res.status(200).send({
          code: 200,
          message: "Player successfully obtained",
          data: {
            ...player,
            team_name: team ? team.name : "Unknown Team",
            tournament_name: tournament ? tournament.name : "Unknown Tournament",
            tournament_year: tournament ? tournament.year : "Unknown Year",
            stats,
          },
        });
      } else {
        res.status(404).send("Player not found");
      }
    } else {
      return res.status(500).send("Error reading players from file");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Crear un nuevo jugador
const createPlayer = async (req, res) => {
  try {
    const players = await getJSONData(playersPath);
    const newPlayer = {
      id: players.length + 1,
      ...req.body,
    };
    players.push(newPlayer);
    await writeJSONData(playersPath, players);
    res.status(200).send({
      code: 200,
      message: "Player successfully created",
      data: newPlayer,
    });
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Actualizar un jugador por ID
const updatePlayer = async (req, res) => {
  try {
    const players = await getJSONData(playersPath);
    const playerIndex = players.findIndex(
      (p) => p.id === parseInt(req.params.id)
    );
    if (playerIndex !== -1) {
      players[playerIndex] = { id: parseInt(req.params.id), ...req.body };
      await writeJSONData(playersPath, players);
      res.status(200).send({
        code: 200,
        message: "Player successfully updated",
        data: players[playerIndex],
      });
    } else {
      res.status(404).send("Player not found");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Eliminar un jugador por ID
const deletePlayer = async (req, res) => {
  try {
    const players = await getJSONData(playersPath);
    const playerIndex = players.findIndex(
      (p) => p.id === parseInt(req.params.id)
    );
    if (playerIndex !== -1) {
      const deletedPlayer = players.splice(playerIndex, 1);
      await writeJSONData(playersPath, players);
      res.status(200).send({
        code: 200,
        message: "Player successfully deleted",
        data: deletedPlayer,
      });
    } else {
      res.status(404).send("Player not found");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

module.exports = {
  getAllPlayers,
  getPlayerByID,
  createPlayer,
  updatePlayer,
  deletePlayer,
};
