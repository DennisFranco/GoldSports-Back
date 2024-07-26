const fs = require("fs");
const path = require("path");

const playersPath = path.join(__dirname, "../../db/players.json");
const teamsPath = path.join(__dirname, "../../db/teams.json");
const teamsGroupsPath = path.join(__dirname, "../../db/teams_groups.json");
const groupsPath = path.join(__dirname, "../../db/groups.json");
const tournamentsPath = path.join(__dirname, "../../db/tournaments.json");
const playerStatsPath = path.join(__dirname, "../../db/player_stats.json");
const positionsPath = path.join(__dirname, "../../db/positions.json");
const typesDocsPath = path.join(__dirname, "../../db/types_docs.json");
const categoriesPath = path.join(__dirname, "../../db/categories.json");

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
    const [players, teams, teamsGroups, groups, tournaments, positions] =
      await Promise.all([
        getJSONData(playersPath),
        getJSONData(teamsPath),
        getJSONData(teamsGroupsPath),
        getJSONData(groupsPath),
        getJSONData(tournamentsPath),
        getJSONData(positionsPath),
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
        const position = positions.find((pos) => pos.id === player.position);

        return {
          ...player,
          team_name: team ? team.name : "Unknown Team",
          tournament_name: tournament ? tournament.name : "Unknown Tournament",
          tournament_year: tournament ? tournament.year : "Unknown Year",
          position_name: position ? position.name : "Unknown Position",
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
    const [
      players,
      teams,
      teamsGroups,
      groups,
      tournaments,
      positions,
      typesDocs,
      playerStats,
    ] = await Promise.all([
      getJSONData(playersPath),
      getJSONData(teamsPath),
      getJSONData(teamsGroupsPath),
      getJSONData(groupsPath),
      getJSONData(tournamentsPath),
      getJSONData(positionsPath),
      getJSONData(typesDocsPath),
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

        const positionName =
          positions.find((pos) => pos.id === player.position)?.name ||
          "Unknown Position";
        const typeName =
          typesDocs.find((type) => type.id === player.type_id)?.name ||
          "Unknown Document Type";

        res.status(200).send({
          code: 200,
          message: "Player successfully obtained",
          data: {
            ...player,
            position_name: positionName,
            type_name: typeName,
            team_name: team ? team.name : "Unknown Team",
            tournament_name: tournament
              ? tournament.name
              : "Unknown Tournament",
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
    console.error("Error in getPlayerByID:", err);
    res.status(500).send("Server error");
  }
};

const addTournamentToPlayer = async (req, res) => {
  try {
    const { playerId, tournamentId } = req.body;

    const [players, categories, tournaments] = await Promise.all([
      getJSONData(playersPath),
      getJSONData(categoriesPath),
      getJSONData(tournamentsPath),
    ]);

    const player = players.find((p) => p.id === parseInt(playerId));
    if (!player) {
      return res.status(404).send("Player not found");
    }

    const tournament = tournaments.find((t) => t.id === parseInt(tournamentId));
    if (!tournament) {
      return res.status(404).send("Tournament not found");
    }

    const category = categories.find(
      (cat) => cat.id === tournament.id_category
    );
    if (!category) {
      return res.status(400).send("Category not found for the tournament");
    }

    const specialRules = category.special_rules;
    const playerAge =
      new Date().getFullYear() - new Date(player.birth_date).getFullYear();

    // Validations
    let isValid = true;
    let message = "Player can be added to the tournament";

    if (player.position === 1) {
      // Lógica para porteros
      if (
        specialRules.goalkeeper_age_range &&
        (playerAge < specialRules.goalkeeper_age_range.minimum_age ||
          playerAge > specialRules.goalkeeper_age_range.maximum_age)
      ) {
        isValid = false;
        message = "Goalkeeper does not fall within the allowed age range";
      }
    } else {
      // Lógica para otros jugadores
      if (specialRules.minimum_age && playerAge < specialRules.minimum_age) {
        // Verificar excepciones de edad
        const exception = specialRules.exception_age_ranges
          ? specialRules.exception_age_ranges.some((range) => {
              return (
                playerAge >= range.minimum_age && playerAge <= range.maximum_age
              );
            })
          : false;

        if (!exception) {
          isValid = false;
          message =
            "Player is too young for this category and does not fall within any exception age ranges";
        }
      }

      if (specialRules.maximum_age && playerAge > specialRules.maximum_age) {
        isValid = false;
        message = "Player is too old for this category";
      }

      if (specialRules.exception_age_ranges && isValid) {
        const exception = specialRules.exception_age_ranges.some((range) => {
          return (
            playerAge >= range.minimum_age && playerAge <= range.maximum_age
          );
        });

        if (exception) {
          const playersInTournament = players.filter((p) =>
            p.tournaments.includes(parseInt(tournamentId))
          );

          const exceptionPlayersCount = playersInTournament.filter((p) => {
            const age =
              new Date().getFullYear() - new Date(p.birth_date).getFullYear();
            return specialRules.exception_age_ranges.some((range) => {
              return age >= range.minimum_age && age <= range.maximum_age;
            });
          }).length;

          if (exceptionPlayersCount >= specialRules.maximum_exceptions) {
            isValid = false;
            message =
              "Maximum number of exception players reached for this category";
          }
        }
      }
    }

    if (!isValid) {
      return res.status(400).send({
        code: 400,
        message,
      });
    }

    if (!player.tournaments.includes(parseInt(tournamentId))) {
      player.tournaments.push(parseInt(tournamentId));
    }

    await writeJSONData(playersPath, players);

    res.status(200).send({
      code: 200,
      message: "Tournament successfully added to the player",
      data: player,
    });
  } catch (err) {
    console.error("Error in addTournamentToPlayer:", err);
    res.status(500).send("Server error");
  }
};

const removeTournamentFromPlayer = async (req, res) => {
  try {
    const { playerId, tournamentId } = req.body;

    const players = await getJSONData(playersPath);

    const player = players.find((p) => p.id === parseInt(playerId));
    if (!player) {
      return res.status(404).send("Player not found");
    }

    const tournamentIndex = player.tournaments.indexOf(parseInt(tournamentId));
    if (tournamentIndex === -1) {
      return res
        .status(400)
        .send("Player is not registered in the specified tournament");
    }

    // Remove the tournament from the player's tournaments list
    player.tournaments.splice(tournamentIndex, 1);

    await writeJSONData(playersPath, players);

    res.status(200).send({
      code: 200,
      message: "Tournament successfully removed from the player",
      data: player,
    });
  } catch (err) {
    console.error("Error in removeTournamentFromPlayer:", err);
    res.status(500).send("Server error");
  }
};

// Crear un nuevo jugador
const createPlayer = async (req, res) => {
  try {
    const players = await getJSONData(playersPath);
    const { number_id } = req.body;

    // Verificar si el jugador ya existe
    const playerExists = players.some(
      (player) => player.number_id === number_id
    );
    if (playerExists) {
      return res.status(400).send({
        code: 400,
        message: "Player with this number_id already exists",
      });
    }

    // Crear un nuevo jugador
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
    console.error("Error in createPlayer:", err);
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
  addTournamentToPlayer,
  removeTournamentFromPlayer,
};
