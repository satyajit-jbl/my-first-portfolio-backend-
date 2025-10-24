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

// app.get("/api/events", async (req, res) => {
//   try {
//     const events = await eventsCollection.find({ isApproved: true }).toArray();
//     res.json(sortByDateAscending(events));
//   } catch (err) {
//     console.error("❌ Error fetching events:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

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

// // Health check
// app.get("/", (req, res) => res.send("🎯 Marathon API is running..."));

// // Export for Vercel
// export default app;

// // Local dev
// if (process.env.NODE_ENV !== "production") {
//   const PORT = process.env.PORT || 5000;
//   app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
// }
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

// Add Event (Create)
app.post("/api/events", async (req, res) => {
  try {
    const payload = req.body;
    const doc = {
      ...payload,
      isApproved: false,
      pendingAction: "create",
      pendingData: payload,
      createdAt: new Date(),
      updatedAt: new Date(),
      requestedAt: new Date(), // ✅ Save request date
    };
    const result = await eventsCollection.insertOne(doc);
    res.json({ message: "⚡ Event submitted — pending admin approval", id: result.insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit event" });
  }
});

// Get Approved Events
app.get("/api/events", async (req, res) => {
  try {
    const events = await eventsCollection.find({ isApproved: true }).toArray();
    res.json(sortByDateAscending(events));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Update Event (pending approval)
app.put("/api/events/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await eventsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          pendingAction: "update",
          pendingData: req.body,
          updatedAt: new Date(),
          requestedAt: new Date(), // ✅ Save request date
        },
      }
    );
    res.json({ message: "⚡ Update submitted — pending approval" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit update" });
  }
});

// Request Delete (pending approval)
app.delete("/api/events/:id/request", async (req, res) => {
  try {
    const { id } = req.params;
    await eventsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          pendingAction: "delete",
          updatedAt: new Date(),
          requestedAt: new Date(), // ✅ Save request date
        },
      }
    );
    res.json({ message: "⚡ Deletion requested — pending approval" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to request delete" });
  }
});

// ----------------- ADMIN ROUTES -----------------

// Get Pending Events
app.get("/api/events/pending", adminAuth, async (req, res) => {
  try {
    const pendings = await eventsCollection
      .find({ pendingAction: { $in: ["create", "update", "delete"] } })
      .sort({ requestedAt: 1 })
      .toArray();
    res.json(pendings);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch pending events" });
  }
});

// Approve Pending Event
app.put("/api/events/:id/approve", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const event = await eventsCollection.findOne({ _id: new ObjectId(id) });
    if (!event) return res.status(404).json({ error: "Not found" });

    const { pendingAction, pendingData } = event;

    if (pendingAction === "create" || pendingAction === "update") {
      await eventsCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            ...pendingData,
            isApproved: true,
            pendingAction: null,
            pendingData: null,
            updatedAt: new Date(),
          },
        }
      );
      return res.json({ message: "✅ Action approved" });
    } else if (pendingAction === "delete") {
      await eventsCollection.deleteOne({ _id: new ObjectId(id) });
      return res.json({ message: "🚫 Event deleted" });
    }

    res.status(400).json({ error: "No pending action found" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to approve" });
  }
});

// Reject Pending Event
app.delete("/api/events/:id/reject", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const event = await eventsCollection.findOne({ _id: new ObjectId(id) });
    if (!event) return res.status(404).json({ error: "Not found" });

    if (event.pendingAction === "create") {
      await eventsCollection.deleteOne({ _id: new ObjectId(id) });
      return res.json({ message: "❌ Create rejected — removed" });
    } else {
      await eventsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { pendingAction: null, pendingData: null, updatedAt: new Date() } }
      );
      return res.json({ message: "❌ Pending request rejected" });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to reject pending action" });
  }
});

// Health check
app.get("/", (req, res) => res.send("🎯 Marathon API is running..."));

// Local dev
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

export default app;
