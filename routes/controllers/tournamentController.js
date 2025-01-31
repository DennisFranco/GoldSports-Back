const { getDB } = require("../../config/db");

const getAllTournaments = async (req, res) => {
  try {
    const db = getDB();

    // Definir el filtro según el rol del usuario

    const filter = req.user.role === 1 ? {} : { created_by: req.user.id };

    // Obtener torneos y categorías simultáneamente con la condición aplicada a torneos
    const [tournaments, categories] = await Promise.all([
      db.collection("tournaments").find(filter).toArray(),
      db.collection("categories").find().toArray(),
    ]);

    // Mapear los torneos con su respectiva categoría
    const tournamentsWithCategory = tournaments.map((tournament) => {
      const category = categories.find(
        (cat) => cat.id === tournament.id_category
      );
      return {
        ...tournament,
        category: category || null, // Si no se encuentra la categoría, asignar null
      };
    });

    res.status(200).send({
      code: 200,
      message: "Torneos obtenidos con éxito",
      data: tournamentsWithCategory,
    });
  } catch (err) {
    res.status(500).send({
      code: 500,
      message: "Error del servidor",
      error: err.message,
    });
  }
};

// Obtener información del torneo
const getTournamentInfo = async (req, res) => {
  try {
    const db = getDB();

    const [tournaments, categories, matches, events, players] =
      await Promise.all([
        db.collection("tournaments").find().toArray(),
        db.collection("categories").find().toArray(),
        db.collection("matches").find().toArray(),
        db.collection("events").find().toArray(),
        db.collection("players").find().toArray(),
      ]);

    const tournament = tournaments.find(
      (t) => t.id === parseInt(req.params.id)
    );
    if (!tournament) {
      return res.status(404).send("Torneo no encontrado");
    }

    const category = categories.find(
      (cat) => cat.id === tournament.id_category
    );

    const tournamentMatches = matches.filter(
      (match) =>
        match.id_tournament === tournament.id &&
        match.status === 5 &&
        match.observations !== "Descanso"
    );

    const totalMatchesPlayed = tournamentMatches.length;
    let totalGoals = 0;
    let totalYellowCards = 0;
    let totalRedCards = 0;
    const playerStats = {};

    events.forEach((event) => {
      const match = tournamentMatches.find((m) => m.id === event.id_match);
      if (match) {
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

    let topScorer = null;
    let mostYellowCards = null;
    let mostRedCards = null;

    Object.keys(playerStats).forEach((playerId) => {
      const stats = playerStats[playerId];

      if (
        totalGoals &&
        (topScorer === null || stats.goals > playerStats[topScorer]?.goals)
      ) {
        topScorer = playerId;
      }
      if (
        totalYellowCards &&
        (mostYellowCards === null ||
          stats.yellowCards > playerStats[mostYellowCards]?.yellowCards)
      ) {
        mostYellowCards = playerId;
      }
      if (
        totalRedCards &&
        (mostRedCards === null ||
          stats.redCards > playerStats[mostRedCards]?.redCards)
      ) {
        mostRedCards = playerId;
      }
    });

    const response = {
      id: tournament.id,
      name: tournament.name,
      year: tournament.year,
      id_category: tournament.id_category,
      category: category ? category : null,
      classification: tournament.classification,
      total_matches_played: totalMatchesPlayed,
      total_goals: totalGoals,
      total_yellow_cards: totalYellowCards,
      total_red_cards: totalRedCards,
      top_scorer: topScorer
        ? {
            name: players.find((p) => p.id === parseInt(topScorer))?.name,
            goals: playerStats[topScorer].goals,
            photo: players.find((p) => p.id === parseInt(topScorer))?.photo,
          }
        : {
            name: "Sin goles",
            redCards: totalGoals,
          },
      most_yellow_cards: mostYellowCards
        ? {
            name: players.find((p) => p.id === parseInt(mostYellowCards))?.name,
            yellowCards: playerStats[mostYellowCards].yellowCards,
            photo: players.find((p) => p.id === parseInt(mostYellowCards))
              ?.photo,
          }
        : {
            name: "Sin tarjetas amarillas",
            redCards: totalYellowCards,
          },
      most_red_cards: mostRedCards
        ? {
            name: players.find((p) => p.id === parseInt(mostRedCards))?.name,
            redCards: playerStats[mostRedCards].redCards,
            photo: players.find((p) => p.id === parseInt(mostRedCards))?.photo,
          }
        : {
            name: "Sin tarjetas rojas",
            redCards: totalRedCards,
          },
    };

    res.status(200).send({
      code: 200,
      message: "Información del torneo obtenida con éxito",
      data: response,
    });
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

const getTournamentMatches = async (req, res) => {
  try {
    const db = getDB();

    // Consultar todas las colecciones necesarias en paralelo
    const [matches, teams, places, groups] = await Promise.all([
      db.collection("matches").find().toArray(),
      db.collection("teams").find().toArray(),
      db.collection("fields").find().toArray(),
      db.collection("groups").find().toArray(),
    ]);

    // Filtrar los partidos del torneo solicitado
    const tournamentMatches = matches.filter(
      (match) => match.id_tournament === parseInt(req.params.id)
    );

    const matchesGroupedByGroup = {};

    // Agrupar partidos por grupo
    groups.forEach((group) => {
      const groupMatches = tournamentMatches.filter(
        (match) => match.id_group === group.id
      );

      const matchesGroupedByRound = groupMatches.reduce((accRound, match) => {
        const roundKey = `FECHA ${match.round}`;
        if (!accRound[roundKey]) {
          accRound[roundKey] = [];
        }
        accRound[roundKey].push({
          ...match,
          local_team:
            teams.find((team) => team.id === match.local_team)?.name ||
            "Equipo no asignado",
          visiting_team:
            teams.find((team) => team.id === match.visiting_team)?.name ||
            "Equipo no asignado",
          place: places.find((p) => p.id === match.place)?.name || "ND",
          hour_start: match.hour_start || "ND",
          date: match.date || "ND",
        });
        return accRound;
      }, {});

      matchesGroupedByGroup[group.name] = matchesGroupedByRound;
    });

    // Agrupar partidos por instancias finales
    const finalStages = [
      { key: "FINAL", type: "Final" },
      { key: "SEMIFINAL", type: "Semifinal" },
      { key: "CUARTOS DE FINAL", type: "Cuartos de Final" },
      { key: "OCTAVOS DE FINAL", type: "Octavos de Final" },
      { key: "DIECISÉISAVOS DE FINAL", type: "Dieciseisavos de Final" },
    ];

    finalStages.forEach(({ key, type }) => {
      const stageMatches = tournamentMatches.filter(
        (match) => match.type === type
      );

      if (stageMatches.length > 0) {
        // Agrupar partidos con claves como PARTIDO 1, PARTIDO 2, etc.
        const matchesByKey = stageMatches.reduce((acc, match, index) => {
          const matchKey =
            stageMatches.length === 1
              ? "PARTIDO UNICO"
              : `PARTIDO ${index + 1}`;
          if (!acc[matchKey]) {
            acc[matchKey] = [];
          }
          acc[matchKey].push({
            ...match,
            local_team:
              teams.find((team) => team.id === match.local_team)?.name ||
              "Equipo no asignado",
            visiting_team:
              teams.find((team) => team.id === match.visiting_team)?.name ||
              "Equipo no asignado",
            place: places.find((p) => p.id === match.place)?.name || "ND",
            hour_start: match.hour_start || "ND",
            date: match.date || "ND",
          });
          return acc;
        }, {});

        matchesGroupedByGroup[key] = matchesByKey;
      }
    });

    res.status(200).send({
      code: 200,
      message: "Partidos del torneo obtenidos con éxito",
      data: matchesGroupedByGroup,
    });
  } catch (err) {
    console.error("Error al obtener los partidos del torneo:", err);
    res.status(500).send("Error del servidor");
  }
};

// Obtener clasificación del torneo
const getTournamentClassification = async (req, res) => {
  try {
    const db = getDB();
    const [classifications, teams, groups] = await Promise.all([
      db.collection("classifications").find().toArray(),
      db.collection("teams").find().toArray(),
      db.collection("groups").find().toArray(),
    ]);

    const tournamentClassifications = classifications.filter(
      (classification) =>
        classification.id_tournament === parseInt(req.params.id)
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
        id_team: classification.id_team,
        id_group: classification.id_group,
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

    res.status(200).send({
      code: 200,
      message: "Clasificación del torneo obtenida con éxito",
      data: formattedClassifications,
    });
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Obtener equipos del torneo
const getTournamentTeams = async (req, res) => {
  try {
    const db = getDB();
    const [groups, teamsGroups, teams] = await Promise.all([
      db.collection("groups").find().toArray(),
      db.collection("teams_groups").find().toArray(),
      db.collection("teams").find().toArray(),
    ]);

    const tournamentTeamsByGroup = groups.reduce((acc, group) => {
      if (group.id_tournament === parseInt(req.params.id)) {
        const groupTeams = teamsGroups
          .filter((tg) => tg.id_group === group.id)
          .map((tg) => teams.find((t) => t.id === tg.id_team))
          .filter((team) => team !== undefined);

        acc[group.name] = groupTeams;
      }
      return acc;
    }, {});

    res.status(200).send({
      code: 200,
      message: "Equipos del torneo obtenidos con éxito",
      data: tournamentTeamsByGroup,
    });
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

const createTournament = async (req, res) => {
  try {
    const db = getDB();

    const { numberGroups, ...tournamentData } = req.body;

    // Obtener el último ID y generar uno nuevo
    const lastID = await db
      .collection("tournaments")
      .findOne({}, { sort: { id: -1 } });
    const newId = lastID ? lastID.id + 1 : 1;

    const newTournament = {
      id: newId,
      edition: tournamentData.year, // Si year viene en tournamentData
      year: new Date().getFullYear(), // Año actual
      name: tournamentData.name,
      id_category: tournamentData.id_category,
      classification: tournamentData.classification,
      created_by: req.user.id,
    };
    await db.collection("tournaments").insertOne(newTournament);

    const groupNames = Array.from(
      { length: numberGroups },
      (_, i) => `Grupo ${String.fromCharCode(65 + i)}`
    );

    // Obtener el último ID y generar uno nuevo
    const lastIDGroup = await db
      .collection("groups") // Corregí esta línea para consultar en la colección correcta
      .findOne({}, { sort: { id: -1 } });
    const newIdGroup = lastIDGroup ? lastIDGroup.id + 1 : 1;

    const newGroups = groupNames.map((name, index) => ({
      id: newIdGroup + index,
      id_tournament: newTournament.id,
      name,
    }));

    await db.collection("groups").insertMany(newGroups);

    res.status(200).send({
      code: 200,
      message: "Torneo y grupos creados con éxito",
      data: {
        tournament: newTournament,
        groups: newGroups,
      },
    });
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Actualizar un torneo por ID
const updateTournament = async (req, res) => {
  try {
    const db = getDB();
    const updatedTournament = await db
      .collection("tournaments")
      .findOneAndUpdate(
        { id: parseInt(req.params.id) },
        { $set: req.body },
        { returnOriginal: false }
      );

    if (updatedTournament) {
      res.status(200).send({
        code: 200,
        message: "Torneo actualizado con éxito",
        data: updatedTournament,
      });
    } else {
      res.status(404).send("Torneo no encontrado");
    }
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

// Eliminar un torneo por ID
const deleteTournament = async (req, res) => {
  try {
    const db = getDB();
    const [matches, groups, classifications, teamsGroups] = await Promise.all([
      db.collection("matches").find().toArray(),
      db.collection("groups").find().toArray(),
      db.collection("classifications").find().toArray(),
      db.collection("teams_groups").find().toArray(),
    ]);

    const tournamentId = parseInt(req.params.id);

    const hasMatches = matches.some(
      (match) => match.id_tournament === tournamentId
    );
    if (hasMatches) {
      return res.status(400).send({
        code: 400,
        message:
          "No se puede eliminar el torneo: hay partidos asignados a este torneo",
      });
    }

    const hasGroups = groups.some(
      (group) => group.id_tournament === tournamentId
    );
    if (hasGroups) {
      return res.status(400).send({
        code: 400,
        message:
          "No se puede eliminar el torneo: hay grupos creados para este torneo",
      });
    }

    const hasClassifications = classifications.some(
      (classification) => classification.id_tournament === tournamentId
    );
    if (hasClassifications) {
      return res.status(400).send({
        code: 400,
        message:
          "No se puede eliminar el torneo: hay clasificaciones relacionadas con este torneo",
      });
    }

    const hasTeamsInGroups = teamsGroups.some((teamGroup) => {
      const group = groups.find((g) => g.id === teamGroup.id_group);
      return group && group.id_tournament === tournamentId;
    });
    if (hasTeamsInGroups) {
      return res.status(400).send({
        code: 400,
        message:
          "No se puede eliminar el torneo: hay equipos asignados a grupos en este torneo",
      });
    }

    const deletedTournament = await db
      .collection("tournaments")
      .findOneAndDelete({ id: tournamentId });

    if (deletedTournament) {
      res.status(200).send({
        code: 200,
        message: "Torneo eliminado con éxito",
        data: deletedTournament,
      });
    } else {
      res.status(404).send("Torneo no encontrado");
    }
  } catch (err) {
    res.status(500).send("Error del servidor");
  }
};

module.exports = {
  getAllTournaments,
  getTournamentInfo,
  createTournament,
  updateTournament,
  deleteTournament,
  getTournamentMatches,
  getTournamentClassification,
  getTournamentTeams,
};
