FROM nginx:1.23.3-alpine

COPY ./public /usr/share/nginx/html/
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
COPY ./nginx.crt /etc/ssl/certs/
COPY ./nginx.key /etc/ssl/private/
