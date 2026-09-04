import PasswordRecoveryForm from "../PasswordRecoveryForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <PasswordRecoveryForm
      mode="reset"
      token={params.token}
      invalidToken={params.error === "INVALID_TOKEN" || !params.token}
    />
  );
}
