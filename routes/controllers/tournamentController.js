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
    ] = await Promise.all([
      getJSONData(tournamentsPath),
      getJSONData(categoriesPath),
      getJSONData(matchesPath),
      getJSONData(classificationsPath),
      getJSONData(teamsPath),
      getJSONData(placesPath),
      getJSONData(groupsPath),
      getJSONData(teamsGroupsPath),
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

      // Agrupar partidos por fecha y ordenar por hora
      const matchesGroupedByDate = tournamentMatches.reduce((acc, match) => {
        if (!acc[match.date]) {
          acc[match.date] = [];
        }
        acc[match.date].push(match);
        acc[match.date].sort((a, b) =>
          a.hour_start.localeCompare(b.hour_start)
        );
        return acc;
      }, {});

      // Ordenar las fechas de manera descendente
      const sortedMatchesGroupedByDate = Object.keys(matchesGroupedByDate)
        .sort((a, b) => new Date(b) - new Date(a))
        .reduce((acc, key) => {
          acc[key] = matchesGroupedByDate[key];
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

      const response = {
        INFORMACIÓN: {
          id: tournament.id,
          name: tournament.name,
          year: tournament.year,
          id_category: tournament.id_category,
          category: category ? category : null,
        },
        PARTIDOS: sortedMatchesGroupedByDate,
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
    const newTournament = {
      id: tournaments.length + 1,
      ...req.body,
    };
    tournaments.push(newTournament);
    await writeJSONData(tournamentsPath, tournaments);
    res.status(200).send({
      code: 200,
      message: "Tournament successfully created",
      data: newTournament,
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
