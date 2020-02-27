'use strict';

var Fabric_Client = require('fabric-client');

class BlockchainClient{

    constructor() {
        this.fabricClient = new Fabric_Client();
    }

    async query(user, params) {
        if (user && user.isEnrolled()) {
            console.log("Succesfully loaded user from persistence");
        }
        else{
            throw new Error("Failed to load user from persistence");
        }
        //responses could be multiple if multiple peers were used as targets
        let responses = await this.channel.queryByChaincode(params);
        console.log("Query has completed, checking results");
        // responses could have more than one  results if there multiple peers were used as targets
        if (responses && responses.length == 1) {
            if (responses[0] instanceof Error) {
                console.error("error from query = ", responses[0]);
            } else {
                console.log("Response is ", responses[0].toString());
            }
        } else {
            console.log("No payloads were returned from query");
        }
    }

    sendTransaction(params) {

    }

    async getUser(userName) {
        return await this.fabricClient.getUserContext(userName, true);
    }

    async ready(storePath, userName) {
        await this.setKeyValueStore(storePath);
        return await this.getUser(userName);
    }

    async setKeyValueStore(storePath) {
        this.storePath = storePath;
        //Set the default state store directory to the fabric client
        let stateStore = await Fabric_Client.newDefaultKeyValueStore({path: this.storePath});
        this.fabricClient.setStateStore(stateStore);

        //Set the crypto suite to the fabric client
        //client
        //  -  suite
        //      -  key store
        let cryptoSuite = Fabric_Client.newCryptoSuite();
        let cryptoKeyStore = Fabric_Client.newCryptoKeyStore({path: this.storePath});
        cryptoSuite.setCryptoKeyStore(cryptoKeyStore);
        this.fabricClient.setCryptoSuite(cryptoSuite);
    }

    newChannel(name, peerAddress, ordererAddress = false) {
        this.channel = this.fabricClient.newChannel(name);
        this.peer = this.fabricClient.newPeer(peerAddress);
        this.channel.addPeer(this.peer);
        if(ordererAddress) {
            this.orderer = this.fabricClient.newOrderer(ordererAddress);
            this.channel.addOrderer(this.orderer);
        }
    }
}

module.exports = BlockchainClient;