const rateLimit = require("express-rate-limit");

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Máximo 100 solicitudes por IP
  message: "Demasiadas solicitudes, intenta más tarde.",
});

module.exports = publicLimiter;
