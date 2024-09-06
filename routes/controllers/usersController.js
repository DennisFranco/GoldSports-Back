const { getDB } = require("../../config/db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Obtener todos los usuarios
const getAllUsers = async (req, res) => {
  try {
    const db = getDB();
    const users = await db.collection("users").find().toArray();
    const roles = await db.collection("roles").find().toArray();

    if (users && roles) {
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
      return res
        .status(500)
        .send("Error fetching users or roles from database");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Obtener todos los roles
const getAllRoles = async (req, res) => {
  try {
    const db = getDB();
    const roles = await db.collection("roles").find().toArray();

    if (roles) {
      res.status(200).send({
        code: 200,
        message: "Successfully obtained roles",
        data: roles,
      });
    } else {
      return res.status(500).send("Error fetching roles from database");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Iniciar sesión
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const db = getDB();
    const user = await db.collection("users").findOne({ email });

    if (!user) {
      return res.status(401).send({
        code: 401,
        message: "User doesn't exist",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).send({
        code: 401,
        message: "Password incorrect",
      });
    }

    if (user.status !== 1) {
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
        return res.status(200).send({
          code: 200,
          message: "Successful login",
          token,
          user: {
            ...user,
            password: undefined, // Omitir la contraseña
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

    if (!name || !email || !password || !role) {
      return res.status(400).send({
        code: 400,
        message: "Name, email, password, and role are required fields",
      });
    }

    const db = getDB();
    const [users, roles] = await Promise.all([
      db.collection("users").find().toArray(),
      db.collection("roles").find().toArray(),
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
      id: users.length + 1, // O usar un enfoque de generación de IDs
      name,
      email,
      password: hashedPassword,
      role,
      status: status || 1,
      phoneNumber: phoneNumber || "",
    };

    await db.collection("users").insertOne(newUser);

    res.status(200).send({
      code: 200,
      message: "User successfully created",
    });
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// Editar un usuario existente
const editUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, status, phoneNumber } = req.body;

    const db = getDB();
    const [user, roles] = await Promise.all([
      db.collection("users").findOne({ id: parseInt(id) }),
      db.collection("roles").find().toArray(),
    ]);

    if (!user) {
      return res.status(404).send({
        code: 404,
        message: "User not found",
      });
    }

    if (role) {
      const validRole = roles.find((r) => r.id === role);
      if (!validRole) {
        return res.status(400).send({
          code: 400,
          message: "Invalid role",
        });
      }
    }

    let hashedPassword;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 12);
    }

    const updatedUser = {
      ...user,
      name: name || user.name,
      email: email || user.email,
      password: hashedPassword || user.password,
      role: role || user.role,
      status: status !== undefined ? status : user.status,
      phoneNumber: phoneNumber || user.phoneNumber,
    };

    await db
      .collection("users")
      .updateOne({ id: parseInt(id) }, { $set: updatedUser });

    res.status(200).send({
      code: 200,
      message: "User successfully updated",
      data: updatedUser,
    });
  } catch (err) {
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
