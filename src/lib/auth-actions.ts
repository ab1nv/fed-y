"use server";

import { redirect } from "next/navigation";
import { db } from "./db";
import { hashPassword, verifyPassword } from "./password";
import { clearSessionCookie, createSession, homeFor, setSessionCookie } from "./session";
import { loginSchema, signupSchema } from "./schemas";

export type FormState = { error: string } | null;

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Enter a valid username and password (min 8 characters)." };

  const user = await db.user.findUnique({ where: { username: parsed.data.username.toLowerCase() } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash)))
    return { error: "Incorrect username or password." };

  const token = await createSession({
    sub: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
  });
  await setSessionCookie(token);
  const next = String(formData.get("next") ?? "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : homeFor(user.role));
}

export async function signupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    username: formData.get("username"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Please fix the highlighted fields." };

  const d = parsed.data;
  const clash = await db.user.findFirst({
    where: { OR: [{ username: d.username.toLowerCase() }, { email: d.email.toLowerCase() }] },
  });
  if (clash) return { error: "That username or email is already registered." };

  const user = await db.user.create({
    data: {
      name: d.name,
      username: d.username.toLowerCase(),
      email: d.email.toLowerCase(),
      passwordHash: await hashPassword(d.password),
      role: d.role,
      ...(d.role === "DRIVER" ? { driver: { create: { phone: d.phone ?? "" } } } : {}),
    },
  });

  const token = await createSession({ sub: user.id, name: user.name, username: user.username, role: user.role });
  await setSessionCookie(token);
  redirect(homeFor(user.role));
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/");
}
