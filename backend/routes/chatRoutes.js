import express from "express";
import { sendChatMessage } from "../controllers/chatController.js";

const router = express.Router();

router.post("/message", sendChatMessage);

export default router;
