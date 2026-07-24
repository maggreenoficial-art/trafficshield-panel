export async function logoutPanel(): Promise<void> {
  await fetch("/api/admin/auth", { method: "DELETE", credentials: "same-origin" });
  window.location.assign("/login");
}
