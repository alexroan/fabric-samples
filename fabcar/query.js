'use strict';
/*
* Copyright IBM Corp All Rights Reserved
*
* SPDX-License-Identifier: Apache-2.0
*/
/*
 * Chaincode query
 */

var path = require('path');
const BlockchainClient = require('./blockchainClient.js');

//Initialize client
var blockchainClient = new BlockchainClient();
//Set key store path
var storePath = path.join(__dirname, 'hfc-key-store');

//Set new channel
blockchainClient.newChannel('mychannel', 'grpc://localhost:7051');

//Set key value store
blockchainClient.ready(storePath, 'user1')
.then(async(user)=>{
	//make request
	const request = {
		//targets : --- letting this default to the peers assigned to the channel
		chaincodeId: 'fabcar',
		fcn: 'queryAllCars',
		args: ['']
	};
	blockchainClient.query(user, request);
});