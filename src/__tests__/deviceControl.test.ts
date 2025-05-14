import request from "supertest";
import express from "express";
import deviceRouter from "../routes/deviceRoutes";
import { disconnectClient } from "../utils/mqtt_client";

const app = express();
app.use(express.json());
app.use("/devices", deviceRouter);

describe("POST /devices/control", () => {
  it("should succeed with valid payload", async () => {
    const res = await request(app)
      .post("/devices/control")
      .send({ macAddress: "E4:5F:01:08:18:C7", action: "activer" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: "ok",
      message: "Command activer executed",
      response: {
        active: true,
        online: true,
        status: "Actif",
      },
    });
  });

  it("should fail if macAddress is missing", async () => {
    const res = await request(app)
      .post("/devices/control")
      .send({ action: "activer" });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "macAddress is required");
  });

  it("should fail if action is missing", async () => {
    const res = await request(app)
      .post("/devices/control")
      .send({ macAddress: "AA:BB:CC:DD:EE:FF" });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error", "action is required");
  });

  it("should fail if action is invalid", async () => {
    const res = await request(app)
      .post("/devices/control")
      .send({ macAddress: "AA:BB:CC:DD:EE:FF", action: "invalid_action" });
    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({
      error: true,
      message: "Failed to control device, Invalid Command.",
    });
  });

  it("should fail if macAddress is invalid or device is not connected", async () => {
    const res = await request(app)
      .post("/devices/control")
      .send({ macAddress: "00:00:00:00:00:00", action: "activer" }); // invalid or offline MAC
    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({
      error: true,
      message: "ODB is not activated or not responding",
    });
  }, 8000);

  afterAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    disconnectClient();
  });
});
