# STEP 1: 빌드 환경 설정 및 프로젝트 빌드
FROM node:20-alpine AS build-stage
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build

# STEP 2: 프로덕션 환경을 위한 Nginx 설정
FROM nginx:1.23-alpine AS production-stage
# build 폴더 대신 dist 폴더를 복사하도록 수정
COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
