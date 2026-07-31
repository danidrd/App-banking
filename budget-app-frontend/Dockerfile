# Fase di build: compila Angular in produzione
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production

# Fase di esecuzione: nginx serve solo i file statici già compilati
FROM nginx:alpine
COPY --from=build /app/dist/budget-app-frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80