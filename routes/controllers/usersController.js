const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const usersPath = path.join(__dirname, "../../db/users.json");
const rolesPath = path.join(__dirname, "../../db/roles.json");

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

const getAllUsers = async (req, res) => {
  try {
    const users = await getJSONData(usersPath);
    const roles = await getJSONData(rolesPath);

    if (users) {
      const roleFilter = parseInt(req.query.role);

      // Filtrar usuarios por rol si se proporciona un parámetro de consulta de rol
      const filteredUsers = roleFilter
        ? users.filter((user) => user.role === roleFilter)
        : users;

      // Combinar los usuarios con sus roles y excluir la contraseña
      const usersWithRoles = filteredUsers.map((user) => {
        const rol = roles.find((rol) => rol.id === user.role);
        const { password, ...userWithoutPassword } = user; // Excluir la contraseña
        return {
          ...userWithoutPassword,
          nameRole: rol ? rol.name : "Role not found",
        };
      });

      res.status(200).send({
        code: 200,
        message: "Users successfully obtained",
        data: usersWithRoles,
      });
    } else {
      return res.status(500).send("Error reading users from file");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

const getAllRoles = async (req, res) => {
  try {
    const roles = await getJSONData(rolesPath);

    if (roles) {
      res.status(200).send({
        code: 200,
        message: "Successfully obtained roles",
        data: roles,
      });
    } else {
      return res.status(500).send("Error reading roles from file");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body; // Recibir nombre y contraseña del cuerpo de la solicitud
  try {
    const users = await getJSONData(usersPath);

    // Buscar el usuario por correo electrónico
    const user = users.find((user) => user.email === email);

    if (!user) {
      return res.status(401).send({
        code: 401,
        message: "User doesn't exist",
      });
    }

    // Verificar la contraseña
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).send({
        code: 401,
        message: "Password incorrect",
      });
    }

    if (user.status !== 1) {
      // Usuario inhabilitado
      return res.status(401).send({
        code: 401,
        message: "Disabled user",
      });
    }

    // Crear token JWT
    jwt.sign(
      { user },
      process.env.SECRET_KEY,
      { expiresIn: "8h" },
      (err, token) => {
        if (err) {
          return res.status(500).send("Error creating token");
        }
        // Usuario encontrado y contraseña correcta
        return res.status(200).send({
          code: 200,
          message: "Successful login",
          token,
          user: {
            ...user,
            password: undefined, // Omitir la contraseña del objeto de usuario
          },
        });
      }
    );
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Crear un nuevo usuario
const createUser = async (req, res) => {
  try {
    const { name, email, password, role, status, phoneNumber } = req.body;

    console.warn(req.body);
    // Validar campos requeridos
    if (!name || !email || !password || !role) {
      return res.status(400).send({
        code: 400,
        message: "Name, email, password, and role are required fields",
      });
    }

    const [users, roles] = await Promise.all([
      getJSONData(usersPath),
      getJSONData(rolesPath),
    ]);

    // Validar rol
    const validRole = roles.find((r) => r.id === role);
    if (!validRole) {
      return res.status(400).send({
        code: 400,
        message: "Invalid role",
      });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 12);

    // Crear nuevo usuario
    const newUser = {
      id: users.length + 1,
      name,
      email,
      password: hashedPassword,
      role,
      status: status || 1, // Por defecto activo
      phoneNumber: phoneNumber || "",
    };

    // Agregar usuario al array
    users.push(newUser);

    // Escribir datos actualizados en el archivo
    await writeJSONData(usersPath, users);

    res.status(200).send({
      code: 200,
      message: "User successfully created",
    });
  } catch (err) {
    console.error("Error in createUser:", err);
    res.status(500).send("Server error");
  }
};

// Editar un usuario existente
const editUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, status, phoneNumber } = req.body;

    const [users, roles] = await Promise.all([
      getJSONData(usersPath),
      getJSONData(rolesPath),
    ]);

    const userIndex = users.findIndex((u) => u.id === parseInt(id));
    if (userIndex === -1) {
      return res.status(404).send({
        code: 404,
        message: "User not found",
      });
    }

    // Validar rol
    if (role) {
      const validRole = roles.find((r) => r.id === role);
      if (!validRole) {
        return res.status(400).send({
          code: 400,
          message: "Invalid role",
        });
      }
    }

    // Encriptar contraseña si se proporciona
    let hashedPassword;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 12);
    }

    // Actualizar usuario
    const updatedUser = {
      ...users[userIndex],
      name: name || users[userIndex].name,
      email: email || users[userIndex].email,
      password: hashedPassword || users[userIndex].password,
      role: role || users[userIndex].role,
      status: status !== undefined ? status : users[userIndex].status,
      phoneNumber: phoneNumber || users[userIndex].phoneNumber,
    };

    users[userIndex] = updatedUser;

    // Escribir datos actualizados en el archivo
    await writeJSONData(usersPath, users);

    // Eliminar la contraseña antes de devolver la respuesta
    const { password: _, ...userWithoutPassword } = updatedUser;

    res.status(200).send({
      code: 200,
      message: "User successfully updated",
      data: userWithoutPassword,
    });
  } catch (err) {
    console.error("Error in editUser:", err);
    res.status(500).send("Server error");
  }
};

module.exports = {
  loginUser,
  getAllUsers,
  getAllRoles,
  createUser,
  editUser,
};
