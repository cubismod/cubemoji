#!/bin/bash
# executes the npm script and watches its progress, logs to discord webhook
# based off of this script: https://gist.github.com/irwiss/4f2b85a97390a8d42fdcaad84c8c51cb
# get the webhook URL
# you need to source the .env file first
export $(xargs <.env)

SPAM_DELAY=2
MAX_LENGTH=2000
FILTER=''

echo $WEBHOOK

function send {
  local message=${1//\"/\\\"}
  echo "$message" | awk -v len=${MAX_LENGTH} '{ if (length($0) > len) print substr($0, 1, len-3) "..."; else print; }'
  # construct a json embed
  local content="{ \"content\": null, \"embeds\": [ { \"description\": \"\`${message}\`\", \"color\": 12968169, \"author\": { \"name\": \"cubemoji\", \"icon_url\": \"https://cdn.discordapp.com/emojis/795419079254605834.gif\" } } ] }"

  curl -s \
      -H "Content-Type: application/json" \
      -X POST \
      -d "${content}" \
      "${WEBHOOK}" | sed -n -e 's/.* \"id\": \"\([[:alnum:]]\+\)\", \"pinned\".*/\1\n/p'
}

while IFS='$\n' read -r line; do
    if [ "$FILTER" = "" ] || (echo "${line}" | grep -q "${FILTER}"); then
        if [ "$FIRST_LINE" == 'true' ] ; then
            FIRST_LINE=false
        else
            sleep "$SPAM_DELAY"
        fi

        send "$line"
    fi
done