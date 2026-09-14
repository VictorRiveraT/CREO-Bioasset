FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["alertas-service.csproj", "./"]
RUN dotnet restore "./alertas-service.csproj"
COPY . .
RUN dotnet publish "alertas-service.csproj" -c Release -o /app/publish
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 3000
ENV ASPNETCORE_URLS=http://+:3000
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "alertas-service.dll"]