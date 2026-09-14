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
    if(user == null || !VerifyPassword(req.password, user.Password) || !user.Activo) return Results.Unauthorized();
    if(user.AccesoHasta.HasValue && user.AccesoHasta.Value.Date < DateTime.UtcNow.Date) return Results.Unauthorized();
    
    var tokenHandler = new JwtSecurityTokenHandler();
    var key = Encoding.UTF8.GetBytes(app.Configuration["Jwt:Secret"]);
    var tokenDescriptor = new SecurityTokenDescriptor {
        Subject = new ClaimsIdentity(new[] { new Claim("id", user.Id.ToString()), new Claim(ClaimTypes.Role, user.Rol) }),
        Expires = DateTime.UtcNow.AddDays(7),
        SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
    };
    var token = tokenHandler.CreateToken(tokenDescriptor);
    return Results.Ok(new { token = tokenHandler.WriteToken(token), user = new { id = user.Id, nombre = user.Nombre, email = user.Email, rol = user.Rol, activo = user.Activo, permisos = user.Permisos, sede = user.Sede, accesoHasta = user.AccesoHasta, sedeTemporal = user.SedeTemporal, sedeTemporalHasta = user.SedeTemporalHasta }});
});

app.MapGet("/me", [Authorize] (HttpContext ctx, AuthDb db) => {
    var id = Guid.Parse(ctx.User.FindFirst("id")?.Value);
    var user = db.Usuarios.Find(id);
    if(user == null) return Results.NotFound();
    if(user.AccesoHasta.HasValue && user.AccesoHasta.Value.Date < DateTime.UtcNow.Date) return Results.Unauthorized();
    return Results.Ok(new { user = new { id = user.Id, nombre = user.Nombre, email = user.Email, rol = user.Rol, activo = user.Activo, permisos = user.Permisos, sede = user.Sede, accesoHasta = user.AccesoHasta, sedeTemporal = user.SedeTemporal, sedeTemporalHasta = user.SedeTemporalHasta }});
});

app.MapGet("/usuarios", [Authorize] async (AuthDb db) => Results.Ok(new { usuarios = await db.Usuarios.Select(u => new { id = u.Id, nombre = u.Nombre, email = u.Email, rol = u.Rol, activo = u.Activo, permisos = u.Permisos, sede = u.Sede, accesoHasta = u.AccesoHasta, sedeTemporal = u.SedeTemporal, sedeTemporalHasta = u.SedeTemporalHasta }).ToListAsync() }));

app.MapPost("/usuarios", [Authorize(Roles="admin")] async (UsuarioDto req, AuthDb db) => {
    var user = new Usuario {
        Id = Guid.NewGuid(),
        Nombre = req.nombre,
        Email = req.email,
        Password = HashPassword(req.password),
        Rol = req.rol,
        Activo = true,
        Permisos = req.permisos ?? "{}",
        Sede = req.sede,
        AccesoHasta = req.accesoHasta,
        SedeTemporal = req.sedeTemporal,
        SedeTemporalHasta = req.sedeTemporalHasta
    };
    db.Usuarios.Add(user);
    await db.SaveChangesAsync();
    return Results.Ok(new { user = new { id = user.Id, nombre = user.Nombre, email = user.Email, rol = user.Rol, activo = user.Activo, permisos = user.Permisos, sede = user.Sede, accesoHasta = user.AccesoHasta, sedeTemporal = user.SedeTemporal, sedeTemporalHasta = user.SedeTemporalHasta }});
});

app.MapPut("/usuarios/{id}/toggle", [Authorize] async (Guid id, AuthDb db, HttpContext ctx) => {
    var user = await db.Usuarios.FindAsync(id);
    if(user != null) {
        if(user.Email == "admin@bioasset.pe") return Results.Forbid();
        user.Activo = !user.Activo;
        await db.SaveChangesAsync();
    }
    return Results.Ok();
});

app.MapPut("/usuarios/{id}", [Authorize(Roles="admin")] async (Guid id, UsuarioDto req, AuthDb db) => {
    var user = await db.Usuarios.FindAsync(id);
    if(user == null) return Results.NotFound();
    if(user.Email == "admin@bioasset.pe" && req.email != "admin@bioasset.pe") return Results.Forbid(); // Protect admin email
    
    user.Nombre = req.nombre ?? user.Nombre;
    if(!string.IsNullOrEmpty(req.password)) user.Password = HashPassword(req.password);
    user.Rol = req.rol ?? user.Rol;
    user.Permisos = req.permisos ?? user.Permisos;
    user.Sede = req.sede;
    user.AccesoHasta = req.accesoHasta;
    user.SedeTemporal = req.sedeTemporal;
    user.SedeTemporalHasta = req.sedeTemporalHasta;
    
    await db.SaveChangesAsync();
    return Results.Ok();
});

app.MapDelete("/usuarios/{id}", [Authorize(Roles="admin")] async (Guid id, AuthDb db) => {
    var user = await db.Usuarios.FindAsync(id);
    if(user != null) {
        if(user.Email == "admin@bioasset.pe") return Results.Forbid();
        db.Usuarios.Remove(user);
        await db.SaveChangesAsync();
    }
    return Results.Ok();
});

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
            new Usuario { Id = Guid.NewGuid(), Nombre = "Admin", Email = "admin@bioasset.pe", Password = HashPassword("bioasset"), Rol = "admin", Activo = true, Sede = "Todas" },
            new Usuario { Id = Guid.NewGuid(), Nombre = "Biomedico", Email = "biomedico@bioasset.pe", Password = HashPassword("bioasset"), Rol = "biomedico", Activo = true, Sede = "Todas" },
            new Usuario { Id = Guid.NewGuid(), Nombre = "Luis", Email = "luis.ramirez@bioasset.pe", Password = HashPassword("bioasset"), Rol = "asistencial", Activo = true, Sede = "Todas" }
        );
        db.SaveChanges();
    }
}

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
public record LoginDto(string email, string password);
public record UsuarioDto(string nombre, string email, string password, string rol, string permisos, string? sede, DateTime? accesoHasta, string? sedeTemporal, DateTime? sedeTemporalHasta);



