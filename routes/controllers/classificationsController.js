const { getDB } = require("../../config/db");

// Obtener todas las clasificaciones
const getAllClassifications = async (req, res) => {
  try {
    const db = getDB();

    // Obtener los datos desde las colecciones de MongoDB
    const [classifications, tournaments, groups, teams, categories] = await Promise.all([
      db.collection("classifications").find().toArray(),
      db.collection("tournaments").find().toArray(),
      db.collection("groups").find().toArray(),
      db.collection("teams").find().toArray(),
      db.collection("categories").find().toArray(),
    ]);

    const formattedClassifications = {};

    classifications.forEach((classification) => {
      const tournament = tournaments.find(
        (t) => t.id === classification.id_tournament
      );
      const group = groups.find((g) => g.id === classification.id_group);
      const team = teams.find((t) => t.id === classification.id_team);
      const category = tournament ? categories.find((c) => c.id === tournament.id_category) : null;

      const tournamentId = tournament ? tournament.id : "Unknown Tournament";
      const tournamentName = tournament
        ? `${tournament.name} (${tournament.year}, ${category ? category.name : "Unknown Category"})`
        : "Unknown Tournament";
      const groupId = group ? group.id : "Unknown Group";
      const groupName = group ? group.name : "Unknown Group";
      const teamName = team ? team.name : "Unknown Team";

      if (!formattedClassifications[tournamentId]) {
        formattedClassifications[tournamentId] = {
          name: tournamentName,
          groups: {}
        };
      }

      if (!formattedClassifications[tournamentId].groups[groupId]) {
        formattedClassifications[tournamentId].groups[groupId] = {
          name: groupName,
          classifications: []
        };
      }

      formattedClassifications[tournamentId].groups[groupId].classifications.push({
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
        formattedClassifications[tournamentId].groups[groupId].classifications.sort((a, b) => {
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
      message: "Classifications successfully obtained",
      data: formattedClassifications,
    });
  } catch (err) {
    console.error("Error in getAllClassifications:", err);
    res.status(500).send("Server error");
  }
};

module.exports = {
  getAllClassifications,
};
