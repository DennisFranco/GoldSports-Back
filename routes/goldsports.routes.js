const express = require("express");
const router = express.Router();
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
const matchPlayerNumberController = require("./controllers/matchPlayerNumberController.js");
const playerStatsController = require("./controllers/playerStatsController.js");
const penaltiesController = require("./controllers/penaltiesController.js");
const webController = require("./controllers/webController.js");
const verifyToken = require("./middlewares/verifyToken");
const publicLimiter = require("./middlewares/rateLimiter");

router
  .post("/login", usersController.loginUser)
  .get("/users", verifyToken, usersController.getAllUsers)
  .get("/roles", verifyToken, usersController.getAllRoles)
  .post("/users", verifyToken, usersController.createUser)
  .put("/users/:id", verifyToken, usersController.editUser)
  .get("/fields", verifyToken, fieldsController.getAllFields)
  .get("/fields/:id", verifyToken, fieldsController.getFieldByID)
  .post("/fields", verifyToken, fieldsController.createField)
  .put("/fields/:id", verifyToken, fieldsController.updateField)
  .delete("/fields/:id", verifyToken, fieldsController.deleteField)
  .get("/players", verifyToken, playersController.getAllPlayers)
  .get("/players/:id", verifyToken, playersController.getPlayerByID)
  .post("/players", verifyToken, playersController.createPlayer)
  .post(
    "/players/addTournament",
    verifyToken,
    playersController.addTournamentToPlayer
  )
  .post(
    "/removeTournamentFromPlayer",
    verifyToken,
    playersController.removeTournamentFromPlayer
  )
  .put("/players/:id", verifyToken, playersController.updatePlayer)
  .delete("/players/:id", verifyToken, playersController.deletePlayer)
  .delete(
    "/players/team/:id_team",
    verifyToken,
    playersController.deletePlayersByTeamID
  )
  .get("/teams", verifyToken, teamsController.getAllTeams)
  .get(
    "/teamsWithoutGroup/:tournamentId",
    verifyToken,
    teamsController.getTeamsWithoutGroup
  )
  .get("/teams/:id", verifyToken, teamsController.getTeamByID)
  .get(
    "/teams/tournament/:id_tournament",
    verifyToken,
    teamsController.getTeamsByTournament
  )
  .get(
    "/players/tournament/:tournamentId/team/:teamId",
    verifyToken,
    teamsController.getPlayersByTournamentAndTeam
  )
  .post("/teams", verifyToken, teamsController.createTeam)
  .put("/teams/:id", verifyToken, teamsController.updateTeam)
  .delete("/teams/:id", verifyToken, teamsController.deleteTeam)
  .get("/matches", verifyToken, matchesController.getAllMatches)
  .get("/matches/:id", verifyToken, matchesController.getMatchByID)
  .get("/download-excel/match/:id", verifyToken, matchesController.generateXLS)
  .get("/matchData/:id", verifyToken, matchesController.getMatchData)
  .post("/matches", verifyToken, matchesController.createMatch)
  .post(
    "/matches/generate",
    verifyToken,
    matchesController.createTournamentMatches
  )
  .post(
    "/matches/generateKnockout",
    verifyToken,
    matchesController.generateKnockoutMatches
  )
  .put("/matches/:id", verifyToken, matchesController.updateMatch)
  .delete("/matches/:id", verifyToken, matchesController.deleteMatch)
  .post("/matches/walkover", verifyToken, matchesController.updateMatchStatus)
  .post(
    "/matches/cancel",
    verifyToken,
    matchesController.cancelMatchDueToIncident
  )
  .get("/tournaments", verifyToken, tournamentController.getAllTournaments)
  .get("/tournaments/:id", verifyToken, tournamentController.getTournamentInfo)
  .get(
    "/tournaments/:id/teams",
    verifyToken,
    tournamentController.getTournamentTeams
  )
  .get(
    "/tournaments/:id/matches",
    verifyToken,
    tournamentController.getTournamentMatches
  )
  .get(
    "/tournaments/:id/classification",
    verifyToken,
    tournamentController.getTournamentClassification
  )
  .post("/tournaments", verifyToken, tournamentController.createTournament)
  .put("/tournaments/:id", verifyToken, tournamentController.updateTournament)
  .delete(
    "/tournaments/:id",
    verifyToken,
    tournamentController.deleteTournament
  )
  .get("/categories", verifyToken, categoriesController.getAllCategories)
  .get("/categories/:id", verifyToken, categoriesController.getCategoryByID)
  .post("/categories", verifyToken, categoriesController.createCategory)
  .put("/categories/:id", verifyToken, categoriesController.updateCategory)
  .delete("/categories/:id", verifyToken, categoriesController.deleteCategory)
  .get("/groups", verifyToken, groupsController.getAllGroups)
  .get("/groups/:id", verifyToken, groupsController.getGroupByID)
  .get(
    "/groupsByTournament/:id",
    verifyToken,
    groupsController.getGroupsByTournamentID
  )
  .post("/groups", verifyToken, groupsController.createGroup)
  .post("/groups/teams", verifyToken, groupsController.createTeamGroup)
  .post("/groups/teams/delete", verifyToken, groupsController.deleteTeamGroup)
  .put("/groups/:id", verifyToken, groupsController.updateGroup)
  .delete("/groups/:id", verifyToken, groupsController.deleteGroup)
  .get("/events", verifyToken, eventsController.getAllEvents)
  .get("/events/:id", verifyToken, eventsController.getEventByID)
  .post("/events", verifyToken, eventsController.createEvent)
  .put("/events/:id", verifyToken, eventsController.updateEvent)
  .delete("/events/:id", verifyToken, eventsController.deleteEvent)
  .post("/send-whatsapp/:id", verifyToken, eventsController.sendMessage)
  .post(
    "/matchPlayersNumbers/:idMatch",
    verifyToken,
    matchPlayerNumberController.createMatchPlayerNumbers
  )
  .get(
    "/classifications",
    verifyToken,
    classificationsController.getAllClassifications
  )
  .put(
    "/update-classifications",
    verifyToken,
    classificationsController.createClassified
  )
  .get("/playerStats", verifyToken, playerStatsController.getAllPlayerStats)
  .get(
    "/playerStats/:playerId/tournament/:tournamentId",
    verifyToken,
    playerStatsController.getPlayerStatsByPlayerAndTournament
  )
  .post("/playerStats", verifyToken, playerStatsController.createPlayerStats)
  .put(
    "/playerStats/:playerId/tournament/:tournamentId",
    verifyToken,
    playerStatsController.updatePlayerStats
  )
  .delete(
    "/playerStats/:playerId/tournament/:tournamentId",
    verifyToken,
    playerStatsController.deletePlayerStats
  )
  .get("/penalties", verifyToken, penaltiesController.getAllPenalties)
  .get("/penalties/:id", verifyToken, penaltiesController.getPenaltyByID)
  .post("/penalties", verifyToken, penaltiesController.createPenalty)
  .put("/penalties/:id", verifyToken, penaltiesController.updatePenalty)
  .delete("/penalties/:id", verifyToken, penaltiesController.deletePenalty)
  .get("/torneos", publicLimiter, webController.getAllTournaments)
  .get("/tablas", publicLimiter, webController.getAllClassifications);

module.exports = router;
