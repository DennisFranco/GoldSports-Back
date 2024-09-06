const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const usersController = require("./controllers/usersController.js");
const fieldsController = require("./controllers/fieldsController.js");
const playersController = require("./controllers/playersController.js");
const teamsController = require("./controllers/teamsController.js");
const matchesController = require("./controllers/matchesController.js");
const classificationsController = require("./controllers/classificationsController.js");
const tournamentController = require("./controllers/tournamentController.js");
const categoriesController = require("./controllers/categoriesController.js");
const groupsController = require("./controllers/groupsController.js");
const eventsController = require("./controllers/eventsController.js");
const refereesController = require("./controllers/refereesController.js");
const matchPlayerNumberController = require("./controllers/matchPlayerNumberController.js");
const playerStatsController = require("./controllers/playerStatsController.js");
const penaltiesController = require("./controllers/penaltiesController.js");

function verificarToken(req, res, next) {
  const bearerHeader = req.headers["authorization"];
  if (typeof bearerHeader !== "undefined") {
    const bearerToken = bearerHeader.split(" ")[1];
    jwt.verify(bearerToken, process.env.SECRET_KEY, (err) => {
      if (err) {
        res.sendStatus(403);
      } else {
        next();
      }
    });
  } else {
    res.sendStatus(403);
  }
}

router
  .post("/login", verificarToken, usersController.loginUser)
  .get("/users", verificarToken, usersController.getAllUsers)
  .get("/roles", verificarToken, usersController.getAllRoles)
  .post("/users", verificarToken, usersController.createUser)
  .put("/users/:id", verificarToken, usersController.editUser)
  .get("/fields", verificarToken, fieldsController.getAllFields)
  .get("/fields/:id", verificarToken, fieldsController.getFieldByID)
  .post("/fields", verificarToken, fieldsController.createField)
  .put("/fields/:id", verificarToken, fieldsController.updateField)
  .delete("/fields/:id", verificarToken, fieldsController.deleteField)
  .get("/players", verificarToken, playersController.getAllPlayers)
  .get("/players/:id", verificarToken, playersController.getPlayerByID)
  .post("/players", verificarToken, playersController.createPlayer)
  .post(
    "/players/addTournament",
    verificarToken,
    playersController.addTournamentToPlayer
  )
  .post(
    "/removeTournamentFromPlayer",
    verificarToken,
    playersController.removeTournamentFromPlayer
  )
  .put("/players/:id", verificarToken, playersController.updatePlayer)
  .delete("/players/:id", verificarToken, playersController.deletePlayer)
  .delete(
    "/players/team/:id_team",
    verificarToken,
    playersController.deletePlayersByTeamID
  )
  .get("/teams", verificarToken, teamsController.getAllTeams)
  .get(
    "/teamsWithoutGroup/:tournamentId",
    verificarToken,
    teamsController.getTeamsWithoutGroup
  )
  .get("/teams/:id", verificarToken, teamsController.getTeamByID)
  .get(
    "/teams/tournament/:id_tournament",
    verificarToken,
    teamsController.getTeamsByTournament
  )
  .get(
    "/players/tournament/:tournamentId/team/:teamId",
    verificarToken,
    teamsController.getPlayersByTournamentAndTeam
  )
  .post("/teams", verificarToken, teamsController.createTeam)
  .put("/teams/:id", verificarToken, teamsController.updateTeam)
  .delete("/teams/:id", verificarToken, teamsController.deleteTeam)
  .get("/matches", verificarToken, matchesController.getAllMatches)
  .get("/matches/:id", verificarToken, matchesController.getMatchByID)
  .get("/download-excel", verificarToken, matchesController.generateXLS)
  .get("/matchData/:id", verificarToken, matchesController.getMatchData)
  .post("/matches", verificarToken, matchesController.createMatch)
  .post(
    "/matches/generate",
    verificarToken,
    matchesController.createTournamentMatches
  )
  .post(
    "/matches/generateKnockout",
    verificarToken,
    matchesController.generateKnockoutMatches
  )
  .put("/matches/:id", verificarToken, matchesController.updateMatch)
  .delete("/matches/:id", verificarToken, matchesController.deleteMatch)
  .post(
    "/matches/walkover",
    verificarToken,
    matchesController.updateMatchStatus
  )
  .post(
    "/matches/cancel",
    verificarToken,
    matchesController.cancelMatchDueToIncident
  )
  .get("/tournaments", verificarToken, tournamentController.getAllTournaments)
  .get(
    "/tournaments/:id",
    verificarToken,
    tournamentController.getTournamentInfo
  )
  .get(
    "/tournaments/:id/teams",
    verificarToken,
    tournamentController.getTournamentTeams
  )
  .get(
    "/tournaments/:id/matches",
    verificarToken,
    tournamentController.getTournamentMatches
  )
  .get(
    "/tournaments/:id/classification",
    verificarToken,
    tournamentController.getTournamentClassification
  )
  .post("/tournaments", verificarToken, tournamentController.createTournament)
  .put(
    "/tournaments/:id",
    verificarToken,
    tournamentController.updateTournament
  )
  .delete(
    "/tournaments/:id",
    verificarToken,
    tournamentController.deleteTournament
  )
  .get("/categories", verificarToken, categoriesController.getAllCategories)
  .get("/categories/:id", verificarToken, categoriesController.getCategoryByID)
  .post("/categories", verificarToken, categoriesController.createCategory)
  .put("/categories/:id", verificarToken, categoriesController.updateCategory)
  .delete(
    "/categories/:id",
    verificarToken,
    categoriesController.deleteCategory
  )
  .get("/groups", verificarToken, groupsController.getAllGroups)
  .get("/groups/:id", verificarToken, groupsController.getGroupByID)
  .get(
    "/groupsByTournament/:id",
    verificarToken,
    groupsController.getGroupsByTournamentID
  )
  .post("/groups", verificarToken, groupsController.createGroup)
  .post("/groups/teams", verificarToken, groupsController.createTeamGroup)
  .put("/groups/:id", verificarToken, groupsController.updateGroup)
  .delete("/groups/:id", verificarToken, groupsController.deleteGroup)
  .get("/events", verificarToken, eventsController.getAllEvents)
  .get("/events/:id", verificarToken, eventsController.getEventByID)
  .post("/events", verificarToken, eventsController.createEvent)
  .put("/events/:id", verificarToken, eventsController.updateEvent)
  .delete("/events/:id", verificarToken, eventsController.deleteEvent)
  .get("/referees", verificarToken, refereesController.getAllReferees)
  .get("/referees/:id", verificarToken, refereesController.getRefereeByID)
  .post("/referees", verificarToken, refereesController.createReferee)
  .put("/referees/:id", verificarToken, refereesController.updateReferee)
  .delete("/referees/:id", verificarToken, refereesController.deleteReferee)
  .post(
    "/matchPlayersNumbers/:idMatch",
    verificarToken,
    matchPlayerNumberController.createMatchPlayerNumbers
  )
  .get(
    "/classifications",
    verificarToken,
    classificationsController.getAllClassifications
  )
  .get("/playerStats", verificarToken, playerStatsController.getAllPlayerStats)
  .get(
    "/playerStats/:playerId/tournament/:tournamentId",
    verificarToken,
    playerStatsController.getPlayerStatsByPlayerAndTournament
  )
  .post("/playerStats", verificarToken, playerStatsController.createPlayerStats)
  .put(
    "/playerStats/:playerId/tournament/:tournamentId",
    verificarToken,
    playerStatsController.updatePlayerStats
  )
  .delete(
    "/playerStats/:playerId/tournament/:tournamentId",
    verificarToken,
    playerStatsController.deletePlayerStats
  )
  .get("/penalties", verificarToken, penaltiesController.getAllPenalties)
  .get("/penalties/:id", verificarToken, penaltiesController.getPenaltyByID)
  .post("/penalties", verificarToken, penaltiesController.createPenalty)
  .put("/penalties/:id", verificarToken, penaltiesController.updatePenalty)
  .delete("/penalties/:id", verificarToken, penaltiesController.deletePenalty);

module.exports = router;