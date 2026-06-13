import { randomInt } from "node:crypto";

export const generateOtp = () => randomInt(100000, 1000000).toString();
