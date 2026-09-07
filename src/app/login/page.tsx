import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Sign in — FedY" };

export default async function LoginPage(props: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await props.searchParams;
  const safe = next && next.startsWith("/") && next !== "/login" ? next : undefined;
  return <AuthForm mode="login" next={safe} />;
}
