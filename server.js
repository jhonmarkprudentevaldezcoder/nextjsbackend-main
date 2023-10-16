const express = require("express");
const mongoose = require("mongoose");
const Patient = require("./models/patientModel");
const Announcements = require("./models/announcemenModel");
const Checkup = require("./models/checkupModel");
const Schedules = require("./models/scheduleModel");
const CheckupsHistory = require("./models/checkupHistoryModel");

const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const app = express();

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

//default route
app.get("/", (req, res) => {
  res.send("SUCCESS");
});

// fetch all checkups
app.get("/checkups", async (req, res) => {
  try {
    const checkups = await Checkup.find({});
    res.status(200).json(checkups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// fetch all schedules
app.get("/schedules", async (req, res) => {
  try {
    const schedules = await Schedules.find({});
    res.status(200).json(schedules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// add schedules
app.post("/insert-schedule", async (req, res) => {
  try {
    const schedule = await Schedules.create(req.body);
    res.status(200).json(schedule);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});

-(
  // fetch all checkup history
  app.get("/checkups-history", async (req, res) => {
    try {
      const checkupshistory = await CheckupsHistory.find({});
      res.status(200).json(checkupshistory);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  })
);

app.get("/announcements/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const announcements = await Announcements.find({ rfid: id });

    if (announcements.length === 0) {
      return res.status(404).json({ message: "No matching records found" });
    }

    res.status(200).json(announcements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//search
/* app.get("/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}); */

// add
/* app.post("/products", async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(200).json(product);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
 */
// update a product
/* app.put("/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndUpdate(id, req.body);
    // we cannot find any product in database
    if (!product) {
      return res
        .status(404)
        .json({ message: `cannot find any product with ID ${id}` });
    }
    const updatedProduct = await Product.findById(id);
    res.status(200).json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}); */

// delete a product
/* 
app.delete("/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return res
        .status(404)
        .json({ message: `cannot find any product with ID ${id}` });
    }
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}); */

//register
app.post("/register", async (req, res) => {
  const { email } = req.body;
  const { rfid } = req.body;

  try {
    // Check if the rfid is registered
    const existingRfid = await Patient.findOne({ rfid });

    if (!existingRfid) {
      try {
        // Check if the email is already taken
        const existingUser = await Patient.findOne({ email });

        if (existingUser) {
          return res.status(400).json({ message: "Email already taken." });
        }

        // If the email is not taken, create the user
        const patient = await Patient.create(req.body);
        res.status(200).json(patient);
        console.log("User registered!");
      } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
      }
    } else {
      res.status(500).json({ message: "rfid not found" });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});

//login

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find the user by email
    const patient = await Patient.findOne({ email });

    if (!patient) {
      return res
        .status(401)
        .json({ message: "Authentication failed. User not found." });
    }

    // Compare the provided password with the stored password
    if (patient.password !== password) {
      return res
        .status(401)
        .json({ message: "Authentication failed. Incorrect password." });
    }

    // Create a JWT token
    const token = jwt.sign({ userId: patient._id }, "your-secret-key", {
      expiresIn: "1h",
    });

    // Set the token as a cookie (optional)
    res.cookie("jwt", token, { httpOnly: true, maxAge: 3600000 }); // 1 hour

    // Respond with the token as a Bearer token
    res.status(200).json({
      message: "Authentication successful",
      token: `${token}`,
      userId: patient._id,
      name: patient.name,
      email: patient.email,
      userRfid: patient.rfid,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

//check authentication

function authenticateToken(req, res, next) {
  // Get the token from the request headers
  const token = req.headers.authorization;

  if (!token || !token.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Unauthorized. Missing or invalid token." });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token.replace("Bearer ", ""), "your-secret-key");

    // Attach the decoded user information to the request object
    req.patient = decoded;

    // Continue to the next middleware
    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized. Invalid token." });
  }
}

app.get("/protected", authenticateToken, (req, res) => {
  // If the middleware passes, the user is authenticated
  // You can access the user information from req.user
  res.status(200).json({
    message: "Protected resource accessed by user: " + req.patient.userId,
  });
});

mongoose.set("strictQuery", false);
mongoose
  .connect(
    "mongodb+srv://shainealferez:sonseung1@capstone.rbfyljo.mongodb.net/PRMS"
  )
  .then(() => {
    console.log("connected to MongoDB");
    app.listen(3000, () => {
      console.log(`Node API app is running on port 3000`);
    });
  })
  .catch((error) => {
    console.log(error);
  });
