const fs = require("fs");
const path = require("path");

const teamsPath = path.join(__dirname, "../../db/teams.json");
const groupsPath = path.join(__dirname, "../../db/groups.json");
const teamsGroupsPath = path.join(__dirname, "../../db/teams_groups.json");
const playersPath = path.join(__dirname, "../../db/players.json");
const matchesPath = path.join(__dirname, "../../db/matches.json");
const classificationsPath = path.join(
  __dirname,
  "../../db/classifications.json"
);
const penaltiesPath = path.join(__dirname, "../../db/penalties.json");
const placesPath = path.join(__dirname, "../../db/fields.json");
const playerStatsPath = path.join(__dirname, "../../db/player_stats.json");
const tournamentsPath = path.join(__dirname, "../../db/tournaments.json");
const categoriesPath = path.join(__dirname, "../../db/categories.json");
const positionsPath = path.join(__dirname, "../../db/positions.json");

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

// Obtener todos los equipos
const getAllTeams = async (req, res) => {
  const teams = await getJSONData(teamsPath);

  try {
    if (teams) {
      res.status(200).send({
        code: 200,
        message: "Teams successfully obtained",
        data: teams,
      });
    } else {
      return res.status(500).send("Error reading teams from file");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Obtener un equipo por ID con información completa
const getTeamByID = async (req, res) => {
  try {
    const [
      teams,
      players,
      matches,
      classifications,
      penalties,
      places,
      groups,
      playerStats,
      tournaments,
      teamsGroups,
      categories,
      positions,
    ] = await Promise.all([
      getJSONData(teamsPath),
      getJSONData(playersPath),
      getJSONData(matchesPath),
      getJSONData(classificationsPath),
      getJSONData(penaltiesPath),
      getJSONData(placesPath),
      getJSONData(groupsPath),
      getJSONData(playerStatsPath),
      getJSONData(tournamentsPath),
      getJSONData(teamsGroupsPath),
      getJSONData(categoriesPath),
      getJSONData(positionsPath),
    ]);

    const team = teams.find((t) => t.id === parseInt(req.params.id));
    if (!team) {
      return res.status(404).send("Team not found");
    }

    // Obtener plantilla
    const plantillaPlayers = players
      .filter((p) => p.id_team === team.id)
      .map((player) => {
        const stats =
          playerStats.find(
            (ps) =>
              ps.id_player === player.id &&
              ps.id_tournament === team.id_tournament
          ) || {};
        const position = positions.find((pos) => pos.id === player.position);
        return {
          ...player,
          matches_played: stats.games_played || 0,
          goals: stats.goals || 0,
          yellow_cards: stats.yellow_cards || 0,
          red_cards: stats.red_cards || 0,
          position_name: position ? position.name : "Unknown Position",
        };
      });

    const plantilla = {
      coach: team.manager_name,
      yearFoundation: team.yearFoundation,
      manager_name: team.manager_name,
      manager_phone: team.manager_phone,
      logo: team.logo,
      players: plantillaPlayers,
    };

    // Obtener sanciones
    const playerIds = new Set(plantillaPlayers.map((player) => player.id));
    const sanciones = penalties
      .filter((p) => playerIds.has(p.id_player))
      .map((penalty) => {
        const player = players.find((p) => p.id === penalty.id_player);
        return {
          ...penalty,
          player_name: player ? player.name : "Unknown Player",
        };
      });

    // Obtener partidos organizados por fecha
    const partidos = matches
      .filter(
        (match) =>
          match.local_team === team.id || match.visiting_team === team.id
      )
      .reduce((acc, match) => {
        const date = match.date;
        if (!acc[date]) {
          acc[date] = [];
        }
        const localTeamName =
          teams.find((t) => t.id === match.local_team)?.name || "Unknown Team";
        const visitingTeamName =
          teams.find((t) => t.id === match.visiting_team)?.name ||
          "Unknown Team";

        acc[date].push({
          ...match,
          local_team: localTeamName,
          visiting_team: visitingTeamName,
          place:
            places.find((p) => p.id === match.place)?.name || "Unknown Place",
        });
        return acc;
      }, {});

    // Obtener clasificación
    const classificationGroups = classifications.reduce(
      (acc, classification) => {
        const group = groups.find((g) => g.id === classification.id_group);
        const groupName = group
          ? group.name
          : `Group ${classification.id_group}`;
        if (!acc[groupName]) {
          acc[groupName] = [];
        }
        acc[groupName].push(classification);
        return acc;
      },
      {}
    );

    const classification = Object.keys(classificationGroups).reduce(
      (acc, groupName) => {
        acc[groupName] = classificationGroups[groupName].map(
          (classification) => {
            const team = teams.find((t) => t.id === classification.id_team);
            return {
              team: team ? team.name : "Unknown Team",
              points: classification.points,
              matches_played: classification.matches_played,
              matches_won: classification.matches_won,
              tied_matches: classification.tied_matches,
              lost_matches: classification.lost_matches,
              favor_goals: classification.favor_goals,
              goals_against: classification.goals_against,
              goal_difference: classification.goal_difference,
            };
          }
        );
        return acc;
      },
      {}
    );

    // Obtener torneos a los que el equipo está inscrito
    const teamTournaments = teamsGroups
      .filter((tg) => tg.id_team === team.id)
      .map((tg) => {
        const group = groups.find((g) => g.id === tg.id_group);
        const tournament = group
          ? tournaments.find((t) => t.id === group.id_tournament)
          : null;
        const category = tournament
          ? categories.find((c) => c.id === tournament.id_category)
          : null;
        return tournament
          ? {
              id: tournament.id,
              name: tournament.name,
              year: tournament.year,
              category: category ? category.name : "Unknown Category",
            }
          : null;
      })
      .filter((tournament) => tournament !== null);

    const response = {
      PLANTILLA: plantilla,
      SANCIONES: sanciones,
      PARTIDOS: partidos,
      CLASIFICACIÓN: classification,
      TORNEOS: teamTournaments,
    };

    res.status(200).send({
      code: 200,
      message: "Team successfully obtained",
      data: response,
    });
  } catch (err) {
    console.error("Error in getTeamByID:", err);
    res.status(500).send("Server error");
  }
};


const getPlayersByTournamentAndTeam = async (req, res) => {
  try {
    const { tournamentId, teamId } = req.params;
    const [players] = await Promise.all([getJSONData(playersPath)]);

    const filteredPlayers = players
      .filter(
        (player) =>
          player.tournaments.includes(parseInt(tournamentId)) &&
          player.id_team === parseInt(teamId)
      )
      .map((player) => ({
        id: player.id,
        name: player.name,
        age:
          new Date().getFullYear() - new Date(player.birth_date).getFullYear(),
      }));

    res.status(200).send({
      code: 200,
      message: "Players successfully obtained",
      data: filteredPlayers,
    });
  } catch (err) {
    console.error("Error in getPlayersByTournamentAndTeam:", err);
    res.status(500).send("Server error");
  }
};

// Crear un nuevo equipo
const createTeam = async (req, res) => {
  try {
    const teams = await getJSONData(teamsPath);
    const newTeam = {
      id: teams.length + 1,
      ...req.body,
    };
    teams.push(newTeam);
    await writeJSONData(teamsPath, teams);
    res.status(200).send({
      code: 200,
      message: "Team successfully created",
      data: newTeam,
    });
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Actualizar un equipo por ID
const updateTeam = async (req, res) => {
  try {
    const teams = await getJSONData(teamsPath);
    const teamIndex = teams.findIndex((t) => t.id === parseInt(req.params.id));
    if (teamIndex !== -1) {
      teams[teamIndex] = { id: parseInt(req.params.id), ...req.body };
      await writeJSONData(teamsPath, teams);
      res.status(200).send({
        code: 200,
        message: "Team successfully updated",
        data: teams[teamIndex],
      });
    } else {
      res.status(404).send("Team not found");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Eliminar un equipo por ID
const deleteTeam = async (req, res) => {
  try {
    const teams = await getJSONData(teamsPath);
    const teamIndex = teams.findIndex((t) => t.id === parseInt(req.params.id));
    if (teamIndex !== -1) {
      const deletedTeam = teams.splice(teamIndex, 1);
      await writeJSONData(teamsPath, teams);
      res.status(200).send({
        code: 200,
        message: "Team successfully deleted",
        data: deletedTeam,
      });
    } else {
      res.status(404).send("Team not found");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Obtener equipos por torneo
const getTeamsByTournament = async (req, res) => {
  try {
    const { id_tournament } = req.params;

    const teams = await getJSONData(teamsPath);
    const teamsGroups = await getJSONData(teamsGroupsPath);
    const groups = await getJSONData(groupsPath);

    // Filtrar grupos por torneo
    const tournamentGroups = groups.filter(
      (group) => group.id_tournament === parseInt(id_tournament)
    );

    // Obtener ids de los grupos del torneo
    const groupIds = tournamentGroups.map((group) => group.id);

    // Filtrar equipos por grupos del torneo
    const tournamentTeamsGroups = teamsGroups.filter((tg) =>
      groupIds.includes(tg.id_group)
    );

    // Obtener ids de los equipos del torneo
    const teamIds = tournamentTeamsGroups.map((tg) => tg.id_team);

    // Filtrar equipos por ids
    const tournamentTeams = teams
      .filter((team) => teamIds.includes(team.id))
      .map((team) => ({
        id: team.id,
        name: team.name,
      }));

    res.status(200).send({
      code: 200,
      message: "Teams successfully obtained for the tournament",
      data: tournamentTeams,
    });
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Obtener equipos sin registro en teams_groups para un torneo específico
const getTeamsWithoutGroup = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const [teams, teamsGroups, groups] = await Promise.all([
      getJSONData(teamsPath),
      getJSONData(teamsGroupsPath),
      getJSONData(groupsPath),
    ]);

    // Obtener IDs de grupos en el torneo específico
    const groupsInTournament = new Set(
      groups
        .filter((g) => g.id_tournament === parseInt(tournamentId))
        .map((g) => g.id)
    );

    // Obtener IDs de equipos en teams_groups para esos grupos
    const teamsInGroups = new Set(
      teamsGroups
        .filter((tg) => groupsInTournament.has(tg.id_group))
        .map((tg) => tg.id_team)
    );

    // Filtrar equipos que no están en esos grupos
    const teamsWithoutGroup = teams.filter(
      (team) => !teamsInGroups.has(team.id)
    );

    res.status(200).send({
      code: 200,
      message: "Teams without group successfully obtained",
      data: teamsWithoutGroup,
    });
  } catch (err) {
    res.status(500).send("Server error");
  }
};

module.exports = {
  getAllTeams,
  getTeamByID,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamsByTournament,
  getTeamsWithoutGroup,
  getPlayersByTournamentAndTeam,
};
