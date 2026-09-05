FROM maven:3.9.11-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src src
RUN mvn -B -ntp package
FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --uid 10001 app
COPY --from=build /app/target/reconciliation-1.0.0.jar app.jar
USER app
ENV BIND_ADDRESS=0.0.0.0
EXPOSE 8101
ENTRYPOINT ["java","-jar","app.jar"]
