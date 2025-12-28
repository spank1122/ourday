// assets/roles.js
export const ROLE_MAP = {
  // ใส่ email ของเกม และ พอมแพมให้ตรง
  "spank11122spank@gmail.com": { role: "หมูอ้วน", name: "เกม" },
  "PAMPAM_EMAIL@gmail.com": { role: "หมูจิ๋ว", name: "พอมแพม" },
};

export function getProfileByEmail(email) {
  const e = (email || "").toLowerCase().trim();

  if (e === "spank11122spank@gmail.com") return { id: "game", name: "หมูอ้วน (เกม)" };
  if (e === "แฟน@gmail.com") return { id: "pompam", name: "หมูจิ๋ว (พอมแพม)" };

  return null;
}
