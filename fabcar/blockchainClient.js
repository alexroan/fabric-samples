'use strict';

var Fabric_Client = require('fabric-client');

class BlockchainClient{

    constructor() {
        this.fabricClient = new Fabric_Client();
    }

    async query(params) {
        this.isEnrolled(this.user);
        //responses could be multiple if multiple peers were used as targets
        let responses = await this.channel.queryByChaincode(params);
        console.log("Query has completed, checking results");
        // responses could have more than one  results if there multiple peers were used as targets
        let response = false;
        if (responses && responses.length == 1) {
            if (responses[0] instanceof Error) {
                console.error("error from query = ", responses[0]);
            } else {
                response = JSON.parse(responses[0].toString());
            }
        } else {
            console.log("No payloads were returned from query");
        }
        return response;
    }

    async sendTransaction(params) {
        this.isEnrolled(this.user);
        let transactionId = this.fabricClient.newTransactionID();
        console.log("Assigning new transaction id: ", transactionId._transaction_id);
        params.chainId = this.channelName;
        params.txId = transactionId;
        let responses = await this.channel.sendTransactionProposal(params);
        console.log(responses);
    }

    isEnrolled(user) {
        if (user && user.isEnrolled()) {
            console.log("Succesfully loaded user from persistence");
        }
        else{
            throw new Error("Failed to load user from persistence");
        }
    }

    async ready(storePath, userName) {
        await this.setKeyValueStore(storePath);
        this.user = await this.fabricClient.getUserContext(userName, true);
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
        this.channelName = name;
        this.channel = this.fabricClient.newChannel(this.channelName);
        this.peer = this.fabricClient.newPeer(peerAddress);
        this.channel.addPeer(this.peer);
        if(ordererAddress) {
            this.orderer = this.fabricClient.newOrderer(ordererAddress);
            this.channel.addOrderer(this.orderer);
        }
    }
}

module.exports = BlockchainClient;