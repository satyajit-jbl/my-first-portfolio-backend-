// import express from "express";
// import cors from "cors";
// import dotenv from "dotenv";
// import { MongoClient, ObjectId } from "mongodb";

// dotenv.config();

// const app = express();
// app.use(express.json());

// // ---- CORS config ----
// app.use(
//   cors({
//     origin: [
//       "http://localhost:5173",
//       "http://localhost:5174",
//       "https://satyajit-ghosh.netlify.app",
//     ],
//     methods: ["GET", "POST", "PUT", "DELETE"],
//     credentials: true,
//   })
// );

// // ---- MongoDB setup ----
// const MONGODB_URI = process.env.MONGODB_URI;
// const DB_NAME = "marathonDB";
// const client = new MongoClient(MONGODB_URI);
// let eventsCollection;

// async function connectDB() {
//   if (!eventsCollection) {
//     try {
//       await client.connect();
//       const db = client.db(DB_NAME);
//       eventsCollection = db.collection("events");
//       console.log("✅ MongoDB connected");
//     } catch (err) {
//       console.error("❌ MongoDB connection error:", err);
//     }
//   }
// }
// await connectDB();

// // ---- Admin middleware ----
// function adminAuth(req, res, next) {
//   const adminSecret = req.headers["x-admin-secret"];
//   if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
//     return res.status(403).json({ error: "❌ Unauthorized: Admin password required" });
//   }
//   next();
// }

// // ---- Helper: sort by date ----
// function sortByDateAscending(arr) {
//   return arr.sort((a, b) => new Date(a.date) - new Date(b.date));
// }

// // ----------------- PUBLIC ROUTES -----------------

// // Add new event
// app.post("/api/events", async (req, res) => {
//   try {
//     const payload = req.body;
//     const doc = {
//       ...payload,
//       isApproved: false,
//       pendingAction: "create",
//       pendingData: payload,
//       createdAt: new Date(),
//       updatedAt: new Date(),
//     };
//     const result = await eventsCollection.insertOne(doc);
//     res.json({ message: "⚡ Event submitted — pending admin approval", id: result.insertedId });
//   } catch (err) {
//     console.error("❌ Error submitting event:", err);
//     res.status(500).json({ error: "Failed to submit event" });
//   }
// });

// // Fetch approved events
// app.get("/api/events", async (req, res) => {
//   try {
//     const events = await eventsCollection.find({ isApproved: true }).toArray();
//     res.json(sortByDateAscending(events));
//   } catch (err) {
//     console.error("❌ Error fetching events:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// // Update event (pending)
// app.put("/api/events/:id", async (req, res) => {
//   try {
//     const { id } = req.params;
//     await eventsCollection.updateOne(
//       { _id: new ObjectId(id) },
//       { $set: { pendingAction: "update", pendingData: req.body, updatedAt: new Date() } }
//     );
//     res.json({ message: "⚡ Update submitted — pending approval" });
//   } catch (err) {
//     console.error("❌ Error submitting update:", err);
//     res.status(500).json({ error: "Failed to submit update" });
//   }
// });

// // Request delete
// app.delete("/api/events/:id/request", async (req, res) => {
//   try {
//     const { id } = req.params;
//     await eventsCollection.updateOne(
//       { _id: new ObjectId(id) },
//       { $set: { pendingAction: "delete", updatedAt: new Date() } }
//     );
//     res.json({ message: "⚡ Deletion requested — pending approval" });
//   } catch (err) {
//     console.error("❌ Error requesting delete:", err);
//     res.status(500).json({ error: "Failed to request delete" });
//   }
// });




// // ----------------- ADMIN ROUTES -----------------

// app.get("/api/events/pending", adminAuth, async (req, res) => {
//   try {
//     const pendings = await eventsCollection
//       .find({ pendingAction: { $in: ["create", "update", "delete"] } })
//       .sort({ updatedAt: 1 })
//       .toArray();
//     res.json(pendings);
//   } catch (err) {
//     res.status(500).json({ error: "Failed to fetch pending events" });
//   }
// });

// app.put("/api/events/:id/approve", adminAuth, async (req, res) => {
//   try {
//     const { id } = req.params;
//     const event = await eventsCollection.findOne({ _id: new ObjectId(id) });
//     if (!event) return res.status(404).json({ error: "Not found" });

//     const { pendingAction, pendingData } = event;

//     if (pendingAction === "create" || pendingAction === "update") {
//       await eventsCollection.updateOne(
//         { _id: new ObjectId(id) },
//         {
//           $set: {
//             ...pendingData,
//             isApproved: true,
//             pendingAction: null,
//             pendingData: null,
//             updatedAt: new Date(),
//           },
//         }
//       );
//       return res.json({ message: "✅ Action approved" });
//     } else if (pendingAction === "delete") {
//       await eventsCollection.deleteOne({ _id: new ObjectId(id) });
//       return res.json({ message: "🚫 Event deleted" });
//     }

//     res.status(400).json({ error: "No pending action found" });
//   } catch (err) {
//     console.error("❌ Error approving:", err);
//     res.status(500).json({ error: "Failed to approve" });
//   }
// });

// app.delete("/api/events/:id/reject", adminAuth, async (req, res) => {
//   try {
//     const { id } = req.params;
//     const event = await eventsCollection.findOne({ _id: new ObjectId(id) });
//     if (!event) return res.status(404).json({ error: "Not found" });

//     if (event.pendingAction === "create") {
//       await eventsCollection.deleteOne({ _id: new ObjectId(id) });
//       return res.json({ message: "❌ Create rejected — removed" });
//     } else {
//       await eventsCollection.updateOne(
//         { _id: new ObjectId(id) },
//         { $set: { pendingAction: null, pendingData: null, updatedAt: new Date() } }
//       );
//       return res.json({ message: "❌ Pending request rejected" });
//     }
//   } catch (err) {
//     res.status(500).json({ error: "Failed to reject pending action" });
//   }
// });

// // Health check route
// app.get("/", (req, res) => res.send("🎯 Marathon API is running..."));

// // ✅ Important for Vercel: export app (no app.listen)
// export default app;

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";

dotenv.config();

const app = express();
app.use(express.json());

// ---- CORS config ----
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://satyajit-ghosh.netlify.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// ---- MongoDB setup ----
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = "marathonDB";
const client = new MongoClient(MONGODB_URI);
let eventsCollection;

async function connectDB() {
  if (!eventsCollection) {
    try {
      await client.connect();
      const db = client.db(DB_NAME);
      eventsCollection = db.collection("events");
      console.log("✅ MongoDB connected");
    } catch (err) {
      console.error("❌ MongoDB connection error:", err);
    }
  }
}
await connectDB();

// ---- Admin middleware ----
function adminAuth(req, res, next) {
  const adminSecret = req.headers["x-admin-secret"];
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: "❌ Unauthorized: Admin password required" });
  }
  next();
}

// ---- Helper: sort by date ----
function sortByDateAscending(arr) {
  return arr.sort((a, b) => new Date(a.date) - new Date(b.date));
}

// ----------------- PUBLIC ROUTES -----------------

// Fetch approved events
app.get("/api/events", async (req, res) => {
  try {
    const events = await eventsCollection.find({ isApproved: true }).toArray();
    res.json(sortByDateAscending(events));
  } catch (err) {
    console.error("❌ Error fetching events:", err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------- ADMIN ROUTES (Password Protected) -----------------

// Add new event
app.post("/api/events", adminAuth, async (req, res) => {
  try {
    const payload = req.body;
    const doc = {
      ...payload,
      isApproved: true, // auto-approved if admin provides password
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await eventsCollection.insertOne(doc);
    res.json({ message: "⚡ Event added successfully", id: result.insertedId });
  } catch (err) {
    console.error("❌ Error adding event:", err);
    res.status(500).json({ error: "Failed to add event" });
  }
});

// Edit existing event
app.put("/api/events/:id", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, updatedAt: new Date() };
    const result = await eventsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: "Event not found" });
    res.json({ message: "⚡ Event updated successfully" });
  } catch (err) {
    console.error("❌ Error updating event:", err);
    res.status(500).json({ error: "Failed to update event" });
  }
});

// Delete an event
app.delete("/api/events/:id", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await eventsCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return res.status(404).json({ error: "Event not found" });
    res.json({ message: "🚫 Event deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting event:", err);
    res.status(500).json({ error: "Failed to delete event" });
  }
});

// Fetch all events (admin view)
app.get("/api/events/all", adminAuth, async (req, res) => {
  try {
    const events = await eventsCollection.find().toArray();
    res.json(sortByDateAscending(events));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// Health check route
app.get("/", (req, res) => res.send("🎯 Marathon API is running..."));

// ✅ Important for Vercel: export app (no app.listen)
export default app;
