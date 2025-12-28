// assets/roles.js
export const ROLE_MAP = {
  // ใส่ email ของเกม และ พอมแพมให้ตรง
  "spank11122spank@gmail.com": { role: "หมูอ้วน", name: "เกม" },
  "PAMPAM_EMAIL@gmail.com": { role: "หมูจิ๋ว", name: "พอมแพม" },
};

export function getProfileByEmail(email) {
  if (!email) return null;
  return ROLE_MAP[email.toLowerCase()] || { role: "ผู้ใช้", name: email };
}
