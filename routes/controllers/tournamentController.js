const fs = require("fs");
const path = require("path");

const tournamentsPath = path.join(__dirname, "../../db/tournaments.json");
const categoriesPath = path.join(__dirname, "../../db/categories.json");
const matchesPath = path.join(__dirname, "../../db/matches.json");
const classificationsPath = path.join(
  __dirname,
  "../../db/classifications.json"
);
const teamsPath = path.join(__dirname, "../../db/teams.json");
const placesPath = path.join(__dirname, "../../db/fields.json");
const groupsPath = path.join(__dirname, "../../db/groups.json");
const teamsGroupsPath = path.join(__dirname, "../../db/teams_groups.json");
const eventsPath = path.join(__dirname, "../../db/events.json");
const playersPath = path.join(__dirname, "../../db/players.json");

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

// Obtener todos los torneos con información de la categoría
const getAllTournaments = async (req, res) => {
  try {
    const [tournaments, categories] = await Promise.all([
      getJSONData(tournamentsPath),
      getJSONData(categoriesPath),
    ]);

    if (tournaments && categories) {
      const tournamentsWithCategory = tournaments.map((tournament) => {
        const category = categories.find(
          (cat) => cat.id === tournament.id_category
        );
        return {
          ...tournament,
          category: category ? category : null,
        };
      });

      res.status(200).send({
        code: 200,
        message: "Tournaments successfully obtained",
        data: tournamentsWithCategory,
      });
    } else {
      return res
        .status(500)
        .send("Error reading tournaments or categories from file");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Obtener un torneo por ID con información completa
const getTournamentByID = async (req, res) => {
  try {
    const [
      tournaments,
      categories,
      matches,
      classifications,
      teams,
      places,
      groups,
      teamsGroups,
      events,
      players,
    ] = await Promise.all([
      getJSONData(tournamentsPath),
      getJSONData(categoriesPath),
      getJSONData(matchesPath),
      getJSONData(classificationsPath),
      getJSONData(teamsPath),
      getJSONData(placesPath),
      getJSONData(groupsPath),
      getJSONData(teamsGroupsPath),
      getJSONData(eventsPath),
      getJSONData(playersPath),
    ]);

    const tournament = tournaments.find(
      (t) => t.id === parseInt(req.params.id)
    );
    if (tournament) {
      const category = categories.find(
        (cat) => cat.id === tournament.id_category
      );

      const tournamentMatches = matches
        .filter((match) => match.id_tournament === tournament.id)
        .map((match) => {
          const localTeam = teams.find((team) => team.id === match.local_team);
          const visitingTeam = teams.find(
            (team) => team.id === match.visiting_team
          );
          const place = places.find((p) => p.id === match.place);
          return {
            ...match,
            local_team: localTeam ? localTeam.name : null,
            visiting_team: visitingTeam ? visitingTeam.name : null,
            place: place ? place.name : null,
          };
        });

      // Agrupar partidos por ronda y ordenar por hora
      const matchesGroupedByRound = tournamentMatches.reduce((acc, match) => {
        if (!acc[match.round]) {
          acc[match.round] = [];
        }
        acc[match.round].push(match);
        acc[match.round].sort((a, b) =>
          a.hour_start.localeCompare(b.hour_start)
        );
        return acc;
      }, {});

      // Ordenar las rondas de manera ascendente
      const sortedMatchesGroupedByRound = Object.keys(matchesGroupedByRound)
        .sort((a, b) => a - b)
        .reduce((acc, key) => {
          acc[key] = matchesGroupedByRound[key];
          return acc;
        }, {});

      const tournamentClassifications = classifications.filter(
        (classification) => classification.id_tournament === tournament.id
      );
      const formattedClassifications = {};

      tournamentClassifications.forEach((classification) => {
        const group =
          groups.find((g) => g.id === classification.id_group)?.name ||
          "Unknown Group";
        const team =
          teams.find((t) => t.id === classification.id_team)?.name ||
          "Unknown Team";

        if (!formattedClassifications[group]) {
          formattedClassifications[group] = [];
        }

        formattedClassifications[group].push({
          team,
          points: classification.points,
          matches_played: classification.matches_played,
          matches_won: classification.matches_won,
          tied_matches: classification.tied_matches,
          lost_matches: classification.lost_matches,
          favor_goals: classification.favor_goals,
          goals_against: classification.goals_against,
          goal_difference: classification.goal_difference,
        });

        formattedClassifications[group].sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.goal_difference !== a.goal_difference)
            return b.goal_difference - a.goal_difference;
          if (b.favor_goals !== a.favor_goals)
            return b.favor_goals - a.favor_goals;
          return a.goals_against - b.goals_against;
        });
      });

      // Obtener equipos del torneo y organizarlos por grupo usando teams_groups
      const tournamentTeamsByGroup = groups.reduce((acc, group) => {
        if (group.id_tournament === tournament.id) {
          const groupTeams = teamsGroups
            .filter((tg) => tg.id_group === group.id)
            .map((tg) => teams.find((t) => t.id === tg.id_team))
            .filter((team) => team !== undefined);

          acc[group.name] = groupTeams;
        }
        return acc;
      }, {});

      // Incluir todos los grupos del torneo, incluso si no tienen equipos asignados
      groups
        .filter((group) => group.id_tournament === tournament.id)
        .forEach((group) => {
          if (!tournamentTeamsByGroup[group.name]) {
            tournamentTeamsByGroup[group.name] = [];
          }
        });

      // Calcular estadísticas
      const totalMatchesPlayed = tournamentMatches.length;
      let totalGoals = 0;
      let totalYellowCards = 0;
      let totalRedCards = 0;
      const playerStats = {};

      events.forEach((event) => {
        const match = matches.find((m) => m.id === event.id_match);
        if (match && match.id_tournament === tournament.id) {
          if (event.id_event_type === 1) {
            totalGoals++;
            if (!playerStats[event.id_player]) {
              playerStats[event.id_player] = {
                goals: 0,
                yellowCards: 0,
                redCards: 0,
              };
            }
            playerStats[event.id_player].goals++;
          } else if (event.id_event_type === 2) {
            totalYellowCards++;
            if (!playerStats[event.id_player]) {
              playerStats[event.id_player] = {
                goals: 0,
                yellowCards: 0,
                redCards: 0,
              };
            }
            playerStats[event.id_player].yellowCards++;
          } else if (event.id_event_type === 3) {
            totalRedCards++;
            if (!playerStats[event.id_player]) {
              playerStats[event.id_player] = {
                goals: 0,
                yellowCards: 0,
                redCards: 0,
              };
            }
            playerStats[event.id_player].redCards++;
          }
        }
      });

      // Encontrar el máximo goleador, el jugador con más amarillas y el jugador con más rojas
      let topScorer = null;
      let mostYellowCards = null;
      let mostRedCards = null;

      Object.keys(playerStats).forEach((playerId) => {
        const stats = playerStats[playerId];
        const player = players.find((p) => p.id === parseInt(playerId));

        if (topScorer === null || stats.goals > playerStats[topScorer].goals) {
          topScorer = playerId;
        }
        if (
          mostYellowCards === null ||
          stats.yellowCards > playerStats[mostYellowCards].yellowCards
        ) {
          mostYellowCards = playerId;
        }
        if (
          mostRedCards === null ||
          stats.redCards > playerStats[mostRedCards].redCards
        ) {
          mostRedCards = playerId;
        }
      });

      const response = {
        INFORMACIÓN: {
          id: tournament.id,
          name: tournament.name,
          year: tournament.year,
          id_category: tournament.id_category,
          category: category ? category : null,
          total_matches_played: totalMatchesPlayed,
          total_goals: totalGoals,
          total_yellow_cards: totalYellowCards,
          total_red_cards: totalRedCards,
          top_scorer: topScorer
            ? players.find((p) => p.id === parseInt(topScorer)).name
            : null,
          most_yellow_cards: mostYellowCards
            ? players.find((p) => p.id === parseInt(mostYellowCards)).name
            : null,
          most_red_cards: mostRedCards
            ? players.find((p) => p.id === parseInt(mostRedCards)).name
            : null,
        },
        PARTIDOS: sortedMatchesGroupedByRound,
        CLASIFICACIÓN: formattedClassifications,
        EQUIPOS: tournamentTeamsByGroup,
      };

      res.status(200).send({
        code: 200,
        message: "Tournament successfully obtained",
        data: response,
      });
    } else {
      res.status(404).send("Tournament not found");
    }
  } catch (err) {
    console.error("Error in getTournamentByID:", err);
    res.status(500).send("Server error");
  }
};

// Crear un nuevo torneo
const createTournament = async (req, res) => {
  try {
    const tournaments = await getJSONData(tournamentsPath);
    const groups = await getJSONData(groupsPath);

    const { numberGroups, ...tournamentData } = req.body;

    const newTournament = {
      id: tournaments.length + 1,
      ...tournamentData,
    };
    tournaments.push(newTournament);

    const groupNames = Array.from(
      { length: numberGroups },
      (_, i) => `Grupo ${String.fromCharCode(65 + i)}`
    );

    const newGroups = groupNames.map((name, index) => ({
      id: groups.length + 1 + index,
      id_tournament: newTournament.id,
      name,
    }));

    const updatedGroups = [...groups, ...newGroups];

    await Promise.all([
      writeJSONData(tournamentsPath, tournaments),
      writeJSONData(groupsPath, updatedGroups),
    ]);

    res.status(200).send({
      code: 200,
      message: "Tournament and groups successfully created",
      data: {
        tournament: newTournament,
        groups: newGroups,
      },
    });
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Actualizar un torneo por ID
const updateTournament = async (req, res) => {
  try {
    const tournaments = await getJSONData(tournamentsPath);
    const tournamentIndex = tournaments.findIndex(
      (t) => t.id === parseInt(req.params.id)
    );
    if (tournamentIndex !== -1) {
      tournaments[tournamentIndex] = {
        id: parseInt(req.params.id),
        ...req.body,
      };
      await writeJSONData(tournamentsPath, tournaments);
      res.status(200).send({
        code: 200,
        message: "Tournament successfully updated",
        data: tournaments[tournamentIndex],
      });
    } else {
      res.status(404).send("Tournament not found");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Eliminar un torneo por ID
const deleteTournament = async (req, res) => {
  try {
    const [tournaments, matches, groups, classifications, teamsGroups] =
      await Promise.all([
        getJSONData(tournamentsPath),
        getJSONData(matchesPath),
        getJSONData(groupsPath),
        getJSONData(classificationsPath),
        getJSONData(teamsGroupsPath),
      ]);

    const tournamentId = parseInt(req.params.id);

    // Verificar si hay partidos asignados al torneo
    const hasMatches = matches.some(
      (match) => match.id_tournament === tournamentId
    );
    if (hasMatches) {
      return res.status(400).send({
        code: 400,
        message:
          "Cannot delete tournament: there are matches assigned to this tournament",
      });
    }

    // Verificar si hay grupos creados para el torneo
    const hasGroups = groups.some(
      (group) => group.id_tournament === tournamentId
    );
    if (hasGroups) {
      return res.status(400).send({
        code: 400,
        message:
          "Cannot delete tournament: there are groups created for this tournament",
      });
    }

    // Verificar si hay clasificaciones relacionadas con el torneo
    const hasClassifications = classifications.some(
      (classification) => classification.id_tournament === tournamentId
    );
    if (hasClassifications) {
      return res.status(400).send({
        code: 400,
        message:
          "Cannot delete tournament: there are classifications related to this tournament",
      });
    }

    // Verificar si hay equipos en grupos relacionados con el torneo
    const hasTeamsInGroups = teamsGroups.some((teamGroup) => {
      const group = groups.find((g) => g.id === teamGroup.id_group);
      return group && group.id_tournament === tournamentId;
    });
    if (hasTeamsInGroups) {
      return res.status(400).send({
        code: 400,
        message:
          "Cannot delete tournament: there are teams assigned to groups in this tournament",
      });
    }

    // Eliminar el torneo si no tiene datos relacionados
    const tournamentIndex = tournaments.findIndex((t) => t.id === tournamentId);
    if (tournamentIndex !== -1) {
      const deletedTournament = tournaments.splice(tournamentIndex, 1);
      await writeJSONData(tournamentsPath, tournaments);
      res.status(200).send({
        code: 200,
        message: "Tournament successfully deleted",
        data: deletedTournament,
      });
    } else {
      res.status(404).send("Tournament not found");
    }
  } catch (err) {
    console.error("Error in deleteTournament:", err);
    res.status(500).send("Server error");
  }
};

module.exports = {
  getAllTournaments,
  getTournamentByID,
  createTournament,
  updateTournament,
  deleteTournament,
};
