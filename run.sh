#!/bin/sh

netlify deploy --prod

docker stop nginx-server
docker rm -f nginx-server
docker rmi nginx-server
docker-compose build
docker-compose up -d

echo netlify dev
echo netlify function:create
echo netlify functions:invoke
# echo npx netlify-lambda build src

exit 0
