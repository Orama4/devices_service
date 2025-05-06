import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import {userRoutes} from "./routes/userRoutes"; 
//const prisma = new PrismaClient();
import deviceRoutes from "./routes/deviceRoutes"; 
import { subscribe, publish } from "./utils/mqtt_client";
import {createNotificationForDeviceAlert , getAndMarkDeviceAlerts} from "./services/deviceService"


// Configuration des variables d'environnement
dotenv.config();

export const app = express();
const PORT = process.env.NODE_ENV === "test" ? 0 : 5001; 

interface AlertMessage {
  type: string;
  level?: number;
  message: string;
  timestamp: string;
  deviceId: string;
}



// Enhanced CORS configuration
const corsOptions = {
  origin: [
    '*',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept'
  ],
  credentials: true, // If using cookies/sessions
  optionsSuccessStatus: 200 // For legacy browsers
};

// Apply CORS middleware before other middleware
app.use(cors());

// Other middlewares
app.use(express.json());

// Routes
app.use("/users", userRoutes);
app.use("/devices", deviceRoutes);
// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

export const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


subscribe('devices/notifications', async (alert: AlertMessage) => {
  console.log(`🚨 Alerte reçue du dispositif ${alert.deviceId}`);
  console.log(`📝 Type: ${alert.type}`);
  console.log(`📅 Timestamp: ${alert.timestamp}`);
  console.log(`💬 Message: ${alert.message}`);

  // Create the notification for the alert
  await createNotificationForDeviceAlert({ deviceId: alert.deviceId }, alert.message);

  // Get and mark the alerts for the deviceId
  const alerts = await getAndMarkDeviceAlerts(parseInt(alert.deviceId));

  // Handle specific alert types
  if (alert.type === 'battery' && alert.level !== undefined && alert.level < 20) {
    console.warn(`⚠️ Batterie faible (niveau: ${alert.level}%)`);
  }

  if (alert.type === 'connection' && alert.message === 'lost') {
    console.error(`🔌 Perte de connexion détectée pour l'appareil ${alert.deviceId}`);
  }
});

// Graceful shutdown
process.on("SIGINT", () => {
  server.close(() => {
    console.log("\nServer stopped gracefully");
    process.exit(0);
  });
});



