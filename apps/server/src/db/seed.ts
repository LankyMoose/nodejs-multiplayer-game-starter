import { auth } from "../auth.js";
import { db } from "./index.js";
import {
  user,
  userFriend,
  friendRequest,
  account,
  verification,
  session,
} from "./schema.js";

async function seed() {
  console.log("seeding...");
  await Promise.all([
    db.delete(user).then(() => console.log("users deleted")),
    db.delete(userFriend).then(() => console.log("user friends deleted")),
    db.delete(friendRequest).then(() => console.log("friend requests deleted")),
    db.delete(account).then(() => console.log("accounts deleted")),
    db.delete(verification).then(() => console.log("verifications deleted")),
    db.delete(session).then(() => console.log("sessions deleted")),
  ]);
  console.log("all tables cleared.");

  const [user1, user2] = await Promise.all([
    auth.api.signUpEmail({
      body: {
        name: "rob",
        email: "rausten93@gmail.com",
        password: "password123",
      },
    }),
    auth.api.signUpEmail({
      body: {
        name: "bob",
        email: "bob@bob.bob",
        password: "password123",
      },
    }),
  ]);

  console.log("users created:", { user1, user2 });
}

await seed();
