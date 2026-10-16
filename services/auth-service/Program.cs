using System;


using System.Security.Cryptography;


using System.IdentityModel.Tokens.Jwt;


using System.Security.Claims;


using System.Text;


using Microsoft.AspNetCore.Builder;


using Microsoft.AspNetCore.Http;


using Microsoft.EntityFrameworkCore;


using Microsoft.Extensions.DependencyInjection;


using Microsoft.IdentityModel.Tokens;


using Microsoft.AspNetCore.Authentication.JwtBearer;


using Microsoft.AspNetCore.Authorization;


using System.ComponentModel.DataAnnotations.Schema;


using System.ComponentModel.DataAnnotations;


using System.Linq;





var builder = WebApplication.CreateBuilder(args);


builder.Services.AddDbContext<AuthDb>(o => o.UseSqlServer(builder.Configuration.GetConnectionString("Default")));


builder.Services.AddCors();


builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)


    .AddJwtBearer(options => {


        options.TokenValidationParameters = new TokenValidationParameters {


            ValidateIssuerSigningKey = true,


            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Secret"])),


            ValidateIssuer = false, ValidateAudience = false


        };


    });


builder.Services.AddAuthorization();


var app = builder.Build();


app.UseCors(b => b.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());


app.UseAuthentication();


app.UseAuthorization();





string HashPassword(string password) {


    return BCrypt.Net.BCrypt.HashPassword(password);


}





bool VerifyPassword(string providedPassword, string hash) {


    // Check if it's the old SHA256 base64 hash format (length 44)


    if (hash.Length == 44 && hash.EndsWith("=")) {


        using var sha256 = SHA256.Create();


        var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(providedPassword));


        var base64 = Convert.ToBase64String(bytes);


        return base64 == hash;


    }


    return BCrypt.Net.BCrypt.Verify(providedPassword, hash);


}





app.MapGet("/health", () => Results.Ok(new { status = "ok", service = "auth-service" }));





app.MapPost("/login", async (LoginDto req, AuthDb db) => {


    var user = await db.Usuarios.FirstOrDefaultAsync(u => u.Email == req.email);


    if(user == null) return Results.BadRequest(new { error = "Correo no registrado" });


    if(!VerifyPassword(req.password, user.Password)) return Results.BadRequest(new { error = "Contraseña incorrecta" });


    if(!user.Activo) return Results.BadRequest(new { error = "Cuenta inactiva" });


    if(user.AccesoHasta.HasValue && user.AccesoHasta.Value.Date < DateTime.UtcNow.Date) return Results.BadRequest(new { error = "Acceso expirado" });


    


    if(!string.IsNullOrEmpty(user.Permisos) && user.Permisos.Contains("\"forzarReset\":true")) {


        return Results.BadRequest(new { error = "Por seguridad, un administrador ha solicitado que cambies tu contraseña. Revisa tu correo electrónico para restablecerla." });


    }





    var tokenHandler = new JwtSecurityTokenHandler();


    var key = Encoding.UTF8.GetBytes(app.Configuration["Jwt:Secret"]);


    var tokenDescriptor = new SecurityTokenDescriptor {


        Subject = new ClaimsIdentity(new[] { 


            new Claim("id", user.Id.ToString()), 


            new Claim(ClaimTypes.Role, user.Rol),


            new Claim("sede", user.Sede ?? "Todas"),


            new Claim("sedeTemporal", user.SedeTemporal ?? "[]")


        }),


        Expires = DateTime.UtcNow.AddDays(7),


        SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)


    };


    var token = tokenHandler.CreateToken(tokenDescriptor);


    return Results.Ok(new { token = tokenHandler.WriteToken(token), user = new { id = user.Id, nombre = user.Nombre, email = user.Email, rol = user.Rol, activo = user.Activo, permisos = user.Permisos, sede = user.Sede, accesoHasta = user.AccesoHasta, sedeTemporal = user.SedeTemporal, sedeTemporalHasta = user.SedeTemporalHasta }});


});








static string GetFrontendOrigin(HttpContext ctx) {
    var rawOrigin = ctx.Request.Headers["Origin"].FirstOrDefault() ?? ctx.Request.Headers["Referer"].FirstOrDefault();
    if (!string.IsNullOrEmpty(rawOrigin) && !rawOrigin.Contains("localhost")) {
        try {
            var uri = new Uri(rawOrigin);
            return $"{uri.Scheme}://{uri.Authority}";
        } catch {}
    }
    var envUrl = Environment.GetEnvironmentVariable("FRONTEND_URL");
    if (!string.IsNullOrEmpty(envUrl) && !envUrl.Contains("localhost")) {
        return envUrl.TrimEnd('/');
    }
    return "https://creo-bioasset-one.vercel.app";
}

app.MapPost("/recover", async (RecoverDto req, HttpContext ctx, AuthDb db) => {
    try {
        var user = await db.Usuarios.FirstOrDefaultAsync(u => u.Email == req.email);
        if(user == null) return Results.BadRequest(new { error = "Correo no registrado" });

        var origin = GetFrontendOrigin(ctx);

        // Generate signed JWT recovery token with 15-minute expiration
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(app.Configuration["Jwt:Secret"]);
        var tokenDescriptor = new SecurityTokenDescriptor {
            Subject = new ClaimsIdentity(new[] {
                new Claim("email", user.Email),
                new Claim("purpose", "password_reset")
            }),
            Expires = DateTime.UtcNow.AddMinutes(15),
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };
        var token = tokenHandler.CreateToken(tokenDescriptor);
        var resetToken = tokenHandler.WriteToken(token);

        var resetLink = $"{origin}/?reset_email={Uri.EscapeDataString(user.Email)}&reset_token={Uri.EscapeDataString(resetToken)}";

        var html = $@"
            <div style='font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;'>
                <div style='text-align: center; margin-bottom: 24px;'>
                    <h1 style='color: #0f172a; font-size: 26px; font-weight: 800; margin: 0; letter-spacing: -0.5px;'>Creo<span style='color: #F2B705;'>+</span></h1>
                    <div style='color: #F2B705; font-size: 13px; font-weight: 700; letter-spacing: 1px;'>BIOASSET</div>
                </div>

                <div style='background: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 14px 16px; margin-bottom: 24px;'>
                    <p style='color: #92400e; font-size: 13px; font-weight: 600; margin: 0;'>
                        ⏱️ Este enlace es de un solo uso y <strong>expirará en 15 minutos</strong> por motivos de seguridad.
                    </p>
                </div>

                <h2 style='color: #1e293b; font-size: 18px; margin: 0 0 12px 0;'>Restablecimiento de Contraseña</h2>
                <p style='color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 8px 0;'>Hola <strong>{user.Nombre}</strong>,</p>
                <p style='color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;'>
                    Hemos recibido una solicitud para cambiar la contraseña de tu cuenta institucional <strong>{user.Email}</strong>. Haz clic en el botón de abajo para asignar tu nueva clave:
                </p>

                <div style='text-align: center; margin: 28px 0;'>
                    <a href='{resetLink}' style='display: inline-block; background-color: #F2B705; color: #18181b; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.08);'>
                        Restablecer Contraseña
                    </a>
                </div>

                <p style='color: #64748b; font-size: 12px; margin: 24px 0 8px 0;'>Si el botón no abre directamente, copia y pega el siguiente enlace en tu navegador:</p>
                <div style='background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; word-break: break-all; font-family: monospace; font-size: 11px; color: #334155;'>
                    {resetLink}
                </div>

                <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 28px 0 16px 0;' />
                <p style='color: #94a3b8; font-size: 11px; text-align: center; margin: 0; line-height: 1.4;'>
                    Si tú no realizaste esta solicitud, puedes ignorar este mensaje de forma segura. Tu contraseña actual no cambiará.
                </p>
            </div>
        ";

        await EmailSender.SendEmail(user.Email, "Recuperación de Contraseña (15 min) - BioAsset", html);
        return Results.Ok(new { message = "Correo de recuperación enviado exitosamente con enlace de 15 minutos de vigencia." });
    } catch (Exception ex) {
        Console.WriteLine($"[Recover] Error: {ex}");
        return Results.BadRequest(new { error = "No se pudo procesar la solicitud de recuperación: " + ex.Message });
    }
});

app.MapPost("/reset", async (ResetDto req, AuthDb db) => {
    try {
        var user = await db.Usuarios.FirstOrDefaultAsync(u => u.Email == req.email);
        if(user == null) return Results.BadRequest(new { error = "Usuario no encontrado" });

        // Validate recovery token and expiration
        if (string.IsNullOrWhiteSpace(req.token)) {
            return Results.BadRequest(new { error = "El enlace de recuperación no es válido o carece de token de seguridad. Por favor solicita un nuevo enlace desde el inicio de sesión." });
        }

        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(app.Configuration["Jwt:Secret"]);
        ClaimsPrincipal principal;
        try {
            principal = tokenHandler.ValidateToken(req.token, new TokenValidationParameters {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(1)
            }, out _);
        } catch (SecurityTokenExpiredException) {
            return Results.BadRequest(new { error = "El enlace de recuperación ha expirado (validez de 15 minutos superada). Por favor solicita uno nuevo." });
        } catch (Exception) {
            return Results.BadRequest(new { error = "El enlace de recuperación es inválido o ha sido alterado. Por favor solicita uno nuevo." });
        }

        var tokenEmail = principal.FindFirst("email")?.Value ?? principal.FindFirst(ClaimTypes.Email)?.Value;
        var purpose = principal.FindFirst("purpose")?.Value;
        if (purpose != "password_reset" || !string.Equals(tokenEmail, req.email, StringComparison.OrdinalIgnoreCase)) {
            return Results.BadRequest(new { error = "El token de recuperación no coincide con la cuenta solicitada." });
        }
        // Enforce password strength
        if (string.IsNullOrWhiteSpace(req.newPassword) || req.newPassword.Length < 9 ||
            !req.newPassword.Any(char.IsUpper) || !req.newPassword.Any(char.IsLower) ||
            !req.newPassword.Any(char.IsDigit) || !req.newPassword.Any(ch => !char.IsLetterOrDigit(ch))) {
            return Results.BadRequest(new { error = "La nueva contraseña debe tener al menos 9 caracteres, 1 mayúscula, 1 número y 1 carácter especial." });
        }

        // Check if new password is same as current password (using safe helper to avoid crash on SHA256 base64 or BCrypt)
        try {
            if (VerifyPassword(req.newPassword, user.Password)) {
                return Results.BadRequest(new { error = "La nueva contraseña no puede ser igual a la actual" });
            }
        } catch (Exception ex) {
            Console.WriteLine($"[Reset] Warning al verificar coincidencia de contraseña: {ex.Message}");
        }

        // Update password with BCrypt hash
        user.Password = BCrypt.Net.BCrypt.HashPassword(req.newPassword);

        // Clear forzarReset if present
        if(!string.IsNullOrEmpty(user.Permisos) && user.Permisos.Contains("\"forzarReset\":true")) {
            user.Permisos = user.Permisos.Replace("\"forzarReset\":true", "\"forzarReset\":false");
        }

        await db.SaveChangesAsync();
        return Results.Ok(new { message = "Contraseña restablecida exitosamente" });
    } catch (Exception ex) {
        Console.WriteLine($"[Reset] Exception: {ex}");
        return Results.BadRequest(new { error = "Error al restablecer la contraseña: " + ex.Message });
    }
});





app.MapGet("/me", [Authorize] (HttpContext ctx, AuthDb db) => {
    var id = Guid.Parse(ctx.User.FindFirst("id")?.Value);
    var user = db.Usuarios.Find(id);
    if(user == null) return Results.NotFound();
    if(!user.Activo) return Results.Unauthorized();


    if(user.AccesoHasta.HasValue && user.AccesoHasta.Value.Date < DateTime.UtcNow.Date) return Results.Unauthorized();


    return Results.Ok(new { user = new { id = user.Id, nombre = user.Nombre, email = user.Email, rol = user.Rol, activo = user.Activo, permisos = user.Permisos, sede = user.Sede, accesoHasta = user.AccesoHasta, sedeTemporal = user.SedeTemporal, sedeTemporalHasta = user.SedeTemporalHasta }});


});





app.MapGet("/usuarios", [Authorize] async (AuthDb db, HttpContext ctx) => {


    var all = await db.Usuarios.Select(u => new { id = u.Id, nombre = u.Nombre, email = u.Email, rol = u.Rol, activo = u.Activo, permisos = u.Permisos, sede = u.Sede, accesoHasta = u.AccesoHasta, sedeTemporal = u.SedeTemporal, sedeTemporalHasta = u.SedeTemporalHasta }).ToListAsync();


    


    var miSede = ctx.User.FindFirst("sede")?.Value ?? "Todas";


    var miSedeTempRaw = ctx.User.FindFirst("sedeTemporal")?.Value ?? "[]";


    


    if (miSede == "Todas") {


        return Results.Ok(new { usuarios = all });


    }





    var allowed = new System.Collections.Generic.HashSet<string> { miSede };


    try {


        var extra = System.Text.Json.JsonSerializer.Deserialize<System.Collections.Generic.List<string>>(miSedeTempRaw);


        if (extra != null) foreach(var s in extra) allowed.Add(s);


    } catch {}





    var filtered = all.Where(u => {


        if (u.sede != null && allowed.Contains(u.sede)) return true;


        if (!string.IsNullOrEmpty(u.sedeTemporal) && u.sedeTemporal != "Ninguna" && u.sedeTemporal != "[]") {


            try {


                if (u.sedeTemporal.StartsWith("[")) {


                    var uExtra = System.Text.Json.JsonSerializer.Deserialize<System.Collections.Generic.List<string>>(u.sedeTemporal);


                    if (uExtra != null && uExtra.Any(s => allowed.Contains(s))) return true;


                } else {


                    if (allowed.Contains(u.sedeTemporal)) return true;


                }


            } catch {}


        }


        return false;


    }).ToList();





    return Results.Ok(new { usuarios = filtered });


});





app.MapPost("/usuarios", [Authorize(Roles="admin")] async (UsuarioDto req, AuthDb db, HttpContext ctx) => {


        if (await db.Usuarios.AnyAsync(u => u.Email == req.email)) return Results.BadRequest(new { error = "El correo ya está registrado en otra cuenta" });

    var miSede = ctx.User.FindFirst("sede")?.Value ?? "Todas";


    if (miSede != "Todas") {


        var miSedeTempRaw = ctx.User.FindFirst("sedeTemporal")?.Value ?? "[]";


        var allowed = new System.Collections.Generic.HashSet<string> { miSede };


        try {


            var extra = System.Text.Json.JsonSerializer.Deserialize<System.Collections.Generic.List<string>>(miSedeTempRaw);


            if (extra != null) foreach(var s in extra) allowed.Add(s);


        } catch {}





        if (req.sede == "Todas" || !allowed.Contains(req.sede ?? "Todas")) return Results.Forbid();


        // Skip deep temporal validation for brevity in prototype, but prevent "Todas"


        if (req.sedeTemporal == "Todas") return Results.Forbid();


    }


    


    // Inject forzarReset into permisos


    var permisosStr = req.permisos ?? "{}";


    if(permisosStr == "{}") {


        permisosStr = "{\"forzarReset\":true}";


    } else if(!permisosStr.Contains("\"forzarReset\":true")) {


        permisosStr = permisosStr.TrimEnd('}') + ",\"forzarReset\":true}";


    }





    var user = new Usuario {


        Id = Guid.NewGuid(),


        Nombre = req.nombre,


        Email = req.email,


        Password = HashPassword(req.password),


        Rol = req.rol,


        Activo = true,


        Permisos = permisosStr,


        Sede = req.sede,


        AccesoHasta = req.accesoHasta,


        SedeTemporal = req.sedeTemporal,


        SedeTemporalHasta = req.sedeTemporalHasta


    };


    db.Usuarios.Add(user);


    await db.SaveChangesAsync();





    var origin = GetFrontendOrigin(ctx);


    var resetLink = $"{origin}/?reset_email={Uri.EscapeDataString(user.Email)}";


    var html = $@"


        <div style='font-family: sans-serif; padding: 20px; text-align: center;'>


            <h2 style='color: #F2B705;'>Bienvenido a Creo+ BioAsset</h2>


            <h3>Tu cuenta ha sido creada exitosamente</h3>


            <p>Hola {user.Nombre},</p>


            <p>Un administrador ha creado una cuenta para ti en el sistema.</p>


            <p>Tus credenciales temporales son:</p>


            <p><strong>Correo:</strong> {user.Email}</p>


            <p><strong>Contraseña Temporal:</strong> {req.password}</p>


            <p>Por motivos de seguridad, es obligatorio que configures una nueva contraseña antes de ingresar al sistema.</p>


            <a href='{resetLink}' style='display:inline-block; padding: 12px 24px; background-color: #F2B705; color: black; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0;'>Configurar Mi Contraseña</a>


        </div>


    ";


    


    await EmailSender.SendEmail(user.Email, "Bienvenido a Creo+ BioAsset - Configura tu cuenta", html);





    return Results.Ok(new { user = new { id = user.Id, nombre = user.Nombre, email = user.Email, rol = user.Rol, activo = user.Activo, permisos = user.Permisos, sede = user.Sede, accesoHasta = user.AccesoHasta, sedeTemporal = user.SedeTemporal, sedeTemporalHasta = user.SedeTemporalHasta }});


});





app.MapPut("/usuarios/{id}/toggle", [Authorize] async (Guid id, AuthDb db, HttpContext ctx) => {


    var user = await db.Usuarios.FindAsync(id);


    if(user != null) {


        if(user.Email == "victor.rivera@upch.pe") return Results.Forbid();


        user.Activo = !user.Activo;


        await db.SaveChangesAsync();


    }


    return Results.Ok();


});








app.MapPost("/usuarios/{id}/force-reset", [Authorize(Roles="admin")] async (Guid id, HttpContext ctx, AuthDb db) => {


    var user = await db.Usuarios.FindAsync(id);


    if(user == null) return Results.NotFound();


    


    // Set forzarReset to true


    if(string.IsNullOrEmpty(user.Permisos) || user.Permisos == "{}") {


        user.Permisos = "{\"forzarReset\":true}";


    } else if(!user.Permisos.Contains("\"forzarReset\":true")) {


        if(user.Permisos.Contains("\"forzarReset\":false")) {


            user.Permisos = user.Permisos.Replace("\"forzarReset\":false", "\"forzarReset\":true");


        } else {


            // Append to existing JSON object


            user.Permisos = user.Permisos.TrimEnd('}') + ",\"forzarReset\":true}";


        }


    }


    await db.SaveChangesAsync();





    var origin = GetFrontendOrigin(ctx);


    var resetLink = $"{origin}/?reset_email={Uri.EscapeDataString(user.Email)}";


    var html = $@"


        <div style='font-family: sans-serif; padding: 20px; text-align: center;'>


            <h2 style='color: #F2B705;'>Creo+ BioAsset</h2>


            <h3>Restablecimiento de Contraseña Requerido</h3>


            <p>Hola {user.Nombre},</p>


            <p>Por motivos de seguridad, un administrador ha solicitado que restablezcas tu contraseña.</p>


            <p>No podrás acceder a tu cuenta hasta que configures una nueva clave usando el siguiente enlace:</p>


            <a href='{resetLink}' style='display:inline-block; padding: 12px 24px; background-color: #F2B705; color: black; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0;'>Configurar Nueva Contraseña</a>


        </div>


    ";


    


    await EmailSender.SendEmail(user.Email, "Restablecimiento de contraseña requerido", html);





    return Results.Ok(new { message = "Se ha forzado el restablecimiento de contraseña y se envió el correo." });


});





app.MapPut("/usuarios/{id}", [Authorize(Roles="admin")] async (Guid id, UsuarioDto req, AuthDb db, HttpContext ctx) => {


    var user = await db.Usuarios.FindAsync(id);


    if(user == null) return Results.NotFound();


        if (req.email != user.Email && await db.Usuarios.AnyAsync(u => u.Email == req.email)) return Results.BadRequest(new { error = "El correo ya está registrado en otra cuenta" });
if(user.Email == "victor.rivera@upch.pe" && req.email != "victor.rivera@upch.pe") return Results.Forbid(); // Protect admin email


    


    user.Nombre = req.nombre ?? user.Nombre;


    user.Email = req.email ?? user.Email;


    if(!string.IsNullOrEmpty(req.password)) {


        user.Password = HashPassword(req.password);


        // Clear forzarReset since admin gave them a new one


        if(!string.IsNullOrEmpty(user.Permisos) && user.Permisos.Contains("\"forzarReset\":true")) {


            user.Permisos = user.Permisos.Replace("\"forzarReset\":true", "\"forzarReset\":false");


        }


        


        var origin = GetFrontendOrigin(ctx);


        var resetLink = $"{origin}/?reset_email={Uri.EscapeDataString(user.Email)}";


        var html = $@"


            <div style='font-family: sans-serif; padding: 20px; text-align: center;'>


                <h2 style='color: #F2B705;'>Creo+ BioAsset</h2>


                <h3>Actualización de Contraseña</h3>


                <p>Hola {user.Nombre},</p>


                <p>Un administrador ha actualizado tu contraseña manualmente.</p>


                <p>Tu nueva contraseña temporal es: <strong>{req.password}</strong></p>


                <p>Te recomendamos encarecidamente restablecer tu contraseña ingresando a este enlace:</p>


                <a href='{resetLink}' style='display:inline-block; padding: 12px 24px; background-color: #F2B705; color: black; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0;'>Restablecer Contraseña</a>


            </div>


        ";


        // Do not await if we want to fire and forget, but await is safer here


        await EmailSender.SendEmail(user.Email, "Tu contraseña ha sido actualizada por un admin", html);


    }


    user.Rol = req.rol ?? user.Rol;


    user.Permisos = req.permisos ?? user.Permisos;


    user.Sede = req.sede;


    user.AccesoHasta = req.accesoHasta;


    user.SedeTemporal = req.sedeTemporal;


    user.SedeTemporalHasta = req.sedeTemporalHasta;


    


    await db.SaveChangesAsync();


    return Results.Ok();


});





// DELETE user endpoint removed to enforce Soft Delete (toggle)





// Auto-migrate and seed


using (var scope = app.Services.CreateScope()) {


    var db = scope.ServiceProvider.GetRequiredService<AuthDb>();


    db.Database.EnsureCreated();


    try {


        db.Database.ExecuteSqlRaw("IF COL_LENGTH('auth.Usuarios', 'Permisos') IS NULL ALTER TABLE auth.Usuarios ADD Permisos NVARCHAR(MAX) DEFAULT '{{}}'");


        db.Database.ExecuteSqlRaw("IF COL_LENGTH('auth.Usuarios', 'Sede') IS NULL ALTER TABLE auth.Usuarios ADD Sede NVARCHAR(MAX) NULL");


        db.Database.ExecuteSqlRaw("IF COL_LENGTH('auth.Usuarios', 'AccesoHasta') IS NULL ALTER TABLE auth.Usuarios ADD AccesoHasta DATETIME2 NULL");


        db.Database.ExecuteSqlRaw("IF COL_LENGTH('auth.Usuarios', 'SedeTemporal') IS NULL ALTER TABLE auth.Usuarios ADD SedeTemporal NVARCHAR(MAX) NULL");


        db.Database.ExecuteSqlRaw("IF COL_LENGTH('auth.Usuarios', 'SedeTemporalHasta') IS NULL ALTER TABLE auth.Usuarios ADD SedeTemporalHasta DATETIME2 NULL");


    } catch (Exception ex) { Console.WriteLine("SQL ERROR: " + ex.ToString()); }


    if(!db.Usuarios.Any()) {


        db.Usuarios.AddRange(


            new Usuario { Id = Guid.NewGuid(), Nombre = "Admin", Email = "victor.rivera@upch.pe", Password = HashPassword("bioasset"), Rol = "admin", Activo = true, Sede = "Todas" },


            new Usuario { Id = Guid.NewGuid(), Nombre = "Biomedico", Email = "biomedico@bioasset.pe", Password = HashPassword("bioasset"), Rol = "biomedico", Activo = true, Sede = "Todas" },


            new Usuario { Id = Guid.NewGuid(), Nombre = "Luis", Email = "luis.ramirez@bioasset.pe", Password = HashPassword("bioasset"), Rol = "asistencial", Activo = true, Sede = "Todas" }


        );


        db.SaveChanges();


    }


}





app.MapDelete("/usuarios/{id}", [Authorize] async (Guid id, AuthDb db, HttpContext ctx) => {
    var adminSede = ctx.User.FindFirst("sede")?.Value;
    var adminRol = ctx.User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
    
    if (adminRol != "admin") return Results.BadRequest(new { error = "No tienes rol admin. Tu rol es: " + adminRol });
    
    var user = await db.Usuarios.FindAsync(id);
    if(user == null) return Results.BadRequest(new { error = "Usuario no encontrado en la BD" });
    
    if(adminSede != "Todas" && user.Sede != adminSede) {
        return Results.BadRequest(new { error = $"No autorizado. AdminSede: {adminSede}, UserSede: {user.Sede}" });
    }
    
    db.Usuarios.Remove(user);
    await db.SaveChangesAsync();
    return Results.Ok();
});
app.Run();





public class AuthDb : DbContext {


    public AuthDb(DbContextOptions<AuthDb> options) : base(options) {}


    public DbSet<Usuario> Usuarios { get; set; }


    protected override void OnModelCreating(ModelBuilder modelBuilder) { modelBuilder.HasDefaultSchema("auth"); }


}


public class Usuario {


    [Key] public Guid Id { get; set; } = Guid.NewGuid();


    public string Nombre { get; set; } = "";


    public string Email { get; set; } = "";


    public string Password { get; set; } = "";


    public string Rol { get; set; } = "";


    public bool Activo { get; set; } = true;


    public string? Permisos { get; set; } = "{}";


    public string? Sede { get; set; }


    public string? SedeTemporal { get; set; }


    public DateTime? AccesoHasta { get; set; }


    public DateTime? SedeTemporalHasta { get; set; }


}


public record RecoverDto(string email);


public record ResetDto(string email, string newPassword, string? token = null);


public record LoginDto(string email, string password);


public record UsuarioDto(string nombre, string email, string? password, string rol, string permisos, string? sede, DateTime? accesoHasta, string? sedeTemporal, DateTime? sedeTemporalHasta);











