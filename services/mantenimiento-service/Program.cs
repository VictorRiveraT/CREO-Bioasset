using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore.Infrastructure;

using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Authorization;
using System.Text;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCors();
builder.Services.AddDbContext<MantDb>(o => o.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

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

app.MapGet("/mantenimientos", [Authorize] async (MantDb db) => Results.Ok(new { mantenimientos = await db.Mantenimientos.ToListAsync() }));
app.MapPost("/mantenimientos", [Authorize(Roles = "admin,biomedico")] async (Mantenimiento dto, MantDb db) => {
    dto.Id = Guid.NewGuid();
    db.Mantenimientos.Add(dto);
    await db.SaveChangesAsync();
    return Results.Created($"/mantenimientos/{dto.Id}", dto);
});
app.MapPut("/mantenimientos/{id}", [Authorize(Roles = "admin,biomedico")] async (Guid id, Mantenimiento dto, MantDb db) => {
    var m = await db.Mantenimientos.FindAsync(id);
    if (m == null) return Results.NotFound();
    m.Estado = dto.Estado;
    m.Descripcion = dto.Descripcion;
    m.ProximaFecha = dto.ProximaFecha;
    m.Fecha = dto.Fecha;
    m.Observaciones = dto.Observaciones;
    if (!string.IsNullOrEmpty(dto.ArchivoBase64)) {
        m.ArchivoBase64 = dto.ArchivoBase64;
    }
    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.MapGet("/incidencias", [Authorize] async (MantDb db) => Results.Ok(new { incidencias = await db.Incidencias.ToListAsync() }));
app.MapPost("/incidencias", [Authorize] async (Incidencia dto, MantDb db) => {
    dto.Id = Guid.NewGuid();
    db.Incidencias.Add(dto);
    await db.SaveChangesAsync();
    return Results.Created($"/incidencias/{dto.Id}", dto);
});
app.MapPut("/incidencias/{id}", [Authorize] async (Guid id, Incidencia dto, MantDb db) => {
    var i = await db.Incidencias.FindAsync(id);
    if (i == null) return Results.NotFound();
    i.Estado = dto.Estado;
    await db.SaveChangesAsync();
    return Results.NoContent();
});

using (var scope = app.Services.CreateScope()) { 
    var dbContext = scope.ServiceProvider.GetRequiredService<MantDb>();
    try {
        var creator = (DatabaseFacade)dbContext.Database;
        var relationalCreator = creator.GetService<Microsoft.EntityFrameworkCore.Storage.IRelationalDatabaseCreator>();
        relationalCreator.EnsureCreated();
        relationalCreator.CreateTables();
    } catch {}
    
    // Auto-migrate new columns
    try {
        dbContext.Database.ExecuteSqlRaw(@"
            IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'Fecha' AND Object_ID = Object_ID(N'[mantenimiento].[Mantenimientos]'))
            BEGIN
                ALTER TABLE [mantenimiento].[Mantenimientos] ADD Fecha NVARCHAR(MAX) NULL
                ALTER TABLE [mantenimiento].[Mantenimientos] ADD Observaciones NVARCHAR(MAX) NULL
                ALTER TABLE [mantenimiento].[Mantenimientos] ADD ArchivoBase64 NVARCHAR(MAX) NULL
                ALTER TABLE [mantenimiento].[Mantenimientos] ADD IncidenciaId UNIQUEIDENTIFIER NULL
            END
        ");
    } catch (Exception e) {
        Console.WriteLine(e);
    }
}
app.Run();

public class MantDb : DbContext {
    public MantDb(DbContextOptions<MantDb> options) : base(options) { }
    public DbSet<Mantenimiento> Mantenimientos => Set<Mantenimiento>();
    public DbSet<Incidencia> Incidencias => Set<Incidencia>();
    protected override void OnModelCreating(ModelBuilder modelBuilder) { modelBuilder.HasDefaultSchema("mantenimiento"); }
}

public class Mantenimiento {
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [Column("activo_id"), JsonPropertyName("activo_id")] public Guid ActivoId { get; set; }
    [Column("biomedico_id"), JsonPropertyName("biomedico_id")] public Guid BiomedicoId { get; set; }
    public string Tipo { get; set; } = "";
    public string Estado { get; set; } = "";
    public string Descripcion { get; set; } = "";
    [Column("proxima_fecha"), JsonPropertyName("proxima_fecha")] public string? ProximaFecha { get; set; }
    public string? Fecha { get; set; }
    public string? Observaciones { get; set; }
    public string? ArchivoBase64 { get; set; }
    [Column("incidencia_id"), JsonPropertyName("incidencia_id")] public Guid? IncidenciaId { get; set; }
}

public class Incidencia {
    [Key] public Guid Id { get; set; } = Guid.NewGuid();
    [Column("activo_id"), JsonPropertyName("activo_id")] public Guid ActivoId { get; set; }
    public string Titulo { get; set; } = "";
    public string Estado { get; set; } = "";
}
