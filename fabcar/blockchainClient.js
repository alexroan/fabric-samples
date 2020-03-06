'use strict';

var Fabric_Client = require('fabric-client');
var util = require('util');

class BlockchainClient{

    constructor() {
        this.fabricClient = new Fabric_Client();
    }

    async query(params) {
        this.isEnrolled(this.user);
        //responses could be multiple if multiple peers were used as targets
        return this.channel.queryByChaincode(params).then((responses) => {
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
        });
    }

    async sendTransaction(params) {
        this.isEnrolled(this.user);
        let transactionId = this.fabricClient.newTransactionID();
        console.log("Assigning new transaction id: ", transactionId._transaction_id);
        params.chainId = this.channelName;
        params.txId = transactionId;
        return this.channel.sendTransactionProposal(params).then((responses) => {
            let proposalResponses = responses[0]; 
            let proposal = responses[1];
            let isProposalGood = this.parseTransactionResponses(proposalResponses, proposal);
            if (isProposalGood) {
                this.pushProposal(proposalResponses, proposal, transactionId).then((results) => {
                    console.log('Send transaction promise and event listener promise have completed');
                    // check the results in the order the promises were added to the promise all list
                    if (results && results[0] && results[0].status === 'SUCCESS') {
                        console.log('Successfully sent transaction to the orderer.');
                    } else {
                        console.error('Failed to order the transaction. Error code: ' + results[0].status);
                    }
    
                    if(results && results[1] && results[1].event_status === 'VALID') {
                        console.log('Successfully committed the change to the ledger by the peer');
                    } else {
                        console.log('Transaction failed to be committed to the ledger due to ::'+results[1].event_status);
                    }
                });
            }
            else{
                console.error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
                throw new Error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
            }
        });
    }

    parseTransactionResponses(proposalResponses, proposal) {
        if (proposalResponses && proposalResponses[0].response &&
            proposalResponses[0].response.status === 200) {
                console.log('Transaction proposal was good');
                return true;
            }
        console.error('Transaction proposal was bad');
        return false;
    }

    pushProposal(proposalResponses, proposal, tx_id) {
        console.log(util.format(
			'Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s"',
			proposalResponses[0].response.status, proposalResponses[0].response.message));

		// build up the request for the orderer to have the transaction committed
		var request = {
			proposalResponses: proposalResponses,
			proposal: proposal
		};

		// set the transaction listener and set a timeout of 30 sec
		// if the transaction did not get committed within the timeout period,
		// report a TIMEOUT status
		var transaction_id_string = tx_id.getTransactionID(); //Get the transaction ID string to be used by the event processing
		var promises = [];

		var sendPromise = this.channel.sendTransaction(request);
		promises.push(sendPromise); //we want the send transaction first, so that we know where to check status

		// get an eventhub once the fabric client has a user assigned. The user
		// is required bacause the event registration must be signed
		let event_hub = this.channel.newChannelEventHub(this.peer);
		// event_hub.setPeerAddr('grpc://localhost:7053');

		// using resolve the promise so that result status may be processed
		// under the then clause rather than having the catch clause process
		// the status
		let txPromise = new Promise((resolve, reject) => {
			let handle = setTimeout(() => {
				event_hub.disconnect();
				resolve({event_status : 'TIMEOUT'}); //we could use reject(new Error('Trnasaction did not complete within 30 seconds'));
			}, 3000);
			event_hub.connect();
			event_hub.registerTxEvent(transaction_id_string, (tx, code) => {
				// this is the callback for transaction event status
				// first some clean up of event listener
				clearTimeout(handle);
				event_hub.unregisterTxEvent(transaction_id_string);
				event_hub.disconnect();

				// now let the application know what happened
				var return_status = {event_status : code, tx_id : transaction_id_string};
				if (code !== 'VALID') {
					console.error('The transaction was invalid, code = ' + code);
					resolve(return_status); // we could use reject(new Error('Problem with the tranaction, event status ::'+code));
				} else {
					console.log('The transaction has been committed on peer ' + event_hub.getPeerAddr());
					resolve(return_status);
				}
			}, (err) => {
				//this is the callback if something goes wrong with the event registration or processing
				reject(new Error('There was a problem with the eventhub ::'+err));
			});
		});
		promises.push(txPromise);

		return Promise.all(promises);
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