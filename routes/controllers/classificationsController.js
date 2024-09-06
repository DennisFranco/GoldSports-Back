const { getDB } = require("../../config/db");

// Obtener todas las clasificaciones
const getAllClassifications = async (req, res) => {
  try {
    const db = getDB();

    const [classifications, tournaments, groups, teams, categories] =
      await Promise.all([
        db.collection("classifications").find().toArray(),
        db.collection("tournaments").find().toArray(),
        db.collection("groups").find().toArray(),
        db.collection("teams").find().toArray(),
        db.collection("categories").find().toArray(),
      ]);

    const formattedClassifications = {};

    classifications.forEach((classification) => {
      const tournament = tournaments.find(
        (t) => t._id.toString() === classification.id_tournament.toString()
      );
      const group = groups.find(
        (g) => g._id.toString() === classification.id_group.toString()
      );
      const team = teams.find(
        (t) => t._id.toString() === classification.id_team.toString()
      );
      const category = tournament
        ? categories.find(
            (c) => c._id.toString() === tournament.id_category.toString()
          )
        : null;

      const tournamentId = tournament
        ? tournament._id.toString()
        : "Torneo desconocido";
      const tournamentName = tournament
        ? `${tournament.name} (${tournament.year}, ${
            category ? category.name : "Categoría desconocida"
          })`
        : "Torneo desconocido";
      const groupId = group ? group._id.toString() : "Grupo desconocido";
      const groupName = group ? group.name : "Grupo desconocido";
      const teamName = team ? team.name : "Equipo desconocido";

      if (!formattedClassifications[tournamentId]) {
        formattedClassifications[tournamentId] = {
          name: tournamentName,
          groups: {},
        };
      }

      if (!formattedClassifications[tournamentId].groups[groupId]) {
        formattedClassifications[tournamentId].groups[groupId] = {
          name: groupName,
          classifications: [],
        };
      }

      formattedClassifications[tournamentId].groups[
        groupId
      ].classifications.push({
        team: teamName,
        points: classification.points,
        matches_played: classification.matches_played,
        matches_won: classification.matches_won,
        tied_matches: classification.tied_matches,
        lost_matches: classification.lost_matches,
        favor_goals: classification.favor_goals,
        goals_against: classification.goals_against,
        goal_difference: classification.goal_difference,
      });
    });

    // Ordenar clasificaciones
    for (const tournamentId in formattedClassifications) {
      for (const groupId in formattedClassifications[tournamentId].groups) {
        formattedClassifications[tournamentId].groups[
          groupId
        ].classifications.sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.goal_difference !== a.goal_difference)
            return b.goal_difference - a.goal_difference;
          if (b.favor_goals !== a.favor_goals)
            return b.favor_goals - a.favor_goals;
          return a.goals_against - b.goals_against;
        });
      }
    }

    res.status(200).send({
      code: 200,
      message: "Clasificaciones obtenidas exitosamente",
      data: formattedClassifications,
    });
  } catch (err) {
    console.error("Error al obtener clasificaciones:", err);
    res.status(500).send("Error del servidor");
  }
};

module.exports = {
  getAllClassifications,
};
