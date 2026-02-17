# Node Installation via Docker

## Pull the Node.js Docker image

docker pull node:24-alpine

## Create a Node.js container and start a Shell session

docker run -it --rm --entrypoint sh node:24-alpine

## Verify the Node.js version

node -v # Should print "v24.11.1".

## Download and install Yarn

corepack enable yarn

## Verify Yarn version

yarn -v

Reference: [text](https://nodejs.org/en/download)
