# Commands

## Clear Environment

* cd ../first-network && ./byfn.sh down
* docker rm -f $(docker ps -aq) && docker network prune
* docker rmi dev-peer0.org1.example.com-fabcar-1.0-5c906e402ed29f20260ae42283216aa75549c571e2e380f3615826365d8269ba

## Start network

* npm install
* ./startFabric.sh node

## Intracting with Blockchain

* node enrollAdmin.js
* node registerUser.js
* node query.js
* node invoke.js

## Logs

* docker logs -f ca.example.com
