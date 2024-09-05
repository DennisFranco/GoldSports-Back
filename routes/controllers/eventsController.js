const fs = require("fs");
const path = require("path");

const eventsPath = path.join(__dirname, "../../db/events.json");
const matchesPath = path.join(__dirname, "../../db/matches.json");
const playersPath = path.join(__dirname, "../../db/players.json");
const classificationsPath = path.join(
  __dirname,
  "../../db/classifications.json"
);
const penaltiesPath = path.join(__dirname, "../../db/penalties.json");
const playerStatsPath = path.join(__dirname, "../../db/player_stats.json");

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

// Obtener todos los eventos
const getAllEvents = async (req, res) => {
  const events = await getJSONData(eventsPath);

  try {
    if (events) {
      res.status(200).send({
        code: 200,
        message: "Events successfully obtained",
        data: events,
      });
    } else {
      return res.status(500).send("Error reading events from file");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Obtener un evento por ID
const getEventByID = async (req, res) => {
  const events = await getJSONData(eventsPath);

  try {
    if (events) {
      const event = events.find((e) => e.id === parseInt(req.params.id));
      if (event) {
        res.status(200).send({
          code: 200,
          message: "Event successfully obtained",
          data: event,
        });
      } else {
        res.status(404).send("Event not found");
      }
    } else {
      return res.status(500).send("Error reading events from file");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

const createEvent = async (req, res) => {
  try {
    const [events, matches, players, classifications, penalties, playerStats] =
      await Promise.all([
        getJSONData(eventsPath),
        getJSONData(matchesPath),
        getJSONData(playersPath),
        getJSONData(classificationsPath),
        getJSONData(penaltiesPath),
        getJSONData(playerStatsPath),
      ]);

    const { id_player, id_match, id_event_type } = req.body;

    // Verificar si el jugador ya tiene un evento de tipo 3 (tarjeta roja) o dos eventos de tipo 2 (tarjetas amarillas) en este partido
    const playerEvents = events.filter(
      (event) => event.id_player === id_player && event.id_match === id_match
    );

    const redCardEvent = playerEvents.find(
      (event) => event.id_event_type === 3
    );
    const yellowCardEvents = playerEvents.filter(
      (event) => event.id_event_type === 2
    );

    if (redCardEvent || yellowCardEvents.length >= 2) {
      return res.status(400).send({
        code: 400,
        message:
          "El jugador ya está expulsado y no puede tener más eventos en este partido.",
      });
    }

    const newEvent = {
      id: events.length + 1,
      ...req.body,
    };
    events.push(newEvent);

    // Actualizar matches.json si id_event_type es 1, 5, 7
    const matchIndex = matches.findIndex((m) => m.id === newEvent.id_match);
    if (matchIndex !== -1) {
      const match = matches[matchIndex];

      if (newEvent.id_event_type === 1) {
        // Actualizar el resultado del partido
        const player = players.find((p) => p.id === newEvent.id_player);
        if (player) {
          const isLocalTeam = match.local_team === player.id_team;
          if (isLocalTeam) {
            match.local_result += 1;
          } else {
            match.visiting_result += 1;
          }
        }
      } else if (newEvent.id_event_type === 5) {
        // Cambiar el estado del partido a 4
        match.status = 4;
      } else if (newEvent.id_event_type === 7) {
        // Cambiar el estado del partido a 5
        match.status = 5;

        // Actualizar classifications.json
        const localTeam = classifications.find(
          (c) =>
            c.id_team === match.local_team &&
            c.id_tournament === match.id_tournament
        );
        const visitingTeam = classifications.find(
          (c) =>
            c.id_team === match.visiting_team &&
            c.id_tournament === match.id_tournament
        );

        if (localTeam && visitingTeam) {
          // Actualizar partidos jugados
          localTeam.matches_played += 1;
          visitingTeam.matches_played += 1;

          // Actualizar goles a favor y en contra
          localTeam.favor_goals += match.local_result;
          localTeam.goals_against += match.visiting_result;
          visitingTeam.favor_goals += match.visiting_result;
          visitingTeam.goals_against += match.local_result;

          // Actualizar diferencia de goles
          localTeam.goal_difference =
            localTeam.favor_goals - localTeam.goals_against;
          visitingTeam.goal_difference =
            visitingTeam.favor_goals - visitingTeam.goals_against;

          // Actualizar puntos, partidos ganados, empatados y perdidos
          if (match.local_result > match.visiting_result) {
            localTeam.points += 3;
            localTeam.matches_won += 1;
            visitingTeam.lost_matches += 1;
          } else if (match.local_result < match.visiting_result) {
            visitingTeam.points += 3;
            visitingTeam.matches_won += 1;
            localTeam.lost_matches += 1;
          } else {
            localTeam.points += 1;
            visitingTeam.points += 1;
            localTeam.tied_matches += 1;
            visitingTeam.tied_matches += 1;
          }
        }
      }
    }

    // Actualizar player_stats.json si id_event_type es 1, 2, 3
    let playerStat = playerStats.find(
      (ps) =>
        ps.id_player === newEvent.id_player &&
        ps.id_tournament === newEvent.id_tournament
    );

    if (!playerStat) {
      playerStat = {
        id: playerStats.length + 1,
        id_player: newEvent.id_player,
        id_tournament: newEvent.id_tournament,
        games_played: 0,
        goals: 0,
        yellow_cards: 0,
        red_cards: 0,
      };
      playerStats.push(playerStat);
    }

    if (newEvent.id_event_type === 1) {
      playerStat.goals += 1;
    } else if (newEvent.id_event_type === 2) {
      playerStat.yellow_cards += 1;

      if (yellowCardEvents.length + 1 >= 2) {
        penalties.push({
          id: penalties.length + 1,
          id_player: newEvent.id_player,
          id_tournament: newEvent.id_tournament,
          date: new Date().toISOString().split("T")[0],
          description: "Suspendido por acumulación de tarjetas amarillas",
          sanction_duration: 1,
          status: "Vigente",
        });
      }
    } else if (newEvent.id_event_type === 3) {
      playerStat.red_cards += 1;

      penalties.push({
        id: penalties.length + 1,
        id_player: newEvent.id_player,
        id_tournament: newEvent.id_tournament,
        date: new Date().toISOString().split("T")[0],
        description: "Suspendido por tarjeta roja directa",
        sanction_duration: 1,
        status: "Vigente",
      });
    }

    await Promise.all([
      writeJSONData(eventsPath, events),
      writeJSONData(matchesPath, matches),
      writeJSONData(classificationsPath, classifications),
      writeJSONData(playerStatsPath, playerStats),
      writeJSONData(penaltiesPath, penalties),
    ]);

    res.status(200).send({
      code: 200,
      message: "Event successfully created",
      data: newEvent,
    });
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Actualizar un evento por ID
const updateEvent = async (req, res) => {
  try {
    const events = await getJSONData(eventsPath);
    const eventIndex = events.findIndex(
      (e) => e.id === parseInt(req.params.id)
    );
    if (eventIndex !== -1) {
      events[eventIndex] = { id: parseInt(req.params.id), ...req.body };
      await writeJSONData(eventsPath, events);
      res.status(200).send({
        code: 200,
        message: "Event successfully updated",
        data: events[eventIndex],
      });
    } else {
      res.status(404).send("Event not found");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Eliminar un evento por ID
const deleteEvent = async (req, res) => {
  try {
    const events = await getJSONData(eventsPath);
    const eventIndex = events.findIndex(
      (e) => e.id === parseInt(req.params.id)
    );
    if (eventIndex !== -1) {
      const deletedEvent = events.splice(eventIndex, 1);
      await writeJSONData(eventsPath, events);
      res.status(200).send({
        code: 200,
        message: "Event successfully deleted",
        data: deletedEvent,
      });
    } else {
      res.status(404).send("Event not found");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

module.exports = {
  getAllEvents,
  getEventByID,
  createEvent,
  updateEvent,
  deleteEvent,
};
