'use strict';
/*
* Copyright IBM Corp All Rights Reserved
*
* SPDX-License-Identifier: Apache-2.0
*/
/*
 * Chaincode Invoke
 */

var path = require('path');
const BlockchainClient = require('./blockchainClient.js');

//Initialize client
var blockchainClient = new BlockchainClient();
//Set new channel
blockchainClient.newChannel('mychannel', 'grpc://localhost:7051', 'grpc://localhost:7050');

var storePath = path.join(__dirname, 'hfc-key-store');
blockchainClient.ready(storePath, 'user1')
	.then(async()=>{
		var params = {
			//targets: let default to the peer assigned to the client
			chaincodeId: 'fabcar',
			fcn: 'createCar',
			args: ['CAR12', 'Honda', 'Accord', 'Black', 'Tom']
		};
		await blockchainClient.sendTransaction(params);
	});