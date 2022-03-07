#!/bin/sh

if [ ! -x "$(command -v serve)" ]; then
  npm i -g serve
fi

export PORT=8000

serve
echo npm start --port 8000

exit 0
