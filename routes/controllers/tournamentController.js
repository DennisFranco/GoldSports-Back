const { getDB } = require("../../config/db");
const { ObjectId } = require("mongodb");

// Obtener todos los torneos con información de la categoría
const getAllTournaments = async (req, res) => {
  try {
    const db = getDB();
    const tournaments = await db.collection("tournaments").find({}).toArray();
    const categories = await db.collection("categories").find({}).toArray();

    const tournamentsWithCategory = tournaments.map((tournament) => {
      const category = categories.find(
        (cat) => cat._id.toString() === tournament.id_category.toString()
      );
      return {
        ...tournament,
        category: category || null,
      };
    });

    res.status(200).send({
      code: 200,
      message: "Torneos obtenidos exitosamente",
      data: tournamentsWithCategory,
    });
  } catch (err) {
    console.error("Error en getAllTournaments:", err);
    res.status(500).send("Error en el servidor");
  }
};

// Obtener información del torneo
const getTournamentInfo = async (req, res) => {
  try {
    const db = getDB();
    const tournamentId = req.params.id;
    const tournament = await db
      .collection("tournaments")
      .findOne({ _id: new ObjectId(tournamentId) });

    if (!tournament) {
      return res.status(404).send("Torneo no encontrado");
    }

    const category = await db
      .collection("categories")
      .findOne({ _id: new ObjectId(tournament.id_category) });

    const matches = await db
      .collection("matches")
      .find({
        id_tournament: new ObjectId(tournamentId),
        status: 5,
        observations: { $ne: "Descanso" },
      })
      .toArray();

    const totalMatchesPlayed = matches.length;
    const events = await db
      .collection("events")
      .find({ id_match: { $in: matches.map((m) => m._id) } })
      .toArray();

    const players = await db.collection("players").find({}).toArray();

    let totalGoals = 0;
    let totalYellowCards = 0;
    let totalRedCards = 0;
    const playerStats = {};

    events.forEach((event) => {
      if (event.id_event_type === 1) {
        totalGoals++;
        playerStats[event.id_player] = playerStats[event.id_player] || {
          goals: 0,
          yellowCards: 0,
          redCards: 0,
        };
        playerStats[event.id_player].goals++;
      } else if (event.id_event_type === 2) {
        totalYellowCards++;
        playerStats[event.id_player] = playerStats[event.id_player] || {
          goals: 0,
          yellowCards: 0,
          redCards: 0,
        };
        playerStats[event.id_player].yellowCards++;
      } else if (event.id_event_type === 3) {
        totalRedCards++;
        playerStats[event.id_player] = playerStats[event.id_player] || {
          goals: 0,
          yellowCards: 0,
          redCards: 0,
        };
        playerStats[event.id_player].redCards++;
      }
    });

    let topScorer = null;
    let mostYellowCards = null;
    let mostRedCards = null;

    Object.keys(playerStats).forEach((playerId) => {
      const stats = playerStats[playerId];
      if (!topScorer || stats.goals > playerStats[topScorer].goals) {
        topScorer = playerId;
      }
      if (
        !mostYellowCards ||
        stats.yellowCards > playerStats[mostYellowCards].yellowCards
      ) {
        mostYellowCards = playerId;
      }
      if (
        !mostRedCards ||
        stats.redCards > playerStats[mostRedCards].redCards
      ) {
        mostRedCards = playerId;
      }
    });

    const response = {
      id: tournament._id,
      name: tournament.name,
      year: tournament.year,
      id_category: tournament.id_category,
      category: category || null,
      total_matches_played: totalMatchesPlayed,
      total_goals: totalGoals,
      total_yellow_cards: totalYellowCards,
      total_red_cards: totalRedCards,
      top_scorer: topScorer
        ? players.find((p) => p._id.toString() === topScorer.toString()).name
        : null,
      most_yellow_cards: mostYellowCards
        ? players.find((p) => p._id.toString() === mostYellowCards.toString())
            .name
        : null,
      most_red_cards: mostRedCards
        ? players.find((p) => p._id.toString() === mostRedCards.toString()).name
        : null,
    };

    res.status(200).send({
      code: 200,
      message: "Información del torneo obtenida exitosamente",
      data: response,
    });
  } catch (err) {
    console.error("Error en getTournamentInfo:", err);
    res.status(500).send("Error en el servidor");
  }
};

// Obtener partidos del torneo
const getTournamentMatches = async (req, res) => {
  try {
    const db = getDB();
    const tournamentId = req.params.id;
    const matches = await db
      .collection("matches")
      .find({ id_tournament: new ObjectId(tournamentId) })
      .toArray();

    const teams = await db.collection("teams").find({}).toArray();
    const places = await db.collection("fields").find({}).toArray();
    const groups = await db.collection("groups").find({}).toArray();

    const matchesGroupedByGroup = {};

    groups.forEach((group) => {
      const groupMatches = matches.filter(
        (match) => match.id_group.toString() === group._id.toString()
      );

      const matchesGroupedByRound = groupMatches.reduce((accRound, match) => {
        const roundKey = `FECHA ${match.round}`;
        if (!accRound[roundKey]) {
          accRound[roundKey] = [];
        }
        accRound[roundKey].push({
          ...match,
          local_team:
            teams.find(
              (team) => team._id.toString() === match.local_team.toString()
            )?.name || "Equipo no asignado",
          visiting_team:
            teams.find(
              (team) => team._id.toString() === match.visiting_team?.toString()
            )?.name || "Equipo no asignado",
          place:
            places.find((p) => p._id.toString() === match.place?.toString())
              ?.name || "ND",
          hour_start: match.hour_start || "ND",
          date: match.date || "ND",
        });
        return accRound;
      }, {});

      matchesGroupedByGroup[group.name] = matchesGroupedByRound;
    });

    res.status(200).send({
      code: 200,
      message: "Partidos del torneo obtenidos exitosamente",
      data: matchesGroupedByGroup,
    });
  } catch (err) {
    console.error("Error en getTournamentMatches:", err);
    res.status(500).send("Error en el servidor");
  }
};

// Obtener clasificación del torneo
const getTournamentClassification = async (req, res) => {
  try {
    const db = getDB();
    const tournamentId = req.params.id;
    const classifications = await db
      .collection("classifications")
      .find({ id_tournament: new ObjectId(tournamentId) })
      .toArray();

    const teams = await db.collection("teams").find({}).toArray();
    const groups = await db.collection("groups").find({}).toArray();

    const formattedClassifications = {};

    classifications.forEach((classification) => {
      const group = groups.find(
        (g) => g._id.toString() === classification.id_group.toString()
      )?.name;
      const team = teams.find(
        (t) => t._id.toString() === classification.id_team.toString()
      )?.name;

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

    res.status(200).send({
      code: 200,
      message: "Clasificación del torneo obtenida exitosamente",
      data: formattedClassifications,
    });
  } catch (err) {
    console.error("Error en getTournamentClassification:", err);
    res.status(500).send("Error en el servidor");
  }
};

// Obtener equipos de un torneo por grupo
const getTournamentTeams = async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;

    const groups = await db.collection("groups").find({ id_tournament: new ObjectId(id) }).toArray();
    const teamsGroups = await db.collection("teams_groups").find({ id_group: { $in: groups.map(g => g._id) } }).toArray();
    const teams = await db.collection("teams").find({}).toArray();

    const tournamentTeamsByGroup = groups.reduce((acc, group) => {
      const groupTeams = teamsGroups
        .filter((tg) => tg.id_group.toString() === group._id.toString())
        .map((tg) => teams.find((t) => t._id.toString() === tg.id_team.toString()))
        .filter((team) => team !== undefined);

      acc[group.name] = groupTeams;
      return acc;
    }, {});

    res.status(200).send({
      code: 200,
      message: "Equipos del torneo obtenidos exitosamente",
      data: tournamentTeamsByGroup,
    });
  } catch (err) {
    console.error("Error en getTournamentTeams:", err);
    res.status(500).send("Error en el servidor");
  }
};

// Crear un nuevo torneo
const createTournament = async (req, res) => {
  try {
    const db = getDB();
    const { numberGroups, ...tournamentData } = req.body;

    const newTournament = await db.collection("tournaments").insertOne({
      ...tournamentData,
      id_category: new ObjectId(tournamentData.id_category),
    });

    const groupNames = Array.from(
      { length: numberGroups },
      (_, i) => `Grupo ${String.fromCharCode(65 + i)}`
    );

    const newGroups = groupNames.map((name) => ({
      id_tournament: newTournament.insertedId,
      name,
    }));

    await db.collection("groups").insertMany(newGroups);

    res.status(200).send({
      code: 200,
      message: "Torneo y grupos creados exitosamente",
      data: {
        tournament: newTournament.ops[0],
        groups: newGroups,
      },
    });
  } catch (err) {
    console.error("Error en createTournament:", err);
    res.status(500).send("Error en el servidor");
  }
};

// Actualizar un torneo por ID
const updateTournament = async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const updatedTournament = await db
      .collection("tournaments")
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: req.body },
        { returnOriginal: false }
      );

    if (!updatedTournament.value) {
      return res.status(404).send("Torneo no encontrado");
    }

    res.status(200).send({
      code: 200,
      message: "Torneo actualizado exitosamente",
      data: updatedTournament.value,
    });
  } catch (err) {
    console.error("Error en updateTournament:", err);
    res.status(500).send("Error en el servidor");
  }
};

// Eliminar un torneo por ID
const deleteTournament = async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;

    const hasMatches = await db
      .collection("matches")
      .findOne({ id_tournament: new ObjectId(id) });
    if (hasMatches) {
      return res.status(400).send({
        code: 400,
        message:
          "No se puede eliminar el torneo: existen partidos asignados a este torneo",
      });
    }

    const hasGroups = await db
      .collection("groups")
      .findOne({ id_tournament: new ObjectId(id) });
    if (hasGroups) {
      return res.status(400).send({
        code: 400,
        message:
          "No se puede eliminar el torneo: existen grupos creados para este torneo",
      });
    }

    const hasClassifications = await db
      .collection("classifications")
      .findOne({ id_tournament: new ObjectId(id) });
    if (hasClassifications) {
      return res.status(400).send({
        code: 400,
        message:
          "No se puede eliminar el torneo: existen clasificaciones relacionadas con este torneo",
      });
    }

    const hasTeamsInGroups = await db.collection("teams_groups").findOne({
      id_group: { $in: await db.collection("groups").find({ id_tournament: new ObjectId(id) }).map(g => g._id).toArray() },
    });
    if (hasTeamsInGroups) {
      return res.status(400).send({
        code: 400,
        message:
          "No se puede eliminar el torneo: existen equipos asignados a grupos en este torneo",
      });
    }

    const deletedTournament = await db
      .collection("tournaments")
      .deleteOne({ _id: new ObjectId(id) });

    if (!deletedTournament.deletedCount) {
      return res.status(404).send("Torneo no encontrado");
    }

    res.status(200).send({
      code: 200,
      message: "Torneo eliminado exitosamente",
    });
  } catch (err) {
    console.error("Error en deleteTournament:", err);
    res.status(500).send("Error en el servidor");
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
