const fs = require("fs");
const path = require("path");

const classificationsPath = path.join(
  __dirname,
  "../../db/classifications.json"
);
const tournamentsPath = path.join(__dirname, "../../db/tournaments.json");
const groupsPath = path.join(__dirname, "../../db/groups.json");
const teamsPath = path.join(__dirname, "../../db/teams.json");
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

// Obtener todas las clasificaciones
const getAllClassifications = async (req, res) => {
  try {
    const [classifications, tournaments, groups, teams, categories] = await Promise.all([
      getJSONData(classificationsPath),
      getJSONData(tournamentsPath),
      getJSONData(groupsPath),
      getJSONData(teamsPath),
      getJSONData(categoriesPath),
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
