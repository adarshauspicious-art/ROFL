import express from "express";
import { webLogin , webRegister} from "../controllers/webAuthController.js";

const router = express.Router();

router.post("/web/login", webLogin);
router.post("/web/user-register", webRegister);

export default router;