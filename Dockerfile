FROM node:20-alpine
RUN apk add --no-cache openssl

EXPOSE 3000

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./

RUN npm ci --omit=dev && npm cache clean --force

COPY . .

# Generate the Prisma client into the image so it's present for every process,
# including the scheduled rollup/retention machines (which run a job script
# directly, not `docker-start`). docker-start still re-runs generate at boot,
# which is a harmless no-op.
RUN npx prisma generate

RUN npm run build

# Run as the built-in non-root "node" user instead of root.
# chown so the runtime user can write Prisma artifacts during docker-start.
RUN chown -R node:node /app
USER node

CMD ["npm", "run", "docker-start"]
