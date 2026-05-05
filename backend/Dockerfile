# server/Dockerfile
FROM node:20-bullseye-slim AS build

# Установим утилиты и pandoc + texlive (для PDF через xelatex)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    wget \
    pandoc \
    texlive-xetex \
    texlive-latex-extra \
    texlive-fonts-recommended \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY package.json package-lock.json ./
RUN npm ci --production=false

# Копируем исходники и соберём TS
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Сборка production-образа (маленький финальный слой)
FROM node:20-bullseye-slim AS runtime

# Установим runtime зависимости (pandoc + texlive нужны и в runtime)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    pandoc \
    texlive-xetex \
    texlive-latex-extra \
    texlive-fonts-recommended \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
# Только production зависимости
COPY package.json package-lock.json ./
RUN npm ci --production

# Копируем собранный код из build stage
COPY --from=build /app/dist ./dist

EXPOSE 3000
ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
