import { Router } from "express";
import { body } from "express-validator";
import * as authController from "../controllers/authController";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/auth";

const router = Router();

router.post(
  "/register",
  validate([
    body("name").trim().notEmpty().isLength({ min: 2, max: 100 }),
    body("email").isEmail().normalizeEmail(),
    body("password")
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
    body("bio").optional().trim().isLength({ max: 500 }),
  ]),
  authController.register,
);

router.post(
  "/login",
  validate([
    body("email").isEmail().normalizeEmail(),
    body("password").notEmpty(),
  ]),
  authController.login,
);

router.post("/refresh", authController.refresh);
router.post("/logout", authenticate, authController.logout);

export default router;
