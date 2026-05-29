FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --no-fund --no-audit --legacy-peer-deps --cache /tmp/npm-cache

COPY . .

CMD ["npm", "run", "dev", "--", "--host"]
