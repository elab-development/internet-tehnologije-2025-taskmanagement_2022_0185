const BREVO_SMTP_EMAIL_URL = "https://api.brevo.com/v3/smtp/email";

export type SendAddedToTeamEmailParams = {
  toEmail: string;
  toName?: string;
  teamName: string;
  inviterEmail?: string;
};

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isBrevoSandboxEnabled() {
  return (process.env.BREVO_SANDBOX ?? "false").trim().toLowerCase() === "true";
}

export async function sendAddedToTeamEmail(
  params: SendAddedToTeamEmailParams
) {
  const brevoApiKey = getRequiredEnv("BREVO_API_KEY");
  const senderEmail = getRequiredEnv("BREVO_SENDER_EMAIL");
  const senderName = process.env.BREVO_SENDER_NAME?.trim() || "Task App";

  const introText = params.inviterEmail
    ? `You were added to the team "${params.teamName}" by ${params.inviterEmail}.`
    : `You were added to the team "${params.teamName}".`;

  const payload: Record<string, unknown> = {
    sender: {
      email: senderEmail,
      name: senderName
    },
    to: [
      params.toName
        ? { email: params.toEmail, name: params.toName }
        : { email: params.toEmail }
    ],
    subject: `Added to team: ${params.teamName}`,
    textContent: `${introText}\n\nYou can now access team resources in Task App.`,
    htmlContent: `<p>${escapeHtml(introText)}</p><p>You can now access team resources in Task App.</p>`
  };

  if (isBrevoSandboxEnabled()) {
    payload.headers = {
      "X-Sib-Sandbox": "drop"
    };
  }

  const response = await fetch(BREVO_SMTP_EMAIL_URL, {
    method: "POST",
    headers: {
      "api-key": brevoApiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Brevo API request failed (${response.status}): ${errorBody || "empty response"}`
    );
  }
}
