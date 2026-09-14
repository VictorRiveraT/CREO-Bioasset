FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["analitica-service.csproj", "./"]
RUN dotnet restore "./analitica-service.csproj"
COPY . .
RUN dotnet publish "analitica-service.csproj" -c Release -o /app/publish
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 3000
ENV ASPNETCORE_URLS=http://+:3000
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "analitica-service.dll"]