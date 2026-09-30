using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

public static class EmailSender {
    // Reemplaza esto con tu API Key real de SendGrid (o ponla en appsettings.json)
    private static readonly string SendGridApiKey = Environment.GetEnvironmentVariable("SENDGRID_API_KEY");

    public static async Task SendEmail(string to, string subject, string bodyHtml) {
        try {
            using var client = new HttpClient();
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
                Console.WriteLine($"[SendGrid] Email enviado exitosamente a {to}");
            } else {
                var error = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"[SendGrid] Error mandando email: {error}");
            }
        } catch (Exception e) {
            Console.WriteLine($"[SendGrid] Exception mandando email: {e.Message}");
        }
    }
}
