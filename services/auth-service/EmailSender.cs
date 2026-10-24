using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

public static class EmailSender {
    private static readonly string ResendApiKey = Environment.GetEnvironmentVariable("RESEND_API_KEY") ?? "";
    private static readonly string SendGridApiKey = Environment.GetEnvironmentVariable("SENDGRID_API_KEY") ?? "";

    public static async Task SendEmail(string to, string subject, string bodyHtml) {
        // 1. Intentar envío ultrarrápido con Resend
        if (!string.IsNullOrWhiteSpace(ResendApiKey)) {
            try {
                using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(5) };
                client.DefaultRequestHeaders.Add("Authorization", $"Bearer {ResendApiKey}");

                var resendPayload = new {
                    from = "BioAsset Services <onboarding@resend.dev>",
                    to = new[] { to },
                    subject = subject,
                    html = bodyHtml
                };

                var resendJson = JsonSerializer.Serialize(resendPayload);
                var resendContent = new StringContent(resendJson, Encoding.UTF8, "application/json");

                var resendResponse = await client.PostAsync("https://api.resend.com/emails", resendContent);

                if (resendResponse.IsSuccessStatusCode) {
                    Console.WriteLine($"[Resend] Email enviado exitosamente a {to} en tiempo real.");
                    return;
                } else {
                    var error = await resendResponse.Content.ReadAsStringAsync();
                    Console.WriteLine($"[Resend] No se pudo enviar por Resend ({error}). Intentando fallback con SendGrid...");
                }
            } catch (Exception ex) {
                Console.WriteLine($"[Resend] Excepción al enviar: {ex.Message}");
            }
        }

        // 2. Fallback con SendGrid si Resend no está configurado con dominio público para ese destinatario
        if (!string.IsNullOrWhiteSpace(SendGridApiKey)) {
            try {
                using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(5) };
                client.DefaultRequestHeaders.Add("Authorization", $"Bearer {SendGridApiKey}");

                var payload = new {
                    personalizations = new[] {
                        new {
                            to = new[] { new { email = to } },
                            subject = subject
                        }
                    },
                    from = new { email = "victor.rivera@upch.pe", name = "BioAsset Services" },
                    content = new[] {
                        new { type = "text/html", value = bodyHtml }
                    }
                };

                var json = JsonSerializer.Serialize(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await client.PostAsync("https://api.sendgrid.com/v3/mail/send", content);

                if (response.IsSuccessStatusCode) {
                    Console.WriteLine($"[SendGrid Fallback] Email enviado exitosamente a {to}");
                } else {
                    var error = await response.Content.ReadAsStringAsync();
                    Console.WriteLine($"[SendGrid Fallback] Error mandando email: {error}");
                }
            } catch (Exception e) {
                Console.WriteLine($"[SendGrid Fallback] Exception mandando email: {e.Message}");
            }
        }
    }
}
