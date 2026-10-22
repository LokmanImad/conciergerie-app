import {
  safeSmtpErrorCode,
  SmtpConfigurationError,
  verifySmtpConfiguration,
} from "../lib/smtp.mjs";

try {
  await verifySmtpConfiguration();
  console.log("Connexion SMTP chiffrée et authentification réussies.");
  console.log(
    "Aucun e-mail envoyé. La réception réelle reste à tester via le formulaire.",
  );
} catch (error) {
  if (error instanceof SmtpConfigurationError) {
    console.error(error.message);
    console.error(
      "Complétez .env.local à partir de .env.example, puis relancez cette commande.",
    );
  } else {
    console.error(
      `Vérification SMTP impossible (${safeSmtpErrorCode(error)}).`,
    );
    console.error(
      "Vérifiez le serveur sortant, le port, les identifiants et le certificat auprès de votre hébergeur.",
    );
  }
  // Do not print a raw error: providers may include private information in it.
  process.exitCode = 1;
}
