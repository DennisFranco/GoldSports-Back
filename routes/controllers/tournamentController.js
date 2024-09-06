const { getDB } = require("../../config/db");

// Obtener todos los torneos con información de la categoría
const getAllTournaments = async (req, res) => {
  try {
    const db = getDB();
    const [tournaments, categories] = await Promise.all([
      db.collection("tournaments").find().toArray(),
      db.collection("categories").find().toArray(),
    ]);

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
  } catch (err) {
    res.status(500).send("Server error");
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
      return res.status(404).send("Tournament not found");
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
    };

    res.status(200).send({
      code: 200,
      message: "Tournament information successfully obtained",
      data: response,
    });
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Obtener partidos del torneo
const getTournamentMatches = async (req, res) => {
  try {
    const db = getDB();
    const [matches, teams, places, groups] = await Promise.all([
      db.collection("matches").find().toArray(),
      db.collection("teams").find().toArray(),
      db.collection("fields").find().toArray(),
      db.collection("groups").find().toArray(),
    ]);

    const tournamentMatches = matches.filter(
      (match) => match.id_tournament === parseInt(req.params.id)
    );

    const matchesGroupedByGroup = {};

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

    res.status(200).send({
      code: 200,
      message: "Tournament matches successfully obtained",
      data: matchesGroupedByGroup,
    });
  } catch (err) {
    res.status(500).send("Server error");
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
      message: "Tournament classification successfully obtained",
      data: formattedClassifications,
    });
  } catch (err) {
    res.status(500).send("Server error");
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
      message: "Tournament teams successfully obtained",
      data: tournamentTeamsByGroup,
    });
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Crear un nuevo torneo
const createTournament = async (req, res) => {
  try {
    const db = getDB();
    const [tournaments, groups] = await Promise.all([
      db.collection("tournaments").find().toArray(),
      db.collection("groups").find().toArray(),
    ]);

    const { numberGroups, ...tournamentData } = req.body;

    const newTournament = {
      id: tournaments.length + 1,
      ...tournamentData,
    };
    await db.collection("tournaments").insertOne(newTournament);

    const groupNames = Array.from(
      { length: numberGroups },
      (_, i) => `Grupo ${String.fromCharCode(65 + i)}`
    );

    const newGroups = groupNames.map((name, index) => ({
      id: groups.length + 1 + index,
      id_tournament: newTournament.id,
      name,
    }));

    await db.collection("groups").insertMany(newGroups);

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
    const db = getDB();
    const updatedTournament = await db
      .collection("tournaments")
      .findOneAndUpdate(
        { id: parseInt(req.params.id) },
        { $set: req.body },
        { returnOriginal: false }
      );

    if (updatedTournament.value) {
      res.status(200).send({
        code: 200,
        message: "Tournament successfully updated",
        data: updatedTournament.value,
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
          "Cannot delete tournament: there are matches assigned to this tournament",
      });
    }

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

    const deletedTournament = await db
      .collection("tournaments")
      .findOneAndDelete({ id: tournamentId });

    if (deletedTournament.value) {
      res.status(200).send({
        code: 200,
        message: "Tournament successfully deleted",
        data: deletedTournament.value,
      });
    } else {
      res.status(404).send("Tournament not found");
    }
  } catch (err) {
    res.status(500).send("Server error");
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
